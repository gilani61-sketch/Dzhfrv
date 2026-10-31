import os, numpy as np
from PIL import Image, ImageFilter, ImageDraw
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'textures')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1905)

# ---- 1. Animated film grain tiles (tileable, 4 frames) -------------------
S = 512
for i in range(4):
    n = rng.normal(128, 38, (S, S)).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(n, 'L').filter(ImageFilter.GaussianBlur(0.4))
    a = np.array(img).astype(np.int16)
    a = ((a - 128) * 1.6 + 128).clip(0, 255).astype(np.uint8)
    rgba = np.dstack([a, a, a, np.full((S, S), 255, np.uint8)])
    Image.fromarray(rgba, 'RGBA').save(f'{OUT}/grain-{i}.png')

# ---- 2. Paper textures ---------------------------------------------------
def paper(w, h, base, fibre, seed):
    r = np.random.default_rng(seed)
    big = r.normal(0, 1, (h // 8, w // 8))
    big = np.array(Image.fromarray(((big - big.min()) / (np.ptp(big)) * 255).astype(np.uint8)
                                   ).resize((w, h), Image.BICUBIC)).astype(np.float32) / 255.
    fine = r.normal(0.5, 0.12, (h, w))
    fine = np.array(Image.fromarray((fine * 255).clip(0, 255).astype(np.uint8)
                                    ).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255.
    # horizontal fibres
    fib = r.normal(0.5, 0.1, (h, w // 4))
    fib = np.array(Image.fromarray((fib * 255).clip(0, 255).astype(np.uint8)
                                   ).resize((w, h), Image.BILINEAR)).astype(np.float32) / 255.
    mix = 0.55 * big + 0.25 * fine + 0.20 * fib
    mix = (mix - mix.min()) / np.ptp(mix)
    base = np.array(base, np.float32)
    fibre = np.array(fibre, np.float32)
    out = base[None, None, :] + (fibre - base)[None, None, :] * mix[:, :, None]
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGB')

paper(1080, 1920, (244, 238, 226), (214, 203, 182), 7).save(f'{OUT}/paper-cream.jpg', quality=88)
paper(1080, 1920, (32, 30, 28), (58, 54, 49), 11).save(f'{OUT}/paper-charcoal.jpg', quality=88)
paper(1080, 1920, (26, 24, 22), (44, 40, 36), 13).save(f'{OUT}/paper-ink.jpg', quality=88)

# ---- 3. Halftone dot tile ------------------------------------------------
T = 64
ht = Image.new('RGBA', (T, T), (0, 0, 0, 0))
d = ImageDraw.Draw(ht)
for (cx, cy) in ((16, 16), (48, 48), (48, 16), (16, 48)):
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(0, 0, 0, 255))
ht.resize((T, T), Image.LANCZOS).save(f'{OUT}/halftone.png')

# ---- 4. Film dust & scratches (6 frames) --------------------------------
W, H = 540, 960
for i in range(6):
    r = np.random.default_rng(100 + i)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for _ in range(r.integers(2, 5)):             # vertical scratches
        x = int(r.integers(0, W)); w = float(r.uniform(0.6, 1.8))
        y0 = int(r.integers(0, H // 2)); y1 = int(r.integers(H // 2, H))
        a = int(r.integers(30, 90))
        d.line([(x, y0), (x + r.integers(-4, 5), y1)], fill=(255, 250, 240, a), width=max(1, int(w)))
    for _ in range(r.integers(18, 40)):           # dust specks
        x, y = int(r.integers(0, W)), int(r.integers(0, H))
        rr = float(r.uniform(0.7, 3.2)); a = int(r.integers(40, 130))
        col = (255, 252, 245, a) if r.random() > 0.35 else (20, 16, 12, a)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=col)
    for _ in range(r.integers(0, 3)):             # hairs
        x, y = int(r.integers(0, W)), int(r.integers(0, H))
        pts = [(x, y)]
        for k in range(6):
            x += int(r.integers(-12, 13)); y += int(r.integers(-18, 19)); pts.append((x, y))
        d.line(pts, fill=(245, 240, 230, int(r.integers(30, 70))), width=1)
    im.save(f'{OUT}/dust-{i}.png')

print('textures ok:', sorted(os.listdir(OUT)))
