/**
 * Знаки. SVG тонируются на лету и подгружаются как картинки,
 * чтобы их можно было рисовать в canvas вместе с остальным.
 */
const NAMES = ['mark-reverse', 'mark-aperture', 'mark-node', 'mark-spark', 'mark-shield'];
const cache = new Map();

const BASE = new URL('.', import.meta.url).href;

export async function loadMark(name, color = '#ffffff') {
  const key = name + '|' + color;
  if (cache.has(key)) return cache.get(key);
  const svg = await (await fetch(`${BASE}${name}.svg`)).text();
  const tinted = svg.replace(/<svg /, `<svg color="${color}" `);
  const img = new Image();
  const p = new Promise((res, rej) => { img.onload = () => res(img); img.onerror = rej; });
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tinted);
  await p;
  cache.set(key, img);
  return img;
}

/** Прогрев: вызвать один раз в boot(), дальше рисовать синхронно. */
export async function preloadMarks(color = '#ffffff', names = NAMES) {
  await Promise.all(names.map(n => loadMark(n, color)));
}

export function drawMark(g, w, h, { name, color = '#ffffff', pad = 0 } = {}) {
  const img = cache.get(name + '|' + color);
  if (!img) return false;
  g.clearRect(0, 0, w, h);
  const s = Math.min(w, h) - pad * 2;
  g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s);
  return true;
}

export const markNames = NAMES;
