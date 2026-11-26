// audio.js — one job: 100% WebAudio synthesis. Engine oscillators tracking
// throttle, filtered noise for the solar wind, beeps/blips for gates and
// docking. No audio files, no music. Mute with M.
export function buildFlightAudio() {
  let ctx = null, engineOsc = null, engineOsc2 = null, engineGain = null;
  let windSrc = null, windGain = null, windFilter = null;
  let muted = false, started = false;

  function start() {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return; }
    started = true;
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
    engineOsc2 = ctx.createOscillator(); engineOsc2.type = 'square';
    engineGain = ctx.createGain(); engineGain.gain.value = 0.0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    engineOsc.connect(lp); engineOsc2.connect(lp);
    lp.connect(engineGain); engineGain.connect(ctx.destination);
    engineOsc.frequency.value = 52; engineOsc2.frequency.value = 104;
    engineOsc.start(); engineOsc2.start();
    // Solar wind: looped seeded noise through a bandpass.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 1337;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 1073741823.5 - 1) * 0.5;
    }
    windSrc = ctx.createBufferSource(); windSrc.buffer = buf; windSrc.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 900; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0.0;
    windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(ctx.destination);
    windSrc.start();
  }

  function update(throttle, speed) {
    if (!started || !ctx) return;
    const t = ctx.currentTime;
    const target = muted ? 0 : 0.05 + throttle * 0.09;
    engineGain.gain.setTargetAtTime(target, t, 0.1);
    engineOsc.frequency.setTargetAtTime(46 + throttle * 90 + speed * 0.08, t, 0.1);
    engineOsc2.frequency.setTargetAtTime(92 + throttle * 180 + speed * 0.16, t, 0.1);
    windGain.gain.setTargetAtTime(muted ? 0 : Math.min(0.06, speed / 420 * 0.06), t, 0.2);
    windFilter.frequency.setTargetAtTime(500 + speed * 2.2, t, 0.2);
  }

  function blip(freq, dur = 0.12, type = 'sine', vol = 0.18) {
    if (!started || !ctx || muted) return;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function setMuted(m) { muted = m; if (started && ctx) update(0, 0); }
  return { start, update, blip, setMuted };
}
