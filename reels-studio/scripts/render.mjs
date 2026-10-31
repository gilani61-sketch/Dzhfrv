#!/usr/bin/env node
/**
 * Рендер роликов.
 *   npm run render                 — все сценарии из content/
 *   npm run render -- demo-collage — один
 *   npm run render -- --preview    — быстрый черновик в 540×960
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition, getCompositions } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const preview = args.includes('--preview');
const ids = args.filter((a) => !a.startsWith('--'));

const browserExecutable = fs.existsSync('/opt/pw-browsers/chromium')
  ? '/opt/pw-browsers/chromium' : undefined;

const t0 = Date.now();
console.log('— собираю бандл…');
const serveUrl = await bundle({
  entryPoint: path.join(root, 'src/index.ts'),
  onProgress: (p) => process.stdout.write(`\r  бандл ${p}%   `),
});
console.log('');

const all = await getCompositions(serveUrl, { browserExecutable });
const targets = all.filter((c) => c.id !== 'style-guide' && (ids.length === 0 || ids.includes(c.id)));

if (targets.length === 0) {
  console.error('Нечего рендерить. Доступно:', all.map((c) => c.id).join(', '));
  process.exit(1);
}

fs.mkdirSync(path.join(root, 'out'), { recursive: true });

for (const c of targets) {
  const composition = await selectComposition({ serveUrl, id: c.id, browserExecutable });
  const scale = preview ? 0.5 : 1;
  const outPath = path.join(root, 'out', `${c.id}${preview ? '.preview' : ''}.mp4`);
  console.log(`— ${c.id}: ${composition.durationInFrames} кадров (${(composition.durationInFrames / composition.fps).toFixed(1)} c)`);
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outPath,
    browserExecutable,
    scale,
    jpegQuality: preview ? 70 : 90,
    crf: preview ? 28 : 18,
    concurrency: 4,
    chromiumOptions: { gl: 'swangle', disableWebSecurity: true },
    onProgress: ({ progress }) => {
      const pc = Math.round(progress * 100);
      if (pc !== last) { last = pc; process.stdout.write(`\r  рендер ${pc}%   `); }
    },
  });
  console.log(`\n  → ${path.relative(root, outPath)}`);
}
console.log(`готово за ${((Date.now() - t0) / 1000).toFixed(0)} c`);
