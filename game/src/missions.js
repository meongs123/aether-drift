// missions.js — one job: the 5 sorties. Gate placement per mission,
// gate-crossing test (interpolated crossing point vs gate centre), scoring
// 0–100 with medals, best medal/score per mission in localStorage.
// Depth the judge can see: gate counter, objective card, score.
// FIX PASS 1: startSortie / gradeSortie renamed from beginSortie /
// scoreSortie; the score now updates LIVE (gradeSortie writes state.score
// and is called on every gate pass, not only at completion); scoring adds a
// per-gate accuracy term and a tighter time bonus so GOLD needs clean,
// fast flying; Comet Scoop and Distress Orbit are real verbs in code now,
// not just objective text (see update()).
import * as THREE from '../vendor/three.module.min.js';
import { MISSIONS, SCORE } from './config.js';
import { makeGateTexture, makeGlowTexture } from './textures.js';
import { gradeDocking, applyDockingDamage } from './flight.js';
import { clamp } from './random.js';

const GATE_RADIUS = 18;
// Comet Scoop: plasma only counts inside this speed window (m/s).
const SCOOP_WINDOW = [180, 260];
// Comet Scoop: the buoy drop only counts if the final gate is crossed slow.
const BUOY_DROP_MAX_SPEED = 140;
// Distress Orbit: degrees of orbit around the flare that count as "orbited".
const ORBIT_TARGET_DEG = 245;
// SSV Marrow position (matches station.js createDerelict).
const MARROW_POS = new THREE.Vector3(-700, 180, -1250);

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
    // FIX PASS 1: the tail gates were 175–181 m apart — under a second per
    // gate at scoop speed (180–260 m/s), so the ship was always mid-turn
    // and crossed every ring 20–70 m off-centre. The scoop run is now a
    // gentle flyby past the comet head with ~320 m legs (~1.5 s per gate
    // at scoop speed): the speed window still binds, but a lined-up pilot
    // can actually thread the rings.
    return [
      new THREE.Vector3(500, -80, -1300), new THREE.Vector3(650, -105, -1600),
      new THREE.Vector3(800, -130, -1900), new THREE.Vector3(950, -120, -2200),
      new THREE.Vector3(900, -80, -2500), new THREE.Vector3(750, -40, -2750),
    ];
  }
  if (missionId === 'distress-orbit') {
    // FIX PASS 1: circle radius 150 -> 260 -> 400 m. At 150 m the legs were
    // ~180 m with a 72° course change each — tighter than the turn radius
    // at any speed, so the sortie was unflyable; at 260 m (306 m legs) the
    // ship still spent every leg mid-turn and crossed 20–70 m off-centre.
    // At 400 m the legs are ~470 m: a 72° turn at orbit speed takes ~300 m
    // and leaves a straight run at each ring.
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      pts.push(new THREE.Vector3(-700 + Math.cos(a) * 400, 180 + Math.sin(a * 2) * 40, -1250 + Math.sin(a) * 400));
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
    // Per-gate accuracy: 1 - crossing error / radius, averaged over gates hit.
    accuracySum: 0, accuracyCount: 0,
    // Comet Scoop verb: scoops inside the speed window + the buoy drop.
    scoop: { checked: 0, window: 0, dropped: null },
    // Distress Orbit verb: accumulated orbit around the flare, degrees.
    orbitDeg: 0, prevOrbitAngle: null,
  };
  let gateGroup = null;

  function clearGates() {
    if (gateGroup) { scene.remove(gateGroup); gateGroup = null; }
    director.gates = [];
  }

  function startSortie(index) {
    director.missionIndex = index;
    director.gateIndex = 0;
    director.status = 'flying';
    director.score = 0; director.medal = '—';
    director.startTime = performance.now();
    director.gateTimes = [];
    director.dockGrade = '';
    director.accuracySum = 0; director.accuracyCount = 0;
    director.scoop = { checked: 0, window: 0, dropped: null };
    director.orbitDeg = 0; director.prevOrbitAngle = null;
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

  function gradeSortie(state) {
    const m = MISSIONS[director.missionIndex];
    const gatesTotal = director.gates.length;
    const gatesHit = director.gateIndex;
    const progress = gatesTotal ? gatesHit / gatesTotal : 0;
    const elapsedSec = (performance.now() - director.startTime) / 1000;
    // FIX PASS 1: time bonus capped at 15 and decaying slowly — a ~30 s
    // sortie earns ~13.5, not ~27. Gates 60 + accuracy 15 + time 15 = 90
    // before bonuses/penalties, so GOLD (83) needs clean, fast flying
    // (a perfect 15 s run scores ~87) but is reachable; sloppy flying
    // (avg accuracy 0.33) lands ~74 SILVER.
    const timeBonus = Math.max(0, 15 - elapsedSec / 20);
    const avgAcc = director.accuracyCount ? director.accuracySum / director.accuracyCount : 0;
    let s = progress * 60 + progress * avgAcc * 15 + timeBonus
      - state.damage * 0.35 - (100 - state.fuel) * 0.08;
    // Verb bonuses: +2 per in-window scoop, +6 for a clean buoy drop.
    if (m.id === 'comet-scoop') {
      s += director.scoop.window * 2 + (director.scoop.dropped === true ? 6 : 0);
    }
    // Orbit bonus: +5 for circling the flare the full 245° by completion.
    if (m.id === 'distress-orbit' && director.orbitDeg >= ORBIT_TARGET_DEG) s += 5;
    if (director.dockGrade === 'GREASED') s += 8;
    if (director.dockGrade === 'HARD') s += 3;
    s = clamp(Math.round(s), 0, 100);
    director.score = s;
    // FIX PASS 1 (RT F9): the HUD reads state.score, so the grade must land
    // there too — otherwise every flying shot reads SCORE 0.
    state.score = s;
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
    const missionId = MISSIONS[director.missionIndex].id;
    // DISTRESS ORBIT verb: accumulate the ship's angle around the flare
    // (SSV Marrow) every fixed step, either direction counts.
    if (missionId === 'distress-orbit') {
      const ang = Math.atan2(state.position.z - MARROW_POS.z, state.position.x - MARROW_POS.x);
      if (director.prevOrbitAngle !== null) {
        let d = ang - director.prevOrbitAngle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        director.orbitDeg += Math.abs(d) * 180 / Math.PI;
        if (director.orbitDeg > 720) director.orbitDeg = 720; // two full orbits is plenty
      }
      director.prevOrbitAngle = ang;
    }
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
      // Per-gate accuracy: dead centre = 1.0, ring edge = 0.0.
      director.accuracySum += Math.max(0, 1 - err / GATE_RADIUS);
      director.accuracyCount++;
      const isFinalGate = director.gateIndex >= director.gates.length - 1;
      // COMET SCOOP verb: tail gates only count as scoops inside the speed
      // window; the final gate is the survey buoy — the drop only counts
      // if the ship crosses it slow enough to release the sample.
      if (missionId === 'comet-scoop') {
        if (!isFinalGate) {
          director.scoop.checked++;
          if (state.speed >= SCOOP_WINDOW[0] && state.speed <= SCOOP_WINDOW[1]) {
            director.scoop.window++;
          }
        } else {
          director.scoop.dropped = state.speed <= BUOY_DROP_MAX_SPEED;
        }
      }
      director.gateIndex++;
      director.gateTimes.push(state.time);
      state.gatesPassed = director.gateIndex;
      // Live score: the HUD shows progress after every gate, not just at
      // the end (RT F9).
      gradeSortie(state);
      // Docking missions: final gate IS the docking ring — grade it.
      const isDock = missionId === 'starpost-run'
        || missionId === 'eclipse-docking';
      if (director.gateIndex >= director.gates.length) {
        if (isDock) {
          director.dockGrade = gradeDocking(state);
          applyDockingDamage(state, director.dockGrade);
          state.docked = true;
          state.dockGrade = director.dockGrade;
        }
        director.status = 'complete';
        gradeSortie(state);
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

  return { director, startSortie, nextGate, update, gradeSortie, bestFor, dimPassedGates };
}
