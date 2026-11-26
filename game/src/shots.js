// shots.js — one job: deterministic staged screenshots. ?shot= presets +
// fixed seed reproduce the exact same frame: mission, ship state, camera
// and lighting are set exactly, the sim settles for a fixed number of
// fixed steps, then freezes. Values on screen cross-check against the
// preset below — the same discipline as the reference's staged shots.
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

// Preset table — the numbers here ARE the numbers the screenshot must show.
export const SHOT_PRESETS = {
  cover: {
    mission: 0, camera: 'chase', settleSteps: 45,
    note: 'Chase, GATE 3/8, VEL 312, FUEL 78.4, gate staged ~500 m ahead, Theros limb upper frame',
    apply(game) {
      const { state, director } = game;
      director.beginSortie(0);
      director.director.gateIndex = 2; // two gates already threaded
      director.dimPassedGates();
      state.gatesPassed = 2;
      setState(state, {
        position: new THREE.Vector3(0, 10, 0),
        speed: 312, fuel: 78.4, hull: 100, roll: 0.18, throttleChanges: 3,
      });
      // Stage the next gate close ahead so the ring reads large in frame.
      const gate = director.director.gates[2];
      gate.position.set(-260, 130, -430);
      gate.lookAt(state.position);
      aimAt(state, gate.position);
      game.camera.setMode('chase');
      game.camera.snap(state);
    },
  },
  cockpit: {
    mission: 4, camera: 'cockpit', settleSteps: 45,
    note: 'Cockpit, Eclipse Docking, VEL 96, FUEL 64.2, DIST ~413 m, 5 gauges',
    apply(game) {
      const { state, director } = game;
      director.beginSortie(4);
      director.director.gateIndex = 2; // final gate: the docking ring
      director.dimPassedGates();
      state.gatesPassed = 2;
      setState(state, {
        position: new THREE.Vector3(60, 30, -480),
        speed: 96, fuel: 64.2, hull: 100, roll: -0.06,
      });
      aimAt(state, new THREE.Vector3(246, 60, -827)); // docking ring ahead
      game.camera.setMode('cockpit');
      game.camera.snap(state);
      game.applyPalette('eclipse');
    },
  },
  asteroid: {
    mission: 0, camera: 'chase', settleSteps: 45,
    note: 'Chase, banking 28 deg, VEL 388, FUEL 71.8, gate ahead between rocks',
    apply(game) {
      const { state, director, THREE: T } = game;
      director.beginSortie(0);
      director.director.gateIndex = 2;
      director.dimPassedGates();
      state.gatesPassed = 2;
      setState(state, {
        position: new THREE.Vector3(0, 20, -820),
        speed: 388, fuel: 71.8, hull: 100, roll: 0.5,
      });
      // Stage the next gate into the hero rock field, flanked by two big rocks.
      const gate = director.director.gates[2];
      gate.position.set(30, 60, -1150);
      gate.lookAt(state.position);
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
    note: 'Score moment, Starpost Run COMPLETE, SCORE 87 GOLD, GREASED dock',
    apply(game) {
      const { state, director } = game;
      director.beginSortie(1);
      director.director.gateIndex = 4;
      state.gatesPassed = 4;
      setState(state, {
        position: new THREE.Vector3(180, 70, -640),
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
