// Tiny WebAudio blips. Sound is optional and off-by-default until the first user gesture.
let ctx = null; let on = true;
export function setSound(v) { on = v; }
export function isSound() { return on; }
function ensure() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
function tone(freq, dur = 0.1, type = 'square', vol = 0.05, slide = 0, delay = 0) {
  if (!on) return; const c = ensure(); if (!c) return;
  const t = c.currentTime + delay; const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  click: () => tone(520, 0.05, 'triangle', 0.04),
  hit: () => tone(180, 0.1, 'sawtooth', 0.06, -90),
  crit: () => { tone(260, 0.1, 'sawtooth', 0.07, -120); tone(520, 0.08, 'square', 0.04, 0, 0.05); },
  miss: () => tone(300, 0.08, 'sine', 0.03, 120),
  sever: () => { tone(120, 0.25, 'sawtooth', 0.09, -80); tone(90, 0.3, 'square', 0.05, -40, 0.05); },
  heal: () => { tone(440, 0.09, 'sine', 0.05); tone(660, 0.12, 'sine', 0.05, 0, 0.07); },
  mutate: () => { [330, 440, 554, 740].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, 0, i * 0.07)); },
  win: () => { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, 0, i * 0.1)); },
  lose: () => { [330, 262, 196, 130].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.06, 0, i * 0.15)); },
};
