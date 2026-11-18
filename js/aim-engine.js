/* Motor 3D (Three.js): cámara FPS con la sensibilidad de Valorant, sala, arma Ghost, disparos y ciclo de juego */
(function (V) {
  'use strict';
  const S = V.Settings, T = window.THREE, DEG = Math.PI / 180;
  const CAM_H = 1.6, WALL = 10, HALF = 20, HEIGHT = 12;

  function gridTexture(rx, ry, fill) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); x.fillStyle = fill; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#243a4d'; x.lineWidth = 3; x.strokeRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    return t;
  }
  function box(w, h, d, col, x, y, z, parent) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshPhongMaterial({ color: col, shininess: 40 }));
    m.position.set(x, y, z); parent.add(m); return m;
  }

  class Engine {
    constructor(canvas, hud, cb) {
      this.cv = canvas; this.hud = hud; this.cb = cb; this.ok = !!T;
      this.state = 'idle'; this.locked = false; this.raw = false; this.wasLocked = false;
      this.targets = []; this.dying = []; this.decals = []; this.kick = 0; this.flashUntil = 0;
      this.camH = CAM_H; this.wall = WALL;
      this.chCv = document.getElementById('ch-overlay'); this.cdEl = document.getElementById('cd');
      this.loop = this.loop.bind(this);
      if (!this.ok) return;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.scene = new T.Scene(); this.scene.background = new T.Color(0x0b1118);
      this.camera = new T.PerspectiveCamera(60, 1, 0.02, 200);
      this.camera.rotation.order = 'YXZ'; this.camera.position.set(0, CAM_H, 0); this.scene.add(this.camera);
      this.scene.add(new T.HemisphereLight(0xffffff, 0x334455, 0.85));
      const dl = new T.DirectionalLight(0xffffff, 0.8); dl.position.set(2, 6, 4); this.scene.add(dl);
      this.ray = new T.Raycaster(); this.center = new T.Vector2(0, 0);
      this.sphere = new T.SphereGeometry(1, 28, 18);
      this.tMat = new T.MeshPhongMaterial({ color: 0xff4655, emissive: 0x5a1118, specular: 0xffffff, shininess: 90 });
      this.decalGeo = new T.CircleGeometry(0.035, 12);
      this.decalMat = new T.MeshBasicMaterial({ color: 0x8fa3b5 });
      this.buildRoom(); this.buildWeapon(); this.applyWeapon();
      window.addEventListener('resize', () => this.resize());
      canvas.addEventListener('mousemove', e => this.onMove(e));
      canvas.addEventListener('mousedown', e => this.onDown(e));
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      document.addEventListener('pointerlockchange', () => this.onLock());
    }
    buildRoom() {
      const W = HALF * 2, mk = (w, h, fill, set) => {
        const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: gridTexture(w / 2, h / 2, fill) }));
        set(m); this.scene.add(m); (this.roomMeshes = this.roomMeshes || []).push(m);
      };
      mk(W, W, '#0c1620', m => { m.rotation.x = -Math.PI / 2; });
      mk(W, W, '#0a121a', m => { m.rotation.x = Math.PI / 2; m.position.y = HEIGHT; });
      mk(W, HEIGHT, '#101b26', m => { m.position.set(0, HEIGHT / 2, -HALF); });
      mk(W, HEIGHT, '#101b26', m => { m.position.set(0, HEIGHT / 2, HALF); m.rotation.y = Math.PI; });
      mk(W, HEIGHT, '#101b26', m => { m.position.set(-HALF, HEIGHT / 2, 0); m.rotation.y = Math.PI / 2; });
      mk(W, HEIGHT, '#101b26', m => { m.position.set(HALF, HEIGHT / 2, 0); m.rotation.y = -Math.PI / 2; });
    }
    /* Pistola Ghost (modelo procedural con formas básicas, no es el modelo oficial del juego) */
    buildWeapon() {
      const g = new T.Group();
      box(0.034, 0.045, 0.19, 0x2b3138, 0, 0.03, -0.05, g);              // corredera
      for (let i = 0; i < 5; i++) box(0.036, 0.04, 0.002, 0x14171b, 0, 0.03, 0.01 + i * 0.008, g);
      box(0.03, 0.022, 0.17, 0x555d66, 0, -0.002, -0.04, g);              // armazón
      box(0.032, 0.09, 0.045, 0x1b2026, 0, -0.06, 0.035, g).rotation.x = -0.25; // empuñadura
      box(0.024, 0.006, 0.05, 0x2b3138, 0, -0.027, -0.03, g);             // guardamonte
      box(0.006, 0.02, 0.008, 0x888f96, 0, -0.018, -0.015, g);            // gatillo
      box(0.006, 0.01, 0.008, 0xe6e6e6, 0, 0.058, -0.125, g);             // punto de mira
      box(0.006, 0.01, 0.008, 0xe6e6e6, -0.009, 0.058, 0.03, g);
      box(0.006, 0.01, 0.008, 0xe6e6e6, 0.009, 0.058, 0.03, g);
      const sup = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.08, 16), new T.MeshPhongMaterial({ color: 0x1a1d21, shininess: 60 }));
      sup.rotation.x = Math.PI / 2; sup.position.set(0, 0.03, -0.185); g.add(sup);   // silenciador integrado
      box(0.05, 0.05, 0.075, 0x2c3a4a, 0, -0.085, 0.05, g).rotation.x = -0.25;     // mano
      const arm = new T.Mesh(new T.CylinderGeometry(0.03, 0.036, 0.4, 14), new T.MeshPhongMaterial({ color: 0x2c3a4a }));
      arm.rotation.x = Math.PI / 2 + 0.4; arm.position.set(0, -0.13, 0.25); g.add(arm);
      this.flash = new T.Mesh(new T.PlaneGeometry(0.1, 0.1),
        new T.MeshBasicMaterial({ color: 0xffd27a, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      this.flash.position.set(0, 0.03, -0.235); this.flash.visible = false; g.add(this.flash);
      this.wBase = new T.Vector3(0.17, -0.16, -0.33);
      g.position.copy(this.wBase); g.rotation.y = 0.05;
      this.weapon = g; this.camera.add(g);
    }
    applyWeapon() { if (this.weapon) this.weapon.visible = !!S.data.showWeapon; }
    resize() {
      if (!this.ok) return;
      const r = this.cv.getBoundingClientRect(); if (!r.width) return;
      this.renderer.setSize(r.width, r.height, false);
      this.camera.aspect = r.width / r.height;
      // FOV horizontal (como en Valorant) convertido al FOV vertical que usa Three.js
      this.camera.fov = 2 * Math.atan(Math.tan(S.data.hfov * DEG / 2) / this.camera.aspect) / DEG;
      this.camera.updateProjectionMatrix();
    }
    drawCrosshair() {
      const c = this.chCv.getContext('2d'); c.clearRect(0, 0, this.chCv.width, this.chCv.height);
      S.drawCrosshair(c, this.chCv.width / 2, this.chCv.height / 2, S.data.crosshair);
    }
    clearScene() {
      this.targets.forEach(t => this.scene.remove(t.mesh)); this.dying.forEach(d => this.scene.remove(d.mesh));
      this.decals.forEach(d => this.scene.remove(d)); this.targets = []; this.dying = []; this.decals = [];
    }
    start(mode) {
      this.mode = mode; this.opts = S.data.modes[mode.id];
      this.clearScene(); this.resize(); this.drawCrosshair(); this.applyWeapon();
      this.yaw = 0; this.pitch = 0; this.times = [];
      this.score = 0; this.hits = 0; this.misses = 0;
      this.duration = this.opts.duration * 1000; this.remaining = this.duration;
      this.lastHit = performance.now(); this.waitUntil = 0;
      V.Sound.unlock();
      this.state = 'countdown'; this.cdEnd = performance.now() + 3000; this.cdShown = 4;
      this.requestLock(); this.updateHud(); this.prev = performance.now();
      cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.loop);
    }
    begin() {
      const n = performance.now();
      this.state = 'running'; this.lastHit = n; this.prev = n;
      this.cdEl.hidden = true; this.mode.init(this); V.Sound.go();
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
        ? 'Esc: pausa · V: mostrar/ocultar arma · Giro = 0,07° × sens por cuenta' + (this.raw ? ' (sin aceleración)' : ' (movimiento ajustado por el sistema)')
        : 'Pointer Lock no disponible: se usa el movimiento relativo normal del ratón y el cursor puede salir de la ventana.';
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
      const k = S.degPerCount() * DEG; // radianes por cuenta: yaw Valorant 0,07° × sens × multiplicador
      this.yaw -= e.movementX * k;
      this.pitch = Math.max(-89 * DEG, Math.min(89 * DEG, this.pitch - e.movementY * k));
    }
    onDown(e) { if (e.button === 0 && this.state === 'running') this.shoot(); }
    add(x, y, z, r) {
      const m = new T.Mesh(this.sphere, this.tMat); m.scale.setScalar(r); m.position.set(x, y, z); this.scene.add(m);
      const t = { mesh: m, x, y, z, r, born: performance.now() }; this.targets.push(t); return t;
    }
    shoot() {
      const n = performance.now();
      this.kick = 1; V.Sound.shot();
      if (S.data.showWeapon) { this.flashUntil = n + 45; this.flash.rotation.z = Math.random() * 6.28; }
      this.camera.updateMatrixWorld(); this.ray.setFromCamera(this.center, this.camera);
      const hits = this.ray.intersectObjects(this.targets.map(t => t.mesh), false);
      if (hits.length) {
        const hit = this.targets.find(t => t.mesh === hits[0].object);
        const rt = this.mode.timing === 'born' ? n - hit.born : n - this.lastHit;
        this.lastHit = n; this.times.push(rt); this.hits++;
        this.score += Math.round(100 + Math.max(0, 100 * (1 - rt / 1500)));
        this.targets.splice(this.targets.indexOf(hit), 1);
        this.dying.push({ mesh: hit.mesh, t0: n, r: hit.r });
        this.mode.onHit(this, hit, n); V.Sound.hit();
      } else {
        this.misses++; this.score = Math.max(0, this.score - 25); V.Sound.miss();
        const w = this.ray.intersectObjects(this.roomMeshes, false)[0];
        if (w) {
          const nrm = w.face.normal.clone().transformDirection(w.object.matrixWorld);
          const d = new T.Mesh(this.decalGeo, this.decalMat);
          d.position.copy(w.point).addScaledVector(nrm, 0.01); d.lookAt(w.point.clone().add(nrm));
          this.scene.add(d); this.decals.push(d);
          if (this.decals.length > 25) this.scene.remove(this.decals.shift());
        }
      }
      this.updateHud();
    }
    pause() {
      if (this.state !== 'running' && this.state !== 'countdown') return;
      this.pausedFrom = this.state; this.state = 'paused'; this.pausedAt = performance.now();
      if (document.pointerLockElement) document.exitPointerLock();
      this.cb.onPause();
    }
    resume() {
      if (this.state !== 'paused') return;
      const d = performance.now() - this.pausedAt;
      this.lastHit += d; this.waitUntil += d; this.cdEnd += d; this.targets.forEach(t => t.born += d);
      this.state = this.pausedFrom; this.prev = performance.now(); V.Sound.unlock(); this.requestLock();
    }
    stop() {
      this.state = 'idle'; cancelAnimationFrame(this.raf); this.cdEl.hidden = true; this.clearScene();
      if (document.pointerLockElement) document.exitPointerLock();
    }
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
        else { this.cdEl.hidden = false; this.cdEl.textContent = left; if (left !== this.cdShown) { this.cdShown = left; V.Sound.tick(); } }
      } else if (this.state === 'running') {
        this.remaining -= dt;
        if (this.mode.tick) this.mode.tick(this, performance.now());
        if (this.remaining <= 0) { this.remaining = 0; this.end(); }
        this.hud.time.textContent = Math.ceil(this.remaining / 1000);
      }
      const n = performance.now();
      this.dying = this.dying.filter(d => {
        const p = (n - d.t0) / 120;
        if (p >= 1) { this.scene.remove(d.mesh); return false; }
        d.mesh.scale.setScalar(d.r * (1 - p)); return true;
      });
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      this.kick = Math.max(0, this.kick - dt / 1000 * 7);
      this.weapon.position.set(this.wBase.x, this.wBase.y, this.wBase.z + this.kick * 0.035);
      this.weapon.rotation.x = this.kick * 0.1;
      this.flash.visible = n < this.flashUntil && !!S.data.showWeapon;
      this.renderer.render(this.scene, this.camera);
    }
  }
  V.Engine = Engine;
})(window.VAT);
