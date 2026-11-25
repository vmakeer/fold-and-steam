// WebAudio bleeps, synthesised at runtime — no sound files, no network.
// The context is created lazily on the first user gesture, so browsers allow it.

let ctx = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  click() { tone(660, 0.07, 'triangle', 0.12); },
  dough() { tone(320, 0.09, 'sine', 0.14, 0, 420); },
  fill() { tone(520, 0.08, 'triangle', 0.12); },
  fold() { tone(440, 0.1, 'triangle', 0.14, 0, 880); },
  perfect() { tone(880, 0.12, 'sine', 0.16); tone(1174, 0.16, 'sine', 0.16, 0.09); tone(1568, 0.2, 'sine', 0.14, 0.18); },
  ready() { tone(1046, 0.14, 'sine', 0.15); tone(1318, 0.18, 'sine', 0.13, 0.1); },
  serve() { tone(784, 0.1, 'triangle', 0.15); tone(988, 0.12, 'triangle', 0.15, 0.08); tone(1318, 0.2, 'triangle', 0.14, 0.16); },
  fail() { tone(220, 0.22, 'sawtooth', 0.09, 0, 140); },
  burnt() { tone(180, 0.3, 'sawtooth', 0.1, 0, 90); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.15, i * 0.13)); },
};
