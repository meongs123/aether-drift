// hud.js — one job: the hybrid HUD. DOM overlay (objective card, systems
// bars, NAV minimap, footer hints) + full-screen 2D canvas instruments
// (VEL/ALT/HDG tapes, attitude, V/S, DIST-TO-OBJECTIVE, 4 gauges chase /
// 5 gauges cockpit, status strip). Every value is a direct read of ship
// state — never static decoration. Density matches the reference bar.
import * as THREE from '../vendor/three.module.min.js';
import { MISSIONS, SCORE, SHIP_NAME, SHIP_CALLSIGN, GAME_TITLE } from './config.js';

const FONT = 'monospace';

function fmt(n, d = 0) { return Number(n).toFixed(d); }

export function createHud(THREE) {
  const instruments = document.getElementById('instruments');
  const ictx = instruments.getContext('2d');
  const minimap = document.getElementById('minimap');
  const mctx = minimap.getContext('2d');
  const el = (id) => document.getElementById(id);

  function resize(w, h) {
    instruments.width = w; instruments.height = h;
    minimap.width = 190; minimap.height = 190;
  }

  function drawTape(ctx, x, y, w, h, value, unit, label, color, ticks) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,10,18,0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(120,200,255,0.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.fillStyle = color; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 18);
    const centre = y + h / 2;
    const step = ticks.step, rangeN = ticks.range;
    for (let v = Math.floor((value - rangeN) / step) * step; v <= value + rangeN; v += step) {
      if (v < 0) continue;
      const dy = centre - (v - value) * (h / (rangeN * 2)) * (ticks.scale ?? 1);
      if (dy < y + 24 || dy > y + h - 8) continue;
      const major = Math.abs(v % (step * 5)) < 0.01;
      ctx.strokeStyle = major ? 'rgba(200,230,255,0.9)' : 'rgba(140,180,220,0.5)';
      ctx.beginPath(); ctx.moveTo(x + w - (major ? 16 : 9), dy); ctx.lineTo(x + w, dy); ctx.stroke();
      if (major) {
        ctx.fillStyle = '#dfeeff'; ctx.font = `12px ${FONT}`; ctx.textAlign = 'right';
        ctx.fillText(String(Math.round(v)), x + w - 20, dy + 4);
      }
    }
    // Centre value box — large, labelled, high contrast.
    ctx.fillStyle = 'rgba(10,24,40,0.95)';
    ctx.fillRect(x - 6, centre - 24, w + 12, 48);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x - 6, centre - 24, w + 12, 48);
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 26px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(fmt(value, ticks.decimals ?? 0), x + w / 2, centre + 9);
    ctx.fillStyle = color; ctx.font = `bold 11px ${FONT}`;
    ctx.fillText(unit, x + w / 2, centre + 22);
    ctx.restore();
  }

  function drawGauge(ctx, cx, cy, r, value, max, label, color, unit) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,10,18,0.78)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, r - 8, a0, a1); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, r - 8, a0, a0 + (a1 - a0) * Math.max(0, Math.min(1, value / max))); ctx.stroke();
    const na = a0 + (a1 - a0) * Math.max(0, Math.min(1, value / max));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * (r - 16), cy + Math.sin(na) * (r - 16)); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `bold 19px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(fmt(value, 0), cx, cy + 6);
    ctx.fillStyle = color; ctx.font = `bold 12px ${FONT}`;
    ctx.fillText(label, cx, cy + r + 16);
    ctx.fillStyle = 'rgba(200,220,255,0.75)'; ctx.font = `10px ${FONT}`;
    ctx.fillText(unit, cx, cy + r + 28);
    ctx.restore();
  }

  function drawAttitude(ctx, cx, cy, r, pitch, roll) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(-roll);
    const py = pitch * r * 1.1;
    ctx.fillStyle = '#1b4a7a'; ctx.fillRect(-r, -r + py, r * 2, r); // sky
    ctx.fillStyle = '#3a2c18'; ctx.fillRect(-r, py, r * 2, r);     // ground
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r, py); ctx.lineTo(r, py); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `11px ${FONT}`; ctx.textAlign = 'center';
    for (const p of [-30, -15, 15, 30]) {
      const yy = py - (p / 30) * r * 0.55;
      ctx.fillRect(-26, yy, 52, 1.5);
      ctx.fillText(String(p), 38, yy + 4);
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.moveTo(cx - 16, cy); ctx.lineTo(cx + 16, cy); ctx.lineTo(cx, cy + 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawInstruments(w, h, state, director, cameraMode, gateScreen, gateDist, therosAlt) {
    const ctx = ictx;
    ctx.clearRect(0, 0, w, h);
    const headingDeg = ((-(state.heading) * 180 / Math.PI) % 360 + 360) % 360;
    const mission = MISSIONS[director.missionIndex];

    // VEL tape (left), ALT tape (right), HDG tape (top centre).
    drawTape(ctx, 14, h * 0.30, 86, h * 0.44, state.speed, 'm/s', 'VEL', '#39e6ff', { step: 20, range: 120, decimals: 0 });
    drawTape(ctx, w - 100, h * 0.30, 86, h * 0.44, therosAlt, 'km', 'ALT', '#7cfc9a', { step: 10, range: 60, decimals: 1 });
    // HDG tape — horizontal strip across the top.
    ctx.save();
    ctx.fillStyle = 'rgba(4,10,18,0.72)';
    ctx.fillRect(w / 2 - 190, 12, 380, 46);
    ctx.strokeStyle = 'rgba(120,200,255,0.45)'; ctx.strokeRect(w / 2 - 190.5, 12.5, 380, 46);
    ctx.fillStyle = '#ffd166'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText('HDG', w / 2 - 182, 28);
    ctx.textAlign = 'center';
    for (let d = Math.floor((headingDeg - 60) / 10) * 10; d <= headingDeg + 60; d += 10) {
      const dd = ((d % 360) + 360) % 360;
      const dx = w / 2 + (dd - headingDeg) * 2.6;
      if (dx < w / 2 - 185 || dx > w / 2 + 185) continue;
      const major = dd % 30 === 0;
      ctx.strokeStyle = major ? '#fff' : 'rgba(160,200,240,0.5)';
      ctx.beginPath(); ctx.moveTo(dx, 34); ctx.lineTo(dx, major ? 46 : 41); ctx.stroke();
      if (major) {
        ctx.fillStyle = '#dfeeff'; ctx.font = `12px ${FONT}`;
        const label = dd === 0 ? 'N' : dd === 90 ? 'E' : dd === 180 ? 'S' : dd === 270 ? 'W' : String(dd);
        ctx.fillText(label, dx, 56);
      }
    }
    ctx.fillStyle = '#fff'; ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`${String(Math.round(headingDeg)).padStart(3, '0')}°`, w / 2, 28);
    ctx.restore();

    // Attitude indicator, bottom centre-left; V/S + DIST readout beside it.
    drawAttitude(ctx, w * 0.5 - 300, h - 118, 52, state.pitch, state.roll);
    ctx.save();
    ctx.fillStyle = 'rgba(4,10,18,0.78)';
    ctx.fillRect(w * 0.5 - 230, h - 158, 180, 84);
    ctx.strokeStyle = 'rgba(120,200,255,0.45)'; ctx.strokeRect(w * 0.5 - 230.5, h - 158.5, 180, 84);
    ctx.textAlign = 'left'; ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = '#39e6ff'; ctx.fillText('V/S', w * 0.5 - 218, h - 132);
    ctx.fillStyle = '#fff'; ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`${state.verticalSpeed >= 0 ? '+' : ''}${fmt(state.verticalSpeed, 1)} m/s`, w * 0.5 - 218, h - 106);
    ctx.fillStyle = '#ffd166'; ctx.font = `bold 13px ${FONT}`;
    ctx.fillText('DIST TO OBJECTIVE', w * 0.5 - 218, h - 88);
    ctx.fillStyle = '#fff'; ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(state.docked ? 'DOCKED' : gateDist == null ? '—' : `${fmt(gateDist, 0)} m`, w * 0.5 - 218, h - 66);
    ctx.restore();

    // Gauges — 4 chase, 5 cockpit (extra HDG dial in the cockpit).
    const gauges = [
      { v: state.speed, max: 420, label: 'VEL', color: '#39e6ff', unit: 'm/s' },
      { v: state.throttle * 100, max: 100, label: 'THR', color: '#ffd166', unit: '%' },
      { v: state.fuel, max: 100, label: 'FUEL', color: '#ff9f43', unit: '%' },
      { v: state.hull, max: 100, label: 'HULL', color: state.hull < 35 ? '#ff5d73' : '#7cfc9a', unit: '%' },
    ];
    if (cameraMode === 'cockpit') {
      gauges.push({ v: headingDeg, max: 360, label: 'HDG', color: '#c792ff', unit: 'deg' });
    }
    const gw = 84, gap = 10;
    const totalW = gauges.length * gw + (gauges.length - 1) * gap;
    // Gauges live right of the V/S box, clear of the minimap (bottom-right).
    let gx = cameraMode === 'cockpit' ? w / 2 - 40 : w / 2 + 20;
    if (gx + totalW > w - 222) gx = w - 222 - totalW;
    gauges.forEach((g, i) => drawGauge(ctx, gx + i * (gw + gap) + gw / 2, h - 118, 38, g.v, g.max, g.label, g.color, g.unit));

    // Next-gate marker projected on screen.
    if (gateScreen && gateDist != null && director.status === 'flying') {
      const sx = (gateScreen.x * 0.5 + 0.5) * w;
      const sy = (0.5 - gateScreen.y * 0.5) * h;
      if (sx > 90 && sx < w - 90 && sy > 70 && sy < h - 180) {
        ctx.save();
        ctx.strokeStyle = '#39e6ff'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 18); ctx.lineTo(sx + 18, sy); ctx.lineTo(sx, sy + 18); ctx.lineTo(sx - 18, sy); ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#39e6ff'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold 15px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText(`GATE ${director.gateIndex + 1}/${director.gates.length}  ·  ${fmt(gateDist, 0)} m`, sx, sy - 26);
        ctx.restore();
      }
    }

    // Status strip (bottom, full width).
    ctx.save();
    ctx.fillStyle = 'rgba(4,10,18,0.8)';
    ctx.fillRect(0, h - 30, w, 30);
    ctx.fillStyle = '#cfe6ff'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left';
    const strip = `FUEL ${fmt(state.fuel, 1)}%   THR ${Math.round(state.throttle * 100)}%   CLAMPS ${state.clamps ? 'DOWN' : 'UP'}   G ${fmt(state.gLoad, 2)}   CAM ${cameraMode.toUpperCase()}   ${SHIP_NAME} ${SHIP_CALLSIGN}   ${mission.name.toUpperCase()}   SCORE ${state.score}`;
    ctx.fillText(strip, 14, h - 10);
    ctx.restore();
  }

  function drawMinimap(state, director) {
    const ctx = mctx;
    const W = 190, H = 190;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(4,10,18,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,200,255,0.45)'; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    // (Title lives in the HTML label under the canvas — not drawn here.)
    // World -> map: x/z in [-2600, 2600] -> [8, 182].
    const map = (x, z) => [95 + (x / 2600) * 86, 95 + (z / 2600) * 86];
    // Theros.
    const [tx, ty] = map(-650, -2300);
    ctx.fillStyle = 'rgba(220,180,110,0.9)';
    ctx.beginPath(); ctx.arc(tx, ty, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,180,110,0.6)';
    ctx.beginPath(); ctx.ellipse(tx, ty, 22, 6, -0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#dfeeff'; ctx.font = `10px ${FONT}`;
    ctx.fillText('THEROS', tx + 14, ty + 3);
    // Station.
    const [sx, sy] = map(220, -900);
    ctx.fillStyle = '#7cfc9a'; ctx.fillRect(sx - 3, sy - 3, 6, 6);
    ctx.fillText('SOLENNE', sx + 6, sy + 3);
    // Gates.
    director.gates.forEach((g, i) => {
      const [gx, gy] = map(g.position.x, g.position.z);
      ctx.strokeStyle = i < director.gateIndex ? '#7cfc9a' : '#39e6ff';
      ctx.lineWidth = i === director.gateIndex ? 2.5 : 1.5;
      ctx.beginPath(); ctx.arc(gx, gy, i === director.gateIndex ? 6 : 4, 0, Math.PI * 2); ctx.stroke();
    });
    // Ship arrow (rotated by heading).
    const [px, py] = map(state.position.x, state.position.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-state.heading);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function updateDom(state, director, cameraMode) {
    const mission = MISSIONS[director.missionIndex];
    const best = director.best ? director.best(director.missionIndex) : null;
    el('obj-mission').textContent = `${mission.name} — ${mission.place}`;
    el('obj-gate').textContent = director.status === 'complete'
      ? `COMPLETE · SCORE ${director.score} · ${director.medal}`
      : `GATE ${Math.min(director.gateIndex + 1, director.gates.length)}/${director.gates.length}`;
    el('obj-text').textContent = mission.objective;
    el('obj-score').textContent = `SCORE ${state.score}   BEST ${best ? `${best.score} ${best.medal}` : '—'}`;
    const setBar = (id, v) => {
      const b = el(id);
      b.style.width = `${Math.max(0, Math.min(100, v))}%`;
      b.style.background = v < 25 ? '#ff5d73' : v < 55 ? '#ffb347' : '#7cfc9a';
    };
    setBar('bar-hull', state.hull);
    setBar('bar-fuel', state.fuel);
    setBar('bar-thr', state.throttle * 100);
    el('val-hull').textContent = `${fmt(state.hull, 0)}%`;
    el('val-fuel').textContent = `${fmt(state.fuel, 1)}%`;
    el('val-thr').textContent = `${Math.round(state.throttle * 100)}%`;
    el('sys-status').textContent = state.crashed
      ? `CRASHED — ${state.crashReason}`
      : state.docked
        ? `DOCKED · ${state.dockGrade}`
        : `CAM ${cameraMode.toUpperCase()} · G ${fmt(state.gLoad, 2)} · ${SHIP_CALLSIGN}`;
    const banner = el('banner');
    if (director.status === 'complete') {
      banner.style.display = 'block';
      el('banner-title').textContent = `SORTIE COMPLETE — ${mission.name}`;
      el('banner-sub').textContent = `SCORE ${director.score} · ${director.medal} MEDAL${director.dockGrade ? ` · DOCKING ${director.dockGrade}` : ''} · Press R to fly again, 1–5 for another sortie`;
      banner.className = 'banner complete';
    } else if (state.crashed) {
      banner.style.display = 'block';
      el('banner-title').textContent = 'SHIP LOST';
      el('banner-sub').textContent = `${state.crashReason} — Press R to fly again`;
      banner.className = 'banner crashed';
    } else if (director.status === 'briefing') {
      banner.style.display = 'block';
      el('banner-title').textContent = `${GAME_TITLE}`;
      el('banner-sub').textContent = `${mission.name}: ${mission.objective} — Click to fly, 1–5 to pick a sortie, C camera, Esc pause`;
      banner.className = 'banner briefing';
    } else {
      banner.style.display = 'none';
    }
  }

  return { resize, drawInstruments, drawMinimap, updateDom };
}
