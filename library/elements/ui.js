/**
 * Монтажный набор: переиспользуемые элементы, которые рисуются в canvas
 * и попадают в сцену как текстуры. Каждая функция — (g, w, h, opts).
 * Все цвета берутся из палитры, чтобы ролики не разъезжались по стилю.
 */
import { palette, type } from '../brand/tokens.js';

const FONT = type.display, MONO = type.mono;
const hex = n => '#' + n.toString(16).padStart(6, '0');
const rgba = (n, a) => {
  const r = (n >> 16) & 255, g2 = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g2},${b},${a})`;
};

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ------------------------------------------------------------------ *
 *  Стекло: база почти всех карточек
 * ------------------------------------------------------------------ */
export function glassPanel(g, w, h, o = {}) {
  const p = palette(o.palette);
  const r = o.radius ?? 34;
  const grad = g.createLinearGradient(0, 0, w * 0.4, h);
  grad.addColorStop(0, o.top ?? rgba(p.accent, 0.10));
  grad.addColorStop(1, o.bottom ?? 'rgba(8,12,22,0.94)');
  roundRect(g, 2, 2, w - 4, h - 4, r);
  g.fillStyle = o.flat ?? grad;
  g.fill();

  g.lineWidth = o.border ?? 2.5;
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, rgba(p.accent, 0.55));
  bg.addColorStop(0.5, rgba(p.accent, 0.10));
  bg.addColorStop(1, rgba(p.accent2, 0.40));
  g.strokeStyle = o.edge ?? bg;
  g.stroke();

  if (o.sheen !== false) {
    const sheen = g.createLinearGradient(0, 0, 0, h * 0.35);
    sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    roundRect(g, 2, 2, w - 4, h * 0.35, r);
    g.fillStyle = sheen;
    g.fill();
  }
}

/* ------------------------------------------------------------------ *
 *  Окно браузера. Содержимое задаётся блоками — не привязано к сайту.
 * ------------------------------------------------------------------ */
export function browserWindow(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  glassPanel(g, w, h, { palette: o.palette, radius: 34 });

  const bar = 86;
  g.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(g, 2, 2, w - 4, bar, 34); g.fill();
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    g.beginPath(); g.arc(44 + i * 30, bar / 2, 9, 0, 7);
    g.fillStyle = c; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
  });
  roundRect(g, 170, 25, w - 220, 42, 21);
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill();
  g.font = `500 30px ${MONO}`;
  g.fillStyle = rgba(p.muted, 0.88);
  g.textBaseline = 'middle';
  g.fillText(o.url ?? 'example.com', 198, 47);

  let y = bar + 40;
  for (const block of (o.blocks ?? [])) {
    if (block.type === 'heading') {
      g.font = `800 ${block.size ?? 42}px ${FONT}`;
      g.fillStyle = rgba(p.ink, 0.88);
      g.textBaseline = 'top';
      g.fillText(block.text, 56, y);
      y += (block.size ?? 42) + 22;
    } else if (block.type === 'tiles') {
      const n = block.count ?? 3, size = block.size ?? 132, gap = 18;
      for (let i = 0; i < n; i++) {
        roundRect(g, 56 + i * (size + gap), y, size, size, 22);
        const t = g.createLinearGradient(56 + i * (size + gap), y, 56 + i * (size + gap) + size, y + size);
        t.addColorStop(0, rgba(p.accent, 0.26 - i * 0.03));
        t.addColorStop(1, 'rgba(16,24,48,0.30)');
        g.fillStyle = t; g.fill();
        g.strokeStyle = rgba(p.accent, 0.30); g.lineWidth = 1.5; g.stroke();
      }
      y += size + 26;
    } else if (block.type === 'input') {
      const ih = block.height ?? 86;
      roundRect(g, 56, y, w - 112, ih, ih / 2);
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill();
      g.strokeStyle = rgba(p.accent, 0.28); g.lineWidth = 1.5; g.stroke();
      g.font = `500 34px ${FONT}`;
      g.textBaseline = 'middle';
      const txt = block.value ?? block.placeholder ?? '';
      g.fillStyle = block.value ? rgba(p.ink, 0.94) : rgba(p.muted, 0.50);
      g.fillText(txt, 92, y + ih / 2);
      if (block.caret && block.value != null) {
        const tw = g.measureText(txt).width;
        g.fillStyle = rgba(p.accent, 0.95);
        g.fillRect(98 + tw, y + ih / 2 - 21, 3, 42);
      }
      if (block.button) {
        const bw = 200, bh = 64;
        button(g, bw, bh, {
          label: block.button, palette: o.palette, hot: block.press ?? 0,
          at: [w - 56 - bw, y + (ih - bh) / 2],
        });
      }
      y += ih + 26;
    } else if (block.type === 'rows') {
      for (let i = 0; i < (block.count ?? 3); i++) {
        roundRect(g, 56, y, w - 112, 54, 14);
        g.fillStyle = 'rgba(255,255,255,0.045)'; g.fill();
        y += 68;
      }
      y += 8;
    }
  }
}

/* ------------------------------------------------------------------ *
 *  Кнопка (можно рисовать внутрь другого элемента через opts.at)
 * ------------------------------------------------------------------ */
export function button(g, w, h, o = {}) {
  const p = palette(o.palette);
  const [x, y] = o.at ?? [0, 0];
  const hot = o.hot ?? 0;
  roundRect(g, x, y, w, h, h / 2);
  if (o.tone === 'ghost') {
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill();
    g.strokeStyle = rgba(p.accent, 0.45); g.lineWidth = 2; g.stroke();
    g.fillStyle = rgba(p.ink, 0.95);
  } else {
    const bg = g.createLinearGradient(x, y, x + w, y + h);
    bg.addColorStop(0, rgba(p.accent, 0.92 + hot * 0.08));
    bg.addColorStop(1, rgba(p.accent2, 0.92));
    g.fillStyle = bg; g.fill();
    g.fillStyle = '#05101c';
  }
  g.font = `800 ${o.size ?? 34}px ${FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(o.label ?? '', x + w / 2, y + h / 2 + 1);
  g.textAlign = 'left';
}

/* ------------------------------------------------------------------ *
 *  Строка сетевого лога
 * ------------------------------------------------------------------ */
export function logRow(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  const y = h / 2;
  g.textBaseline = 'middle';
  g.font = `600 ${o.size ?? 37}px ${MONO}`;
  const tone = { POST: p.accent, GET: p.muted, PUT: p.accent2, WSS: p.accent2, DELETE: p.hot };
  g.fillStyle = rgba(tone[(o.method ?? 'GET').trim()] ?? p.muted, 0.95);
  g.fillText((o.method ?? 'GET').padEnd(4, ' '), 0, y);
  g.fillStyle = rgba(p.ink, 0.95);
  g.fillText(o.path ?? '/', 116, y);
  const good = /^(2|open)/.test(String(o.status ?? ''));
  g.font = `600 ${(o.size ?? 37) - 5}px ${MONO}`;
  g.fillStyle = rgba(good ? p.ok : p.hot, 0.95);
  g.fillText(String(o.status ?? ''), w - 120, y);
}

/* ------------------------------------------------------------------ *
 *  Панель кода с подсветкой и посимвольным набором
 * ------------------------------------------------------------------ */
export const SYNTAX = {
  kw: '#ff9ec4', id: '#dbe7ff', cls: '#8fd7ff', op: '#8fa2c0',
  fn: '#9ee6b4', str: '#ffd79a', const: '#c7a6ff', cmt: '#5f7391',
};

export function codePane(g, w, h, o = {}) {
  const p = palette(o.palette);
  const lines = o.lines ?? [];
  const progress = o.progress ?? 1;
  g.clearRect(0, 0, w, h);
  glassPanel(g, w, h, { palette: o.palette, radius: 30, top: 'rgba(14,20,34,0.95)', bottom: 'rgba(7,11,20,0.95)' });

  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(g, 2, 2, w - 4, 70, 30); g.fill();
  g.font = `600 26px ${MONO}`;
  g.fillStyle = rgba(p.muted, 0.75);
  g.fillText(o.title ?? 'main.py', 34, 37);
  if (o.badge) {
    g.fillStyle = rgba(p.ok, 0.85);
    g.fillText(o.badge, w - 34 - g.measureText(o.badge).width, 37);
  }

  const total = lines.reduce((s, l) => s + l.reduce((a, t) => a + t[0].length, 0), 0);
  let budget = Math.ceil(total * progress);
  const size = o.size ?? 40, lh = o.lineHeight ?? 66;

  lines.forEach((line, li) => {
    let x = 56;
    const y = (o.top ?? 136) + li * lh;
    g.font = `500 26px ${MONO}`;
    g.fillStyle = rgba(p.dim, 0.5);
    g.fillText(String(li + 1).padStart(2, ' '), 6, y);
    g.font = `600 ${size}px ${MONO}`;
    for (const [txt, kind] of line) {
      if (budget <= 0) return;
      const shown = txt.slice(0, budget);
      budget -= txt.length;
      g.fillStyle = SYNTAX[kind] ?? SYNTAX.id;
      g.fillText(shown, x, y);
      x += g.measureText(txt).width;
      if (shown.length < txt.length) {
        g.fillStyle = rgba(p.accent, 0.9);
        g.fillRect(x - g.measureText(txt.slice(shown.length)).width, y - size / 2, 3, size);
        return;
      }
    }
  });
}

/* ------------------------------------------------------------------ *
 *  Ряд чипов (языки, фичи, теги) с поочерёдным зажиганием
 * ------------------------------------------------------------------ */
export function chipRow(g, w, h, o = {}) {
  const p = palette(o.palette);
  const labels = o.labels ?? [];
  const lit = o.lit ?? 1;
  g.clearRect(0, 0, w, h);
  g.font = `700 ${o.size ?? 36}px ${FONT}`;
  g.textBaseline = 'middle';
  const widths = labels.map(l => g.measureText(l).width + 64);
  const totalW = widths.reduce((a, b) => a + b, 0) + (labels.length - 1) * 20;
  let x = o.align === 'left' ? 0 : (w - totalW) / 2;
  labels.forEach((lb, i) => {
    const on = i / labels.length < lit;
    roundRect(g, x, h / 2 - 34, widths[i], 68, 34);
    g.fillStyle = on ? rgba(p.accent, 0.20) : 'rgba(255,255,255,0.04)';
    g.fill();
    g.strokeStyle = on ? rgba(p.accent, 0.55) : 'rgba(255,255,255,0.10)';
    g.lineWidth = 1.6; g.stroke();
    g.fillStyle = on ? rgba(p.ink, 0.98) : rgba(p.dim, 0.45);
    g.fillText(lb, x + 32, h / 2 + 1);
    x += widths[i] + 20;
  });
}

/* ------------------------------------------------------------------ *
 *  Терминал: промпт, который печатается
 * ------------------------------------------------------------------ */
export function terminal(g, w, h, o = {}) {
  const p = palette(o.palette);
  const text = o.text ?? '';
  const shown = o.shown ?? text.length;
  g.clearRect(0, 0, w, h);
  glassPanel(g, w, h, { palette: o.palette, radius: 28, top: 'rgba(12,18,30,0.94)', bottom: 'rgba(6,10,18,0.94)' });
  g.font = `600 ${o.size ?? 40}px ${MONO}`;
  g.textBaseline = 'top';
  g.fillStyle = rgba(p.ok, 0.95);
  g.fillText(o.prompt ?? '▸', 40, 50);

  let x = 92, y = 48;
  g.fillStyle = rgba(p.ink, 0.97);
  for (const word of text.slice(0, shown).split(' ')) {
    const ww = g.measureText(word + ' ').width;
    if (x + ww > w - 60) { x = 92; y += (o.lineHeight ?? 58); }
    g.fillText(word + ' ', x, y);
    x += ww;
  }
  if (o.caret) {
    g.fillStyle = rgba(p.accent, 0.95);
    g.fillRect(x + 2, y + 6, 16, (o.size ?? 40) - 2);
  }
}

/* ------------------------------------------------------------------ *
 *  Цифра с подписью — для «до/после», метрик, результатов
 * ------------------------------------------------------------------ */
export function statTile(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  if (o.panel !== false) glassPanel(g, w, h, { palette: o.palette, radius: 28 });
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `800 ${o.size ?? 110}px ${FONT}`;
  g.fillStyle = rgba(o.tone === 'hot' ? p.hot : o.tone === 'ok' ? p.ok : p.ink, 0.98);
  g.fillText(o.value ?? '', w / 2, h * 0.58);
  g.font = `600 ${o.labelSize ?? 36}px ${FONT}`;
  g.fillStyle = rgba(p.muted, 0.75);
  g.fillText(o.label ?? '', w / 2, h * 0.82);
  g.textAlign = 'left';
}

/* ------------------------------------------------------------------ *
 *  Цитата / отзыв
 * ------------------------------------------------------------------ */
export function quoteCard(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  glassPanel(g, w, h, { palette: o.palette, radius: 30 });
  g.font = `800 96px ${FONT}`;
  g.fillStyle = rgba(p.accent, 0.35);
  g.textBaseline = 'top';
  g.fillText('«', 44, 24);
  g.font = `600 ${o.size ?? 40}px ${FONT}`;
  g.fillStyle = rgba(p.ink, 0.95);
  let x = 46, y = 120;
  for (const word of (o.text ?? '').split(' ')) {
    const ww = g.measureText(word + ' ').width;
    if (x + ww > w - 46) { x = 46; y += (o.size ?? 40) * 1.35; }
    g.fillText(word + ' ', x, y);
    x += ww;
  }
  if (o.author) {
    g.font = `600 32px ${FONT}`;
    g.fillStyle = rgba(p.muted, 0.7);
    g.fillText('— ' + o.author, 46, h - 70);
  }
}

/* ------------------------------------------------------------------ *
 *  Рамка телефона с произвольным экраном внутри
 * ------------------------------------------------------------------ */
export function phoneFrame(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  const r = o.radius ?? 56;
  roundRect(g, 6, 6, w - 12, h - 12, r);
  g.fillStyle = 'rgba(10,14,22,0.96)'; g.fill();
  g.strokeStyle = rgba(p.accent, 0.40); g.lineWidth = 5; g.stroke();
  g.save();
  roundRect(g, 22, 22, w - 44, h - 44, r - 14);
  g.clip();
  if (o.screen) o.screen(g, w - 44, h - 44);
  else { g.fillStyle = 'rgba(20,28,48,0.9)'; g.fillRect(22, 22, w - 44, h - 44); }
  g.restore();
  // динамический островок
  roundRect(g, w / 2 - 52, 34, 104, 28, 14);
  g.fillStyle = 'rgba(0,0,0,0.9)'; g.fill();
}

/* ------------------------------------------------------------------ *
 *  Курсор, кольцо клика, стрелка, уголки кадрирования
 * ------------------------------------------------------------------ */
export function cursorArrow(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  g.beginPath();
  g.moveTo(10, 6); g.lineTo(10, 86); g.lineTo(30, 68); g.lineTo(44, 100);
  g.lineTo(58, 93); g.lineTo(45, 62); g.lineTo(70, 60); g.closePath();
  g.fillStyle = '#ffffff';
  g.shadowColor = rgba(p.accent, 0.9); g.shadowBlur = 22;
  g.fill();
  g.shadowBlur = 0;
}

export function clickRing(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  g.beginPath(); g.arc(w / 2, h / 2, Math.min(w, h) / 2 - 14, 0, 7);
  g.strokeStyle = rgba(p.accent, 0.95); g.lineWidth = 10; g.stroke();
}

export function arrow(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  const y = h / 2, head = h * 0.34;
  g.strokeStyle = rgba(o.tone === 'hot' ? p.hot : p.accent, 0.95);
  g.lineWidth = h * 0.10; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(h * 0.2, y); g.lineTo(w - head, y); g.stroke();
  g.beginPath();
  g.moveTo(w - head * 1.5, y - head); g.lineTo(w - h * 0.2, y); g.lineTo(w - head * 1.5, y + head);
  g.stroke();
}

export function cornerBrackets(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  const L = o.length ?? Math.min(w, h) * 0.18, m = o.margin ?? 10;
  g.strokeStyle = rgba(p.accent, o.alpha ?? 0.8);
  g.lineWidth = o.width ?? 5; g.lineCap = 'round';
  const corners = [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]];
  for (const [x, y, sx, sy] of corners) {
    g.beginPath();
    g.moveTo(x + sx * L, y); g.lineTo(x, y); g.lineTo(x, y + sy * L);
    g.stroke();
  }
}

/* ------------------------------------------------------------------ *
 *  Кольцо прогресса — для «загрузки», процентов, таймеров
 * ------------------------------------------------------------------ */
export function progressRing(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
  g.lineWidth = R * 0.16; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, R, 0, 7);
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.stroke();
  g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (o.t ?? 0));
  g.strokeStyle = rgba(p.accent, 0.95); g.stroke();
  if (o.label) {
    g.font = `800 ${R * 0.5}px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = rgba(p.ink, 0.95);
    g.fillText(o.label, cx, cy + 2);
    g.textAlign = 'left';
  }
}

/* ------------------------------------------------------------------ *
 *  Разделительная линия со свечением к центру
 * ------------------------------------------------------------------ */
export function rule(g, w, h, o = {}) {
  const p = palette(o.palette);
  g.clearRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, rgba(p.accent, 0));
  gr.addColorStop(0.5, rgba(p.accent, 0.9));
  gr.addColorStop(1, rgba(p.accent, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}

export const elements = {
  glassPanel, browserWindow, button, logRow, codePane, chipRow, terminal,
  statTile, quoteCard, phoneFrame, cursorArrow, clickRing, arrow,
  cornerBrackets, progressRing, rule,
};
