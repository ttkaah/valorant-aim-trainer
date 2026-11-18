/* Motor: canvas, Pointer Lock, sensibilidad, disparos, puntuación y ciclo de juego */
(function (V) {
  'use strict';
  const S = V.Settings;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  class Engine {
    constructor(canvas, hud, cb) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.hud = hud; this.cb = cb;
      this.state = 'idle'; this.locked = false; this.raw = false; this.wasLocked = false;
      this.cur = { x: 0, y: 0 }; this.targets = []; this.fx = [];
      this.loop = this.loop.bind(this);
      window.addEventListener('resize', () => this.resize());
      canvas.addEventListener('mousemove', e => this.onMove(e));
      canvas.addEventListener('mousedown', e => this.onDown(e));
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      document.addEventListener('pointerlockchange', () => this.onLock());
    }
    resize() {
      const r = this.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      if (!r.width) return;
      this.w = r.width; this.h = r.height; this.s = this.h / 1080;
      this.cv.width = Math.round(this.w * d); this.cv.height = Math.round(this.h * d);
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
      this.cur.x = clamp(this.cur.x, 0, this.w); this.cur.y = clamp(this.cur.y, 0, this.h);
    }
    start(mode) {
      this.mode = mode; this.opts = S.data.modes[mode.id];
      this.resize();
      this.cur.x = this.w / 2; this.cur.y = this.h / 2;
      this.targets = []; this.fx = []; this.times = [];
      this.score = 0; this.hits = 0; this.misses = 0;
      this.duration = this.opts.duration * 1000; this.remaining = this.duration;
      this.lastHit = performance.now(); this.waitUntil = 0; this.last = { x: this.w / 2, y: this.h / 2 };
      V.Sound.unlock();
      this.state = 'countdown'; this.cdEnd = performance.now() + 3000; this.cdShown = 4;
      this.requestLock();
      this.updateHud(); this.prev = performance.now();
      cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.loop);
    }
    begin() {
      const n = performance.now();
      this.state = 'running'; this.lastHit = n; this.prev = n;
      this.mode.init(this); V.Sound.go();
    }
    requestLock() {
      const c = this.cv; this.raw = false;
      if (!c.requestPointerLock) return this.note();
      const fallback = () => { try { c.requestPointerLock(); } catch (e) {} };
      try {
        const p = c.requestPointerLock({ unadjustedMovement: true });
        if (p && p.then) p.then(() => { this.raw = true; this.note(); }).catch(fallback);
      } catch (e) { fallback(); }
    }
    note() {
      this.hud.note.textContent = this.locked
        ? 'Esc: pausa · Sensibilidad aplicada con Pointer Lock' + (this.raw ? ' (movimiento sin aceleración)' : ' (movimiento ajustado por el sistema)')
        : 'Pointer Lock no disponible: el cursor usa la sensibilidad del sistema y los ajustes de sensibilidad no se aplican.';
    }
    onLock() {
      this.locked = document.pointerLockElement === this.cv;
      if (this.locked) this.wasLocked = true;
      else if (this.wasLocked && (this.state === 'running' || this.state === 'countdown')) this.pause();
      if (!this.locked) this.wasLocked = false;
      this.note();
    }
    onMove(e) {
      if (this.state !== 'running' && this.state !== 'countdown') return;
      if (this.locked) {
        const k = S.degPerCount() * (this.w / S.data.hfov); // píxeles por cuenta
        this.cur.x = clamp(this.cur.x + e.movementX * k, 0, this.w);
        this.cur.y = clamp(this.cur.y + e.movementY * k, 0, this.h);
      } else {
        const r = this.cv.getBoundingClientRect();
        this.cur.x = e.clientX - r.left; this.cur.y = e.clientY - r.top;
      }
    }
    onDown(e) { if (e.button === 0 && this.state === 'running') this.shoot(); }
    add(x, y, r) { const t = { x, y, r, born: performance.now() }; this.targets.push(t); return t; }
    clampPos(p, r) { const m = r + 10; return { x: clamp(p.x, m, this.w - m), y: clamp(p.y, m, this.h - m) }; }
    shoot() {
      const n = performance.now(); let hit = null;
      for (const t of this.targets) if (Math.hypot(t.x - this.cur.x, t.y - this.cur.y) <= t.r) { hit = t; break; }
      if (hit) {
        const rt = this.mode.timing === 'born' ? n - hit.born : n - this.lastHit;
        this.lastHit = n; this.times.push(rt); this.hits++;
        this.score += Math.round(100 + Math.max(0, 100 * (1 - rt / 1500)));
        this.targets.splice(this.targets.indexOf(hit), 1);
        this.fx.push({ x: hit.x, y: hit.y, r: hit.r, t: n });
        this.mode.onHit(this, hit, n); V.Sound.hit();
      } else {
        this.misses++; this.score = Math.max(0, this.score - 25); V.Sound.miss();
        this.fx.push({ x: this.cur.x, y: this.cur.y, r: 6, t: n, miss: true });
      }
      this.updateHud();
    }
    pause() {
      if (this.state !== 'running' && this.state !== 'countdown') return;
      this.pausedFrom = this.state;
      this.state = 'paused'; this.pausedAt = performance.now();
      if (document.pointerLockElement) document.exitPointerLock();
      this.cb.onPause();
    }
    resume() {
      if (this.state !== 'paused') return;
      const d = performance.now() - this.pausedAt;
      this.lastHit += d; this.waitUntil += d; this.cdEnd += d; this.targets.forEach(t => t.born += d);
      this.state = this.pausedFrom; V.Sound.unlock(); this.prev = performance.now(); this.requestLock();
    }
    stop() { this.state = 'idle'; cancelAnimationFrame(this.raf); if (document.pointerLockElement) document.exitPointerLock(); }
    end() {
      this.state = 'ended'; if (document.pointerLockElement) document.exitPointerLock();
      const shots = this.hits + this.misses, sum = this.times.reduce((a, b) => a + b, 0);
      this.cb.onEnd({
        mode: this.mode.id, ts: Date.now(), score: this.score, hits: this.hits, misses: this.misses,
        acc: shots ? this.hits / shots * 100 : 0, avgMs: this.times.length ? sum / this.times.length : 0,
        tpm: this.hits / (this.duration / 60000), duration: this.opts.duration
      });
    }
    updateHud() {
      const h = this.hud, shots = this.hits + this.misses;
      h.score.textContent = this.score; h.hits.textContent = this.hits; h.miss.textContent = this.misses;
      h.acc.textContent = (shots ? Math.round(this.hits / shots * 100) : 0) + '%';
    }
    loop(now) {
      if (this.state === 'idle') return;
      this.raf = requestAnimationFrame(this.loop);
      const dt = Math.min(now - this.prev, 50); this.prev = now;
      if (this.state === 'countdown') {
        const left = Math.ceil((this.cdEnd - performance.now()) / 1000);
        if (left <= 0) this.begin();
        else if (left !== this.cdShown) { this.cdShown = left; V.Sound.tick(); }
      } else if (this.state === 'running') {
        this.remaining -= dt;
        if (this.mode.tick) this.mode.tick(this, performance.now());
        if (this.remaining <= 0) { this.remaining = 0; this.end(); }
        this.hud.time.textContent = Math.ceil(this.remaining / 1000);
      }
      this.draw();
    }
    draw() {
      const c = this.ctx, n = performance.now();
      c.fillStyle = '#0b1118'; c.fillRect(0, 0, this.w, this.h);
      if (this.mode.drawBg) this.mode.drawBg(this, c);
      for (const t of this.targets) {
        c.shadowColor = '#ff4655'; c.shadowBlur = 14;
        c.fillStyle = '#ff4655'; c.beginPath(); c.arc(t.x, t.y, t.r, 0, 6.2832); c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#ece8e1'; c.beginPath(); c.arc(t.x, t.y, t.r * 0.6, 0, 6.2832); c.fill();
        c.fillStyle = '#ff4655'; c.beginPath(); c.arc(t.x, t.y, t.r * 0.22, 0, 6.2832); c.fill();
      }
      this.fx = this.fx.filter(f => n - f.t < 220);
      for (const f of this.fx) {
        const p = (n - f.t) / 220;
        c.strokeStyle = f.miss ? 'rgba(139,151,163,' + (1 - p) + ')' : 'rgba(236,232,225,' + (1 - p) + ')';
        c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r * (1 + p * 0.8), 0, 6.2832); c.stroke();
      }
      if (this.state === 'countdown') {
        const left = Math.max(1, Math.ceil((this.cdEnd - n) / 1000));
        c.fillStyle = '#ece8e1'; c.font = '700 120px Bahnschrift, "Segoe UI", sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(left, this.w / 2, this.h / 2 - 140);
      }
      S.drawCrosshair(c, this.cur.x, this.cur.y, S.data.crosshair);
    }
  }
  V.Engine = Engine;
})(window.VAT);
