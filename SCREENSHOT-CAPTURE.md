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

## Committed files (fix pass 2, 27 Nov 2026)

| file | preset | bytes | sha256 |
|---|---|---|---|
| `1-cover.jpg` | cover | 150,792 | `83da08f36bbc420b33834fb98975d9c5ba04e23ec4b6616319d4a4eebe70827d` |
| `2-cockpit.jpg` | cockpit | 135,572 | `c7fbe6ee657028f0794dc18e0068860d7f43cc8f2b6f73b7cc50d25dadf92324` |
| `3-asteroid.jpg` | asteroid | 145,206 | `0effa0e31dd0b53d90ef8791123b51c371598f14fb7088f3cdad211c996437e2` |
| `4-docking.jpg` | docking | 141,433 | `cc693ef60a0fe87353ed06a3c683744cdebfabb9914a74958f3d1b1742c21023` |

Re-captured with `qa/fix2-capture-shots.py` (identical logic to `qa/capture-shots.py`,
different /tmp dir); each preset captured twice, byte-identical across runs.
Cover + asteroid are byte-identical to fix pass 1 (their code paths untouched);
cockpit + docking changed (cockpit geometry/staging, docking banner) as intended.
0 console errors on all runs.

All four are 1280×720 and under the 256 KiB limit. The builder's original
capture command / JPEG quality was never recorded (QA could not reproduce
the pre-fix bytes); quality 85 is the fix-pass-1 standard from here on.

## Notes

- Staged scores are honest: cover/asteroid/cockpit show SCORE 46 — two
  gates threaded at ~23 each, the live per-gate value measured in the
  harness. The docking shot shows the real completion SCORE 87 GOLD.
- The cover gate is staged ×3 (54 m ring) and the cockpit gate ×2 (36 m)
  so the ring reads large in frame; the cockpit ship also flies a ~10°
  descending approach (aim 55 m below the final gate) so the ring sits
  above the panel with its lower arc clear of it. The crossing test
  still uses the real 18 m GATE_RADIUS.
- `qa/` (capture + playtest scripts, PNG probes) is NOT committed.
