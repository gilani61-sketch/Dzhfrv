#!/usr/bin/env node
/**
 * Озвучка через ElevenLabs.
 *
 *   node tools/voice.mjs list                      — голоса аккаунта
 *   node tools/voice.mjs models                    — доступные модели
 *   node tools/voice.mjs say --film <имя>          — озвучить films/<имя>/voice.json
 *   node tools/voice.mjs say --film <имя> --role narrator --dry
 *
 * Нужны: ELEVENLABS_API_KEY в окружении и открытый доступ к api.elevenlabs.io
 * в сетевой политике среды. Реплики кладутся в out/voice/<film>/<id>.wav,
 * собранная дорожка — в out/<film>.vo.wav (выровнена по полю "at").
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'library/voice/voices.json'), 'utf8'));
const KEY = process.env.ELEVENLABS_API_KEY ?? '';

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n, d = null) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
const has = n => argv.includes(n);

function need(cond, msg) { if (!cond) { console.error(msg); process.exit(1); } }

async function api(route, init = {}) {
  need(KEY, 'нет ELEVENLABS_API_KEY — добавь ключ в секреты среды');
  let res;
  try {
    res = await fetch(`${REG.api}${route}`, {
      ...init,
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (e) {
    console.error(`не достучался до ${REG.api}: ${e.message}`);
    console.error('скорее всего сетевая политика среды не пускает api.elevenlabs.io —');
    console.error('добавь хост в Allowed domains в настройках облачной среды.');
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 400)}`);
    process.exit(3);
  }
  return res;
}

async function cmdList() {
  const data = await (await api('/voices')).json();
  for (const v of data.voices ?? []) {
    console.log(`${v.voice_id}  ${v.name}${v.labels?.description ? '  — ' + v.labels.description : ''}`);
  }
  console.log(`\nвсего ${data.voices?.length ?? 0}. Подставь нужный voice_id в library/voice/voices.json`);
}

async function cmdModels() {
  const data = await (await api('/models')).json();
  for (const m of data) console.log(`${m.model_id}  ${m.name}  langs:${m.languages?.length ?? '?'}`);
}

async function tts(text, role, model, outMp3) {
  const r = REG.roles[role];
  need(r, `нет роли "${role}" в library/voice/voices.json`);
  need(r.voice_id, `у роли "${role}" пустой voice_id — заполни его (node tools/voice.mjs list)`);
  const res = await api(`/text-to-speech/${r.voice_id}`, {
    method: 'POST',
    headers: { accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, voice_settings: r.settings }),
  });
  fs.writeFileSync(outMp3, Buffer.from(await res.arrayBuffer()));
}

async function cmdSay() {
  const film = flag('--film', 'reverse-api-engineer');
  const scriptPath = path.join(ROOT, 'films', film, 'voice.json');
  need(fs.existsSync(scriptPath), `нет файла ${path.relative(ROOT, scriptPath)}`);
  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
  const role = flag('--role', script.role ?? 'self');
  const model = flag('--model', script.model ?? REG.defaultModel);
  const dir = path.join(ROOT, 'out', 'voice', film);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`${film}: ${script.lines.length} реплик, роль "${role}", модель ${model}`);
  if (has('--dry')) {
    for (const l of script.lines) console.log(`  ${String(l.at).padStart(6)}s  ${l.text}`);
    return;
  }

  const made = [];
  for (const line of script.lines) {
    const mp3 = path.join(dir, `${line.id}.mp3`);
    const wav = path.join(dir, `${line.id}.wav`);
    await tts(line.text, role, model, mp3);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-ar', '48000', '-ac', '1', wav]);
    const dur = Number(execFileSync('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString().trim());
    made.push({ ...line, file: path.relative(ROOT, wav), duration: dur });
    console.log(`  ✓ ${line.id}  ${dur.toFixed(2)}s`);
  }

  // одна дорожка, выровненная по таймлайну ролика
  const total = Math.max(...made.map(l => l.at + l.duration)) + 0.5;
  const inputs = made.flatMap(l => ['-i', path.join(ROOT, l.file)]);
  const delays = made.map((l, i) => `[${i}:a]adelay=${Math.round(l.at * 1000)}|${Math.round(l.at * 1000)}[d${i}]`).join(';');
  const mixIn = made.map((_, i) => `[d${i}]`).join('');
  const out = path.join(ROOT, 'out', `${film}.vo.wav`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs,
    '-filter_complex', `${delays};${mixIn}amix=inputs=${made.length}:normalize=0,apad,atrim=0:${total.toFixed(2)},aresample=48000[a]`,
    '-map', '[a]', '-ac', '1', out]);

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ film, role, model, lines: made }, null, 2));
  console.log(`→ ${path.relative(ROOT, out)}  (${total.toFixed(1)}s)`);
  console.log('дальше: python3 films/' + film + '/sound.py  — он подмешает голос и пригнёт музыку под него');
}

switch (cmd) {
  case 'list': await cmdList(); break;
  case 'models': await cmdModels(); break;
  case 'say': await cmdSay(); break;
  default:
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].split('/**')[1].trim());
}
