// flight.js — one job: the arcade-lite flight model. Throttle discipline,
// pitch/roll/yaw response at every speed, fuel burn, damage from G-load,
// asteroid scrapes and hard dockings, graded dockings, crash conditions.
// Fuel and damage turn a sortie into decisions, not a joyride.
import * as THREE from '../vendor/three.module.min.js';
import { MAX_SPEED, FUEL_CAPACITY } from './config.js';
import { clamp, lerp } from './random.js';

export function createFlightState() {
  return {
    position: new THREE.Vector3(0, 0, 0),
    heading: 0, pitch: 0, roll: 0, // radians; heading 0 = -Z
    speed: 0, throttle: 0.62,
    fuel: 100, hull: 100, damage: 0,
    gLoad: 1, verticalSpeed: 0, stalled: false,
    crashed: false, crashReason: '',
    docked: false, dockGrade: '',
    clamps: false, aerobrake: false, retro: false,
    time: 0, distanceFlown: 0, gatesPassed: 0, score: 0,
    throttleChanges: 0, hardEvents: 0,
  };
}

export function forwardVector(state) {
  const e = new THREE.Euler(state.pitch, state.heading, state.roll, 'YXZ');
  const v = new THREE.Vector3(0, 0, -1);
  return v.applyEuler(e);
}

export function stepFlight(state, input, dt, world) {
  if (state.crashed || state.docked) return state;
  state.time += dt;

  // Throttle: Shift up, Ctrl down; F aerobrake trims speed, B retro brakes.
  const prevThrottle = state.throttle;
  if (input.throttleUp) state.throttle = clamp(state.throttle + dt * 0.5, 0, 1);
  if (input.throttleDown) state.throttle = clamp(state.throttle - dt * 0.6, 0, 1);
  if (Math.abs(state.throttle - prevThrottle) > 0.001) state.throttleChanges++;
  state.aerobrake = !!input.aerobrake;
  state.retro = !!input.retro;
  state.clamps = !!input.clamps;

  const targetSpeed = MAX_SPEED * state.throttle
    * (state.aerobrake ? 0.55 : 1)
    * (state.retro ? 0.25 : 1);
  const accel = state.retro ? 140 : 55;
  state.speed = Math.abs(state.speed - targetSpeed) < accel * dt
    ? targetSpeed
    : state.speed + Math.sign(targetSpeed - state.speed) * accel * dt;

  // Controls: authority ramps with speed, cut by damage. STALL (FIX PASS 1):
  // below 60 m/s on low throttle the ship wallows — authority ×0.35 and the
  // nose drops until throttle comes back up. Slow flight is a decision now,
  // not a free hover.
  const stalled = state.speed < 60 && state.throttle < 0.4;
  state.stalled = stalled;
  const authority = clamp(0.35 + (state.speed / MAX_SPEED) * 0.85, 0.3, 1.2)
    * (1 - state.damage * 0.004)
    * (stalled ? 0.35 : 1);
  // FIX PASS 1: roll rate 1.5 -> 2.4, pitch rate 0.9 -> 1.1. At 1.5 the
  // bank took ~2 s to reverse, so after every course change the ship
  // overshot its heading by ~0.6 rad and settled into a stable ~190 m
  // orbit around the next gate, never crossing the 18 m ring — the Halo
  // sortie was unflyable even for a perfect autopilot. The ship still
  // banks and turns; it just answers the stick promptly now.
  const pitchRate = (input.pitch + input.mousePitch) * 1.1 * authority;
  const rollRate = (input.roll + input.mouseRoll) * 2.4 * authority;
  const yawRate = input.yaw * 0.45 * authority;
  state.pitch = clamp(state.pitch + pitchRate * dt, -1.1, 1.1);
  if (stalled) state.pitch += (-0.12 - state.pitch) * dt * 0.3; // nose drops
  state.roll = clamp(state.roll + rollRate * dt, -1.35, 1.35);
  // Coordinated turn: roll bleeds into heading; pitch damps back to level.
  // FIX PASS 1: turn coefficient 0.55 -> 0.8. At 0.55 the turn radius at
  // cruise (~370 m at 311 m/s) was wider than the Halo legs could use — the
  // ship could not line up an 18 m ring 750 m ahead after a 45° course
  // change, and the Distress circle (180 m legs) was unflyable at any
  // speed. At 0.8 the radius at cruise is ~250 m and the model still
  // feels weighty; the turn stays bank-driven, not a yaw cheat.
  state.heading += -state.roll * 0.8 * dt * (0.4 + state.speed / MAX_SPEED);
  state.heading += yawRate * dt;
  state.pitch = lerp(state.pitch, state.pitch * 0.995, dt);
  // FIX PASS 1: roll self-levels at 1.5/s, not 0.25/s. At 0.25 the wings
  // took ~4 s to level after the stick was released, so after every course
  // change the ship kept turning for seconds and settled into a stable
  // ~200 m orbit around the next gate instead of flying through the 18 m
  // ring — the Halo sortie was unthreadable. A held bank still reaches
  // full roll (roll rate beats the decay); releasing the stick now levels
  // the wings in under a second, as an arcade pilot expects.
  state.roll = lerp(state.roll, 0, dt * 1.5);

  const fwd = forwardVector(state);
  state.position.addScaledVector(fwd, state.speed * dt);
  state.verticalSpeed = fwd.y * state.speed;
  state.distanceFlown += state.speed * dt;

  // G-load from turn rate + pitch rate; hard G damages the hull.
  // 3.35 g is the standard structural limit for this airframe class — a
  // physical limit, not a borrowed constant.
  const turnG = Math.abs(state.roll) * 1.6 + Math.abs(pitchRate) * 0.7 + 1;
  state.gLoad = lerp(state.gLoad, turnG, dt * 4);
  if (state.gLoad > 3.35) {
    state.damage += (state.gLoad - 3.35) * dt * 6;
    state.hardEvents++;
  }

  // Fuel burn grows with throttle^1.37 — full throttle is a decision.
  // FIX PASS 1: burn ×2.5 (was ~0.77%/s at 74% throttle, ~25% per sortie —
  // fuel could never bind). A Halo Ring Run at cruise now costs ~55–70%
  // of the tank, so fuel is a real decision and GOLD is not automatic.
  // FIX PASS 2: eased 25 -> 21 (~16% lighter; full-throttle empty ~42 s,
  // was ~35 s). The Comet/Distress failures were controller limit-cycles,
  // not fuel — but the extra margin lets a circling learner recover
  // instead of running dry mid-sortie. Sloppy-vs-clean separation is
  // untouched: it lives in the accuracy term, and the fuel term moves
  // scores <1 pt.
  const burn = (0.004 + 0.11 * Math.pow(state.throttle, 1.37)) * dt;
  state.fuel = Math.max(0, state.fuel - burn * 21);
  if (state.fuel <= 0 && state.speed > 5) {
    state.throttle = Math.max(0, state.throttle - dt * 0.5);
  }

  // Asteroid scrape: proximity check against the rock list.
  if (world && world.rocks) {
    for (const rock of world.rocks) {
      const d = state.position.distanceTo(rock.pos);
      if (d < rock.radius + 4.5) {
        if (state.speed > 120) {
          state.damage += (state.speed / MAX_SPEED) * 14 * dt * 10;
          state.hull = Math.max(0, 100 - state.damage);
          state.hardEvents++;
        }
      }
    }
  }

  // Planet collision: Theros surface is a hard deck.
  if (world && world.theros) {
    const d = state.position.distanceTo(world.theros.position);
    if (d < 520 + 6) {
      state.crashed = true; state.crashReason = 'Impact with Theros — hull breached on the gas giant';
    }
  }
  if (state.hull <= 0) {
    state.crashed = true; state.crashReason = 'Hull integrity lost — ISV Aetherwing destroyed';
  }
  return state;
}

export function gradeDocking(state) {
  // Docking grade: slow + aligned + clamps down = GREASED; fast = HARD.
  const speed = state.speed;
  const align = Math.abs(state.roll) + Math.abs(state.pitch);
  if (speed <= 45 && align < 0.25 && state.clamps) return 'GREASED';
  if (speed <= 90 && align < 0.5) return 'HARD';
  return 'ROUGH';
}

export function applyDockingDamage(state, grade) {
  if (grade === 'HARD') state.damage += 8;
  if (grade === 'ROUGH') state.damage += 22;
  state.hull = Math.max(0, 100 - state.damage);
  if (state.hull <= 0) {
    state.crashed = true; state.crashReason = 'Docking impact — hull breached at the ring';
  }
}
