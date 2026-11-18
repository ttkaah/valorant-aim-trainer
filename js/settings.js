/* Configuración, conversiones de sensibilidad, mira y almacenamiento de estadísticas */
window.VAT = window.VAT || {};
(function (V) {
  'use strict';
  const YAW = 0.07; // grados por cuenta de ratón en Valorant (sens 1.0)
  const KEY = 'vat_settings_v1';
  const DEFAULTS = {
    sens: 0.4, dpi: 800, mult: 1, hfov: 103, correction: 1,
    crosshair: { color: '#00ffcc', size: 1, thickness: 2, gap: 4, length: 8, outline: true, opacity: 1, dot: true },
    modes: {
      gridshot: { size: 28, duration: 60 },
      micro: { size: 12, spacing: 160, duration: 60 },
      flicks: { size: 24, minDist: 200, maxDist: 700, interval: 250, duration: 60 }
    }
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  function merge(base, src) {
    const out = clone(base);
    if (!src || typeof src !== 'object') return out;
    for (const k in out) {
      if (out[k] && typeof out[k] === 'object') out[k] = merge(out[k], src[k]);
      else if (typeof src[k] === typeof out[k]) out[k] = src[k];
    }
    return out;
  }
  function load() { try { return merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY))); } catch (e) { return clone(DEFAULTS); } }

  const S = {
    YAW, data: load(),
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} },
    reset() { this.data = clone(DEFAULTS); this.save(); },
    // cm para girar 360º: (360 / (yaw * sens * dpi)) pulgadas * 2.54
    cm360(sens, dpi) { return 360 * 2.54 / (YAW * sens * dpi); },
    sensFromCm(cm, dpi) { return 360 * 2.54 / (YAW * dpi * cm); },
    // Grados girados por cada cuenta de ratón dentro del entrenador
    degPerCount() { return YAW * this.data.sens * this.data.mult * this.data.correction; },
    drawCrosshair(ctx, x, y, c) {
      const k = c.size, t = c.thickness * k, g = c.gap * k, L = c.length * k;
      const bars = [[g, -t / 2, L, t], [-g - L, -t / 2, L, t], [-t / 2, g, t, L], [-t / 2, -g - L, t, L]];
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = c.opacity;
      if (c.outline) {
        ctx.fillStyle = '#000';
        bars.forEach(b => ctx.fillRect(b[0] - 1, b[1] - 1, b[2] + 2, b[3] + 2));
        if (c.dot) ctx.fillRect(-t / 2 - 1, -t / 2 - 1, t + 2, t + 2);
      }
      ctx.fillStyle = c.color;
      bars.forEach(b => ctx.fillRect(b[0], b[1], b[2], b[3]));
      if (c.dot) ctx.fillRect(-t / 2, -t / 2, t, t);
      ctx.restore();
    }
  };

  const SK = 'vat_stats_v1';
  const Stats = {
    all() { try { return JSON.parse(localStorage.getItem(SK)) || []; } catch (e) { return []; } },
    forMode(m) { return this.all().filter(s => s.mode === m); },
    best(m) { const a = this.forMode(m); return a.length ? Math.max(...a.map(s => s.score)) : 0; },
    add(s) { const a = this.all(); a.push(s); try { localStorage.setItem(SK, JSON.stringify(a.slice(-300))); } catch (e) {} },
    clear() { try { localStorage.removeItem(SK); } catch (e) {} }
  };
  V.Settings = S; V.Stats = Stats; V.Modes = V.Modes || {};
  V.rand = (a, b) => a + Math.random() * (b - a);
})(window.VAT);
