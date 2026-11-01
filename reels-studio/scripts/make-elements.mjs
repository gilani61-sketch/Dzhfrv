#!/usr/bin/env node
/**
 * Генератор графических элементов библиотеки.
 * Всё рисуется кодом — ничего не скачивается, прав ни у кого спрашивать не нужно.
 * Цвет задаётся при вставке через currentColor, поэтому один файл работает
 * в любом регистре.
 *   node scripts/make-elements.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public/library/elements');
fs.mkdirSync(OUT, { recursive: true });

/** детерминированный шум: один и тот же сид — один и тот же файл */
const rnd = (n, seed = 1) => {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">${body}</svg>`;

const files = {};

/* ── штамп круглый: текст по кругу ───────────────────────────────── */
const roundStamp = (top, bottom, seed) => {
  const S = 300, c = S / 2, R = 128;
  const ring = (r, sw, dash) =>
    `<circle cx="${c}" cy="${c}" r="${r}" stroke="currentColor" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const arc = (r, flip) => flip
    ? `M ${c - r} ${c} A ${r} ${r} 0 0 0 ${c + r} ${c}`
    : `M ${c - r} ${c} A ${r} ${r} 0 0 1 ${c + r} ${c}`;
  return svg(S, S, `
<g opacity="0.92">
  ${ring(R, 5)}${ring(R - 13, 2)}${ring(R - 46, 2.5, '7 6')}
  <defs>
    <path id="t${seed}" d="${arc(R - 26, false)}"/>
    <path id="b${seed}" d="${arc(R - 26, true)}"/>
  </defs>
  <text font-family="Oswald, Arial Narrow, sans-serif" font-size="26" font-weight="600"
        letter-spacing="5" fill="currentColor">
    <textPath href="#t${seed}" startOffset="50%" text-anchor="middle">${top}</textPath>
  </text>
  <text font-family="Oswald, Arial Narrow, sans-serif" font-size="22" font-weight="500"
        letter-spacing="4" fill="currentColor">
    <textPath href="#b${seed}" startOffset="50%" text-anchor="middle">${bottom}</textPath>
  </text>
  <path d="M ${c - 34} ${c} L ${c + 34} ${c}" stroke="currentColor" stroke-width="3"/>
  <path d="M ${c - 10} ${c - 16} L ${c} ${c - 26} L ${c + 10} ${c - 16}" stroke="currentColor" stroke-width="3"/>
</g>`);
};
files['stamp-archive.svg'] = roundStamp('АРХИВ · ARCHIVE', 'ПОДЛИННИК', 1);
files['stamp-checked.svg'] = roundStamp('ПРОВЕРЕНО', 'ФАКТ · FACT', 2);

/* ── штамп прямоугольный, с неровным краем ──────────────────────── */
const rectStamp = (label, seed, W = 420) => {
  const H = 130;
  let d = '';
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const jx = (rnd(i, seed) - 0.5) * 5;
    d += `${i ? 'L' : 'M'} ${8 + t * (W - 16) + jx} ${8 + (rnd(i, seed + 9) - 0.5) * 5} `;
  }
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    d += `L ${W - 8 + (rnd(i, seed + 3) - 0.5) * 5} ${8 + t * (H - 16)} `;
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    d += `L ${8 + t * (W - 16)} ${H - 8 + (rnd(i, seed + 5) - 0.5) * 5} `;
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    d += `L ${8 + (rnd(i, seed + 7) - 0.5) * 5} ${8 + t * (H - 16)} `;
  }
  return svg(W, H, `
<g opacity="0.9">
  <path d="${d} Z" stroke="currentColor" stroke-width="6"/>
  <text x="${W / 2}" y="${H / 2 + 13}" text-anchor="middle" fill="currentColor"
        font-family="Oswald, Arial Narrow, sans-serif" font-size="${Math.min(44, (W - 60) / (label.length * 0.62))}" font-weight="700"
        letter-spacing="6">${label}</text>
</g>`);
};
files['stamp-origin.svg'] = rectStamp('ПРОИСХОЖДЕНИЕ', 11, 620);
files['stamp-no-1.svg'] = rectStamp('№ 1', 13, 240);

/* ── угловые метки кадра ────────────────────────────────────────── */
files['corner-marks.svg'] = (() => {
  const W = 1080, H = 1920, m = 48, L = 92, sw = 3;
  const corner = (x, y, dx, dy) =>
    `<path d="M ${x} ${y + dy * L} L ${x} ${y} L ${x + dx * L} ${y}" stroke="currentColor" stroke-width="${sw}"/>`;
  return svg(W, H, `<g opacity="0.75">
  ${corner(m, m, 1, 1)}${corner(W - m, m, -1, 1)}
  ${corner(m, H - m, 1, -1)}${corner(W - m, H - m, -1, -1)}
</g>`);
})();

/* ── двойная типографская линейка ───────────────────────────────── */
files['rule-double.svg'] = svg(900, 16, `
<path d="M0 3 H900" stroke="currentColor" stroke-width="4"/>
<path d="M0 13 H900" stroke="currentColor" stroke-width="1.5"/>`);

files['rule-dotted.svg'] = svg(900, 8, `
<path d="M0 4 H900" stroke="currentColor" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>`);

/* ── типографский разделитель-орнамент ──────────────────────────── */
files['divider-ornament.svg'] = svg(520, 60, `
<g stroke="currentColor" stroke-width="2.5" opacity="0.9">
  <path d="M10 30 H190"/><path d="M330 30 H510"/>
  <path d="M230 30 l30 -16 l30 16 l-30 16 Z" fill="currentColor" stroke="none" opacity="0.9"/>
  <circle cx="208" cy="30" r="4" fill="currentColor" stroke="none"/>
  <circle cx="312" cy="30" r="4" fill="currentColor" stroke="none"/>
</g>`);

/* ── перфорация киноплёнки ──────────────────────────────────────── */
files['sprocket-strip.svg'] = (() => {
  const W = 120, H = 1920, n = 24, hh = H / n;
  let holes = '';
  for (let i = 0; i < n; i++) {
    holes += `<rect x="30" y="${i * hh + hh * 0.3}" width="60" height="${hh * 0.4}" rx="8" fill="currentColor"/>`;
  }
  return svg(W, H, `<g opacity="0.9">${holes}</g>`);
})();

/* ── рисованная стрелка ─────────────────────────────────────────── */
files['arrow-hand.svg'] = svg(360, 180, `
<g stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
  <path d="M20 150 C 90 40, 190 20, 300 48"/>
  <path d="M300 48 L 258 28"/>
  <path d="M300 48 L 268 86"/>
</g>`);

files['arrow-straight.svg'] = svg(320, 90, `
<g stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none">
  <path d="M14 45 H286"/><path d="M240 16 L290 45 L240 74"/>
</g>`);

/* ── кусок скотча ───────────────────────────────────────────────── */
files['tape.svg'] = (() => {
  const W = 300, H = 92;
  const edge = (y, seed) => {
    let d = `M 0 ${y}`;
    for (let i = 1; i <= 14; i++) d += ` L ${(W / 14) * i} ${y + (rnd(i, seed) - 0.5) * 9}`;
    return d;
  };
  const edgeBack = (y, seed) => {
    let d = '';
    for (let i = 14; i >= 0; i--) d += ` L ${(W / 14) * i} ${y + (rnd(i, seed) - 0.5) * 9}`;
    return d;
  };
  return svg(W, H, `
<path d="${edge(14, 21)}${edgeBack(H - 14, 31)} Z" fill="currentColor" opacity="0.3"/>
<path d="${edge(14, 21)}" stroke="currentColor" stroke-width="1.5" opacity="0.45" fill="none"/>
<path d="M 0 ${H - 14}${edgeBack(H - 14, 31)}" stroke="currentColor" stroke-width="1.5" opacity="0.45" fill="none"/>`);
})();

/* ── скрепка ────────────────────────────────────────────────────── */
files['paperclip.svg'] = svg(120, 260, `
<g stroke="currentColor" stroke-width="9" fill="none" stroke-linecap="round">
  <path d="M38 210 V62 a22 22 0 0 1 44 0 v150 a38 38 0 0 1 -76 0 V72"/>
</g>`);

/* ── лучи старой рекламы ────────────────────────────────────────── */
files['burst.svg'] = (() => {
  const S = 900, c = S / 2, n = 28;
  let rays = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / n / 2;
    rays += `<path d="M ${c} ${c} L ${c + Math.cos(a0) * c} ${c + Math.sin(a0) * c} L ${c + Math.cos(a1) * c} ${c + Math.sin(a1) * c} Z" fill="currentColor"/>`;
  }
  return svg(S, S, `<g opacity="0.85">${rays}</g>`);
})();

/* ── лента-баннер ───────────────────────────────────────────────── */
files['ribbon.svg'] = svg(760, 150, `
<g fill="currentColor">
  <path d="M90 22 H670 L706 75 L670 128 H90 L54 75 Z" opacity="0.95"/>
  <path d="M0 40 L54 75 L0 110 Z" opacity="0.55"/>
  <path d="M760 40 L706 75 L760 110 Z" opacity="0.55"/>
</g>`);

/* ── рамка с уголками ───────────────────────────────────────────── */
files['frame-deco.svg'] = svg(900, 620, `
<g stroke="currentColor" stroke-width="3" fill="none" opacity="0.9">
  <rect x="16" y="16" width="868" height="588"/>
  <rect x="30" y="30" width="840" height="560" stroke-width="1.2"/>
  <path d="M16 70 L70 16"/><path d="M884 70 L830 16"/>
  <path d="M16 550 L70 604"/><path d="M884 550 L830 604"/>
</g>`);

/* ── каталожная карточка с дырочкой ─────────────────────────────── */
files['index-card.svg'] = svg(720, 440, `
<g>
  <rect x="6" y="6" width="708" height="428" rx="4" fill="currentColor" opacity="0.1"/>
  <rect x="6" y="6" width="708" height="428" rx="4" stroke="currentColor" stroke-width="2.5"/>
  <path d="M6 96 H714" stroke="currentColor" stroke-width="2"/>
  ${[0, 1, 2, 3, 4].map((i) => `<path d="M48 ${150 + i * 56} H672" stroke="currentColor" stroke-width="1" opacity="0.4"/>`).join('')}
  <circle cx="360" cy="400" r="17" stroke="currentColor" stroke-width="2.5"/>
</g>`);

/* ── запись + каталог ────────────────────────────────────────────── */
const catalog = {};
for (const [name, body] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), body.trim() + '\n');
  const m = body.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  catalog[name] = { w: Number(m[1]), h: Number(m[2]), aspect: Number((Number(m[1]) / Number(m[2])).toFixed(4)) };
}
fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`элементов: ${Object.keys(files).length} → ${path.relative(root, OUT)}`);
console.log(Object.keys(files).sort().join('\n'));
