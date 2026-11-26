// input.js — one job: keyboard + mouse bindings. W/S pitch, A/D roll, Q/E
// yaw, Shift/Ctrl throttle, F aerobrake, G docking clamps, B retro-thrusters,
// C camera, Space action, Esc pause, R restart, M mute. Mouse steers only
// while the left button is held, with a dead zone around centre — a resting
// cursor must never bank the ship. W = nose up, D = bank right (the
// reference convention; FIX PASS 1 un-inverted both).
export function bindPilotInput(callbacks) {
  const input = {
    pitch: 0, roll: 0, yaw: 0,
    mousePitch: 0, mouseRoll: 0,
    throttleUp: false, throttleDown: false,
    aerobrake: false, clamps: false, retro: false,
    paused: false, muted: false,
  };
  const keys = new Set();
  let mouseHeld = false;
  const KEYMAP = {
    KeyW: 'pitchUp', KeyS: 'pitchDown',
    KeyA: 'rollLeft', KeyD: 'rollRight',
    KeyQ: 'yawLeft', KeyE: 'yawRight',
    ShiftLeft: 'throttleUp', ShiftRight: 'throttleUp',
    ControlLeft: 'throttleDown', ControlRight: 'throttleDown',
    KeyF: 'aerobrake', KeyG: 'clamps', KeyB: 'retro',
  };
  function recompute() {
    // W = pitch up (+1), S = pitch down: positive pitch input raises the
    // nose (forwardVector y > 0). D = roll right (+1), A = roll left.
    input.pitch = (keys.has('pitchUp') ? 1 : 0) - (keys.has('pitchDown') ? 1 : 0);
    input.roll = (keys.has('rollRight') ? 1 : 0) - (keys.has('rollLeft') ? 1 : 0);
    input.yaw = (keys.has('yawRight') ? 1 : 0) - (keys.has('yawLeft') ? 1 : 0);
    input.throttleUp = keys.has('throttleUp');
    input.throttleDown = keys.has('throttleDown');
    input.aerobrake = keys.has('aerobrake');
    input.clamps = keys.has('clamps');
    input.retro = keys.has('retro');
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC') { callbacks.onCamera?.(); return; }
    if (e.code === 'Escape') { input.paused = !input.paused; callbacks.onPause?.(input.paused); return; }
    if (e.code === 'KeyR') { callbacks.onRestart?.(); return; }
    if (e.code === 'KeyM') { input.muted = !input.muted; callbacks.onMute?.(input.muted); return; }
    if (e.code === 'Space') { e.preventDefault(); callbacks.onAction?.(); return; }
    if (e.code === 'Digit1') { callbacks.onMission?.(0); return; }
    if (e.code === 'Digit2') { callbacks.onMission?.(1); return; }
    if (e.code === 'Digit3') { callbacks.onMission?.(2); return; }
    if (e.code === 'Digit4') { callbacks.onMission?.(3); return; }
    if (e.code === 'Digit5') { callbacks.onMission?.(4); return; }
    const action = KEYMAP[e.code];
    if (action) { keys.add(action); recompute(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) { keys.delete(action); recompute(); }
  });
  window.addEventListener('mousemove', (e) => {
    if (!mouseHeld) { input.mouseRoll = 0; input.mousePitch = 0; return; }
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    // Dead zone around centre, then gentle steer: mouse up = nose up
    // (ny < 0 -> positive pitch), mouse right = bank right.
    const dz = 0.08;
    const ax = Math.abs(nx) < dz ? 0 : nx;
    const ay = Math.abs(ny) < dz ? 0 : ny;
    input.mouseRoll = ax * 0.55;
    input.mousePitch = -ay * 0.4;
  });
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouseHeld = true; callbacks.onAction?.(); }
  });
  window.addEventListener('mouseup', () => {
    mouseHeld = false; input.mouseRoll = 0; input.mousePitch = 0;
  });
  window.addEventListener('blur', () => {
    keys.clear(); recompute(); mouseHeld = false; input.mouseRoll = 0; input.mousePitch = 0;
  });
  return input;
}
