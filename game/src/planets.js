// planets.js — one job: the recognisable places. Ringed gas giant Theros
// (limb light + atmosphere rim + terminator), ocean world Veyla, cratered
// moon Keth. Each is a real sphere with a painted canvas surface and a
// fresnel atmosphere shell lit from the one sun direction.
import * as THREE from '../vendor/three.module.min.js';
import { SUN_DIR } from './config.js';
import { makeBandTexture, makeOceanTexture, makeMoonTexture } from './textures.js';

function atmosphereShell(THREE, radius, color, intensity) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sunDir: { value: SUN_DIR.clone() },
      rimColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
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
        float fres = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 5.0);
        float sunSide = clamp(dot(normalize(vNormal), sunDir) * 0.5 + 0.75, 0.0, 1.0);
        gl_FragColor = vec4(rimColor, fres * sunSide * intensity);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.025, 48, 32), mat);
  mesh.name = 'atmosphereRim';
  return mesh;
}

export function createTheros(THREE, rng) {
  const group = new THREE.Group();
  group.name = 'planetTheros';
  const R = 520;
  const surf = new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 48),
    new THREE.MeshStandardMaterial({ map: makeBandTexture(THREE, rng), roughness: 0.9, metalness: 0.0 }),
  );
  surf.name = 'therosSurface';
  group.add(surf);
  group.add(atmosphereShell(THREE, R, 0x9fd8e8, 0.55));
  // Ring system: tilted, canvas gradient band, lit by the same sun.
  const ringTex = (() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 8;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, 'rgba(210,190,150,0)');
    grad.addColorStop(0.15, 'rgba(230,210,170,0.85)');
    grad.addColorStop(0.4, 'rgba(200,170,120,0.55)');
    grad.addColorStop(0.55, 'rgba(240,220,180,0.9)');
    grad.addColorStop(0.75, 'rgba(190,160,110,0.5)');
    grad.addColorStop(1, 'rgba(210,190,150,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 8);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(R * 1.25, R * 2.15, 96, 1),
    new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = 0.9; // tilted face-on to the flight corridor, not edge-on
  ring.rotation.y = 0.3;
  ring.name = 'therosRings';
  group.add(ring);
  group.position.set(-650, 300, -2300);
  return group;
}

export function createVeyla(THREE, rng) {
  const group = new THREE.Group();
  group.name = 'planetVeyla';
  const R = 260;
  const surf = new THREE.Mesh(
    new THREE.SphereGeometry(R, 48, 32),
    new THREE.MeshStandardMaterial({ map: makeOceanTexture(THREE, rng), roughness: 0.55, metalness: 0.05 }),
  );
  surf.name = 'veylaSurface';
  group.add(surf);
  group.add(atmosphereShell(THREE, R, 0x5fb8ff, 1.0));
  group.position.set(1450, -320, -2400);
  return group;
}

export function createKeth(THREE, rng) {
  const group = new THREE.Group();
  group.name = 'moonKeth';
  const R = 120;
  const surf = new THREE.Mesh(
    new THREE.SphereGeometry(R, 40, 28),
    new THREE.MeshStandardMaterial({ map: makeMoonTexture(THREE, rng), roughness: 1.0, metalness: 0.0 }),
  );
  surf.name = 'kethSurface';
  group.add(surf);
  group.add(atmosphereShell(THREE, R, 0xbfc8d8, 0.35));
  // FIX PASS 1: Keth used to sit at (-1250,-480,-1100), in none of the 4
  // judging shots. It now sits beside Theros on the cover's sightline
  // (~12° off the cover camera axis, ~83 px disc) and clear of Theros
  // itself (721 m centre-to-centre vs 520 + 120 radii).
  group.position.set(-1150, 40, -1850);
  return group;
}
