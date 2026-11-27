// postfx.js — one job: the hand-rolled post-processing chain.
// Three r180 is vendored CORE ONLY (no EffectComposer / UnrealBloomPass
// addons), so the composer is built here from raw render targets and
// fullscreen-quad ShaderMaterials — every line of GLSL written fresh.
//
// Chain (all deterministic — no time-varying noise, so staged screenshots
// stay byte-identical):
//   1. scene -> multisampled HDR render target (samples: 4, keeps the
//      antialiasing that antialias:true would have given on canvas)
//   2. bright pass (threshold ~0.85, soft knee) -> half-res target
//   3. separable 9-tap Gaussian blur, horizontal + vertical, half-res
//   4. composite -> canvas: chromatic aberration (3 extra texture
//      samples, radial, speed-scaled) + additive bloom + ACES tone map
//      + sRGB encode, done HERE because three r180 only applies
//      ACES + sRGB when rendering to the canvas, never to a target —
//      skipping this step would wash the whole frame out (or crush it).
// The HUD is DOM + a 2D canvas overlay, never in the WebGL framebuffer,
// so none of this touches the HUD.
import * as THREE from '../vendor/three.module.min.js';

// Fullscreen-quad vertex shader shared by all three passes.
const QUAD_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }`;

// Bright pass: keep only what is above the bloom threshold, with a soft
// knee so the cutoff does not draw a hard line across the gate rings.
const BRIGHT_FRAG = /* glsl */`
  uniform sampler2D tScene;
  uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tScene, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float w = smoothstep(uThreshold - 0.12, uThreshold + 0.12, l);
    gl_FragColor = vec4(c * w, 1.0);
  }`;

// Separable 9-tap Gaussian blur (sigma ~2 texels). One direction per
// pass; the caller runs it horizontally then vertically.
const BLUR_FRAG = /* glsl */`
  uniform sampler2D tInput;
  uniform vec2 uDirection;
  varying vec2 vUv;
  void main() {
    vec3 c = vec3(0.0);
    c += texture2D(tInput, vUv + uDirection * -4.0).rgb * 0.0162162162;
    c += texture2D(tInput, vUv + uDirection * -3.0).rgb * 0.0540540541;
    c += texture2D(tInput, vUv + uDirection * -2.0).rgb * 0.1216216216;
    c += texture2D(tInput, vUv + uDirection * -1.0).rgb * 0.1945945946;
    c += texture2D(tInput, vUv).rgb * 0.2270270270;
    c += texture2D(tInput, vUv + uDirection * 1.0).rgb * 0.1945945946;
    c += texture2D(tInput, vUv + uDirection * 2.0).rgb * 0.1216216216;
    c += texture2D(tInput, vUv + uDirection * 3.0).rgb * 0.0540540541;
    c += texture2D(tInput, vUv + uDirection * 4.0).rgb * 0.0162162162;
    gl_FragColor = vec4(c, 1.0);
  }`;

// Composite: chromatic aberration (red pulled outwards, blue inwards,
// along the radius from frame centre — 3 extra samples, 0 extra passes),
// additive bloom, then the ACES filmic curve + sRGB encode that three
// would normally apply on the canvas render.
const COMPOSITE_FRAG = /* glsl */`
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float uAberration;
  uniform float uBloomStrength;
  uniform float uExposure;
  varying vec2 vUv;
  vec3 acesFit(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  vec3 linearToSrgb(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }
  void main() {
    vec2 dir = vUv - 0.5;
    vec3 col;
    col.r = texture2D(tScene, vUv + dir * uAberration).r;
    col.g = texture2D(tScene, vUv).g;
    col.b = texture2D(tScene, vUv - dir * uAberration).b;
    col += texture2D(tBloom, vUv).rgb * uBloomStrength;
    col = acesFit(col * uExposure);
    gl_FragColor = vec4(linearToSrgb(col), 1.0);
  }`;

export function createPostFX(THREE, renderer) {
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(quadGeo, null);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const brightMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: BRIGHT_FRAG,
    uniforms: { tScene: { value: null }, uThreshold: { value: 0.85 } },
    depthTest: false, depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG,
    uniforms: { tInput: { value: null }, uDirection: { value: new THREE.Vector2(1, 0) } },
    depthTest: false, depthWrite: false,
  });
  const compositeMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: COMPOSITE_FRAG,
    uniforms: {
      tScene: { value: null },
      tBloom: { value: null },
      uAberration: { value: 0.0015 },
      uBloomStrength: { value: 0.85 },
      uExposure: { value: renderer.toneMappingExposure || 1.0 },
    },
    depthTest: false, depthWrite: false,
  });

  let sceneRT = null;
  let bloomA = null;
  let bloomB = null;
  const bufSize = new THREE.Vector2();
  // Preallocated: render() runs every frame, so no per-frame Vector2.
  const bloomTexel = new THREE.Vector2();

  function makeRT(w, h, samples) {
    return new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples,
      depthBuffer: samples > 0,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }

  function resize() {
    renderer.getDrawingBufferSize(bufSize);
    const w = Math.max(2, bufSize.x | 0);
    const h = Math.max(2, bufSize.y | 0);
    if (sceneRT && sceneRT.width === w && sceneRT.height === h) return;
    if (sceneRT) sceneRT.dispose();
    if (bloomA) bloomA.dispose();
    if (bloomB) bloomB.dispose();
    sceneRT = makeRT(w, h, 4);
    bloomA = makeRT(w >> 1, h >> 1, 0);
    bloomB = makeRT(w >> 1, h >> 1, 0);
  }
  resize();

  function runPass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }

  // Render one frame through the chain. opts.aberration is the radial
  // chromatic-aberration offset in UV units (0.0015–0.003); the caller
  // scales it with speed/throttle. Everything here is a pure function
  // of the scene + the uniforms — no clock, no noise — so a frozen
  // staged frame reproduces exactly.
  function render(scene, camera, opts = {}) {
    resize();
    bloomTexel.set(1 / bloomA.width, 1 / bloomA.height);
    compositeMat.uniforms.uAberration.value = opts.aberration ?? 0.0015;
    compositeMat.uniforms.uBloomStrength.value = opts.bloomStrength ?? 0.85;

    // 1. Scene into the multisampled HDR target (linear, no tone map).
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);

    // 2. Bright pass -> half-res bloom target A.
    brightMat.uniforms.tScene.value = sceneRT.texture;
    runPass(brightMat, bloomA);

    // 3. Separable Gaussian: horizontal A -> B, vertical B -> A.
    // One H+V pair at half res: the 9-tap kernel already spans ~9 px
    // of the half-res buffer (~18 full-res px), wide enough for the
    // engine glow and gate rings without a second iteration.
    blurMat.uniforms.tInput.value = bloomA.texture;
    blurMat.uniforms.uDirection.value.set(bloomTexel.x, 0);
    runPass(blurMat, bloomB);
    blurMat.uniforms.tInput.value = bloomB.texture;
    blurMat.uniforms.uDirection.value.set(0, bloomTexel.y);
    runPass(blurMat, bloomA);

    // 4. Composite to the canvas (does its own ACES + sRGB).
    compositeMat.uniforms.tScene.value = sceneRT.texture;
    compositeMat.uniforms.tBloom.value = bloomA.texture;
    runPass(compositeMat, null);
  }

  function dispose() {
    if (sceneRT) sceneRT.dispose();
    if (bloomA) bloomA.dispose();
    if (bloomB) bloomB.dispose();
    quadGeo.dispose();
    brightMat.dispose();
    blurMat.dispose();
    compositeMat.dispose();
  }

  return { render, resize, dispose };
}
