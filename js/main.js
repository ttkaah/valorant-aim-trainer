/* Interfaz: navegación, ajustes, estadísticas y control de partida */
(function (V) {
  'use strict';
  const S = V.Settings, St = V.Stats, $ = id => document.getElementById(id);
  const NAMES = { gridshot: 'Gridshot 3x3', micro: 'Microajustes', flicks: 'Flicks' };
  let selected = 'gridshot';

  /* ---------- helpers de formulario ---------- */
  function addRow(parent, label, get, set, o) {
    o = o || {};
    const wrap = document.createElement('div'); wrap.className = 'row';
    const lab = document.createElement('label'); lab.textContent = label;
    const inp = document.createElement('input'); inp.type = o.type || 'range';
    if (o.min !== undefined) { inp.min = o.min; inp.max = o.max; inp.step = o.step; }
    const out = document.createElement('output');
    const show = v => { out.textContent = inp.type === 'range' ? v : ''; };
    const write = v => { if (inp.type === 'checkbox') inp.checked = !!v; else inp.value = v; show(v); };
    write(get());
    inp.addEventListener('input', () => {
      let v = inp.type === 'checkbox' ? inp.checked : inp.type === 'color' ? inp.value : parseFloat(inp.value);
      if (inp.type === 'number' && !(v > 0)) return;
      show(v); set(v); S.save(); if (o.after) o.after();
    });
    wrap.append(lab, inp, out); parent.append(wrap);
    return { write };
  }
  const r3 = v => Math.round(v * 1000) / 1000;

  /* ---------- navegación ---------- */
  function showView(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.toggle('active', e.id === 'view-' + v));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    if (v === 'stats') renderStats();
    if (v === 'settings') drawPreview();
  }
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

  /* ---------- opciones por modo ---------- */
  const OPTS = {
    gridshot: [['size', 'Radio del objetivo (cm)', 10, 60, 1], ['spacing', 'Separación de la cuadrícula (cm)', 60, 300, 10], ['duration', 'Duración (s)', 30, 90, 30]],
    micro: [['size', 'Radio del objetivo (cm)', 4, 30, 1], ['spacing', 'Distancia entre objetivos (cm)', 30, 300, 10], ['duration', 'Duración (s)', 30, 90, 30]],
    flicks: [['size', 'Radio del objetivo (cm)', 8, 60, 1], ['minDist', 'Distancia mínima (°)', 5, 60, 1], ['maxDist', 'Distancia máxima (°)', 15, 90, 1],
      ['interval', 'Intervalo entre objetivos (ms)', 0, 1000, 50], ['duration', 'Duración (s)', 30, 90, 30]]
  };
  function renderOptions() {
    const box = $('mode-options'); box.innerHTML = '';
    $('opt-title').textContent = 'Ajustes de ' + NAMES[selected];
    OPTS[selected].forEach(([k, label, min, max, step]) =>
      addRow(box, label, () => S.data.modes[selected][k], v => { S.data.modes[selected][k] = v; }, { min, max, step }));
    document.querySelectorAll('.card').forEach(c => c.classList.toggle('selected', c.dataset.mode === selected));
  }
  document.querySelectorAll('.card').forEach(c => c.addEventListener('click', () => { selected = c.dataset.mode; renderOptions(); }));

  /* ---------- configuración: sensibilidad y mira ---------- */
  function updateInfo() {
    const d = S.data, deg = S.degPerCount(), cpd = d.dpi / 2.54; // cuentas por cm
    const base = S.cm360(d.sens, d.dpi), eff = 360 / deg / cpd, screen = d.hfov / deg / cpd;
    $('sens-info').innerHTML =
      'Valorant: <b>' + base.toFixed(2) + ' cm/360°</b> (yaw 0,07°/cuenta)<br>' +
      'En el entrenador: <b>' + eff.toFixed(2) + ' cm/360°</b><br>' +
      'Cruzar la pantalla (' + d.hfov + '° de campo): <b>' + screen.toFixed(2) + ' cm</b>';
  }
  function buildSettings() {
    const sf = $('sens-fields'); const d = S.data; let sensRow, cmRow;
    sensRow = addRow(sf, 'Sensibilidad en Valorant', () => d.sens, v => { d.sens = v; cmRow.write(r3(S.cm360(d.sens, d.dpi))); }, { type: 'number', step: 0.001, after: updateInfo });
    addRow(sf, 'DPI del ratón', () => d.dpi, v => { d.dpi = v; cmRow.write(r3(S.cm360(d.sens, d.dpi))); }, { type: 'number', step: 50, after: updateInfo });
    cmRow = addRow(sf, 'cm/360° (editable)', () => r3(S.cm360(d.sens, d.dpi)), v => { d.sens = r3(S.sensFromCm(v, d.dpi)); sensRow.write(d.sens); }, { type: 'number', step: 0.1, after: updateInfo });
    addRow(sf, 'Multiplicador del entrenador', () => d.mult, v => { d.mult = v; }, { min: 0.25, max: 3, step: 0.05, after: updateInfo });
    addRow(sf, 'Campo de visión horizontal (°)', () => d.hfov, v => { d.hfov = v; }, { min: 60, max: 120, step: 1, after: updateInfo });
    addRow(sf, 'Corrección del navegador', () => d.correction, v => { d.correction = v; }, { min: 0.5, max: 2, step: 0.01, after: updateInfo });
    const cf = $('ch-fields'), c = d.crosshair, ap = drawPreview;
    addRow(cf, 'Color', () => c.color, v => { c.color = v; }, { type: 'color', after: ap });
    addRow(cf, 'Tamaño', () => c.size, v => { c.size = v; }, { min: 0.5, max: 3, step: 0.1, after: ap });
    addRow(cf, 'Grosor', () => c.thickness, v => { c.thickness = v; }, { min: 1, max: 8, step: 0.5, after: ap });
    addRow(cf, 'Separación', () => c.gap, v => { c.gap = v; }, { min: 0, max: 20, step: 1, after: ap });
    addRow(cf, 'Longitud de líneas', () => c.length, v => { c.length = v; }, { min: 2, max: 30, step: 1, after: ap });
    addRow(cf, 'Opacidad', () => c.opacity, v => { c.opacity = v; }, { min: 0.1, max: 1, step: 0.05, after: ap });
    addRow(cf, 'Contorno', () => c.outline, v => { c.outline = v; }, { type: 'checkbox', after: ap });
    addRow(cf, 'Punto central', () => c.dot, v => { c.dot = v; }, { type: 'checkbox', after: ap });
    addRow(cf, 'Mostrar arma (Ghost)', () => d.showWeapon, v => { d.showWeapon = v; }, { type: 'checkbox' });
    updateInfo(); drawPreview();
  }
  function drawPreview() {
    const cv = $('ch-preview'), c = cv.getContext('2d');
    c.fillStyle = '#0b1118'; c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#ff4655'; c.beginPath(); c.arc(60, 50, 20, 0, 6.2832); c.fill();
    c.fillStyle = '#ece8e1'; c.beginPath(); c.arc(60, 50, 12, 0, 6.2832); c.fill();
    S.drawCrosshair(c, cv.width / 2, cv.height / 2, S.data.crosshair);
  }
  $('btn-reset-settings').addEventListener('click', () => {
    S.reset(); $('sens-fields').innerHTML = ''; $('ch-fields').innerHTML = ''; buildSettings(); renderOptions();
  });

  /* ---------- estadísticas ---------- */
  const fmt = (n, d) => (+n).toFixed(d || 0);
  function renderStats() {
    const box = $('stats-content'); box.innerHTML = '';
    Object.keys(NAMES).forEach(m => {
      const a = St.forMode(m), p = document.createElement('div'); p.className = 'panel';
      let h = '<h3>' + NAMES[m] + '</h3>';
      if (!a.length) { p.innerHTML = h + '<p class="hint">Aún no hay sesiones. Juega este modo para ver tus resultados aquí.</p>'; box.append(p); return; }
      const avgAcc = a.reduce((s, x) => s + x.acc, 0) / a.length;
      h += '<div class="mini"><div><small>Récord</small><b>' + St.best(m) + '</b></div><div><small>Sesiones</small><b>' + a.length +
        '</b></div><div><small>Precisión media</small><b>' + fmt(avgAcc, 1) + '%</b></div></div>';
      h += '<table><tr><th>Fecha</th><th>Puntos</th><th>Aciertos</th><th>Fallos</th><th>Precisión</th><th>Tiempo medio</th><th>Obj./min</th></tr>';
      a.slice(-8).reverse().forEach(s => {
        h += '<tr><td>' + new Date(s.ts).toLocaleString() + '</td><td>' + s.score + '</td><td>' + s.hits + '</td><td>' + s.misses +
          '</td><td>' + fmt(s.acc, 1) + '%</td><td>' + fmt(s.avgMs) + ' ms</td><td>' + fmt(s.tpm, 1) + '</td></tr>';
      });
      p.innerHTML = h + '</table>'; box.append(p);
    });
  }
  $('btn-clear-stats').addEventListener('click', () => { if (confirm('¿Borrar todas las estadísticas?')) { St.clear(); renderStats(); } });

  /* ---------- partida ---------- */
  const hud = { score: $('h-score'), hits: $('h-hits'), miss: $('h-miss'), acc: $('h-acc'), time: $('h-time'), note: $('h-note') };
  const engine = new V.Engine($('game-canvas'), hud, { onPause, onEnd });
  function hideOverlays() { $('ov-pause').hidden = true; $('ov-results').hidden = true; }
  function startGame() {
    if (!engine.ok) { alert('No se pudo cargar Three.js (se descarga desde cdnjs). Comprueba tu conexión a internet.'); return; }
    hideOverlays(); $('topbar').hidden = true; $('menus').hidden = true; $('view-game').hidden = false;
    $('h-mode').textContent = NAMES[selected]; $('h-time').textContent = S.data.modes[selected].duration;
    engine.start(V.Modes[selected]);
  }
  function exitGame() { engine.stop(); hideOverlays(); $('view-game').hidden = true; $('topbar').hidden = false; $('menus').hidden = false; }
  function onPause() { $('ov-pause').hidden = false; }
  function onEnd(s) {
    const prev = St.forMode(s.mode).slice(-5), best = St.best(s.mode);
    const prevAvg = prev.length ? prev.reduce((t, x) => t + x.score, 0) / prev.length : null;
    const record = s.score > best && St.forMode(s.mode).length > 0 || (best === 0 && s.score > 0);
    St.add(s);
    $('r-title').textContent = 'Resultados: ' + NAMES[s.mode];
    $('r-record').hidden = !record;
    const items = [['Puntuación', s.score], ['Aciertos', s.hits], ['Fallos', s.misses], ['Precisión', fmt(s.acc, 1) + '%'],
      ['Tiempo medio', fmt(s.avgMs) + ' ms'], ['Objetivos/min', fmt(s.tpm, 1)], ['Récord', Math.max(best, s.score)]];
    $('r-grid').innerHTML = items.map(i => '<div><small>' + i[0] + '</small><b>' + i[1] + '</b></div>').join('');
    $('r-compare').textContent = prevAvg === null ? 'Primera sesión de este modo.'
      : 'Frente a tus últimas ' + prev.length + ' sesiones (media ' + fmt(prevAvg) + ' puntos): ' +
        (s.score >= prevAvg ? '+' : '') + fmt((s.score - prevAvg) / Math.max(prevAvg, 1) * 100, 1) + '%';
    $('ov-results').hidden = false;
  }
  $('btn-start').addEventListener('click', startGame);
  $('g-pause').addEventListener('click', () => engine.pause());
  $('g-restart').addEventListener('click', startGame);
  $('p-resume').addEventListener('click', () => { $('ov-pause').hidden = true; engine.resume(); });
  $('p-restart').addEventListener('click', startGame);
  $('p-exit').addEventListener('click', exitGame);
  $('r-again').addEventListener('click', startGame);
  $('r-menu').addEventListener('click', exitGame);
  document.addEventListener('keydown', e => {
    if ($('view-game').hidden) return;
    if (e.key.toLowerCase() === 'v') { S.data.showWeapon = !S.data.showWeapon; S.save(); engine.applyWeapon(); }
    else if (e.key === 'Escape' || e.key.toLowerCase() === 'p') engine.pause();
    else if (e.key.toLowerCase() === 'r' && engine.state !== 'ended') startGame();
  });
  $('start-hint').textContent = 'Esc pausa · R reinicia · V arma';

  buildSettings(); renderOptions();
})(window.VAT);
