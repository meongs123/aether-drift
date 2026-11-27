// A working best-game-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. A starting point, not a winner: Block Dodger, a
// plain 2D canvas game where a paddle dodges falling blocks and catches coins, with a title screen,
// score, lives and levels, game over and restart, flat colours and no sound. Build your own game
// (any genre, any library you vendor under game/, or none), put your 3 or 4 PNG or JPEG screenshots
// in screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// --- Authored verification block (fix pass 3, 27 Nov 2026) ---
// Read-only post-write check, written for AETHER DRIFT: after the dossier is
// written, confirm (a) it parses and carries the expected keys (schema, cover,
// images, text), (b) every listed screenshot exists in the output directory and
// its sha256 matches both the dossier entry and the same-named file in this
// repo's screenshots/, and (c) the embedded base64 bytes hash to the same
// sha256. This block only reads files; it never writes, copies, or modifies
// anything in the output directory, so the dossier it verifies is byte-identical
// to the one buildDossier just wrote. Any mismatch prints to stderr and exits 1.
const dossierPath = join(out, 'dossier.json');
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
const fail = (message) => {
  console.error(`main.ts verification failed: ${message}`);
  process.exit(1);
};
if (dossier.schema !== 'makefun/dossier/v1') fail(`unexpected dossier schema: ${String(dossier.schema)}`);
if (typeof dossier.cover !== 'number' || dossier.cover < 0) fail(`unexpected dossier cover: ${String(dossier.cover)}`);
if (!Array.isArray(dossier.images) || dossier.images.length === 0) fail('dossier lists no screenshots');
if (typeof dossier.text !== 'string' || dossier.text.length === 0) fail('dossier has no text');
if (dossier.cover >= dossier.images.length) fail(`dossier cover index ${dossier.cover} is out of range for ${dossier.images.length} screenshots`);
const sha256Of = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const image of dossier.images) {
  if (typeof image.name !== 'string' || typeof image.sha256 !== 'string' || typeof image.base64 !== 'string') {
    fail(`dossier image entry is missing name, sha256, or base64: ${JSON.stringify(image).slice(0, 120)}`);
  }
  const copied = join(out, 'screenshots', image.name);
  const source = join(here, 'screenshots', image.name);
  if (!existsSync(copied)) fail(`screenshot listed in dossier.json is missing from the output: ${image.name}`);
  if (!existsSync(source)) fail(`screenshot listed in dossier.json is missing from the repo: ${image.name}`);
  const copiedHash = sha256Of(readFileSync(copied));
  const sourceHash = sha256Of(readFileSync(source));
  if (copiedHash !== image.sha256) fail(`screenshot ${image.name}: output sha256 ${copiedHash} does not match dossier sha256 ${image.sha256}`);
  if (sourceHash !== image.sha256) fail(`screenshot ${image.name}: repo sha256 ${sourceHash} does not match dossier sha256 ${image.sha256}`);
  const embeddedHash = sha256Of(Buffer.from(image.base64, 'base64'));
  if (embeddedHash !== image.sha256) fail(`screenshot ${image.name}: embedded base64 sha256 ${embeddedHash} does not match dossier sha256 ${image.sha256}`);
}
