// main.js — one job: wire everything together. Renderer + lights, world,
// ship, flight model, cameras, input, missions, HUD, audio, effects,
// fixed-timestep loop (1/90 s), deterministic ?shot= presets, and the
// ready flag the screenshot harness waits on.
import * as THREE from '../vendor/three.module.min.js';
import { SUN_DIR, SUN_COLOR, AMBIENT_COLOR, SPACE_BG, MISSIONS, FIXED_DT, PALETTES, GAME_TITLE } from './config.js';
import { mulberry32 } from './random.js';
import { createStarfield } from './starfield.js';
import { createNebula } from './nebula.js';
import { createTheros, createVeyla, createKeth } from './planets.js';
import { createPortSolenne, createDerelict, createComet } from './station.js';
import { createAsteroidBelt } from './asteroids.js';
import { buildShipModel } from './ship.js';
import { createFlightState, stepFlight, forwardVector } from './flight.js';
import { createFlightCamera } from './camera.js';
import { bindPilotInput } from './input.js';
import { createMissionDirector } from './missions.js';
import { createHud } from './hud.js';
import { buildFlightAudio } from './audio.js';
import { createThrusterParticles, createSpeedStreaks } from './effects.js';
import { applyShotPreset } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;
const rng = mulberry32(seed);

window.addEventListener('error', (e) => { window.__AETHER_ERROR__ = String(e.message || e.error); });

// ---- Renderer (pixel-ratio cap 1.5, no shadow maps, no post-processing) ----
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(SPACE_BG);

// ---- Lights: ONE directional sun + one hemisphere + a dim cool fill from
// behind the camera so the ship's rear and the camera-facing rock faces
// never go black. Same sun direction everywhere.
const sun = new THREE.DirectionalLight(SUN_COLOR, 2.6);
sun.position.copy(SUN_DIR).multiplyScalar(800);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8fb4ff, 0.55);
fill.position.set(480, 200, 680);
scene.add(fill);
const hemi = new THREE.HemisphereLight(0x33415e, 0x1c2636, 1.15);
scene.add(hemi);

function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.day;
  sun.intensity = p.sun;
  hemi.intensity = p.ambient;
}

// ---- World (seeded — same seed, same world) ----
createStarfield(scene, rng);
createNebula(scene, rng);
const theros = createTheros(THREE, rng); scene.add(theros);
const veyla = createVeyla(THREE, rng); scene.add(veyla);
const keth = createKeth(THREE, rng); scene.add(keth);
const station = createPortSolenne(THREE); scene.add(station);
const marrow = createDerelict(THREE, rng); scene.add(marrow);
const comet = createComet(THREE, rng); scene.add(comet);
const belt = createAsteroidBelt(THREE, rng); scene.add(belt);
const world = { rocks: belt.userData.rocks, theros };

// ---- Ship ----
const ship = buildShipModel(THREE);
scene.add(ship.group);

// ---- State, missions, cameras, input, HUD, audio, effects ----
const state = createFlightState();
const mission = createMissionDirector(THREE, scene);
const camera = createFlightCamera(THREE, ship.group, ship.cockpit);
const hud = createHud(THREE);
const audio = buildFlightAudio();
const thrusters = createThrusterParticles(THREE, scene);
const streaks = createSpeedStreaks(THREE, scene, 160, rng);

const game = { THREE, scene, state, director: mission, camera, ship, world, applyPalette };
mission.director.best = mission.bestFor;
mission.beginSortie(0);
mission.director.status = 'briefing';

const input = bindPilotInput({
  onCamera: () => { camera.toggle(); },
  onPause: (paused) => { /* loop reads input.paused */ },
  onRestart: () => restart(),
  onMute: (muted) => { audio.setMuted(muted); },
  onAction: () => {
    audio.start();
    if (mission.director.status === 'briefing') mission.director.status = 'flying';
    else if (mission.director.status === 'complete' || state.crashed) restart();
  },
  onMission: (i) => {
    restart();
    mission.beginSortie(i);
    mission.director.status = 'flying';
    applyPalette(MISSIONS[i].night ? 'eclipse' : 'day');
  },
});

function restart() {
  const keepMission = mission.director.missionIndex;
  Object.assign(state, createFlightState());
  state.position.set(0, 0, 0);
  mission.beginSortie(keepMission);
  mission.director.status = 'flying';
  applyPalette(MISSIONS[keepMission].night ? 'eclipse' : 'day');
  camera.setMode('chase');
  camera.snap(state);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.chase.aspect = window.innerWidth / window.innerHeight;
  camera.chase.updateProjectionMatrix();
  camera.cockpit.aspect = window.innerWidth / window.innerHeight;
  camera.cockpit.updateProjectionMatrix();
  hud.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

// ---- Deterministic staged shots ----
let staged = false;
if (shotName) {
  const preset = applyShotPreset(shotName, game);
  if (preset) {
    // Settle the sim for a fixed number of fixed steps, then freeze.
    const zeroInput = { pitch: 0, roll: 0, yaw: 0, mousePitch: 0, mouseRoll: 0, throttleUp: false, throttleDown: false, aerobrake: false, clamps: false, retro: false };
    const prevPos = state.position.clone();
    for (let i = 0; i < preset.settleSteps; i++) {
      const pp = state.position.clone();
      stepFlight(state, zeroInput, FIXED_DT, world);
      mission.update(state, pp);
    }
    // Restore the exact staged values (settle must not drift the HUD numbers).
    preset.apply(game);
    staged = true;
    mission.director.status = shotName === 'docking' ? 'complete' : 'flying';
    document.getElementById('banner').style.display = shotName === 'docking' ? 'block' : 'none';
  }
}

// ---- Fixed-timestep loop ----
let last = performance.now();
let acc = 0;
const prevPos = new THREE.Vector3();
const gateScreen = new THREE.Vector3();
let frames = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (input.paused) { renderFrame(); return; }
  acc += dt;
  let steps = 0;
  while (acc >= FIXED_DT && steps < 5) {
    if (!staged && mission.director.status === 'flying' && !state.crashed && !state.docked) {
      prevPos.copy(state.position);
      stepFlight(state, input, FIXED_DT, world);
      const beforeGates = mission.director.gateIndex;
      mission.update(state, prevPos);
      if (mission.director.gateIndex !== beforeGates) audio.blip(880, 0.15, 'sine', 0.22);
      if (mission.director.status === 'complete') audio.blip(1320, 0.4, 'sine', 0.25);
    }
    acc -= FIXED_DT;
    steps++;
  }
  if (acc > FIXED_DT * 5) acc = 0;

  // Ship transform follows state.
  ship.group.position.copy(state.position);
  ship.group.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
  // Engine glow breathes with throttle; thruster particles at speed.
  const glowScale = 2.2 + state.throttle * 2.2;
  for (const g of ship.engines) g.scale.set(glowScale, glowScale, 1);
  ship.engineLight.intensity = 6 + state.throttle * 14;
  if (!staged && state.speed > 60 && mission.director.status === 'flying') {
    const fwd = forwardVector(state);
    const tail = new THREE.Vector3().copy(state.position).addScaledVector(fwd, 5.2);
    thrusters.emit(tail, fwd, 1.2, state.speed);
  }
  const fwd = forwardVector(state);
  // Staged shots freeze the effects clock (dt 0, fixed timestamp) so the
  // same preset + seed reproduces byte-identical frames.
  const effDt = staged ? 0 : dt;
  const effNow = staged ? 1000 : now;
  thrusters.update(effDt, state.position, fwd, state.speed);
  streaks.update(effDt, state.position, fwd, state.speed);
  // Derelict flare pulse + comet drift.
  marrow.userData.flare.material.opacity = 0.55 + 0.4 * Math.sin(effNow * 0.004);
  if (!staged) comet.position.x += Math.sin(now * 0.00005) * 0.01;

  renderFrame();
  frames++;
  if (frames === 10 && !window.__AETHER_READY__) {
    window.__AETHER_READY__ = true;
  }
}

function renderFrame() {
  if (staged) camera.snap(state); // frozen chase framing, exact every run
  const cam = camera.update(state, 1 / 60);
  // Next-gate screen projection for the HUD marker.
  const gate = mission.nextGate();
  let gateDist = null;
  if (gate && mission.director.status === 'flying') {
    gateDist = state.position.distanceTo(gate.position);
    gateScreen.copy(gate.position).project(cam);
  } else {
    gateScreen.set(0, 0, 2);
  }
  const therosAlt = Math.max(0, (state.position.distanceTo(theros.position) - 520) * 0.1);
  hud.drawInstruments(window.innerWidth, window.innerHeight, state, mission.director, camera.getMode(), gateScreen, gateDist, therosAlt);
  hud.drawMinimap(state, mission.director);
  hud.updateDom(state, mission.director, camera.getMode());
  audio.update(state.throttle, state.speed);
  renderer.render(scene, cam);
}

document.title = GAME_TITLE;
window.__AETHER_SCENE__ = scene; // debug hook: lets a probe hide groups
requestAnimationFrame(frame);
