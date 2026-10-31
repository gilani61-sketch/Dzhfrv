import pw from '/opt/node-tools/node_modules/playwright/index.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const { chromium } = pw;
const SRC = path.resolve('src');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const f = path.join(SRC, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : req.url.slice(1));
  if (!f.startsWith(SRC) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(8731, r));

const args = process.argv.slice(2);
const previewAt = args.includes('--preview')
  ? args[args.indexOf('--preview') + 1].split(',').map(Number) : null;
const outFile = args.includes('-o') ? args[args.indexOf('-o') + 1] : 'out/reel.mp4';

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--disable-frame-rate-limit', '--force-device-scale-factor=1'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8731/index.html');
await page.waitForFunction('window.__ready === true', { timeout: 120000 });
const meta = await page.evaluate(() => ({ fps: __film.FPS, total: __film.total }));
console.log(`film: ${meta.total} frames @ ${meta.fps}fps`);

if (previewAt) {
  fs.mkdirSync('out/preview', { recursive: true });
  for (const sec of previewAt) {
    const f = Math.round(sec * meta.fps);
    await page.evaluate(i => __film.renderFrame(i), f);
    await page.screenshot({ path: `out/preview/t${String(sec).padStart(5, '0')}.png` });
    console.log('preview', sec + 's');
  }
} else {
  fs.mkdirSync('out', { recursive: true });
  const ff = spawn('ffmpeg', [
    '-y', '-f', 'image2pipe', '-c:v', 'png', '-r', String(meta.fps), '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
    '-r', String(meta.fps), outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const t0 = Date.now();
  for (let i = 0; i < meta.total; i++) {
    await page.evaluate(n => __film.renderFrame(n), i);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 30 === 0) {
      const el = (Date.now() - t0) / 1000;
      const eta = el / Math.max(1, i) * (meta.total - i);
      process.stdout.write(`\rframe ${i}/${meta.total}  ${(el).toFixed(0)}s elapsed  eta ${(eta / 60).toFixed(1)}m   `);
    }
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('\nwrote', outFile);
}
await browser.close();
server.close();
process.exit(0);
