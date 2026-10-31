import { roundRect } from './engine.js';

const FONT = "'Inter Display','Inter',sans-serif";
const MONO = "'JetBrains Mono',monospace";

function glassPanel(g, w, h, r, opts = {}) {
  const grad = g.createLinearGradient(0, 0, w * 0.4, h);
  grad.addColorStop(0, opts.top ?? 'rgba(28,38,58,0.92)');
  grad.addColorStop(1, opts.bottom ?? 'rgba(10,15,26,0.92)');
  roundRect(g, 2, 2, w - 4, h - 4, r);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 2.5;
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, opts.edgeA ?? 'rgba(150,195,255,0.55)');
  bg.addColorStop(0.5, 'rgba(120,160,230,0.12)');
  bg.addColorStop(1, opts.edgeB ?? 'rgba(90,140,220,0.40)');
  g.strokeStyle = bg;
  g.stroke();
  // top sheen
  const sheen = g.createLinearGradient(0, 0, 0, h * 0.35);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  roundRect(g, 2, 2, w - 4, h * 0.35, r);
  g.fillStyle = sheen;
  g.fill();
}

/* ---------------- browser window mock ---------------- */
export function drawBrowser(g, w, h, state = {}) {
  g.clearRect(0, 0, w, h);
  glassPanel(g, w, h, 34);

  // chrome bar
  g.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(g, 2, 2, w - 4, 86, 34); g.fill();
  const dots = ['#ff5f57', '#febc2e', '#28c840'];
  dots.forEach((c, i) => {
    g.beginPath(); g.arc(44 + i * 30, 45, 9, 0, 7); g.fillStyle = c; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
  });
  roundRect(g, 170, 25, w - 220, 42, 21);
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill();
  g.font = `500 30px ${MONO}`;
  g.fillStyle = 'rgba(190,215,255,0.88)';
  g.textBaseline = 'middle';
  g.fillText(state.url ?? 'midjourney.com', 198, 47);

  if (state.variant === 'redesign') {
    // same product, different skin — the point of the beat
    g.fillStyle = 'rgba(255,255,255,0.86)';
    g.font = `800 42px ${FONT}`;
    g.fillText('Create', 56, 168);
    for (let i = 0; i < 3; i++) {
      roundRect(g, 56 + i * 150, 196, 132, 132, 22);
      g.fillStyle = `rgba(${90 + i * 20},${130 + i * 10},${220 - i * 20},0.22)`; g.fill();
      g.strokeStyle = 'rgba(150,190,255,0.35)'; g.lineWidth = 1.5; g.stroke();
    }
    roundRect(g, 56, 372, w - 112, 76, 38);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
    g.font = `500 32px ${FONT}`;
    g.fillStyle = 'rgba(200,220,255,0.55)';
    g.fillText('Describe your image…', 92, 410);
    roundRect(g, w - 236, 388, 160, 44, 22);
    g.fillStyle = 'rgba(120,180,255,0.92)'; g.fill();
    g.fillStyle = '#071018'; g.font = `800 30px ${FONT}`;
    g.fillText('Generate', w - 212, 411);
    return;
  }

  // prompt field
  roundRect(g, 56, 150, w - 112, 92, 46);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill();
  g.strokeStyle = 'rgba(140,180,255,0.28)'; g.lineWidth = 1.5; g.stroke();
  g.font = `500 34px ${FONT}`;
  g.fillStyle = 'rgba(214,230,255,0.94)';
  const typed = state.typed ?? 'собор из света, кинематографично --ar 9:16';
  g.fillText(typed, 96, 197);
  if (state.caret) {
    const tw = g.measureText(typed).width;
    g.fillStyle = 'rgba(160,210,255,0.95)';
    g.fillRect(100 + tw, 176, 3, 42);
  }

  // generate button
  const hot = state.press ?? 0;
  roundRect(g, w - 300, 272, 244, 72, 36);
  const bg = g.createLinearGradient(w - 300, 272, w - 56, 344);
  bg.addColorStop(0, `rgba(${110 + hot * 100},${175 + hot * 60},255,${0.90})`);
  bg.addColorStop(1, `rgba(${70 + hot * 80},${125 + hot * 80},245,${0.90})`);
  g.fillStyle = bg; g.fill();
  g.fillStyle = '#05101c'; g.font = `800 34px ${FONT}`;
  g.fillText('Generate', w - 262, 310);

  // result tiles
  for (let i = 0; i < 4; i++) {
    const x = 56 + (i % 2) * 172, y = 272 + Math.floor(i / 2) * 172;
    roundRect(g, x, y, 150, 150, 20);
    const t = g.createLinearGradient(x, y, x + 150, y + 150);
    t.addColorStop(0, `rgba(${60 + i * 25},${110 + i * 12},${200},0.30)`);
    t.addColorStop(1, 'rgba(20,30,60,0.30)');
    g.fillStyle = t; g.fill();
    g.strokeStyle = 'rgba(150,190,255,0.22)'; g.lineWidth = 1.2; g.stroke();
  }
}

/* ---------------- network log ---------------- */
export const LOG_LINES = [
  ['POST', '/api/app/submit-jobs', '202'],
  ['GET ', '/api/app/job-status', '200'],
  ['WSS ', '/ws?auth=…', 'open'],
  ['GET ', '/api/app/recent-jobs', '200'],
  ['POST', '/api/app/variation', '202'],
  ['GET ', '/api/app/user-info', '200'],
  ['POST', '/api/app/upscale', '202'],
  ['GET ', '/api/app/image/0.webp', '200'],
];

export function drawLogRow(g, w, h, row, reveal = 1) {
  g.clearRect(0, 0, w, h);
  const [m, path, code] = row;
  g.font = `600 37px ${MONO}`;
  g.textBaseline = 'middle';
  const y = h / 2;
  const colors = { POST: '#8fd0ff', 'GET ': '#9fb5d8', 'WSS ': '#b79bff' };
  g.globalAlpha = reveal;
  g.fillStyle = colors[m] ?? '#9fb5d8';
  g.fillText(m, 0, y);
  g.fillStyle = 'rgba(226,238,255,0.95)';
  g.fillText(path, 116, y);
  const ok = code === '202' || code === '200' || code === 'open';
  g.fillStyle = ok ? 'rgba(126,231,178,0.95)' : 'rgba(255,160,120,0.95)';
  g.font = `600 32px ${MONO}`;
  g.fillText(code, w - 120, y);
  g.globalAlpha = 1;
}

/* ---------------- code panel ---------------- */
const CODE = [
  [['from ', 'kw'], ['mj ', 'id'], ['import ', 'kw'], ['Client', 'cls']],
  [],
  [['c ', 'id'], ['= ', 'op'], ['Client', 'cls'], ['(', 'op'], ['SESSION', 'const'], [')', 'op']],
  [['job ', 'id'], ['= ', 'op'], ['c', 'id'], ['.', 'op'], ['imagine', 'fn'], ['(', 'op'], ['"собор"', 'str'], [')', 'op']],
  [['img ', 'id'], ['= ', 'op'], ['job', 'id'], ['.', 'op'], ['wait', 'fn'], ['()', 'op'], ['.', 'op'], ['url', 'id']],
];

const SYN = {
  kw: '#ff9ec4', id: '#dbe7ff', cls: '#8fd7ff', op: '#8fa2c0',
  fn: '#9ee6b4', str: '#ffd79a', const: '#c7a6ff', cmt: '#5f7391',
};

export function drawCode(g, w, h, progress = 1) {
  g.clearRect(0, 0, w, h);
  glassPanel(g, w, h, 30, { top: 'rgba(14,20,34,0.95)', bottom: 'rgba(7,11,20,0.95)' });

  g.font = `600 26px ${MONO}`;
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(g, 2, 2, w - 4, 70, 30); g.fill();
  g.fillStyle = 'rgba(160,190,230,0.75)';
  g.fillText('client.py', 34, 37);
  g.fillStyle = 'rgba(126,231,178,0.85)';
  g.fillText('generated', w - 170, 37);

  const totalChars = CODE.reduce((s, l) => s + l.reduce((a, t) => a + t[0].length, 0), 0);
  let budget = Math.ceil(totalChars * progress);

  g.font = `600 40px ${MONO}`;
  CODE.forEach((line, li) => {
    let x = 56;
    const y = 136 + li * 66;
    g.fillStyle = 'rgba(120,145,180,0.40)';
    g.font = `500 26px ${MONO}`;
    g.fillText(String(li + 1).padStart(2, ' '), 6, y);
    g.font = `600 40px ${MONO}`;
    for (const [txt, kind] of line) {
      if (budget <= 0) return;
      const shown = txt.slice(0, budget);
      budget -= txt.length;
      g.fillStyle = SYN[kind] ?? '#dbe7ff';
      g.fillText(shown, x, y);
      x += g.measureText(txt).width;
      if (shown.length < txt.length) {
        g.fillStyle = 'rgba(160,210,255,0.9)';
        g.fillRect(x - g.measureText(txt.slice(shown.length)).width, y - 20, 3, 40);
        return;
      }
    }
  });
}

/* ---------------- language chips ---------------- */
export function drawChips(g, w, h, labels, lit = 1) {
  g.clearRect(0, 0, w, h);
  g.font = `700 36px ${FONT}`;
  g.textBaseline = 'middle';
  let x = 0;
  labels.forEach((lb, i) => {
    const tw = g.measureText(lb).width;
    const cw = tw + 64;
    const on = i / labels.length < lit;
    roundRect(g, x, h / 2 - 34, cw, 68, 34);
    g.fillStyle = on ? 'rgba(90,150,255,0.20)' : 'rgba(255,255,255,0.04)';
    g.fill();
    g.strokeStyle = on ? 'rgba(140,195,255,0.55)' : 'rgba(255,255,255,0.10)';
    g.lineWidth = 1.6; g.stroke();
    g.fillStyle = on ? 'rgba(226,240,255,0.98)' : 'rgba(180,200,225,0.35)';
    g.fillText(lb, x + 32, h / 2 + 1);
    x += cw + 20;
  });
}

/* ---------------- terminal prompt ---------------- */
export function drawPrompt(g, w, h, text, shown, caret) {
  g.clearRect(0, 0, w, h);
  glassPanel(g, w, h, 28, { top: 'rgba(12,18,30,0.94)', bottom: 'rgba(6,10,18,0.94)' });
  g.font = `600 40px ${MONO}`;
  g.textBaseline = 'top';
  g.fillStyle = 'rgba(126,231,178,0.95)';
  g.fillText('▸', 40, 50);

  const words = text.slice(0, shown).split(' ');
  let x = 92, y = 48;
  const maxX = w - 60;
  g.fillStyle = 'rgba(228,240,255,0.97)';
  for (const word of words) {
    const ww = g.measureText(word + ' ').width;
    if (x + ww > maxX) { x = 92; y += 58; }
    g.fillText(word + ' ', x, y);
    x += ww;
  }
  if (caret) {
    g.fillStyle = 'rgba(160,210,255,0.95)';
    g.fillRect(x + 2, y + 6, 16, 38);
  }
}

/* ---------------- closing mark ---------------- */
export function drawMark(g, w, h, t) {
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.34;
  g.lineCap = 'round';

  // outer ring, drawn in reverse
  g.beginPath();
  g.arc(cx, cy, R, -Math.PI * 0.5, -Math.PI * 0.5 - Math.PI * 1.55 * t, true);
  g.strokeStyle = 'rgba(150,200,255,0.95)';
  g.lineWidth = R * 0.11;
  g.stroke();

  // arrowhead
  const a = -Math.PI * 0.5 - Math.PI * 1.55 * t;
  const ax = cx + Math.cos(a) * R, ay = cy + Math.sin(a) * R;
  g.save(); g.translate(ax, ay); g.rotate(a - Math.PI / 2);
  g.beginPath(); g.moveTo(-R * 0.16, R * 0.16); g.lineTo(0, -R * 0.02); g.lineTo(R * 0.16, R * 0.16);
  g.strokeStyle = 'rgba(190,225,255,0.98)'; g.lineWidth = R * 0.1; g.stroke();
  g.restore();

  // inner braces
  g.font = `800 ${R * 0.9}px ${MONO}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(226,240,255,0.95)';
  g.fillText('{ }', cx, cy + R * 0.04);
  g.textAlign = 'left';
}
