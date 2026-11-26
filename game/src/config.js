// AETHER DRIFT — Deep-Space Courier
// config.js — one job: shared constants, sun direction, palettes, mission defs.
// Sun direction is THE light direction for the whole game: ship, planets,
// asteroids and station are all lit from this one vector.
import * as THREE from '../vendor/three.module.min.js';

export const SUN_DIR = new THREE.Vector3(-0.55, 0.42, -0.72).normalize();
export const SUN_COLOR = 0xfff2d8;
export const AMBIENT_COLOR = 0x33415e;
export const SPACE_BG = 0x04060d;

export const SHIP_NAME = 'ISV Aetherwing';
export const SHIP_CALLSIGN = 'AD-AW07';
export const GAME_TITLE = 'AETHER DRIFT — Deep-Space Courier';

// Palette per mission: day-side (warm sun) vs eclipse (cool night-side).
export const PALETTES = {
  day: { sun: 2.6, ambient: 0.85, nebula: 0.9, fog: null },
  eclipse: { sun: 0.9, ambient: 0.55, nebula: 1.0, fog: null },
};

export const MISSIONS = [
  {
    id: 'halo-ring-run', name: 'Halo Ring Run', place: 'Theros',
    objective: 'Thread all 8 halo gates around Theros',
    gates: 8, night: false, throttleHint: 'Full throttle between gates',
  },
  {
    id: 'starpost-run', name: 'Starpost Run', place: 'Port Solenne',
    objective: 'Deliver the data core — dock at Port Solenne',
    gates: 4, night: false, throttleHint: 'Slow to 40 m/s for the ring',
  },
  {
    id: 'comet-scoop', name: 'Comet Scoop', place: 'Veyla',
    objective: 'Scoop plasma from the comet tail, drop at the buoy',
    gates: 6, night: false, throttleHint: 'Hold 180–260 m/s in the tail',
  },
  {
    id: 'distress-orbit', name: 'Distress Orbit', place: 'SSV Marrow',
    objective: 'Orbit the derelict SSV Marrow and hold the flare',
    gates: 5, night: false, throttleHint: 'Bank steady — watch the rocks',
  },
  {
    id: 'eclipse-docking', name: 'Eclipse Docking', place: 'Port Solenne',
    objective: 'Night-side approach — dock on the lit ring',
    gates: 3, night: true, throttleHint: 'Cockpit view recommended (C)',
  },
];

export const SCORE = { GOLD: 83, SILVER: 68 };
export const FIXED_DT = 1 / 90;
export const MAX_SPEED = 420; // m/s at 100% throttle
export const FUEL_CAPACITY = 100; // percent
