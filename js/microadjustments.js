/* Modo Microajustes: un objetivo pequeño aparece a poca distancia del anterior */
(function (V) {
  'use strict';
  V.Modes.micro = {
    id: 'micro', name: 'Microajustes', timing: 'last',
    init(e) { this.spawn(e, { x: e.w / 2, y: e.h / 2 }); },
    spawn(e, from) {
      const r = e.opts.size * e.s, d = e.opts.spacing * e.s;
      let p = { x: from.x, y: from.y };
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2, dist = d * V.rand(0.6, 1);
        p = { x: from.x + Math.cos(a) * dist, y: from.y + Math.sin(a) * dist };
        const q = e.clampPos(p, r);
        if (q.x === p.x && q.y === p.y) break;
      }
      p = e.clampPos(p, r); e.add(p.x, p.y, r);
    },
    onHit(e, t) { this.spawn(e, t); }
  };
})(window.VAT);
