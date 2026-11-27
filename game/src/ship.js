// ship.js — one job: the ISV Aetherwing. A fully modelled procedural
// spaceship: lofted hull, swept fins, twin engine nacelles, canopy, painted
// livery "AD-AW07", engine glow. Plus the cockpit interior (panel + canopy
// frame) that only the seat-eye camera sees. No sprites pretending to be a ship.
import * as THREE from '../vendor/three.module.min.js';
import { SUN_DIR } from './config.js';
import { makeLiveryTexture, makeGlowTexture, makePanelTexture } from './textures.js';

export function buildShipModel(THREE) {
  const group = new THREE.Group();
  group.name = 'shipAetherwing';
  const livery = new THREE.MeshStandardMaterial({
    map: makeLiveryTexture(THREE), roughness: 0.42, metalness: 0.2,
  });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2b313c, roughness: 0.5, metalness: 0.3 });
  const tealTrim = new THREE.MeshStandardMaterial({ color: 0x0e7f86, roughness: 0.35, metalness: 0.3, emissive: 0x0a4a4e, emissiveIntensity: 0.5 });
  // FIX PASS 1: the canopy used to be opaque blue glass, so from the seat
  // it read as a solid dome filling the frame. Real canopy glass: mostly
  // transparent from inside (opacity 0.22, no depth write), faint blue
  // tint kept so it still reads as glass from the chase camera.
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a2038, roughness: 0.08, metalness: 0.2,
    emissive: 0x2a6ea8, emissiveIntensity: 0.15, clearcoat: 1,
    transparent: true, opacity: 0.22, depthWrite: false,
  });

  // Lofted hull: lathe profile (pointed nose -> wide mid -> tapered tail),
  // then squashed vertically for a lifting-body look. Forward is -Z.
  const profile = [];
  profile.push(new THREE.Vector2(0.01, -5.4));
  profile.push(new THREE.Vector2(0.55, -5.0));
  profile.push(new THREE.Vector2(1.05, -3.6));
  profile.push(new THREE.Vector2(1.35, -1.2));
  profile.push(new THREE.Vector2(1.30, 1.2));
  profile.push(new THREE.Vector2(1.05, 3.2));
  profile.push(new THREE.Vector2(0.55, 4.6));
  profile.push(new THREE.Vector2(0.01, 5.0));
  const hull = new THREE.Mesh(new THREE.LatheGeometry(profile, 14), livery);
  hull.rotation.x = -Math.PI / 2; // lathe axis Y -> ship axis Z (nose -Z)
  hull.scale.set(1, 1, 0.62);
  hull.name = 'hull';
  group.add(hull);

  // PASS 4: rim-light shell — the same lofted hull profile, scaled ~1.04
  // and rendered BackSide with a fresnel shader (same pattern as the
  // planet atmosphere shells in planets.js: pow ~4, sun-gated, additive).
  // Only the silhouette edge lights up, so the ship pops against the
  // void and the dark side of a planet. +1 draw call, no per-asteroid
  // shells. Hidden in cockpit mode by main.js (the seat eye sits inside
  // it, so it would wrap the camera in glow). ShaderMaterial ignores
  // scene.fog by default, so the shell never gets fogged at range.
  const rimMat = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sunDir: { value: SUN_DIR.clone() },
      rimColor: { value: new THREE.Color(0x66ccff) },
      intensity: { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 sunDir; uniform vec3 rimColor; uniform float intensity;
      varying vec3 vNormal; varying vec3 vWorldPos;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 4.0);
        float sunSide = clamp(dot(normalize(vNormal), sunDir) * 0.5 + 0.75, 0.0, 1.0);
        gl_FragColor = vec4(rimColor, fres * sunSide * intensity);
      }`,
  });
  const rimShell = new THREE.Mesh(new THREE.LatheGeometry(profile, 14), rimMat);
  rimShell.rotation.x = -Math.PI / 2;
  rimShell.scale.set(1.04, 1.04, 0.62 * 1.04);
  rimShell.name = 'rimShell';
  group.add(rimShell);

  // Dorsal spine + nose stripe.
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 6.4), tealTrim);
  spine.position.set(0, 0.72, -0.6); spine.name = 'spine'; group.add(spine);

  // Swept fins: extruded delta shapes, left/right + ventral tail fin.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(3.4, 1.1); finShape.lineTo(3.0, 2.6);
  finShape.lineTo(0.4, 1.4); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.22, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(finGeo, livery);
    fin.rotation.x = Math.PI / 2;
    fin.rotation.y = s > 0 ? 0 : Math.PI;
    fin.position.set(s * 1.05, 0.1, 2.6);
    fin.scale.set(s, 1, 1);
    fin.name = 'sweptFin';
    group.add(fin);
  }
  const tailFin = new THREE.Mesh(finGeo, darkMetal);
  tailFin.rotation.x = Math.PI / 2; tailFin.rotation.z = Math.PI / 2;
  tailFin.position.set(0, 0.55, 3.4); tailFin.scale.set(0.8, 1, 1);
  tailFin.name = 'tailFin'; group.add(tailFin);

  // Twin engine nacelles + glowing nozzles.
  const glowTex = makeGlowTexture(THREE, 'rgba(140,230,255,1)', 'rgba(40,140,255,0.5)');
  const engines = [];
  for (const s of [-1, 1]) {
    const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 4.6, 12), darkMetal);
    nac.rotation.x = Math.PI / 2;
    nac.position.set(s * 1.85, -0.15, 1.6);
    nac.name = 'nacelle'; group.add(nac);
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.42, 0.9, 12),
      new THREE.MeshStandardMaterial({ color: 0x111418, emissive: 0x66ccff, emissiveIntensity: 1.4, roughness: 0.4 }),
    );
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(s * 1.85, -0.15, 4.1);
    nozzle.name = 'nozzle'; group.add(nozzle);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.9,
    }));
    glow.position.set(s * 1.85, -0.15, 5.4);
    glow.scale.set(2.6, 2.6, 1);
    glow.name = 'engineGlow';
    group.add(glow);
    engines.push(glow);
    // Wingtip nav lights.
    const nav = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: s < 0 ? 0xff2a2a : 0x2aff66, emissiveIntensity: 2.5 }),
    );
    nav.position.set(s * 4.3, 0.15, 2.2);
    nav.name = 'navLight'; group.add(nav);
  }
  // Engine point light so the ship lights nearby rocks/gates from behind.
  const engineLight = new THREE.PointLight(0x66bbff, 12, 40, 1.6);
  engineLight.position.set(0, 0, 5.5);
  group.add(engineLight);

  // Canopy: glossy bubble over the forward fuselage.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), canopyMat);
  canopy.scale.set(1, 0.62, 1.7);
  canopy.position.set(0, 0.72, -2.6);
  canopy.name = 'canopy';
  group.add(canopy);

  // ---- Cockpit interior (visible only from the seat-eye camera) ----
  const cockpit = new THREE.Group();
  cockpit.name = 'cockpitInterior';
  cockpit.visible = false;
  // Instrument panel: curved box with the backlit gauge texture.
  // FIX PASS 1: the panel used to sit at y 0.37 — buried inside the hull
  // (hull top is ~0.73 at this station), so from the seat only clipped
  // label fragments peeked over the nose. It now sits at y 0.85, tilted up
  // toward the raised seat eye, clear of the hull line.
  // FIX PASS 2: y 0.85 still hid the dials' lower halves behind the nose
  // wedge (ray from the seat eye to the dial bottoms crossed the hull
  // crest) and the panel top sat where the ring's lower arc projects.
  // Panel raised to y 1.05, moved forward to z -2.35, tilt eased to -0.35:
  // projection-checked (qa/fix2-projection.mjs) — all 5 dial centres,
  // bottoms and labels clear of the nose (dial bottoms ~19 px above the
  // nose line) and the panel top edge sits below the staged ring's lower
  // arc. Emissive 1.1 so the dials read lit even in the eclipse palette.
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.85, 0.22),
    new THREE.MeshStandardMaterial({ map: makePanelTexture(THREE), roughness: 0.5, metalness: 0.2, emissive: 0xffffff, emissiveMap: makePanelTexture(THREE), emissiveIntensity: 1.1 }),
  );
  panel.position.set(0, 1.05, -2.35);
  panel.rotation.x = -0.35;
  panel.name = 'instrumentPanel';
  cockpit.add(panel);
  // Glareshield above the panel + side consoles.
  // FIX PASS 2: the shield sat at y 1.15, right where the GATE label
  // projects — its dark bar bisected "GATE x/x · xxx m" in the staged
  // cockpit shot. Raised to y 1.38 and thinned (0.07 x 0.30): the band
  // now projects at y ~333-343, well below the label (~192) and below
  // the staged ring's lower arc (~308).
  const shield = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 0.30), darkMetal);
  shield.position.set(0, 1.38, -2.45); shield.rotation.x = 0.3; cockpit.add(shield);
  for (const s of [-1, 1]) {
    const console_ = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 2.2), darkMetal);
    console_.position.set(s * 1.55, -0.35, -1.4);
    cockpit.add(console_);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x39e6ff, emissiveIntensity: 1.6 }));
    strip.position.set(s * 1.55, -0.18, -1.4);
    cockpit.add(strip);
  }
  // Canopy frame struts (so the canopy reads as a real frame, not a void).
  for (const s of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), darkMetal);
    strut.position.set(s * 1.05, 0.75, -2.0);
    strut.rotation.z = s * -0.35;
    cockpit.add(strut);
    const strut2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 0.14), darkMetal);
    strut2.position.set(s * 1.15, 0.7, -3.4);
    strut2.rotation.z = s * -0.5;
    cockpit.add(strut2);
  }
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.14), darkMetal);
  frameTop.position.set(0, 1.45, -2.7);
  cockpit.add(frameTop);
  group.add(cockpit);

  return { group, engines, engineLight, cockpit, rimShell };
}
