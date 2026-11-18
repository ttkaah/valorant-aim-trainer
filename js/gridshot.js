/* Modo Gridshot 3x3: tres objetivos simultáneos en celdas distintas */
(function (V) {
  'use strict';
  V.Modes.gridshot = {
    id: 'gridshot', name: 'Gridshot 3x3', timing: 'last',
    area(e) { const w = e.w * 0.7, h = e.h * 0.7; return { x: (e.w - w) / 2, y: (e.h - h) / 2 + 20, w, h }; },
    init(e) { e.cells = new Array(9).fill(null); for (let i = 0; i < 3; i++) this.spawn(e); },
    spawn(e) {
      const free = []; e.cells.forEach((c, i) => { if (!c) free.push(i); });
      if (!free.length) return;
      const i = free[Math.floor(Math.random() * free.length)], a = this.area(e);
      const cw = a.w / 3, ch = a.h / 3, r = Math.min(e.opts.size * e.s, cw / 2 - 2, ch / 2 - 2);
      const x = a.x + (i % 3) * cw + V.rand(r, cw - r), y = a.y + Math.floor(i / 3) * ch + V.rand(r, ch - r);
      const t = e.add(x, y, r); t.cell = i; e.cells[i] = t;
    },
    onHit(e, t) { e.cells[t.cell] = null; this.spawn(e); },
    drawBg(e, c) {
      const a = this.area(e); c.strokeStyle = '#1f2d3a'; c.lineWidth = 1; c.strokeRect(a.x, a.y, a.w, a.h);
      c.beginPath();
      for (let i = 1; i < 3; i++) {
        c.moveTo(a.x + a.w / 3 * i, a.y); c.lineTo(a.x + a.w / 3 * i, a.y + a.h);
        c.moveTo(a.x, a.y + a.h / 3 * i); c.lineTo(a.x + a.w, a.y + a.h / 3 * i);
      }
      c.stroke();
    }
  };
})(window.VAT);
