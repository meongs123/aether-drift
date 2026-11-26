// station.js — one job: built structures. Port Solenne station + its lit
// docking ring, the derelict SSV Marrow, and the comet with its tail.
// All geometry is procedural; lights are emissive canvas-free materials.
import * as THREE from '../vendor/three.module.min.js';
import { makeGlowTexture, makeGateTexture } from './textures.js';

export function createPortSolenne(THREE) {
  const group = new THREE.Group();
  group.name = 'stationPortSolenne';
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xb9c0cc, roughness: 0.55, metalness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a4356, roughness: 0.7, metalness: 0.3 });
  const litMat = new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x66d9ff, emissiveIntensity: 1.6, roughness: 0.4 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffb347, emissiveIntensity: 1.8, roughness: 0.4 });

  // Spine + habitat ring + solar wings.
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 120, 12), hullMat);
  spine.rotation.x = Math.PI / 2; spine.name = 'spine'; group.add(spine);
  const hab = new THREE.Mesh(new THREE.TorusGeometry(34, 7, 12, 40), hullMat);
  hab.name = 'habitatRing'; group.add(hab);
  for (const s of [-1, 1]) {
    // FIX PASS 1: wings were dark blue at metalness 0.7 — they rendered as
    // unlit black slabs on the night side. Brighter blue, low metalness.
    const wing = new THREE.Mesh(new THREE.BoxGeometry(70, 0.8, 18), new THREE.MeshStandardMaterial({ color: 0x2f6fc0, roughness: 0.35, metalness: 0.25, emissive: 0x0a2a4a, emissiveIntensity: 0.4 }));
    wing.position.set(s * 48, 0, 0); wing.name = 'solarWing'; group.add(wing);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14, 8), darkMat);
    mast.rotation.z = Math.PI / 2; mast.position.set(s * 14, 0, 0); group.add(mast);
  }
  // Docking ring: the lit approach target — big, glowing, centred ahead.
  // FIX PASS 1: brighter emissive + larger glow so the ring reads at range.
  const dockRing = new THREE.Mesh(
    new THREE.TorusGeometry(26, 1.6, 12, 64),
    new THREE.MeshStandardMaterial({ map: makeGateTexture(THREE), emissive: 0x39e6ff, emissiveIntensity: 2.4, roughness: 0.4 }),
  );
  dockRing.position.set(0, 0, 78);
  dockRing.name = 'dockingRing';
  group.add(dockRing);
  const dockGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(THREE, 'rgba(57,230,255,0.9)', 'rgba(57,230,255,0.25)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9,
  }));
  dockGlow.position.copy(dockRing.position);
  dockGlow.scale.set(90, 90, 1);
  dockGlow.name = 'dockingGlow';
  group.add(dockGlow);
  // Approach corridor lights: a row of amber beacons leading to the ring.
  for (let i = 0; i < 6; i++) {
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), i % 2 ? litMat : amberMat);
    beacon.position.set(i % 2 ? -30 : 30, i % 2 ? 8 : -8, 78 - i * 14);
    beacon.name = 'approachBeacon';
    group.add(beacon);
  }
  // Windows: small emissive dots on the habitat ring.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 6), amberMat);
    win.position.set(Math.cos(a) * 34, Math.sin(a) * 34, 7);
    group.add(win);
  }
  group.position.set(220, 60, -900);
  group.rotation.y = 0.35;
  return group;
}

export function createDerelict(THREE, rng) {
  const group = new THREE.Group();
  group.name = 'derelictMarrow';
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.95, metalness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.9, metalness: 0.4 });
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(9, 12, 70, 10), hullMat);
  hull.rotation.z = Math.PI / 2.4; hull.name = 'marrowHull'; group.add(hull);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 10), darkMat);
  bridge.position.set(24, 8, 0); bridge.name = 'marrowBridge'; group.add(bridge);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(4, 22, 2), darkMat);
  fin.position.set(-18, 10, 0); fin.rotation.z = 0.5; group.add(fin);
  // Tumbling debris + a blinking distress flare.
  for (let i = 0; i < 14; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(1 + rng() * 3, 1 + rng() * 2, 1 + rng() * 2), darkMat);
    d.position.set((rng() - 0.5) * 90, (rng() - 0.5) * 40, (rng() - 0.5) * 40);
    d.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    d.name = 'marrowDebris'; group.add(d);
  }
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(THREE, 'rgba(255,80,60,1)', 'rgba(255,120,60,0.4)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95,
  }));
  flare.scale.set(26, 26, 1); flare.position.set(30, 14, 0);
  flare.name = 'distressFlare'; group.add(flare);
  group.position.set(-700, 180, -1250);
  group.rotation.set(0.2, 0.7, 0.4);
  group.userData.flare = flare;
  return group;
}

export function createComet(THREE, rng) {
  const group = new THREE.Group();
  group.name = 'comet';
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(7, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xcfd8e2, roughness: 0.9, emissive: 0x88ccff, emissiveIntensity: 0.25 }),
  );
  head.name = 'cometHead'; group.add(head);
  // Tail: a fan of additive glow sprites streaming behind the head.
  const tailTex = makeGlowTexture(THREE, 'rgba(140,220,255,0.8)', 'rgba(80,140,255,0.2)');
  for (let i = 0; i < 26; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tailTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.55 - i * 0.018,
    }));
    const t = i / 26;
    spr.position.set(18 + t * 150, (rng() - 0.5) * (8 + t * 42), (rng() - 0.5) * (8 + t * 42));
    spr.scale.set(14 + t * 30, 14 + t * 30, 1);
    spr.name = 'cometTail';
    group.add(spr);
  }
  group.position.set(900, -140, -1900);
  group.rotation.y = -0.5;
  return group;
}
