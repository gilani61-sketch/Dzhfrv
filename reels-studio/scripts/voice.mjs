#!/usr/bin/env node
/**
 * Озвучка через ElevenLabs.
 *
 *   node scripts/voice.mjs voices                 список голосов и моделей
 *   node scripts/voice.mjs say <slug>             озвучить сценарий
 *   node scripts/voice.mjs say <slug> --fit       … и подогнать длительности сцен под голос
 *   node scripts/voice.mjs say <slug> --dry       показать, что уйдёт в запрос, ничего не тратя
 *   node scripts/voice.mjs say <slug> --scene 3   переозвучить одну сцену
 *
 * Текст берётся из поля "say" каждой сцены. Каждая сцена синтезируется отдельным
 * файлом — так её длительность известна точно, и можно переозвучить одну, не трогая
 * остальные. Потом всё склеивается в одну дорожку public/media/audio/vo/<slug>.mp3.
 *
 * Переменные окружения:
 *   ELEVENLABS_API_KEY   обязательна
 *   ELEVENLABS_VOICE_ID  голос по умолчанию (можно задать в сценарии полем voiceId)
 *   ELEVENLABS_MODEL     модель, по умолчанию eleven_multilingual_v2
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY;
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
/** хвост тишины после реплики, чтобы склейка не обрезала голос */
const TAIL = 0.35;

const die = (m) => { console.error(m); process.exit(1); };
const needKey = () => KEY || die(
  'Нет ELEVENLABS_API_KEY.\n' +
  '  Linux/macOS:  export ELEVENLABS_API_KEY=...\n' +
  '  Windows:      setx ELEVENLABS_API_KEY "..."  (и перезапустить терминал)');

const api = async (route, init = {}) => {
  const res = await fetch(API + route, {
    ...init,
    headers: { 'xi-api-key': needKey(), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    die(`ElevenLabs ${res.status} на ${route}\n${body.slice(0, 600)}`);
  }
  return res;
};

const durationOf = (file) => Number(execFileSync('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
]).toString().trim());

/* ───────────────────────── voices ───────────────────────── */
async function listVoices() {
  const voices = await (await api('/v2/voices?page_size=100')).json();
  console.log('ГОЛОСА\n');
  for (const v of voices.voices ?? []) {
    const own = v.category === 'cloned' || v.category === 'professional' ? ' ★ твой' : '';
    console.log(`  ${v.voice_id}  ${v.name}${own}`);
    const d = [v.labels?.language, v.labels?.gender, v.labels?.accent, v.labels?.description]
      .filter(Boolean).join(' · ');
    if (d) console.log(`      ${d}`);
  }
  const models = await (await api('/v1/models')).json();
  console.log('\nМОДЕЛИ\n');
  for (const m of models) {
    if (!m.can_do_text_to_speech) continue;
    const ru = (m.languages ?? []).some((l) => l.language_id === 'ru');
    console.log(`  ${m.model_id}${ru ? '  (русский есть)' : ''}  — ${m.name}`);
  }
  console.log('\nПоложи нужный id в ELEVENLABS_VOICE_ID или в поле "voiceId" сценария.');
}

/* ───────────────────────── say ───────────────────────── */
async function speak(slug, { fit, dry, only }) {
  const jsonPath = path.join(root, 'content', `${slug}.json`);
  if (!fs.existsSync(jsonPath)) die(`Нет сценария ${path.relative(root, jsonPath)}`);
  const reel = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const voiceId = reel.voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId && !dry) die('Не задан голос: ELEVENLABS_VOICE_ID или поле "voiceId" в сценарии.\n' +
                            'Список голосов: node scripts/voice.mjs voices');

  const parts = reel.scenes
    .map((s, i) => ({ i, text: (s.say ?? '').trim() }))
    .filter((p) => p.text && (only == null || p.i === only));

  if (parts.length === 0) {
    die('Ни в одной сцене нет поля "say". Добавь текст реплик — см. docs/07-voice.md');
  }

  const chars = parts.reduce((n, p) => n + p.text.length, 0);
  console.log(`${slug}: реплик ${parts.length}, символов ${chars}, модель ${MODEL}`);
  if (dry) {
    parts.forEach((p) => console.log(`  [${p.i + 1}] ${p.text}`));
    console.log('\n--dry: ничего не отправлено, кредиты не потрачены.');
    return;
  }

  const dir = path.join(root, 'public/media/audio/vo', slug);
  fs.mkdirSync(dir, { recursive: true });

  for (const p of parts) {
    const file = path.join(dir, `${String(p.i + 1).padStart(2, '0')}.mp3`);
    const res = await api(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: p.text,
        model_id: MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
      }),
    });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`  [${p.i + 1}] ${durationOf(file).toFixed(2)} c  →  ${path.relative(root, file)}`);
  }

  // склейка всех реплик по порядку сцен, с паузами на сценах без реплики
  const all = reel.scenes.map((s, i) => {
    const f = path.join(dir, `${String(i + 1).padStart(2, '0')}.mp3`);
    return fs.existsSync(f) ? { i, file: f, dur: durationOf(f) } : { i, file: null, dur: 0 };
  });

  const DEFAULT_DUR = { cover: 3, footage: 3, still: 3, statement: 2.5, numeral: 2.5, quote: 4, collage: 3, split: 3.5, gallery: 4, outro: 3 };
  const sceneDur = all.map((a, i) =>
    a.file ? a.dur + TAIL : (reel.scenes[i].dur ?? DEFAULT_DUR[reel.scenes[i].type] ?? 3));

  const silence = path.join(dir, '_sil.mp3');
  const listFile = path.join(dir, '_list.txt');
  const lines = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].file) {
      lines.push(`file '${all[i].file.replace(/'/g, "'\\''")}'`);
      lines.push(`file '${silence}'`);   // хвост
    } else {
      lines.push(`file '${silence}'`);   // сцена без реплики
    }
  }
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', String(TAIL), '-c:a', 'libmp3lame', '-b:a', '128k', silence, '-y']);
  fs.writeFileSync(listFile, lines.join('\n') + '\n');

  const outFile = path.join(root, 'public/media/audio/vo', `${slug}.mp3`);
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-c:a', 'libmp3lame', '-b:a', '160k', outFile, '-y']);
  fs.rmSync(listFile, { force: true });

  reel.voice = path.relative(path.join(root, 'public'), outFile).split(path.sep).join('/');

  if (fit) {
    reel.scenes.forEach((s, i) => {
      if (all[i].file) s.dur = Math.round(sceneDur[i] * 100) / 100;
    });
    console.log('\nДлительности сцен подогнаны под голос.');
  }
  fs.writeFileSync(jsonPath, JSON.stringify(reel, null, 2) + '\n');

  const total = sceneDur.reduce((a, b) => a + b, 0);
  console.log(`\nдорожка  → ${path.relative(root, outFile)}`);
  console.log(`ролик с голосом ≈ ${total.toFixed(1)} c`);
  if (!fit) console.log('Добавь --fit, чтобы длительности сцен совпали с репликами.');
}

/* ───────────────────────── main ───────────────────────── */
const [cmd, ...rest] = process.argv.slice(2);
const flags = {
  fit: rest.includes('--fit'),
  dry: rest.includes('--dry'),
  only: rest.includes('--scene') ? Number(rest[rest.indexOf('--scene') + 1]) - 1 : null,
};
const positional = rest.filter((a, i) => !a.startsWith('--') && rest[i - 1] !== '--scene');

if (cmd === 'voices') await listVoices();
else if (cmd === 'say' && positional[0]) await speak(positional[0], flags);
else {
  console.log(`Озвучка через ElevenLabs

  node scripts/voice.mjs voices                 список голосов и моделей
  node scripts/voice.mjs say <slug>             озвучить сценарий
  node scripts/voice.mjs say <slug> --fit       … и подогнать длительности сцен
  node scripts/voice.mjs say <slug> --dry       показать запрос, ничего не тратя
  node scripts/voice.mjs say <slug> --scene 3   переозвучить одну сцену`);
}
