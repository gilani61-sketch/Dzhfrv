#!/usr/bin/env python3
"""
Озвучка сценария твоим голосом из ElevenLabs.

Читает script.md проекта, синтезирует каждую реплику отдельным файлом,
склеивает в voice.mp3 и возвращает точные тайминги в timings.json —
на них потом раскладываются субтитры.

Нужно: переменная окружения ELEVENLABS_API_KEY и id голоса.

    export ELEVENLABS_API_KEY=...
    python3 scripts/tts_eleven.py projects/martin-eden --voice-id <ID>

Без ключа скрипт ничего не трогает и честно говорит, чего не хватает.
"""
import argparse, json, os, subprocess, sys, urllib.request, urllib.error
from pathlib import Path

API = "https://api.elevenlabs.io/v1"
DEFAULT_MODEL = "eleven_multilingual_v2"


def die(msg, code=1):
    print(f"✗ {msg}", file=sys.stderr)
    sys.exit(code)


def read_lines(script_path: Path):
    """Реплики — строки, начинающиеся с '- '. Остальное (заголовки, заметки) игнорим."""
    if not script_path.exists():
        die(f"нет файла {script_path}")
    out = []
    for raw in script_path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if s.startswith("- "):
            t = s[2:].strip()
            if t:
                out.append(t)
    if not out:
        die(f"в {script_path} нет реплик (строк, начинающихся с '- ')")
    return out


def synth(text, voice_id, key, model, stability, similarity, style):
    body = json.dumps({
        "text": text,
        "model_id": model,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity,
            "style": style,
            "use_speaker_boost": True,
        },
    }).encode()
    req = urllib.request.Request(
        f"{API}/text-to-speech/{voice_id}",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        die(f"ElevenLabs {e.code}: {e.read().decode('utf-8', 'replace')[:400]}")


def dur(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project", help="папка проекта, напр. projects/martin-eden")
    ap.add_argument("--voice-id", default=os.environ.get("ELEVEN_VOICE_ID"))
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--gap", type=float, default=0.42,
                    help="пауза между репликами, сек")
    ap.add_argument("--stability", type=float, default=0.45)
    ap.add_argument("--similarity", type=float, default=0.80)
    ap.add_argument("--style", type=float, default=0.10)
    a = ap.parse_args()

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        die("нет ELEVENLABS_API_KEY в окружении")
    if not a.voice_id:
        die("не задан --voice-id (или ELEVEN_VOICE_ID)")

    proj = Path(a.project)
    lines = read_lines(proj / "script.md")
    adir = proj / "audio"
    parts = adir / "parts"
    parts.mkdir(parents=True, exist_ok=True)

    print(f"→ {len(lines)} реплик, голос {a.voice_id}")
    timings, t = [], 0.0

    for i, line in enumerate(lines, 1):
        f = parts / f"{i:03d}.mp3"
        if not f.exists():
            f.write_bytes(synth(line, a.voice_id, key, a.model,
                                a.stability, a.similarity, a.style))
            print(f"  {i:>3}/{len(lines)}  {line[:52]}")
        else:
            print(f"  {i:>3}/{len(lines)}  (кэш)")
        d = dur(f)
        timings.append({"i": i, "text": line, "at": round(t, 3),
                        "dur": round(d, 3)})
        t += d + a.gap

    # склейка через concat-фильтр с паузами
    listf = adir / "_concat.txt"
    sil = adir / "_sil.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i",
                    f"anullsrc=r=44100:cl=mono", "-t", str(a.gap),
                    "-q:a", "9", str(sil), "-y"], check=True)
    with listf.open("w") as fh:
        for i in range(1, len(lines) + 1):
            fh.write(f"file '{(parts / f'{i:03d}.mp3').resolve()}'\n")
            if i != len(lines):
                fh.write(f"file '{sil.resolve()}'\n")

    voice = adir / "voice.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0",
                    "-i", str(listf), "-c:a", "libmp3lame", "-q:a", "2",
                    str(voice), "-y"], check=True)

    (adir / "timings.json").write_text(
        json.dumps(timings, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✓ {voice}  ({dur(voice):.1f} с)")
    print(f"✓ {adir/'timings.json'}")
    print("\nДальше: python3 scripts/build_scenes.py", a.project)


if __name__ == "__main__":
    main()
