#!/usr/bin/env python3
"""
Собирает scenes.json из script.md (+ timings.json, если озвучка уже готова).

script.md — это и сценарий, и раскадровка одновременно:

    # Мартин Иден
    author: Джек Лондон
    mode: cinematic
    preset: reel

    ## 01.jpg
    - Он пришёл в этот дом матросом
    - и остался в нём навсегда

    ## 02.jpg
    - Руфь сначала ждала

Каждый `## файл` — сцена, каждая `- строка` — субтитр и одновременно реплика
для озвучки. Порядок реплик в script.md и в timings.json совпадает, поэтому
тайминги ложатся на субтитры один в один.

Без timings.json длительности считаются по длине текста — удобно, чтобы
посмотреть черновик до того, как тратить символы ElevenLabs.
"""
import argparse, json, re, sys
from pathlib import Path

# сколько секунд читается строка, если озвучки ещё нет
CPS = 13.0      # знаков в секунду — спокойный темп
MIN_D = 1.5
PAD_HEAD = 0.25   # воздух в начале сцены
PAD_TAIL = 0.55   # воздух в конце
MIN_SCENE = 3.5   # кадр короче этого не успевает прочитаться как кадр
MAX_CHARS = 26    # длиннее — субтитр уедет на вторую строку (reel, caption 40px)


def parse_script(p: Path):
    if not p.exists():
        sys.exit(f"✗ нет {p}")
    meta, scenes = {}, []
    cur = None
    title = None

    for raw in p.read_text(encoding="utf-8").splitlines():
        s = raw.rstrip()
        if s.startswith("# "):
            title = s[2:].strip()
        elif s.startswith("## "):
            cur = {"src": s[3:].strip(), "lines": []}
            scenes.append(cur)
        elif s.startswith("- "):
            if cur is None:
                sys.exit("✗ реплика до первого '## файл'")
            cur["lines"].append(s[2:].strip())
        elif ":" in s and not s.startswith("-") and cur is None and s.strip():
            k, v = s.split(":", 1)
            k = k.strip().lower()
            if k in ("author", "mode", "preset", "watermark", "music", "slug", "fps"):
                meta[k] = v.strip()

    if not scenes:
        sys.exit("✗ в script.md нет сцен ('## файл')")
    return title, meta, scenes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--no-title", action="store_true",
                    help="без титульной карточки")
    ap.add_argument("--title-dur", type=float, default=4.0)
    a = ap.parse_args()

    proj = Path(a.project)
    slug = proj.name
    title, meta, scenes = parse_script(proj / "script.md")

    tpath = proj / "audio" / "timings.json"
    timings = json.loads(tpath.read_text(encoding="utf-8")) if tpath.exists() else None
    if timings:
        total_lines = sum(len(s["lines"]) for s in scenes)
        if len(timings) != total_lines:
            sys.exit(f"✗ реплик в script.md {total_lines}, а в timings.json {len(timings)} — "
                     "переозвучь или поправь сценарий")
        print(f"→ беру тайминги из озвучки ({len(timings)} реплик)")
    else:
        print("→ озвучки нет, считаю длительности по тексту")

    out_scenes = []
    k = 0            # сквозной индекс реплики
    clock = 0.0      # абсолютное время от начала ролика

    for si, sc in enumerate(scenes):
        caps = []
        if timings:
            t0 = timings[k]["at"]
            start = t0 - PAD_HEAD if si else 0.0
            for _ in sc["lines"]:
                tm = timings[k]
                caps.append({"text": tm["text"],
                             "at": round(tm["at"] - start, 2),
                             "dur": round(tm["dur"], 2)})
                k += 1
            end = timings[k - 1]["at"] + timings[k - 1]["dur"] + PAD_TAIL
            dur = round(end - start, 2)
        else:
            local = PAD_HEAD if si else 0.6
            for ln in sc["lines"]:
                d = max(MIN_D, round(len(ln) / CPS, 2))
                caps.append({"text": ln, "at": round(local, 2), "dur": d})
                local += d + 0.3
                k += 1
            dur = round(local + PAD_TAIL - 0.3, 2)

        dur = max(dur, MIN_SCENE)
        out_scenes.append({"src": sc["src"], "dur": dur, "captions": caps})
        clock += dur

    spec = {
        "slug": meta.get("slug", slug),
        "mode": meta.get("mode", "cinematic"),
        "preset": meta.get("preset", "reel"),
        "titleCard": None if a.no_title else {
            "title": title or slug,
            "author": meta.get("author"),
            "at": 0,
            "dur": a.title_dur,
        },
        "watermark": meta.get("watermark", "@juliapolskayaa"),
        "voice": f"proj/{slug}/audio/voice.mp3" if (proj / "audio" / "voice.mp3").exists() else None,
        "music": f"proj/{slug}/audio/{meta['music']}" if meta.get("music") else None,
        "musicGainDb": -12,
        "grain": True,
        "scenes": out_scenes,
    }
    if meta.get("fps"):
        spec["fps"] = int(meta["fps"])

    outp = proj / "scenes.json"
    outp.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ {outp}")
    print(f"  сцен {len(out_scenes)}, субтитров {k}, длина ≈ {clock:.1f} с")
    longs = [c["text"] for sc in out_scenes for c in sc["captions"]
             if len(c["text"]) > MAX_CHARS]
    if longs:
        print(f"  ⚠ {len(longs)} субтитр(ов) длиннее {MAX_CHARS} знаков — уедут на вторую строку:")
        for t in longs:
            print(f"      {len(t):>3}  {t}")
        print("      в референсе субтитр всегда в одну строку — лучше разбить на два кадра")

    missing = [s["src"] for s in out_scenes if not (proj / "shots" / s["src"]).exists()]
    if missing:
        print(f"  ⚠ нет кадров: {', '.join(missing)}")
    print(f"\nРендер:\n  bash scripts/render.sh {slug}")


if __name__ == "__main__":
    main()
