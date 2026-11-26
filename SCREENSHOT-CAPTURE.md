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

## Committed files (fix pass 1, 27 Nov 2026)

| file | preset | bytes | sha256 |
|---|---|---|---|
| `1-cover.jpg` | cover | 150,792 | `83da08f36bbc420b33834fb98975d9c5ba04e23ec4b6616319d4a4eebe70827d` |
| `2-cockpit.jpg` | cockpit | 130,700 | `f44e4f425cc2a4905860564ebc749ea084ff7f9ff13fbe83c7edbe009b08f5f9` |
| `3-asteroid.jpg` | asteroid | 145,206 | `0effa0e31dd0b53d90ef8791123b51c371598f14fb7088f3cdad211c996437e2` |
| `4-docking.jpg` | docking | 142,849 | `535e2d4be1c2387227d356586ab3cb71e88003d57fb75cf872e8af9056c4ba14` |

All four are 1280×720 and under the 256 KiB limit. The builder's original
capture command / JPEG quality was never recorded (QA could not reproduce
the pre-fix bytes); quality 85 is the fix-pass-1 standard from here on.

## Notes

- Staged scores are honest: cover/asteroid/cockpit show SCORE 46 — two
  gates threaded at ~23 each, the live per-gate value measured in the
  harness. The docking shot shows the real completion SCORE 87 GOLD.
- The cover and cockpit gates are staged ×3 (54 m ring) so the ring reads
  large in frame; the crossing test still uses the real 18 m GATE_RADIUS.
- `qa/` (capture + playtest scripts, PNG probes) is NOT committed.
