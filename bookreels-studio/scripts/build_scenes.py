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

Внутри сцены можно добавлять элементы библиотеки:

    ## 03.jpg
    overlay: dust-01.png
    badge: год | 1909
    - Редакции возвращали его рассказы

    ## quote
    quote: Я напишу об этом так, как никто не писал | Мартин Иден

Мета-строки в шапке: palette, endcard, music, overlay.

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
            cur = {"src": s[3:].strip(), "lines": [], "overlays": [],
                   "badge": None, "quote": None}
            scenes.append(cur)
        elif s.startswith("- "):
            if cur is None:
                sys.exit("✗ реплика до первого '## файл'")
            cur["lines"].append(s[2:].strip())
        elif ":" in s and s.strip():
            k, v = s.split(":", 1)
            k, v = k.strip().lower(), v.strip()
            if cur is None:
                if k in ("author", "mode", "preset", "watermark", "music",
                         "slug", "fps", "palette", "endcard", "overlay"):
                    meta.setdefault(k, [] if k == "overlay" else v)
                    if k == "overlay":
                        meta["overlay"].append(v)
            else:
                if k == "overlay":
                    cur["overlays"].append(v)
                elif k == "badge" and "|" in v:
                    lab, val = v.split("|", 1)
                    cur["badge"] = {"label": lab.strip(), "value": val.strip()}
                elif k == "quote":
                    txt, _, src = v.partition("|")
                    cur["quote"] = {"text": txt.strip(),
                                    "source": src.strip() or None}

    if not scenes:
        sys.exit("✗ в script.md нет сцен ('## файл')")
    return title, meta, scenes


ROLE_RE = re.compile(r"^\[([A-Za-z0-9_-]+)\]\s*")
EMO_RE = re.compile(r"\[[^\]]*\]\s*")


def clean(text: str) -> str:
    """Субтитр не должен содержать служебных тегов роли и эмоции."""
    return EMO_RE.sub("", ROLE_RE.sub("", text)).strip()


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
                caps.append({"text": clean(tm["text"]),
                             "at": round(tm["at"] - start, 2),
                             "dur": round(tm["dur"], 2)})
                k += 1
            end = timings[k - 1]["at"] + timings[k - 1]["dur"] + PAD_TAIL
            dur = round(end - start, 2)
        else:
            local = PAD_HEAD if si else 0.6
            for ln in sc["lines"]:
                d = max(MIN_D, round(len(clean(ln)) / CPS, 2))
                caps.append({"text": clean(ln), "at": round(local, 2), "dur": d})
                local += d + 0.3
                k += 1
            dur = round(local + PAD_TAIL - 0.3, 2)

        dur = max(dur, MIN_SCENE)
        node = {"src": sc["src"], "dur": dur, "captions": caps}
        if sc.get("overlays"):
            node["overlays"] = [{"src": o, "blend": "screen", "drift": True}
                                if o.startswith("leak") else {"src": o}
                                for o in sc["overlays"]]
        if sc.get("badge"):
            node["badge"] = sc["badge"]
        if sc.get("quote"):
            node["quote"] = sc["quote"]
        out_scenes.append(node)
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
        "palette": meta.get("palette", "literature"),
        "overlays": [{"src": o, "blend": "screen", "drift": True}
                     if o.startswith("leak") else {"src": o}
                     for o in meta.get("overlay", [])],
        "endCard": ({"handle": meta.get("watermark", "@juliapolskayaa"),
                     "line": meta["endcard"], "dur": 2.5}
                    if meta.get("endcard") else None),
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

    missing = [s["src"] for s in out_scenes
               if not s.get("quote") and not (proj / "shots" / s["src"]).exists()]
    if missing:
        print(f"  ⚠ нет кадров: {', '.join(missing)}")
    print(f"\nРендер:\n  bash scripts/render.sh {slug}")


if __name__ == "__main__":
    main()
