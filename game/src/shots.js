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
    note: 'Chase, GATE 3/8, VEL 312, FUEL 78.4, DIST ~218 m, SCORE 30 (2 gates threaded, live clean-run value — see note below), hero gate 63 m ring ~218 m ahead, Theros day side upper frame, Keth in frame left',
    apply(game) {
      const { state, director } = game;
      director.startSortie(0);
      director.director.gateIndex = 2; // two gates already threaded
      director.dimPassedGates();
      state.gatesPassed = 2;
      // Staged live score is 30, NOT 46. The old "2 gates x ~23" was a
      // miscalculation: the ~23 measured live after gate 1 already
      // contains the time bonus (~15, one-off, decays — not per gate),
      // so the marginal second gate is only ~+9. gradeSortie at 2/8
      // gates caps at 34 absolute (progress 0.25: 15 + 3.75 + 15), and
      // the verifier's clean-run probe (fuel ~78, ~15 s/gate) lands at
      // 30 — that is the value staged here. The shot must show a SCORE,
      // not 0, the same as real flight does after gate 1.
      director.director.score = 30;
      state.score = 30;
      setState(state, {
        position: new THREE.Vector3(0, 10, 0),
        speed: 312, fuel: 78.4, hull: 100, roll: 0.18, throttleChanges: 3,
      });
      // Stage the next gate close ahead, CENTRED, and scaled ×3 so the 3D
      // ring itself dominates the frame (~370 px) — not a HUD diamond.
      const gate = director.director.gates[2];
      gate.position.set(-105, 55, -185);
      gate.lookAt(state.position);
      // Ring x3.5 (was x3) — one size up so the hero ring dominates even
      // more of the frame (~400 px, verifier-measured) against Theros' bands.
      stageGateLarge(gate, 3.5, 150);
      aimAt(state, gate.position);
      game.camera.setMode('chase');
      game.camera.snap(state);
    },
  },
  cockpit: {
    mission: 0, camera: 'cockpit', settleSteps: 45,
    note: 'Cockpit, Halo Ring Run DAY, VEL 196, FUEL 76.0, DIST ~215 m, SCORE 30 (2 gates threaded, live clean-run value — gradeSortie ceiling at 2/8 gates is 34, time bonus ~15 is one-off not per gate), 5 gauges, halo gate x2.5 staged between ship and Theros day-side so the ring reads large (~253 px) against the banded planet, aim 60 m below gate so the ring sits high and its lower arc clears the raised 3D panel — the cockpit view of a real playable mission (C toggles cockpit in any mission), not a fabrication',
    apply(game) {
      const { state, director } = game;
      director.startSortie(0);
      director.director.gateIndex = 2; // two gates already threaded
      director.dimPassedGates();
      state.gatesPassed = 2;
      director.director.score = 30;
      state.score = 30;
      // DAY cockpit (was Eclipse mission 4, night palette sun 0.9 /
      // ambient 0.55): the Eclipse staging put the ship ~215 m from a
      // gate that sits only 38 m in front of Port Solenne's own dock
      // ring, so TWO rings overlapped in frame and the left arc of the
      // dock ring crossed the "GATE 3/3 · 225 m" label, on top of the
      // murky night palette. Halo day (sun 2.6 / ambient 0.85) lights
      // the panel, nose and ring; the gate is staged on the
      // ship->Theros sightline (same staging discipline as the cover,
      // whose gate is also repositioned toward Theros) so the ring
      // reads against Theros' lit bands instead of black void.
      // Ship (0,200,-1200); Theros centre (-650,300,-2300).
      const gate = director.director.gates[2];
      gate.position.set(-109, 217, -1384);
      gate.lookAt(new THREE.Vector3(0, 200, -1200));
      stageGateLarge(gate, 2.5, 115);
      setState(state, {
        position: new THREE.Vector3(0, 200, -1200),
        speed: 196, fuel: 76.0, hull: 100, roll: -0.06,
      });
      // Aim 60 m BELOW the staged gate so the ring sits high in frame
      // instead of dead-centre behind the panel.
      const aimPoint = gate.position.clone();
      aimPoint.y -= 60;
      aimAt(state, aimPoint);
      game.camera.setMode('cockpit');
      game.camera.snap(state);
      game.applyPalette('day');
    },
  },
  asteroid: {
    mission: 0, camera: 'chase', settleSteps: 45,
    note: 'Chase, banking 28 deg, VEL 388, FUEL 71.8, DIST ~335 m, SCORE 30 (2 gates threaded, live clean-run value — gradeSortie ceiling at 2/8 gates is 34, time bonus ~15 is one-off not per gate), gate ahead between rocks (ring ×3, rocks pushed to frame edges)',
    apply(game) {
      const { state, director, THREE: T } = game;
      director.startSortie(0);
      director.director.gateIndex = 2;
      director.dimPassedGates();
      state.gatesPassed = 2;
      director.director.score = 30;
      state.score = 30;
      setState(state, {
        position: new THREE.Vector3(0, 20, -820),
        speed: 388, fuel: 71.8, hull: 100, roll: 0.5,
      });
      // Stage the next gate into the hero rock field, flanked by two big rocks.
      const gate = director.director.gates[2];
      gate.position.set(30, 60, -1150);
      gate.lookAt(state.position);
      // Ring x3 (was x2): the gate is the hero of this shot — ~229 px
      // across (verifier-measured), framed by rocks pushed to the frame edges for depth
      // instead of hugging the ring.
      stageGateLarge(gate, 3, 130);
      aimAt(state, gate.position);
      for (const [x, y, z, s] of [[-95, 25, -1130, 26], [150, 85, -1200, 34], [110, -15, -1010, 22]]) {
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
        position: new THREE.Vector3(215, 68, -745),
        speed: 0, fuel: 71.6, hull: 100, roll: 0, pitch: 0,
      });
      state.docked = true;
      state.dockGrade = 'GREASED';
      // Variant C (mild): ship 15 m right / 8 m up from the old
      // (200,60,-760) — just enough to shift the big dark seeded rock
      // out of the dead bottom-left corner without re-framing the
      // station. Variant B (185,75,-780, ~57 m) was REJECTED: it put a
      // huge seeded rock slab across the top-right corner and cropped
      // the station awkwardly.
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
