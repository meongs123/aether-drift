# Screenshot capture record — AETHER DRIFT

The 4 committed JPEGs in `screenshots/` are deterministic staged renders.
Re-capture them with exactly this procedure; a second run must produce
byte-identical files (same sha256).

## Command

```bash
# 1. Serve the entry (its own serve.ts — no other server):
node serve.ts --port 8099

# 2. Capture (Playwright venv — system python3 has no playwright):
~/workspace/tools/playwright-venv/bin/python qa/capture-shots.py
```

`qa/capture-shots.py` loads each `?shot=<preset>&seed=1` in headless
Chromium 1255 (`/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`,
flags `--no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader`),
viewport **1280×720**, waits for `window.__AETHER_READY__ === true`,
settles 1500 ms, then `page.screenshot(type="jpeg", quality=85)`.
Each preset is captured **twice**; the script only writes to
`screenshots/` when the two runs are byte-identical.

## Committed files (visual upgrade pass 4 — F1 re-capture, 27 Nov 2026)

| file | preset | bytes | sha256 |
|---|---|---|---|
| `1-cover.jpg` | cover | 158,097 | `4e477561b8a4ea5a7d4b1183668bf99a6d86af5963c7b89bf7e5422a83c90fe1` |
| `2-cockpit.jpg` | cockpit | 138,381 | `2f3c4639cdf9739d06dc95967c8cf60eee6332b5fd60e5f73da02c3978fa5c87` |
| `3-asteroid.jpg` | asteroid | 154,526 | `5867d8edac41f744e275f27c6a625c9762db78475b54a137eafa15107a7a0d20` |
| `4-docking.jpg` | docking | 150,465 | `027ab191eb6f1d806124fc31d0b7f59e958dc5c264f0298fe8e8441be11d3968` |

Re-captured from HEAD 4ed326d9 (visual upgrade pass 4: bloom composer,
fog, ship rim light, chromatic aberration — NO code change in this
commit, screenshots only) with `qa/qa5-f1-capture.py` — the same
canonical procedure as `qa/capture-shots.py` (Playwright Chromium
1255, SwiftShader, 1280×720, `__AETHER_READY__`, settle 1500 ms,
JPEG q85), rebuilt to write intermediates to `qa/f1-capture/` in the
workspace instead of /tmp (tmpfs was wiped by the runtime); each
preset captured twice, byte-identical across runs, 0 console errors,
and every hash matches the values independently verified 2× by QA
pass 4 + Red Team pass 4 + the pass-4b restore check. All four are
1280×720 and under the 256 KiB limit. Dossier 2× byte-identical
(node22 v22.23.4 main.ts to two out dirs):
sha256 `a88983009778025a9c54be643ffc3a93739ae6c3fe61aa1de7de520467fc4006`
— identical to the dossier hash QA pass 4 computed from the same
screenshots. Grader sim (fresh clone, read-only, user nobody,
TZ=UTC, node22) 2× exit 0, same dossier hash.

Previous round (screenshot round 3, staging-only re-shoot) hashes,
now superseded: cover 152,583 B `fd923a3c…`, cockpit 132,575 B
`cc793afa…`, asteroid 147,013 B `643a7ccd…`, docking 141,879 B
`74c13cc3…`.
Contact sheet (judge style, cover 768×432 + 3 cells 256×144):
`qa/shot3-contact-sheet.png` — 4/4 cells read as a flight game.

## Notes

- Staged scores are honest: cover/asteroid/cockpit show SCORE 30 — two
  gates threaded, the live clean-run value. CORRECTION (27 Nov 2026,
  verifier blocker fix): the old claim "SCORE 46, two gates × ~23"
  was a miscalculation — the ~23 measured live after gate 1 already
  contains the time bonus (~15, one-off, decays — not per gate), so the
  marginal second gate is only ~+9. gradeSortie at 2/8 gates caps at
  34 absolute (progress 0.25: 15 + 3.75 + 15); the verifier's clean-run
  probe (fuel ~78, ~15 s/gate) lands at 30, so 30 is staged. The
  docking shot shows the real completion SCORE 87 GOLD.
- The cover gate is staged ×3.5 (63 m ring) and the cockpit gate ×2.5
  (45 m ring) so the ring reads large in frame; the cockpit ship flies
  a ~16° descending approach (aim 60 m below the staged gate) so the
  ring sits above the panel with its lower arc clear of it. The
  crossing test still uses the real 18 m GATE_RADIUS.
- Round 3 staging changes (27 Nov 2026, all in `game/src/shots.js`
  only — no game code touched): cockpit moved from Eclipse Docking
  (mission 4, night palette) to Halo Ring Run (mission 0, day palette)
  with the gate staged on the ship→Theros sightline, because the
  Eclipse staging put the gate 38 m in front of Port Solenne's own
  dock ring so TWO rings overlapped and the dock ring's arc crossed
  the GATE label, on top of the murky night palette; asteroid ring
  ×2→×3 with the staged rocks pushed to the frame edges; docking
  ship nudged to (215,68,-745) so Veyla sits fully in frame and the
  bottom-left rock is lit instead of a black slab (a closer
  (185,75,-780) variant was tried and REJECTED — a seeded rock slab
  covered the top-right corner); a Comet Scoop chase candidate with
  Veyla was tried and REJECTED — the comet itself never entered the
  frame and the left half was empty, so it beat none of the 4.
  Iteration captures went to /tmp only; `screenshots/` was written
  only by the final `qa/capture-shots.py` run.
- Ring sizes corrected to verifier-measured values (27 Nov 2026):
  cover ~400 px (was "~430 px"), asteroid ~229 px (was "~270 px"),
  cockpit ~253 px (was "~240 px"). The wins vs the old shots are
  unchanged — only the numbers were corrected.
- `qa/` (capture + playtest scripts, PNG probes) is NOT committed.
