// textures.js — one job: runtime canvas textures. No image files anywhere:
// every texture in the game is painted at load from a <canvas> gradient.
// Soft radial glow (star glare, engine glow, gate glow, nebula puff).
export function makeGlowTexture(THREE, inner, outer) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}

// Gas-giant banding for Theros: cream / rust / teal horizontal bands + storms.
export function makeBandTexture(THREE, rng) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const bands = [
    ['#e8d9b0', 0.0], ['#c98f5a', 0.08], ['#e8d9b0', 0.16], ['#a8623c', 0.24],
    ['#e3c98f', 0.33], ['#7fb3a8', 0.42], ['#d9b878', 0.50], ['#b06a42', 0.58],
    ['#ecd9a8', 0.66], ['#8a4a2e', 0.74], ['#d9c08a', 0.82], ['#c98f5a', 0.90],
    ['#e8d9b0', 1.0],
  ];
  for (let i = 0; i < bands.length - 1; i++) {
    const y0 = bands[i][1] * 512, y1 = bands[i + 1][1] * 512;
    const grad = g.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, bands[i][0]); grad.addColorStop(1, bands[i + 1][0]);
    g.fillStyle = grad; g.fillRect(0, y0, 1024, y1 - y0);
  }
  // Turbulent streaks + one storm oval.
  for (let i = 0; i < 260; i++) {
    const y = rng() * 512, x = rng() * 1024, len = 20 + rng() * 120;
    g.fillStyle = `rgba(${rng() > 0.5 ? '255,240,200' : '120,60,30'},${0.05 + rng() * 0.12})`;
    g.fillRect(x, y, len, 1 + rng() * 3);
  }
  g.fillStyle = 'rgba(190,90,50,0.55)';
  g.beginPath(); g.ellipse(700, 330, 70, 26, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(240,210,160,0.5)';
  g.beginPath(); g.ellipse(700, 330, 44, 14, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Ocean world: deep blue seas, teal shallows, cloud swirls, ice caps.
export function makeOceanTexture(THREE, rng) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#dfe9f2'); grad.addColorStop(0.14, '#2f7fc4');
  grad.addColorStop(0.5, '#14558f'); grad.addColorStop(0.86, '#2f7fc4');
  grad.addColorStop(1, '#dfe9f2');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 9; i++) { // teal shallow reefs / island chains
    const x = rng() * 1024, y = 90 + rng() * 330;
    g.fillStyle = 'rgba(64,190,170,0.5)';
    g.beginPath(); g.ellipse(x, y, 30 + rng() * 90, 8 + rng() * 18, rng() * 3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 90; i++) { // cloud swirls
    const x = rng() * 1024, y = rng() * 512;
    g.fillStyle = `rgba(255,255,255,${0.08 + rng() * 0.22})`;
    g.beginPath(); g.ellipse(x, y, 20 + rng() * 70, 4 + rng() * 10, rng() * 3, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Cratered moon: grey regolith + craters.
export function makeMoonTexture(THREE, rng) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8d8d94'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2400; i++) {
    g.fillStyle = `rgba(${rng() > 0.5 ? '200,200,205' : '70,70,78'},${0.05 + rng() * 0.2})`;
    g.fillRect(rng() * 512, rng() * 256, 1 + rng() * 2, 1 + rng() * 2);
  }
  for (let i = 0; i < 46; i++) {
    const x = rng() * 512, y = rng() * 256, r = 3 + rng() * 16;
    g.strokeStyle = 'rgba(60,60,68,0.55)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(210,210,215,0.28)';
    g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Ship livery: gunmetal panels, teal cheatline, "AD-AW07" markings, panel lines.
export function makeLiveryTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#c8ccd4'); grad.addColorStop(0.5, '#9aa1ad'); grad.addColorStop(1, '#6e7683');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#0e7f86'; g.fillRect(0, 108, 512, 14); // teal cheatline
  g.fillStyle = '#e8b13c'; g.fillRect(0, 124, 512, 4);  // amber pinstripe
  g.strokeStyle = 'rgba(40,44,52,0.6)'; g.lineWidth = 1;
  for (let x = 32; x < 512; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  for (let y = 24; y < 256; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.fillStyle = '#1c2430'; g.font = 'bold 44px monospace'; g.textAlign = 'center';
  g.fillText('AD-AW07', 256, 84);
  g.font = 'bold 20px monospace'; g.fillText('AETHERWING', 256, 176);
  g.fillStyle = '#c33'; g.beginPath(); g.arc(470, 40, 14, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Ring-gate band: glowing chevron ring texture for the torus.
export function makeGateTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#06121a'; g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#39e6ff';
  for (let x = 0; x < 256; x += 32) {
    g.beginPath(); g.moveTo(x + 6, 4); g.lineTo(x + 20, 16); g.lineTo(x + 6, 28); g.lineTo(x + 14, 16); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.repeat.x = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Cockpit panel face: dark panel, backlit gauge faces, labels, warning lights.
export function makePanelTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0e14'; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = 'rgba(120,200,255,0.25)'; g.lineWidth = 2;
  g.strokeRect(6, 6, 1012, 244);
  const gauge = (cx, cy, r, label, color) => {
    g.fillStyle = '#101623'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = color; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r - 3, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
    for (let a = 0; a <= 10; a++) {
      const t = (Math.PI * 0.75) + (a / 10) * Math.PI * 1.5;
      g.beginPath();
      g.moveTo(cx + Math.cos(t) * (r - 10), cy + Math.sin(t) * (r - 10));
      g.lineTo(cx + Math.cos(t) * (r - 18), cy + Math.sin(t) * (r - 18));
      g.stroke();
    }
    const na = Math.PI * 0.75 + 0.62 * Math.PI * 1.5;
    g.strokeStyle = color; g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(na) * (r - 20), cy + Math.sin(na) * (r - 20)); g.stroke();
    g.fillStyle = color; g.font = 'bold 17px monospace'; g.textAlign = 'center';
    g.fillText(label, cx, cy + r + 24);
  };
  gauge(110, 108, 62, 'VEL', '#39e6ff');
  gauge(300, 108, 62, 'ALT', '#7CFC9A');
  gauge(490, 108, 62, 'HDG', '#ffd166');
  gauge(680, 108, 62, 'FUEL', '#ff9f43');
  gauge(870, 108, 62, 'HULL', '#ff5d73');
  g.fillStyle = '#39e6ff'; g.font = 'bold 22px monospace'; g.textAlign = 'left';
  g.fillText('ISV AETHERWING  ·  AD-AW07', 30, 34);
  g.fillStyle = '#ff5d73'; g.fillText('● MASTER CAUTION', 700, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Nebula puff: soft coloured cloud sprite.
export function makeNebulaTexture(THREE, rng, hue) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 60 + rng() * 136, y = 60 + rng() * 136, r = 22 + rng() * 58;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `hsla(${hue + rng() * 40 - 20}, 75%, 62%, ${0.10 + rng() * 0.14})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // Fade the texture edges to fully transparent so a sprite never shows a
  // hard square boundary against the sky.
  g.globalCompositeOperation = 'destination-in';
  const edge = g.createRadialGradient(128, 128, 60, 128, 128, 128);
  edge.addColorStop(0, 'rgba(0,0,0,1)');
  edge.addColorStop(0.7, 'rgba(0,0,0,0.85)');
  edge.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = edge; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'source-over';
  return new THREE.CanvasTexture(c);
}
