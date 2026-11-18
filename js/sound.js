/* Sonidos generados con Web Audio (sin archivos externos) */
(function (V) {
  'use strict';
  let ctx = null;
  function tone(type, f0, f1, dur, vol) {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  V.Sound = {
    unlock() { // debe llamarse desde un clic del usuario
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { ctx = null; }
    },
    hit() { tone('sine', 900, 1500, 0.09, 0.25); },
    miss() { tone('square', 180, 90, 0.14, 0.12); },
    tick() { tone('sine', 620, 620, 0.07, 0.2); },
    go() { tone('sine', 1000, 1400, 0.22, 0.25); }
  };
})(window.VAT);
