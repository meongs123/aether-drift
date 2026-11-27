// shots.js — one job: deterministic staged screenshots. ?shot= presets +
// fixed seed reproduce the exact same frame: mission, ship state, camera
// and lighting are set exactly, the sim settles for a fixed number of
// fixed steps, then freezes. Values on screen cross-check against the
// preset below — the same discipline as the reference's staged shots.
// FIX PASS 1: the cover gate is staged ~218 m ahead and scaled ×3 (54 m
// ring, ~370 px) instead of a 517 m / 18 m ring that read as a ~50 px
// diamond; the cockpit ship sits ~207 m from the docking ring; the
// docking ship sits ~81 m from the ring instead of ~199 m.
import * as THREE from '../vendor/three.module.min.js';

function aimAt(state, target) {
  const dx = target.x - state.position.x;
  const dy = target.y - state.position.y;
  const dz = target.z - state.position.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  state.heading = Math.atan2(-dx, -dz);
  state.pitch = Math.asin(Math.max(-1, Math.min(1, dy / len)));
}

function setState(state, o) {
  Object.assign(state, o);
  state.throttle = o.speed / 420; // throttle holds the staged speed steady
}

// Scale a staged gate's ring so it reads LARGE in frame (the crossing test
// still uses the 18 m GATE_RADIUS — staging only changes the visual).
function stageGateLarge(gate, factor, glowSize) {
  const ring = gate.children.find((c) => c.name === 'gateRing');
  if (ring) {
    ring.scale.setScalar(factor);
    ring.material.emissiveIntensity = 2.4;
  }
  const glow = gate.children.find((c) => c.name === 'gateGlow');
  if (glow) glow.scale.set(glowSize, glowSize, 1);
}

// Preset table — the numbers here ARE the numbers the screenshot must show.
export const SHOT_PRESETS = {
  cover: {
    mission: 0, camera: 'chase', settleSteps: 45,
    note: 'Chase, GATE 3/8, VEL 312, FUEL 78.4, DIST ~218 m, SCORE 46 (2 gates x ~23 live), hero gate 54 m ring ~218 m ahead, Theros day side upper frame, Keth in frame left',
    apply(game) {
      const { state, director } = game;
      director.startSortie(0);
      director.director.gateIndex = 2; // two gates already threaded
      director.dimPassedGates();
      state.gatesPassed = 2;
      // Staged live score: two gates threaded at ~23 each (the live
      // per-gate value from the harness) — the shot must show a SCORE,
      // not 0, the same as real flight does after gate 1.
      director.director.score = 46;
      state.score = 46;
      setState(state, {
        position: new THREE.Vector3(0, 10, 0),
        speed: 312, fuel: 78.4, hull: 100, roll: 0.18, throttleChanges: 3,
      });
      // Stage the next gate close ahead, CENTRED, and scaled ×3 so the 3D
      // ring itself dominates the frame (~370 px) — not a HUD diamond.
      const gate = director.director.gates[2];
      gate.position.set(-105, 55, -185);
      gate.lookAt(state.position);
      stageGateLarge(gate, 3, 130);
      aimAt(state, gate.position);
      game.camera.setMode('chase');
      game.camera.snap(state);
    },
  },
  cockpit: {
    mission: 4, camera: 'cockpit', settleSteps: 45,
    note: 'Cockpit, Eclipse Docking, VEL 96, FUEL 64.2, DIST ~225 m, SCORE 46 (2 gates x ~23 live), 5 gauges, docking ring x2 ~215 m ahead, staged high in frame (aim 55 m below the gate) so its lower arc clears the raised 3D panel + glareshield — projection-checked in qa/fix2-projection.mjs',
    apply(game) {
      const { state, director } = game;
      director.startSortie(4);
      director.director.gateIndex = 2; // final gate: the docking ring
      director.dimPassedGates();
      state.gatesPassed = 2;
      director.director.score = 46;
      state.score = 46;
      // FIX PASS 2: ring staged x2 (was x3) and aimed 55 m below the gate
      // centre. A x3 ring at dead-centre put its lower arc behind the
      // raised 3D panel / glareshield and an asteroid overlapped its
      // upper-right; with the aim offset the ring reads large (~185 px)
      // in the upper frame with its full circle clear (lower arc ~308,
      // panel top ~326, shield band ~333-343, GATE label ~192) and no
      // asteroid overlaps the disc (qa/fix2-projection.mjs, exact seeded
      // belt). The crossing test still uses the real 18 m GATE_RADIUS.
      stageGateLarge(director.director.gates[2], 2, 100);
      setState(state, {
        position: new THREE.Vector3(140, 45, -650),
        speed: 96, fuel: 64.2, hull: 100, roll: -0.06,
      });
      // Aim 55 m BELOW the real final gate (220,60,-860) so the ring sits
      // high in frame instead of dead-centre behind the panel — the ship
      // flies a ~10 deg descending approach to the ring, V/S ~-17 m/s.
      const aimPoint = director.director.gates[2].position.clone();
      aimPoint.y -= 55;
      aimAt(state, aimPoint);
      game.camera.setMode('cockpit');
      game.camera.snap(state);
      game.applyPalette('eclipse');
    },
  },
  asteroid: {
    mission: 0, camera: 'chase', settleSteps: 45,
    note: 'Chase, banking 28 deg, VEL 388, FUEL 71.8, DIST ~335 m, SCORE 46 (2 gates x ~23 live), gate ahead between rocks (ring ×2)',
    apply(game) {
      const { state, director, THREE: T } = game;
      director.startSortie(0);
      director.director.gateIndex = 2;
      director.dimPassedGates();
      state.gatesPassed = 2;
      director.director.score = 46;
      state.score = 46;
      setState(state, {
        position: new THREE.Vector3(0, 20, -820),
        speed: 388, fuel: 71.8, hull: 100, roll: 0.5,
      });
      // Stage the next gate into the hero rock field, flanked by two big rocks.
      const gate = director.director.gates[2];
      gate.position.set(30, 60, -1150);
      gate.lookAt(state.position);
      stageGateLarge(gate, 2, 100);
      aimAt(state, gate.position);
      for (const [x, y, z, s] of [[-38, 52, -1120, 24], [88, 40, -1185, 30]]) {
        const rock = new T.Mesh(
          new T.DodecahedronGeometry(1, 0),
          new T.MeshStandardMaterial({ color: 0x9d8f7c, roughness: 1, flatShading: true }),
        );
        rock.scale.setScalar(s);
        rock.position.set(x, y, z);
        rock.rotation.set(0.7, 1.2, 0.4);
        rock.name = 'stagedRock';
        game.scene.add(rock);
      }
      game.camera.setMode('chase');
      game.camera.snap(state);
    },
  },
  docking: {
    mission: 1, camera: 'chase', settleSteps: 30,
    note: 'Score moment, Starpost Run COMPLETE, SCORE 87 GOLD, GREASED dock, ship ~81 m from the ring',
    apply(game) {
      const { state, director } = game;
      director.startSortie(1);
      director.director.gateIndex = 4;
      state.gatesPassed = 4;
      setState(state, {
        position: new THREE.Vector3(200, 60, -760),
        speed: 0, fuel: 71.6, hull: 100, roll: 0, pitch: 0,
      });
      state.docked = true;
      state.dockGrade = 'GREASED';
      aimAt(state, new THREE.Vector3(246, 60, -827)); // docking ring ahead
      // Score moment: hide the mission gate rings so only the station's own
      // docking ring reads — no double-ring confusion.
      director.director.gates.forEach((g) => { g.visible = false; });
      director.director.status = 'complete';
      director.director.score = 87;
      director.director.medal = 'GOLD';
      director.director.dockGrade = 'GREASED';
      state.score = 87;
      game.camera.setMode('chase');
      game.camera.snap(state);
    },
  },
};

export function applyShotPreset(name, game) {
  const preset = SHOT_PRESETS[name];
  if (!preset) return null;
  preset.apply(game);
  return preset;
}
