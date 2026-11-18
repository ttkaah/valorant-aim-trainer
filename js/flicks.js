/* Flicks en 3D: la esfera aparece a una distancia angular (grados) del objetivo anterior */
(function (V) {
  'use strict';
  const D = Math.PI / 180;
  V.Modes.flicks = {
    id: 'flicks', name: 'Flicks', timing: 'born',
    init(e) { e.waitUntil = performance.now() + 400; e.lastAng = { yaw: 0, pitch: 0 }; },
    tick(e, now) { if (!e.targets.length && now >= e.waitUntil) this.spawn(e); },
    spawn(e) {
      const o = e.opts, r = o.size / 100, lo = Math.min(o.minDist, o.maxDist), hi = Math.max(o.minDist, o.maxDist);
      let yaw = 0, pitch = 0;
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2, d = V.rand(lo, hi);
        yaw = e.lastAng.yaw + Math.cos(a) * d; pitch = e.lastAng.pitch + Math.sin(a) * d * 0.6;
        if (Math.abs(yaw) <= 65 && pitch >= -6 && pitch <= 30) break;
      }
      yaw = Math.max(-65, Math.min(65, yaw)); pitch = Math.max(-6, Math.min(30, pitch));
      const R = e.wall, cp = Math.cos(pitch * D);
      const t = e.add(R * Math.sin(yaw * D) * cp, e.camH + R * Math.sin(pitch * D), -R * Math.cos(yaw * D) * cp, r);
      t.yaw = yaw; t.pitch = pitch;
    },
    onHit(e, t, now) { e.lastAng = { yaw: t.yaw, pitch: t.pitch }; e.waitUntil = now + e.opts.interval; }
  };
})(window.VAT);
