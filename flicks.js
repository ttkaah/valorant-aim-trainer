/* Modo Flicks: objetivo lejano tras una pausa corta; el tiempo se mide desde su aparición */
(function (V) {
  'use strict';
  V.Modes.flicks = {
    id: 'flicks', name: 'Flicks', timing: 'born',
    init(e) { e.waitUntil = performance.now() + 400; },
    tick(e, now) { if (!e.targets.length && now >= e.waitUntil) this.spawn(e); },
    spawn(e) {
      const o = e.opts, r = o.size * e.s;
      const lo = Math.min(o.minDist, o.maxDist), hi = Math.max(o.minDist, o.maxDist);
      let p;
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2, d = V.rand(lo, hi) * e.s;
        p = { x: e.last.x + Math.cos(a) * d, y: e.last.y + Math.sin(a) * d };
        const q = e.clampPos(p, r);
        if (q.x === p.x && q.y === p.y) break;
      }
      p = e.clampPos(p, r); e.add(p.x, p.y, r);
    },
    onHit(e, t, now) { e.last = { x: t.x, y: t.y }; e.waitUntil = now + e.opts.interval; }
  };
})(window.VAT);
