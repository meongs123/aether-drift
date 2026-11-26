// asteroids.js — one job: the Shatter belt. One InstancedMesh of irregular
// rocks (bounded draw calls by construction), plus a denser hero field the
// asteroid screenshot flies through. Seeded, so presets reproduce it.
import * as THREE from '../vendor/three.module.min.js';
import { range } from './random.js';

export function createAsteroidBelt(THREE, rng) {
  const group = new THREE.Group();
  group.name = 'asteroidBelt';
  const geo = new THREE.DodecahedronGeometry(1, 0);
  // Jitter the vertices once so every rock is irregular, not a clean solid.
  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    v.multiplyScalar(0.82 + rng() * 0.36);
    posAttr.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x9d8f7c, roughness: 1.0, metalness: 0.05, flatShading: true });
  const COUNT = 240;
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.name = 'beltRocks';
  const dummy = new THREE.Object3D();
  const rocks = [];
  for (let i = 0; i < COUNT; i++) {
    // Belt arc around Theros at radius 950–1350, tilted like the rings.
    const a = rng() * Math.PI * 2;
    const r = range(rng, 950, 1350);
    const x = -650 + Math.cos(a) * r;
    const z = -2300 + Math.sin(a) * r * 0.92;
    const y = 300 + (rng() - 0.5) * 160 + Math.sin(a) * 60;
    const s = range(rng, 3, 16);
    dummy.position.set(x, y, z);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    rocks.push({ pos: dummy.position.clone(), radius: s * 1.1 });
  }
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);

  // Hero field: ~40 larger rocks near the flight corridor for the asteroid shot.
  const heroGeo = new THREE.DodecahedronGeometry(1, 0);
  const hPos = heroGeo.attributes.position;
  for (let i = 0; i < hPos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(hPos, i);
    v.multiplyScalar(0.8 + rng() * 0.4);
    hPos.setXYZ(i, v.x, v.y, v.z);
  }
  heroGeo.computeVertexNormals();
  const hero = new THREE.InstancedMesh(heroGeo, mat, 42);
  hero.name = 'heroRocks';
  const heroRocks = [];
  for (let i = 0; i < 42; i++) {
    const x = range(rng, -260, 260);
    const y = range(rng, -90, 160);
    const z = range(rng, -1250, -350);
    const s = range(rng, 6, 26);
    dummy.position.set(x, y, z);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    hero.setMatrixAt(i, dummy.matrix);
    heroRocks.push({ pos: dummy.position.clone(), radius: s * 1.1 });
  }
  hero.instanceMatrix.needsUpdate = true;
  group.add(hero);
  group.userData.rocks = rocks.concat(heroRocks);
  return group;
}
