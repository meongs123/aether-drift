// effects.js — one job: motion cues. Pooled thruster particles behind the
// engines and speed streaks at high velocity — the "terrain rushing past"
// cue in space. Zero per-frame allocation in the hot path: fixed pools,
// positions written in place.
import * as THREE from '../vendor/three.module.min.js';
import { forwardVector } from './flight.js';

export function createThrusterParticles(THREE, scene, count = 240) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const life = new Float32Array(count);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x7fd4ff, size: 1.8, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'thrusterParticles';
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0;
  const tmp = new THREE.Vector3();
  function emit(origin, fwd, spread, speed) {
    for (let k = 0; k < 4; k++) {
      const i = cursor; cursor = (cursor + 1) % count;
      pos[i * 3] = origin.x + (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = origin.y + (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * spread;
      life[i] = 0.5 + Math.random() * 0.4;
    }
  }
  function update(dt, shipPos, fwd, speed) {
    // Particles drift backwards relative to the ship and fade.
    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      pos[i * 3] -= fwd.x * speed * dt * 0.55;
      pos[i * 3 + 1] -= fwd.y * speed * dt * 0.55;
      pos[i * 3 + 2] -= fwd.z * speed * dt * 0.55;
      if (life[i] <= 0) { pos[i * 3 + 1] = -99999; }
    }
    geo.attributes.position.needsUpdate = true;
  }
  return { emit, update };
}

export function createSpeedStreaks(THREE, scene, count = 160, rng = Math.random) {
  // Long thin line segments rushing past the camera at high velocity.
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 6);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xbfd9ff, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.name = 'speedStreaks';
  lines.frustumCulled = false;
  scene.add(lines);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    seeds.push({
      x: (rng() - 0.5) * 120, y: (rng() - 0.5) * 80,
      z: -rng() * 220, len: 4 + rng() * 14,
    });
  }
  function update(dt, shipPos, fwd, speed) {
    const show = speed > 240 ? Math.min(0.75, (speed - 240) / 220) : 0;
    mat.opacity = show;
    if (show <= 0) return;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      s.z += speed * dt * 1.6;
      if (s.z > 10) { s.z = -220; s.x = (rng() - 0.5) * 120; s.y = (rng() - 0.5) * 80; }
      // Streak in ship-local space, placed ahead of the ship.
      const wx = shipPos.x + fwd.x * -s.z + s.x * 0.4;
      const wy = shipPos.y + s.y * 0.4;
      const wz = shipPos.z + fwd.z * -s.z + s.x * 0.2;
      pos[i * 6] = wx; pos[i * 6 + 1] = wy; pos[i * 6 + 2] = wz;
      pos[i * 6 + 3] = wx - fwd.x * s.len; pos[i * 6 + 4] = wy - fwd.y * s.len; pos[i * 6 + 5] = wz - fwd.z * s.len;
    }
    geo.attributes.position.needsUpdate = true;
  }
  return { update };
}
