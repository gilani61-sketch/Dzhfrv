/**
 * Frame renderer: drives a film in headless Chromium and pipes the frames
 * straight into ffmpeg. No intermediate PNGs on disk.
 *
 *   node tools/render.mjs                          # render the default film
 *   node tools/render.mjs --film reverse-api-engineer
 *   node tools/render.mjs --preview 1.9,7.3,14.2   # contact-sheet frames only
 *   node tools/render.mjs -o out/custom.mp4
 */
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const { chromium } = pw;
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const argv = process.argv.slice(2);
const flag = (name, def = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? def : argv[i + 1];
};
const film = flag('--film', 'reverse-api-engineer');
const preview = argv.includes('--preview') ? flag('--preview').split(',').map(Number) : null;
const outFile = path.resolve(ROOT, flag('-o', `out/${film}.silent.mp4`));

if (!fs.existsSync(path.join(ROOT, 'films', film, 'index.html'))) {
  console.error(`no such film: films/${film}/index.html`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--disable-frame-rate-limit', '--force-device-scale-factor=1'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${PORT}/films/${film}/index.html`);
await page.waitForFunction('window.__ready === true', { timeout: 180000 });

const meta = await page.evaluate(() => ({ fps: __film.FPS, total: __film.total }));
console.log(`${film}: ${meta.total} frames @ ${meta.fps}fps`);

if (preview) {
  const dir = path.join(ROOT, 'out', 'preview', film);
  fs.mkdirSync(dir, { recursive: true });
  for (const sec of preview) {
    await page.evaluate(i => __film.renderFrame(i), Math.round(sec * meta.fps));
    await page.screenshot({ path: path.join(dir, `t${String(sec).padStart(6, '0')}.png`) });
    console.log('preview', sec + 's');
  }
  console.log('→', path.relative(ROOT, dir));
} else {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-r', String(meta.fps),
    '-i', 'pipe:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
    '-r', String(meta.fps), outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const t0 = Date.now();
  for (let i = 0; i < meta.total; i++) {
    await page.evaluate(n => __film.renderFrame(n), i);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 15 === 0) {
      const el = (Date.now() - t0) / 1000;
      const eta = el / Math.max(1, i) * (meta.total - i);
      fs.writeFileSync(path.join(ROOT, 'out', '.progress'),
        `${i}/${meta.total}  ${el.toFixed(0)}s elapsed  eta ${(eta / 60).toFixed(1)}m\n`);
    }
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('→', path.relative(ROOT, outFile));
}
await browser.close();
server.close();
process.exit(0);
