#!/usr/bin/env python3
"""
Озвучка сценария через ElevenLabs. Поддерживает несколько голосов в одном
ролике: повествование твоим голосом, прямая речь героев — другими.

    export ELEVENLABS_API_KEY=...
    python3 scripts/tts_eleven.py projects/martin-eden

Голоса берутся из library/voices/voices.json. Реплика без роли читается
голосом по умолчанию; роль указывается в квадратных скобках в начале строки:

    - Он пришёл в этот дом матросом          ← голос по умолчанию
    - [character-male] Я напишу об этом      ← голос character-male

Модель eleven_v3 понимает теги эмоций прямо в тексте:

    - [character-male] [с горечью] Я напишу об этом

Реплики кэшируются по хэшу текста и настроек: правка одной строки
не перегенерит весь ролик и не сожжёт символы заново.
"""
import argparse, hashlib, json, os, subprocess, sys, urllib.request, urllib.error
from pathlib import Path

API = "https://api.elevenlabs.io/v1"
ROOT = Path(__file__).resolve().parent.parent
VOICES = ROOT / "library" / "voices" / "voices.json"


def die(msg):
    print(f"✗ {msg}", file=sys.stderr)
    sys.exit(1)


def load_voices():
    if not VOICES.exists():
        die(f"нет {VOICES}")
    d = json.loads(VOICES.read_text(encoding="utf-8"))
    return d


def api_get(path, key):
    req = urllib.request.Request(f"{API}{path}", headers={"xi-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        die(f"ElevenLabs {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
    except urllib.error.URLError as e:
        die(f"нет связи с ElevenLabs: {e.reason}\n"
            "  Если это отказ прокси — хост api.elevenlabs.io надо разрешить\n"
            "  в настройках сетевого доступа окружения.")


def list_models(key):
    """Что реально доступно аккаунту — имена моделей не угадываем."""
    return [(m.get("model_id"), m.get("name", ""),
             bool(m.get("can_do_text_to_speech", True)))
            for m in api_get("/models", key)]


def pick_model(key, preference, override=None):
    """Берём первую доступную из списка предпочтений — новая версия
    подхватится сама, как только появится в аккаунте."""
    if override:
        return override
    avail = [mid for mid, _, tts in list_models(key) if tts and mid]
    for want in preference:
        if want in avail:
            return want
    if not avail:
        die("аккаунт не вернул ни одной TTS-модели")
    print(f"  ⚠ ни одна из {preference} недоступна, беру {avail[0]}")
    return avail[0]


def list_account_voices(key):
    return [(v.get("voice_id"), v.get("name", ""), v.get("category", ""))
            for v in api_get("/voices", key).get("voices", [])]


def read_lines(script_path: Path):
    """Реплики — строки с '- '. Роль — в [скобках] в начале."""
    if not script_path.exists():
        die(f"нет {script_path}")
    out = []
    for raw in script_path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if not s.startswith("- "):
            continue
        t = s[2:].strip()
        if not t:
            continue
        role = None
        if t.startswith("["):
            close = t.find("]")
            if close > 0:
                tag = t[1:close].strip()
                # эмоциональный тег (кириллица/пробелы) — не роль, оставляем в тексте
                if tag.replace("-", "").replace("_", "").isascii() and " " not in tag:
                    role = tag
                    t = t[close + 1:].strip()
        out.append((role, t))
    if not out:
        die(f"в {script_path} нет реплик (строк с '- ')")
    return out


def synth(text, voice_id, key, model, st):
    body = json.dumps({
        "text": text,
        "model_id": model,
        "voice_settings": {
            "stability": st.get("stability", 0.45),
            "similarity_boost": st.get("similarity_boost", 0.8),
            "style": st.get("style", 0.1),
            "use_speaker_boost": True,
        },
    }).encode()
    req = urllib.request.Request(
        f"{API}/text-to-speech/{voice_id}", data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:400]
        die(f"ElevenLabs {e.code}: {detail}")
    except urllib.error.URLError as e:
        die(f"нет связи с ElevenLabs: {e.reason}\n"
            "  Если это отказ прокси — хост api.elevenlabs.io надо разрешить\n"
            "  в настройках сетевого доступа окружения.")


def dur(p: Path) -> float:
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", str(p)],
                       capture_output=True, text=True, check=True)
    return float(o.stdout.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--model", default=None,
                    help="явно задать модель; по умолчанию берётся лучшая доступная")
    ap.add_argument("--list-models", action="store_true",
                    help="показать модели, доступные аккаунту, и выйти")
    ap.add_argument("--list-voices", action="store_true",
                    help="показать голоса аккаунта с их voice_id, и выйти")
    ap.add_argument("--gap", type=float, default=0.42)
    ap.add_argument("--dry-run", action="store_true",
                    help="показать разбор по ролям, ничего не синтезировать")
    a = ap.parse_args()

    cfg = load_voices()
    default_role = cfg.get("default", "julia")
    voices = cfg["voices"]
    preference = cfg.get("modelPreference") or ["eleven_multilingual_v2"]

    if a.list_models or a.list_voices:
        key = os.environ.get("ELEVENLABS_API_KEY")
        if not key:
            die("нет ELEVENLABS_API_KEY в окружении")
        if a.list_models:
            print("модели аккаунта:")
            for mid, name, tts in list_models(key):
                print(f"  {'✓' if tts else '·'} {mid:<32} {name}")
            print(f"\nпредпочтение из voices.json: {' → '.join(preference)}")
        if a.list_voices:
            print("\nголоса аккаунта:")
            for vid, name, cat in list_account_voices(key):
                print(f"  {vid:<24} {name}  ({cat})")
        return

    proj = Path(a.project)
    lines = read_lines(proj / "script.md")

    # проверяем роли до первого запроса, чтобы не потратить символы зря
    used = {r or default_role for r, _ in lines}
    for r in sorted(used):
        if r not in voices:
            die(f"роль '{r}' не описана в library/voices/voices.json")
        if not a.dry_run and (not voices[r].get("voice_id")
                              or voices[r]["voice_id"] == "ЗАПОЛНИ"):
            die(f"у роли '{r}' не заполнен voice_id в library/voices/voices.json\n"
                "  узнать id своих голосов:\n"
                f"    python3 scripts/tts_eleven.py {a.project} --list-voices")

    if a.dry_run:
        print(f"модель: будет выбрана из {' → '.join(preference)}")
        for i, (r, t) in enumerate(lines, 1):
            vid = voices[r or default_role].get("voice_id") or ""
            mark = " " if vid and vid != "ЗАПОЛНИ" else "!"
            print(f"  {i:>3} {mark} [{r or default_role:<16}] {t}")
        print(f"\n{len(lines)} реплик, ролей {len(used)}, "
              f"{sum(len(t) for _, t in lines)} символов")
        return

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        die("нет ELEVENLABS_API_KEY в окружении")

    model = pick_model(key, preference, a.model)

    adir = proj / "audio"
    parts = adir / "parts"
    parts.mkdir(parents=True, exist_ok=True)

    print(f"→ {len(lines)} реплик, модель {model}, ролей {len(used)}")
    timings, t, fresh = [], 0.0, 0

    for i, (role, text) in enumerate(lines, 1):
        r = role or default_role
        v = voices[r]
        st = v.get("settings", {})
        h = hashlib.sha1(
            f"{text}|{v['voice_id']}|{model}|{json.dumps(st, sort_keys=True)}"
            .encode()).hexdigest()[:10]
        f = parts / f"{i:03d}-{h}.mp3"

        if not f.exists():
            for old in parts.glob(f"{i:03d}-*.mp3"):
                old.unlink()                      # текст поменялся — старое не нужно
            f.write_bytes(synth(text, v["voice_id"], key, model, st))
            fresh += 1
            print(f"  {i:>3}/{len(lines)}  [{r}] {text[:46]}")
        else:
            print(f"  {i:>3}/{len(lines)}  (кэш)")

        d = dur(f)
        timings.append({"i": i, "role": r, "text": text,
                        "at": round(t, 3), "dur": round(d, 3)})
        t += d + a.gap

    sil = adir / "_sil.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i",
                    "anullsrc=r=44100:cl=mono", "-t", str(a.gap),
                    "-q:a", "9", str(sil), "-y"], check=True)
    listf = adir / "_concat.txt"
    with listf.open("w") as fh:
        for i, tm in enumerate(timings, 1):
            f = next(parts.glob(f"{i:03d}-*.mp3"))
            fh.write(f"file '{f.resolve()}'\n")
            if i != len(timings):
                fh.write(f"file '{sil.resolve()}'\n")

    voice = adir / "voice.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0",
                    "-i", str(listf), "-c:a", "libmp3lame", "-q:a", "2",
                    str(voice), "-y"], check=True)
    (adir / "timings.json").write_text(
        json.dumps(timings, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✓ {voice}  ({dur(voice):.1f} с, новых реплик {fresh})")
    print(f"✓ {adir / 'timings.json'}")
    print(f"\nДальше:\n  python3 scripts/build_scenes.py {a.project}")


if __name__ == "__main__":
    main()
