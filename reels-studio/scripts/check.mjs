#!/usr/bin/env node
/**
 * Проверка сценариев перед рендером: то, что схема проверить не может.
 *   npm run check
 * Смотрит: существуют ли файлы, не слишком ли длинные подписи,
 * выдержан ли ритм, не вылезает ли ролик за формат.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOT_MIN = 1.5, CAPTION_MAX_WORDS = 6, REEL_MIN = 15, REEL_MAX = 60;

const DEFAULT_DUR = { cover: 3, footage: 3, still: 3, statement: 2.5, numeral: 2.5, quote: 4, collage: 3, split: 3.5, gallery: 4, outro: 3 };
const TRANS = { cut: 0, dip: 6, flash: 7, fade: 12, paper: 16, slide: 14, halftone: 18, zoom: 14, shutter: 14, filmroll: 16 };

const mediaRefs = (s) => {
  const out = [];
  if (s.src) out.push(s.src);
  if (s.bg?.src) out.push(s.bg.src);
  if (s.top?.src) out.push(s.top.src);
  if (s.bottom?.src) out.push(s.bottom.src);
  (s.layers ?? []).forEach((l) => l.src && out.push(l.src));
  return out.filter((p) => !/^https?:/.test(p));
};

let problems = 0, warnings = 0;
const files = fs.readdirSync(path.join(root, 'content'))
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'));

if (files.length === 0) { console.log('В content/ пока нет сценариев.'); process.exit(0); }

for (const file of files) {
  const reel = JSON.parse(fs.readFileSync(path.join(root, 'content', file), 'utf8'));
  const say = { err: (m) => { problems++; console.log(`  ✗ ${m}`); },
                warn: (m) => { warnings++; console.log(`  ! ${m}`); } };
  console.log(`\n${file}  [${reel.style ?? 'chronicle'}]`);

  let frames = 0, prev = null, sameLen = 1;
  reel.scenes.forEach((s, i) => {
    const where = `сцена ${i + 1} (${s.type})`;
    const dur = s.dur ?? DEFAULT_DUR[s.type] ?? 3;
    if (dur < SHOT_MIN) say.err(`${where}: ${dur} c — короче минимального плана ${SHOT_MIN} c`);
    frames += Math.round(dur * 30) - (i === 0 ? 0 : (TRANS[s.in] ?? 0));

    if (s.caption) {
      const w = s.caption.trim().split(/\s+/).length;
      if (w > CAPTION_MAX_WORDS) say.warn(`${where}: подпись из ${w} слов — разбей на две сцены`);
    }
    for (const ref of mediaRefs(s)) {
      if (!fs.existsSync(path.join(root, 'public', ref))) say.err(`${where}: нет файла public/${ref}`);
    }
    if (s.in && !(s.in in TRANS)) say.err(`${where}: неизвестный переход "${s.in}"`);

    if (prev === dur) { sameLen++; if (sameLen === 4) say.warn(`сцены ${i - 2}–${i + 1}: четыре плана подряд по ${dur} c — ритм станет метрономом`); }
    else sameLen = 1;
    prev = dur;
  });

  for (const a of ['voice', 'music']) {
    if (reel[a] && !fs.existsSync(path.join(root, 'public', reel[a]))) say.err(`нет файла public/${reel[a]} (${a})`);
  }
  if (reel.scenes.at(-1)?.type !== 'outro') say.warn('последняя сцена не outro — ролик закончится без подписи аккаунта');

  const sec = frames / 30;
  if (sec < REEL_MIN) say.warn(`всего ${sec.toFixed(1)} c — коротко для объяснения`);
  if (sec > REEL_MAX) say.warn(`всего ${sec.toFixed(1)} c — длинно для Reels`);
  console.log(`  длительность ${sec.toFixed(1)} c · сцен ${reel.scenes.length}`);
}

console.log(`\n${problems ? `ошибок: ${problems}` : 'ошибок нет'}${warnings ? `, предупреждений: ${warnings}` : ''}`);
process.exit(problems ? 1 : 0);
