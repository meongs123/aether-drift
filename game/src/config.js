// AETHER DRIFT — Deep-Space Courier
// config.js — one job: shared constants, sun direction, palettes, mission defs.
// Sun direction is THE light direction for the whole game: ship, planets,
// asteroids and station are all lit from this one vector.
// FIX PASS 1: SUN_DIR used to point ahead (-Z), which put every planet on
// its night side from the flight corridor (camera-facing hemisphere unlit).
// The sun now stands behind-left of the corridor (+Z): planets ahead show
// their day side (lit limb + bands + terminator) and the ship's rear, the
// station and the camera-facing rock faces are lit. SUN_GLARE_DIR keeps the
// visible glare sprite ahead-left in the sky as a distant backdrop element;
// it lights nothing — all 3D lighting still comes from SUN_DIR alone.
import * as THREE from '../vendor/three.module.min.js';

export const SUN_DIR = new THREE.Vector3(-0.62, 0.45, 0.55).normalize();
export const SUN_GLARE_DIR = new THREE.Vector3(-0.55, 0.42, -0.72).normalize();
export const SUN_COLOR = 0xfff2d8;
export const AMBIENT_COLOR = 0x33415e;
export const SPACE_BG = 0x04060d;

export const SHIP_NAME = 'ISV Aetherwing';
export const SHIP_CALLSIGN = 'AD-AW07';
export const GAME_TITLE = 'AETHER DRIFT — Deep-Space Courier';

// Palette per mission: day-side (warm sun) vs eclipse (cool night-side).
// PASS 4: fog holds the exponential depth density (FogExp2, colour
// SPACE_BG). Density is deliberately tiny — 0.00015 means a rock 1 km
// out is only ~2% fogged, while the far belt/station fade gently into
// the void. Eclipse runs a touch thinner (0.00012) so the night-side
// approach keeps its long sightlines. Planets + the Theros ring opt out
// (fog:false) because at 2.3–5.2 km even this density would grey them out.
export const PALETTES = {
  day: { sun: 2.6, ambient: 0.85, nebula: 0.9, fog: 0.00015 },
  eclipse: { sun: 0.9, ambient: 0.55, nebula: 1.0, fog: 0.00012 },
};

export const MISSIONS = [
  {
    id: 'halo-ring-run', name: 'Halo Ring Run', place: 'Theros',
    objective: 'Thread all 8 halo gates around Theros',
    gates: 8, night: false, throttleHint: 'Full throttle between gates',
    // FIX PASS 1: spawn sits ~350 m before gate 1 (was 2,017 m from origin —
    // an 8 s black transit before anything happened) AND on the circle
    // tangent, so the entry leg continues into the ring instead of forcing
    // a 143° reversal after gate 1. One spawn per mission.
    spawn: [256, 300, -2305],
  },
  {
    id: 'starpost-run', name: 'Starpost Run', place: 'Port Solenne',
    objective: 'Deliver the data core — dock at Port Solenne',
    gates: 4, night: false, throttleHint: 'Slow to 40 m/s for the ring',
    spawn: [0, 0, 0],
  },
  {
    id: 'comet-scoop', name: 'Comet Scoop', place: 'Veyla',
    objective: 'Scoop plasma in the tail at 180–260 m/s — drop slow at the buoy',
    gates: 6, night: false, throttleHint: 'Hold 180–260 m/s in the tail, slow to <140 at the buoy',
    // FIX PASS 1: tangent entry to the lengthened flyby (gate0 (500,-80,-1300)
    // minus the entry direction x 350 m).
    spawn: [343, -52, -989],
  },
  {
    id: 'distress-orbit', name: 'Distress Orbit', place: 'SSV Marrow',
    objective: 'Orbit the derelict SSV Marrow 245° around the flare',
    gates: 5, night: false, throttleHint: 'Bank steady — watch the rocks',
    // FIX PASS 1: tangent entry like Halo (was a 118° reversal after gate 1).
    // Recomputed for the 400 m orbit circle: gate0 (-300,180,-1250) minus
    // the gate4->gate0 chord direction x 350 m.
    spawn: [-506, 163, -1533],
  },
  {
    id: 'eclipse-docking', name: 'Eclipse Docking', place: 'Port Solenne',
    objective: 'Night-side approach — dock on the lit ring',
    gates: 3, night: true, throttleHint: 'Cockpit view recommended (C)',
    spawn: [60, 20, -220],
  },
];

export const SCORE = { GOLD: 83, SILVER: 68 };
export const FIXED_DT = 1 / 90;
export const MAX_SPEED = 420; // m/s at 100% throttle
export const FUEL_CAPACITY = 100; // percent
