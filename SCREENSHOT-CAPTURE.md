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

## Committed files (screenshot round 3, 27 Nov 2026 — staging-only re-shoot)

| file | preset | bytes | sha256 |
|---|---|---|---|
| `1-cover.jpg` | cover | 152,583 | `fd923a3c9c6be42f249bcff5d10ef6323d5df92278e99c209b21396927f6d266` |
| `2-cockpit.jpg` | cockpit | 132,575 | `cc793afa657b2d0bb49d2a3da079563ef44a2a21c19491a38a6f77587a8d5341` |
| `3-asteroid.jpg` | asteroid | 147,013 | `643a7ccd7c65d75ad791a45b9b9aad7e4801c99d05c223d7e2055e2feae73ccf` |
| `4-docking.jpg` | docking | 141,879 | `74c13cc34db50b73747b751ba2684d10d1be257dfa41efff132e31c83acd70fb` |

Captured with `qa/capture-shots.py` (same procedure as fix pass 2);
each preset captured twice, byte-identical across runs, 0 console
errors. All four are 1280×720 and under the 256 KiB limit. Dossier
2× byte-identical (node22 main.ts to two out dirs):
sha256 `3b8b64a6db60834901cf7b213df5980e59141d3a9c24bb138b2723e8600a8ae7`.
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
