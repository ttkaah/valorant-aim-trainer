/* Gridshot 3x3 en 3D: tres esferas activas sobre una pared con cuadrícula de 9 posiciones */
(function (V) {
  'use strict';
  V.Modes.gridshot = {
    id: 'gridshot', name: 'Gridshot 3x3', timing: 'last',
    pos(e, i) {
      const sp = e.opts.spacing / 100;
      return { x: ((i % 3) - 1) * sp, y: e.camH + (1 - Math.floor(i / 3)) * sp, z: -e.wall };
    },
    init(e) { e.cells = new Array(9).fill(null); for (let i = 0; i < 3; i++) this.spawn(e); },
    spawn(e) {
      const free = []; e.cells.forEach((c, i) => { if (!c) free.push(i); });
      if (!free.length) return;
      const i = free[Math.floor(Math.random() * free.length)], p = this.pos(e, i);
      const r = Math.min(e.opts.size / 100, e.opts.spacing / 100 * 0.45);
      const t = e.add(p.x, p.y, p.z, r); t.cell = i; e.cells[i] = t;
    },
    onHit(e, t) { e.cells[t.cell] = null; this.spawn(e); }
  };
})(window.VAT);
