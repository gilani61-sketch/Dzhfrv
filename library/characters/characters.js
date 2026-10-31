/**
 * Персонажи. Намеренно не «мультяшные»: это светящиеся знаки,
 * которые живут в той же оптике, что и остальной мир.
 * Каждая функция — (g, w, h, opts), где opts.t — фаза анимации 0..1.
 */
import { palette } from '../brand/tokens.js';

const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;

/** Агент: светящийся глаз-сфера. Смотрит, думает, моргает. */
export function agentOrb(g, w, h, o = {}) {
  const p = palette(o.palette);
  const t = o.t ?? 0;
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.34;

  const halo = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.1);
  halo.addColorStop(0, rgba(p.accent, 0.45));
  halo.addColorStop(0.45, rgba(p.accent, 0.10));
  halo.addColorStop(1, rgba(p.accent, 0));
  g.fillStyle = halo;
  g.fillRect(0, 0, w, h);

  const body = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  body.addColorStop(0, 'rgba(240,250,255,0.95)');
  body.addColorStop(0.55, rgba(p.accent, 0.55));
  body.addColorStop(1, rgba(p.accent2, 0.18));
  g.beginPath(); g.arc(cx, cy, R, 0, 7);
  g.fillStyle = body; g.fill();

  // зрачок ведёт взгляд
  const look = o.look ?? [Math.sin(t * 6.28) * 0.25, Math.cos(t * 4.1) * 0.12];
  const blink = o.blink ?? 1;
  g.save();
  g.translate(cx + look[0] * R, cy + look[1] * R);
  g.scale(1, Math.max(0.06, blink));
  g.beginPath(); g.arc(0, 0, R * 0.30, 0, 7);
  g.fillStyle = 'rgba(6,12,24,0.92)'; g.fill();
  g.beginPath(); g.arc(-R * 0.09, -R * 0.09, R * 0.09, 0, 7);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
  g.restore();

  // орбита-«мысль»
  g.save();
  g.translate(cx, cy); g.rotate(t * 2.4); g.scale(1, 0.32);
  g.beginPath(); g.arc(0, 0, R * 1.42, 0, 7);
  g.strokeStyle = rgba(p.accent, 0.5); g.lineWidth = R * 0.055; g.stroke();
  g.restore();
}

/** Стойка серверов — «та сторона», с которой говорит клиент. */
export function serverStack(g, w, h, o = {}) {
  const p = palette(o.palette);
  const t = o.t ?? 0;
  g.clearRect(0, 0, w, h);
  const n = o.units ?? 4;
  const uw = w * 0.74, uh = h / (n + 1.4), x = (w - uw) / 2;
  for (let i = 0; i < n; i++) {
    const y = h * 0.08 + i * uh * 1.12;
    g.beginPath();
    g.roundRect ? g.roundRect(x, y, uw, uh, 14) : g.rect(x, y, uw, uh);
    const gr = g.createLinearGradient(x, y, x + uw, y + uh);
    gr.addColorStop(0, 'rgba(24,34,56,0.95)');
    gr.addColorStop(1, 'rgba(10,16,30,0.95)');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = rgba(p.accent, 0.35); g.lineWidth = 2; g.stroke();
    for (let k = 0; k < 5; k++) {
      const on = ((i * 5 + k + Math.floor(t * 9)) % 7) < 3;
      g.beginPath(); g.arc(x + uw - 34 - k * 26, y + uh / 2, 6, 0, 7);
      g.fillStyle = on ? rgba(p.ok, 0.95) : 'rgba(255,255,255,0.12)';
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.fillRect(x + 26, y + uh / 2 - 4, uw * 0.42, 8);
  }
}

/** Силуэт человека — «ты» в кадре, без лица и без стока. */
export function userSilhouette(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  const cx = w / 2;
  g.fillStyle = rgba(p.dim, o.alpha ?? 0.55);
  g.beginPath(); g.arc(cx, h * 0.30, Math.min(w, h) * 0.15, 0, 7); g.fill();
  g.beginPath();
  g.moveTo(cx - w * 0.30, h);
  g.quadraticCurveTo(cx - w * 0.28, h * 0.52, cx, h * 0.50);
  g.quadraticCurveTo(cx + w * 0.28, h * 0.52, cx + w * 0.30, h);
  g.closePath(); g.fill();
}

/** Призрак интерфейса — пустая оболочка сайта, которая вот-вот сменится. */
export function uiGhost(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  g.strokeStyle = rgba(p.dim, 0.45); g.lineWidth = 2.5;
  const r = 18;
  const box = (x, y, bw, bh) => {
    g.beginPath();
    g.roundRect ? g.roundRect(x, y, bw, bh, r) : g.rect(x, y, bw, bh);
    g.stroke();
  };
  box(10, 10, w - 20, h - 20);
  box(34, 46, w - 68, 44);
  const cols = o.cols ?? 3;
  const cw = (w - 68 - (cols - 1) * 18) / cols;
  for (let i = 0; i < cols; i++) box(34 + i * (cw + 18), 112, cw, cw * 0.8);
  box(34, 112 + cw * 0.8 + 24, w - 68, 56);
}

/** Пакет данных как персонаж — маленький светящийся курьер. */
export function packetSprite(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)');
  gr.addColorStop(0.3, rgba(p.accent, 0.8));
  gr.addColorStop(1, rgba(p.accent, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  g.save();
  g.translate(cx, cy); g.rotate(Math.PI / 4);
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.fillRect(-R * 0.45, -R * 0.45, R * 0.9, R * 0.9);
  g.restore();
}

export const characters = { agentOrb, serverStack, userSilhouette, uiGhost, packetSprite };
