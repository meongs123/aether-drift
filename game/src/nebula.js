// nebula.js — one job: coloured volumetric-feeling nebula glow. Layered
// transparent sprites in teal / violet / magenta, low saturation so the ship
// and HUD stay legible, placed so the cover shot has a coloured backdrop
// behind the ship — never a bare black void.
import * as THREE from '../vendor/three.module.min.js';
import { makeNebulaTexture } from './textures.js';
import { range } from './random.js';

export function createNebula(scene, rng) {
  const group = new THREE.Group();
  group.name = 'nebula';
  const hues = [185, 265, 305, 210, 285]; // teal, violet, magenta, blue, purple
  const placements = [
    // [x, y, z, scale, hue, opacity] — arranged around the play volume so
    // every mission direction has colour behind it.
    [-1400, 500, -2600, 2400, 265, 0.85],
    [900, -700, -3200, 2800, 185, 0.8],
    [1800, 900, -1800, 2000, 305, 0.7],
    [-2600, -400, -1200, 2200, 210, 0.75],
    [400, 1400, -3800, 3000, 285, 0.8],
    [-800, -1200, -2600, 1800, 185, 0.65],
    [2600, -200, -2600, 2200, 265, 0.7],
    [0, 300, -5200, 3600, 305, 0.6],
  ];
  for (const [x, y, z, s, hue, op] of placements) {
    const tex = makeNebulaTexture(THREE, rng, hue);
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: op, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.position.set(x + range(rng, -150, 150), y + range(rng, -120, 120), z);
    spr.scale.set(s, s * 0.75, 1);
    spr.name = 'nebulaPuff';
    group.add(spr);
  }
  scene.add(group);
  return group;
}
