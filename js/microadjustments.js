/* Microajustes en 3D: esfera pequeña que reaparece cerca de la anterior sobre la pared */
(function (V) {
  'use strict';
  V.Modes.micro = {
    id: 'micro', name: 'Microajustes', timing: 'last',
    init(e) { this.spawn(e, { x: 0, y: e.camH }); },
    spawn(e, from) {
      const r = e.opts.size / 100, d = e.opts.spacing / 100, xm = 4.5, y0 = 0.8, y1 = 3.6;
      let x = from.x, y = from.y;
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2, dist = d * V.rand(0.6, 1);
        x = from.x + Math.cos(a) * dist; y = from.y + Math.sin(a) * dist;
        if (Math.abs(x) <= xm && y >= y0 && y <= y1) break;
      }
      x = Math.max(-xm, Math.min(xm, x)); y = Math.max(y0, Math.min(y1, y));
      e.add(x, y, -e.wall, r);
    },
    onHit(e, t) { this.spawn(e, t); }
  };
})(window.VAT);
