// camera.js — one job: the two real cameras. Chase (behind/up, lerped,
// FOV 54°) and cockpit (seat-eye, FOV 66°), toggled with C. The camera
// never fights the pilot: chase rolls slightly with the ship, cockpit is
// fixed to the seat and inherits ship orientation exactly.
import * as THREE from '../vendor/three.module.min.js';
import { forwardVector } from './flight.js';
import { lerp } from './random.js';

export function createFlightCamera(THREE, shipGroup, cockpitGroup) {
  const chase = new THREE.PerspectiveCamera(54, 16 / 9, 0.1, 12000);
  const cockpit = new THREE.PerspectiveCamera(66, 16 / 9, 0.1, 12000);
  let mode = 'chase';
  const chasePos = new THREE.Vector3();
  const chaseLook = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function update(state, dt) {
    const fwd = forwardVector(state);
    if (mode === 'chase') {
      // 20 m behind, 7 m up — the ship sits large, lower-centre, in frame.
      tmp.copy(state.position).addScaledVector(fwd, -20);
      tmp.y += 7;
      chasePos.lerp(tmp, 1 - Math.pow(0.0001, dt));
      chase.position.copy(chasePos);
      chaseLook.copy(state.position).addScaledVector(fwd, 60);
      chaseLook.y -= 5; // ship rides higher in frame, clear of the HUD cluster
      chase.lookAt(chaseLook);
      chase.up.set(0, 1, 0);
      chase.rotateZ(-state.roll * 0.18);
      cockpitGroup.visible = false;
      return chase;
    }
    // Cockpit: eye at the seat — behind the panel, ahead of the canopy rear
    // rim, high enough to see over the nose. Never inside the canopy bubble.
    const eye = tmp.copy(state.position).addScaledVector(fwd, -1.3);
    eye.y += 1.15;
    cockpit.position.copy(eye);
    const look = new THREE.Vector3().copy(state.position).addScaledVector(fwd, 80);
    cockpit.up.set(0, 1, 0);
    cockpit.lookAt(look);
    cockpit.rotateZ(-state.roll * 0.9);
    cockpitGroup.visible = true;
    return cockpit;
  }

  function toggle() {
    mode = mode === 'chase' ? 'cockpit' : 'chase';
    return mode;
  }
  // Snap the chase camera to its ideal framing instantly (staged shots).
  function snap(state) {
    const fwd = forwardVector(state);
    chasePos.copy(state.position).addScaledVector(fwd, -20);
    chasePos.y += 7;
    chase.position.copy(chasePos);
    return mode;
  }
  function setMode(m) { mode = m; return mode; }
  function getMode() { return mode; }

  return { chase, cockpit, update, toggle, snap, setMode, getMode };
}
