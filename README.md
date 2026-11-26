# AETHER DRIFT — Deep-Space Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/meongs123/aether-drift/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/meongs123/aether-drift/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Entry for the [make.fun](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) bounty **"Make the best flight game"** (`best-flight-game-20261126-0057`).

Fly the **ISV Aetherwing** (AD-AW07) through the Veil Reach — a ringed gas
giant, an ocean world, a cratered moon, and the station Port Solenne — in a
fully procedural Three.js space flight game. Five sorties with different
goals: thread halo gates around Theros, deliver a data core to the station,
scoop plasma from a comet tail at 180–260 m/s and drop it slow at the survey
buoy, orbit the derelict SSV Marrow 245° around its flare, and dock on
the night side in eclipse. Chase and cockpit cameras, a dense hybrid HUD
(VEL/ALT/HDG tapes, attitude, gauges, NAV minimap), fuel and hull stakes,
a low-speed stall regime, per-gate accuracy scoring, graded dockings, and
scoring 0–100 with GOLD / SILVER / BRONZE medals.

## How to play

- **W/S** pitch (W = nose up) · **A/D** roll (D = bank right) · **Q/E** yaw · **Shift/Ctrl** throttle
- **F** aerobrake · **G** docking clamps · **B** retro-thrusters
- **C** camera (chase / cockpit) · **Space** action · **1–5** pick a sortie
- **Esc** pause · **R** restart · **M** mute · hold the left mouse button to steer with the mouse (dead zone around centre)
- Thread the glowing gates, mind your fuel, dock slow with clamps down for
  a GREASED grade. Slow down too much on low throttle and the ship stalls.
  Score is gate progress + per-gate accuracy + time, minus damage and fuel
  used, plus scoop / orbit / docking bonuses. Crash or run the hull to zero
  and the sortie scores 0.

## Play it

Serve `game/` with any static server and open `game/index.html` in a desktop browser (no network needed):

```
node serve.ts
# then open http://localhost:8080
```

Screenshots are deterministic staged renders of the game itself:
`?shot=cover|cockpit|asteroid|docking&seed=1`.

## Tech

Three.js vendored locally (`game/vendor/three.module.min.js`), 100%
procedural — no model, texture, or audio files. Textures are runtime
canvas gradients, audio is WebAudio synthesis, the world is seeded so
every `?shot=` preset reproduces the same frame. Fixed timestep 1/90 s,
pixel-ratio cap 1.5, no shadow maps, no post-processing, zero network
requests.
