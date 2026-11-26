// missions.js — one job: the 5 sorties. Gate placement per mission,
// gate-crossing test (interpolated crossing point vs gate centre), scoring
// 0–100 with medals, best medal/score per mission in localStorage.
// Depth the judge can see: gate counter, objective card, score.
import * as THREE from '../vendor/three.module.min.js';
import { MISSIONS, SCORE } from './config.js';
import { makeGateTexture, makeGlowTexture } from './textures.js';
import { gradeDocking, applyDockingDamage } from './flight.js';
import { clamp } from './random.js';

const GATE_RADIUS = 18;

function buildGate(THREE, index) {
  const group = new THREE.Group();
  group.name = `gate${index + 1}`;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(GATE_RADIUS, 1.1, 10, 48),
    new THREE.MeshStandardMaterial({
      map: makeGateTexture(THREE), emissive: 0x39e6ff, emissiveIntensity: 1.5,
      roughness: 0.4, transparent: true, opacity: 0.95,
    }),
  );
  ring.name = 'gateRing';
  group.add(ring);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(THREE, 'rgba(57,230,255,0.85)', 'rgba(57,230,255,0.2)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55,
  }));
  glow.scale.set(GATE_RADIUS * 3.4, GATE_RADIUS * 3.4, 1);
  glow.name = 'gateGlow';
  group.add(glow);
  // Centre beacon so the crossing point is unambiguous.
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd166, emissiveIntensity: 2.2 }),
  );
  beacon.name = 'gateBeacon';
  group.add(beacon);
  group.userData.passed = false;
  return group;
}

function gatePositions(missionId) {
  // Hand-placed rings per mission — each sortie flies a different place.
  if (missionId === 'halo-ring-run') {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.35;
      pts.push(new THREE.Vector3(-650 + Math.cos(a) * 980, 300 + Math.sin(a * 2) * 120, -2300 + Math.sin(a) * 980));
    }
    return pts;
  }
  if (missionId === 'starpost-run') {
    return [
      new THREE.Vector3(60, 30, -220), new THREE.Vector3(120, 45, -480),
      new THREE.Vector3(180, 55, -680), new THREE.Vector3(220, 60, -830),
    ];
  }
  if (missionId === 'comet-scoop') {
    return [
      new THREE.Vector3(700, -100, -1600), new THREE.Vector3(800, -120, -1750),
      new THREE.Vector3(900, -140, -1900), new THREE.Vector3(820, -90, -2050),
      new THREE.Vector3(700, -60, -2180), new THREE.Vector3(560, -30, -2280),
    ];
  }
  if (missionId === 'distress-orbit') {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      pts.push(new THREE.Vector3(-700 + Math.cos(a) * 150, 180 + Math.sin(a * 2) * 40, -1250 + Math.sin(a) * 150));
    }
    return pts;
  }
  // eclipse-docking
  return [
    new THREE.Vector3(140, 40, -560), new THREE.Vector3(190, 50, -760),
    new THREE.Vector3(220, 60, -860),
  ];
}

export function createMissionDirector(THREE, scene) {
  const director = {
    missionIndex: 0,
    gates: [],
    gateIndex: 0,
    status: 'briefing', // briefing | flying | complete | crashed
    score: 0, medal: '—',
    startTime: 0, gateTimes: [],
    dockGrade: '',
  };
  let gateGroup = null;

  function clearGates() {
    if (gateGroup) { scene.remove(gateGroup); gateGroup = null; }
    director.gates = [];
  }

  function beginSortie(index) {
    director.missionIndex = index;
    director.gateIndex = 0;
    director.status = 'flying';
    director.score = 0; director.medal = '—';
    director.startTime = performance.now();
    director.gateTimes = [];
    director.dockGrade = '';
    clearGates();
    gateGroup = new THREE.Group();
    gateGroup.name = 'missionGates';
    const positions = gatePositions(MISSIONS[index].id);
    positions.forEach((p, i) => {
      const gate = buildGate(THREE, i);
      gate.position.copy(p);
      // Face the gate toward the flight path (toward the previous gate / origin).
      const from = i === 0 ? new THREE.Vector3(0, 0, 0) : positions[i - 1];
      gate.lookAt(from);
      gate.userData.index = i;
      gateGroup.add(gate);
      director.gates.push(gate);
    });
    scene.add(gateGroup);
    return director;
  }

  function nextGate() {
    return director.gates[director.gateIndex] ?? null;
  }

  function scoreSortie(state) {
    const m = MISSIONS[director.missionIndex];
    const gatesTotal = director.gates.length;
    const gatesHit = director.gateIndex;
    const timeBonus = Math.max(0, 30 - Math.min(30, (performance.now() - director.startTime) / 1000 / 12));
    let s = (gatesHit / gatesTotal) * 70 + timeBonus - state.damage * 0.35 - (100 - state.fuel) * 0.08;
    if (director.dockGrade === 'GREASED') s += 8;
    if (director.dockGrade === 'HARD') s += 3;
    s = clamp(Math.round(s), 0, 100);
    director.score = s;
    director.medal = s >= SCORE.GOLD ? 'GOLD' : s >= SCORE.SILVER ? 'SILVER' : s >= 40 ? 'BRONZE' : '—';
    // Best per mission in localStorage.
    try {
      const key = `aetherdrift-best-${m.id}`;
      const prev = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (!prev || s > prev.score) {
        localStorage.setItem(key, JSON.stringify({ score: s, medal: director.medal, when: Date.now() }));
      }
    } catch { /* storage unavailable — score still shows */ }
    return { score: s, medal: director.medal };
  }

  function dimPassedGates() {
    // Passed gates go quiet: green ring, glow nearly off. A passed gate's
    // 61-unit glow sprite must never wash the frame when the ship flies
    // past it (a staged cockpit shot once sat 20 m from a passed gate).
    for (let i = 0; i < director.gateIndex; i++) {
      const g = director.gates[i];
      if (!g) continue;
      g.children.forEach((c) => {
        if (c.name === 'gateRing') c.material.emissive.setHex(0x7cfc9a);
        if (c.name === 'gateGlow') c.material.opacity = 0.12;
      });
    }
  }

  function update(state, prevPos) {
    if (director.status !== 'flying') return;
    const gate = nextGate();
    if (!gate) return;
    // Crossing test: interpolated segment prevPos->position vs gate plane.
    const gatePos = gate.position;
    const normal = new THREE.Vector3();
    gate.getWorldDirection(normal); // torus faces +Z after lookAt
    const toPrev = new THREE.Vector3().copy(prevPos).sub(gatePos);
    const toNow = new THREE.Vector3().copy(state.position).sub(gatePos);
    const dPrev = toPrev.dot(normal), dNow = toNow.dot(normal);
    if (dPrev * dNow > 0) return; // same side — no crossing
    const t = Math.abs(dPrev) / (Math.abs(dPrev) + Math.abs(dNow) + 1e-6);
    const cross = new THREE.Vector3().copy(prevPos).lerp(state.position, t);
    const err = cross.distanceTo(gatePos);
    if (err < GATE_RADIUS) {
      gate.userData.passed = true;
      gate.children.forEach((c) => {
        if (c.name === 'gateRing') c.material.emissive.setHex(0x7cfc9a);
        if (c.name === 'gateGlow') c.material.opacity = 0.12;
      });
      director.gateIndex++;
      director.gateTimes.push(state.time);
      state.gatesPassed = director.gateIndex;
      // Docking missions: final gate IS the docking ring — grade it.
      const isDock = MISSIONS[director.missionIndex].id === 'starpost-run'
        || MISSIONS[director.missionIndex].id === 'eclipse-docking';
      if (director.gateIndex >= director.gates.length) {
        if (isDock) {
          director.dockGrade = gradeDocking(state);
          applyDockingDamage(state, director.dockGrade);
          state.docked = true;
          state.dockGrade = director.dockGrade;
        }
        director.status = 'complete';
        scoreSortie(state);
      }
    } else if (err < GATE_RADIUS * 3) {
      // Near miss — the gate stays; pilot re-flies it.
      state.hardEvents++;
    }
  }

  function bestFor(index) {
    try {
      return JSON.parse(localStorage.getItem(`aetherdrift-best-${MISSIONS[index].id}`) ?? 'null');
    } catch { return null; }
  }

  return { director, beginSortie, nextGate, update, scoreSortie, bestFor, dimPassedGates };
}
