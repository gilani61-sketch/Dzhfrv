#!/usr/bin/env python3
"""
Генератор библиотеки: текстуры, оверлеи, виньетки, градиенты.

Всё создаётся кодом, а не лежит бинарниками — значит воспроизводимо
и настраивается параметрами. Запуск:

    python3 scripts/gen_library.py          # всё
    python3 scripts/gen_library.py paper    # только бумагу
"""
import sys, json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "library"
RNG = np.random.default_rng(7)          # фиксируем —库 воспроизводима

W, H = 1080, 1920                        # базовый холст reel


def save(img: Image.Image, rel: str):
    p = LIB / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, optimize=True)
    kb = p.stat().st_size // 1024
    print(f"  ✓ {rel}  ({img.size[0]}×{img.size[1]}, {kb} KB)")


def fbm(shape, octaves=5, persistence=0.55, base=4):
    """Фрактальный шум — основа всех натуральных текстур."""
    h, w = shape
    total = np.zeros(shape, dtype=np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        n = base * (2 ** o)
        small = RNG.random((max(2, int(n * h / w)), max(2, n))).astype(np.float32)
        layer = np.array(
            Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC),
            dtype=np.float32) / 255.0
        total += layer * amp
        norm += amp
        amp *= persistence
    return total / norm


# ─────────────────────────── бумага и холст ───────────────────────────

def gen_paper():
    print("бумага:")
    for name, tint, rough in [
        ("paper-warm", (242, 234, 217), 0.10),
        ("paper-cold", (236, 238, 240), 0.08),
        ("paper-aged", (226, 210, 180), 0.16),
    ]:
        n = fbm((H, W), octaves=6, base=6)
        fib = fbm((H, W), octaves=2, base=90) * 0.35      # волокна
        v = np.clip(1.0 - rough + (n * 0.6 + fib * 0.4) * rough * 2, 0, 1.35)
        arr = np.stack([np.clip(v * c, 0, 255) for c in tint], axis=-1).astype(np.uint8)
        save(Image.fromarray(arr), f"backgrounds/{name}.jpg")

    # холст — переплетение нитей
    print("холст:")
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    weave = (np.sin(xx * 1.05) * 0.5 + np.sin(yy * 1.05) * 0.5)
    n = fbm((H, W), octaves=5, base=8)
    v = np.clip(0.86 + weave * 0.055 + (n - 0.5) * 0.26, 0, 1.3)
    arr = np.stack([np.clip(v * c, 0, 255) for c in (231, 219, 198)], axis=-1).astype(np.uint8)
    save(Image.fromarray(arr).filter(ImageFilter.GaussianBlur(0.4)), "backgrounds/canvas-linen.jpg")


# ─────────────────────────── оверлеи ───────────────────────────

def gen_grain():
    """Зерно тайлами — движок двигает их покадрово."""
    print("зерно:")
    for name, size, sigma in [("grain-fine", 256, 0.0), ("grain-coarse", 256, 0.7)]:
        g = RNG.normal(128, 34, (size, size)).clip(0, 255).astype(np.uint8)
        im = Image.fromarray(g, "L")
        if sigma:
            im = im.filter(ImageFilter.GaussianBlur(sigma))
        rgba = Image.merge("RGBA", (im, im, im, Image.new("L", im.size, 255)))
        save(rgba, f"overlays/{name}.png")


def gen_vignettes():
    print("виньетки:")
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx, cy = W / 2, H / 2
    for name, power, strength in [
        ("vignette-soft", 2.1, 0.42),
        ("vignette-strong", 1.7, 0.70),
        ("vignette-cine", 2.6, 0.55),
    ]:
        d = np.sqrt(((xx - cx) / (W * 0.62)) ** 2 + ((yy - cy) / (H * 0.62)) ** 2)
        a = (np.clip(d, 0, 1.6) ** power * strength * 255).clip(0, 255).astype(np.uint8)
        rgba = np.zeros((H, W, 4), np.uint8)
        rgba[..., 3] = a
        save(Image.fromarray(rgba, "RGBA"), f"overlays/{name}.png")

    # нижний скрим под субтитр
    grad = np.zeros((H, W, 4), np.uint8)
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    a = (np.clip((t - 0.52) / 0.48, 0, 1) ** 1.45 * 0.70 * 255)
    grad[..., 3] = np.repeat(a, W, axis=1).astype(np.uint8)
    save(Image.fromarray(grad, "RGBA"), "overlays/scrim-bottom.png")


def gen_dust():
    """Пылинки и царапины — «архивная плёнка» для биографий."""
    print("пыль и царапины:")
    for idx in range(1, 4):
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for _ in range(RNG.integers(90, 150)):
            x, y = RNG.integers(0, W), RNG.integers(0, H)
            r = RNG.integers(1, 4)
            a = int(RNG.integers(40, 120))
            d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
        for _ in range(RNG.integers(3, 8)):
            x = int(RNG.integers(0, W))
            a = int(RNG.integers(25, 70))
            d.line([x, 0, x + int(RNG.integers(-30, 30)), H],
                   fill=(255, 255, 255, a), width=1)
        save(layer.filter(ImageFilter.GaussianBlur(0.35)), f"overlays/dust-{idx:02d}.png")


def gen_lightleaks():
    print("засветки:")
    specs = [
        ("leak-warm-tr", (255, 196, 120), (0.88, 0.10)),
        ("leak-cold-bl", (140, 190, 255), (0.12, 0.88)),
        ("leak-amber-top", (255, 170, 90), (0.50, -0.05)),
    ]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for name, rgb, (fx, fy) in specs:
        cx, cy = W * fx, H * fy
        d = np.sqrt(((xx - cx) / (W * 0.85)) ** 2 + ((yy - cy) / (H * 0.55)) ** 2)
        a = (np.clip(1 - d, 0, 1) ** 2.0 * 0.55 * 255)
        rgba = np.zeros((H, W, 4), np.uint8)
        for i, c in enumerate(rgb):
            rgba[..., i] = c
        rgba[..., 3] = a.astype(np.uint8)
        save(Image.fromarray(rgba, "RGBA").filter(ImageFilter.GaussianBlur(28)),
             f"overlays/{name}.png")


# ─────────────────────────── градиентные фоны ───────────────────────────

def gen_gradients():
    """Фоны для титульных карточек и концовок, когда кадра нет."""
    print("градиенты:")
    pal = json.loads((LIB / "palettes" / "palettes.json").read_text(encoding="utf-8"))["palettes"]
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    xx = np.linspace(0, 1, W, dtype=np.float32)[None, :]

    for key, p in pal.items():
        deep = tuple(int(p["deep"][i:i + 2], 16) for i in (1, 3, 5))
        acc = tuple(int(p["accent"][i:i + 2], 16) for i in (1, 3, 5))
        # мягкий диагональный переход от глубокого к притушенному акценту
        t = np.clip(yy * 0.78 + xx * 0.22, 0, 1) ** 1.25
        n = (fbm((H, W), octaves=4, base=3) - 0.5) * 0.045
        arr = np.zeros((H, W, 3), np.float32)
        for i in range(3):
            top = deep[i]
            bot = deep[i] * 0.42 + acc[i] * 0.30
            arr[..., i] = (top * (1 - t[..., 0 if t.ndim == 3 else slice(None)]) if False
                           else top + (bot - top) * t) + n * 255
        save(Image.fromarray(arr.clip(0, 255).astype(np.uint8)),
             f"backgrounds/gradient-{key}.jpg")


def gen_index():
    """Индекс библиотеки — чтобы не искать ассеты по папкам."""
    print("индекс:")
    idx = {"$meta": {"note": "Генерируется scripts/gen_library.py — руками не править."}}
    for d in sorted(LIB.iterdir()):
        if not d.is_dir():
            continue
        files = sorted(
            str(f.relative_to(LIB)) for f in d.rglob("*")
            if f.is_file() and f.suffix.lower() in
            {".png", ".jpg", ".svg", ".mp3", ".wav", ".json"}
            and f.name != "index.json"
        )
        if files:
            idx[d.name] = files
    (LIB / "index.json").write_text(
        json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(v) for k, v in idx.items() if k != "$meta")
    print(f"  ✓ index.json  ({total} файлов в {len(idx) - 1} разделах)")


STEPS = {
    "paper": gen_paper, "grain": gen_grain, "vignette": gen_vignettes,
    "dust": gen_dust, "leak": gen_lightleaks, "gradient": gen_gradients,
    "index": gen_index,
}

if __name__ == "__main__":
    want = sys.argv[1:] or list(STEPS)
    for k in want:
        if k not in STEPS:
            sys.exit(f"✗ не знаю шаг '{k}'. Доступно: {', '.join(STEPS)}")
    for k in want:
        STEPS[k]()
    print("\n✓ библиотека обновлена")
