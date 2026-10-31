#!/usr/bin/env node
/**
 * Контактный лист: N опорных кадров ролика одной картинкой.
 * Быстрая проверка композиции без полного рендера.
 *   node scripts/sheet.mjs demo-chronicle 12
 */
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
const count = Number(process.argv[3] ?? 12);
if (!id) { console.error('укажи id композиции'); process.exit(1); }

const browserExecutable = fs.existsSync('/opt/pw-browsers/chromium')
  ? '/opt/pw-browsers/chromium' : undefined;

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts') });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
const tmp = fs.mkdtempSync('/tmp/sheet-');

for (let i = 0; i < count; i++) {
  const frame = Math.round((composition.durationInFrames - 1) * (i / (count - 1 || 1)));
  await renderStill({
    composition, serveUrl, frame, browserExecutable, scale: 0.3,
    output: path.join(tmp, `f${String(i).padStart(2, '0')}.png`),
    chromiumOptions: { gl: 'swangle', disableWebSecurity: true },
  });
  process.stdout.write(`\r  кадр ${i + 1}/${count}   `);
}
const out = path.join(root, 'out', `${id}.sheet.png`);
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync('ffmpeg', ['-v', 'error', '-pattern_type', 'glob', '-i', path.join(tmp, '*.png'),
  '-vf', `tile=${Math.min(count, 6)}x${Math.ceil(count / 6)}`, '-frames:v', '1', out, '-y']);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n→ ${path.relative(root, out)}`);
