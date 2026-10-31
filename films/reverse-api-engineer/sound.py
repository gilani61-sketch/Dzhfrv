"""
Дорожка ролика. Собрана из студийного набора library/sfx/kit.py.
Если рядом лежит out/<film>.vo.wav (озвучка), музыка автоматически
пригибается под голосом.

    python3 films/reverse-api-engineer/sound.py
"""
import os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'library', 'sfx'))
import kit

FILM = 'reverse-api-engineer'
DUR = 26.0
BEATS = [0.0, 3.40, 5.90, 9.40, 12.80, 16.60, 20.20, 23.20]
OUT = os.path.join(ROOT, 'out', f'{FILM}.score.wav')
VO = os.path.join(ROOT, 'out', f'{FILM}.vo.wav')

kit.seed(7)
tr = kit.Track(DUR)
t = tr.t()

# --- подложка ---------------------------------------------------------
swell = 0.25 + 0.75 * np.clip(t / 20.0, 0, 1) ** 0.7
swell *= 1 - 0.55 * np.clip((t - 24.6) / 1.4, 0, 1)
tr.bed(kit.drone(DUR), 0.34, envelope=swell * (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t)))

pad_env = np.clip((t - 1.0) / 6.0, 0, 1) ** 1.3 * (1 - 0.7 * np.clip((t - 24.0) / 2.0, 0, 1))
# холодим «слом парсера»: воздух уходит
pad_env *= 1 - 0.45 * np.clip((t - 16.4) / 1.2, 0, 1) * (1 - np.clip((t - 19.4) / 1.0, 0, 1))
tr.bed(kit.pad(DUR), 0.055, envelope=pad_env)

# --- станции ----------------------------------------------------------
for i, b in enumerate(BEATS):
    if i:
        tr.add(b - 0.95, kit.riser(0.98, 160 + i * 40, 2200 + i * 160), 0.30, pan=(-1) ** i * 0.25)
    tr.add(b - 0.02, kit.boom(1.7, 150 + i * 6, 36, 0.55), 0.55 if i else 0.42)

# --- 01: клик по кнопке ----------------------------------------------
tr.add(8.33, kit.whoosh(0.9), 0.35)
tr.add(8.35, kit.tick(1800, 0.09), 0.16)

# --- 02: строки лога ---------------------------------------------------
for i in range(8):
    tr.add(9.68 + i * 0.13, kit.tick(1200 + i * 110, 0.12, 0.7), 0.075, pan=(i % 2 - 0.5) * 0.6)

# --- 03: код печатается, зажигаются чипы ------------------------------
tr.add_many(kit.typing(6.65, 7.95, rate=26), 0.085)
for i, f in enumerate((880, 1100, 1320, 1600)):
    tr.add(14.72 + i * 0.22, kit.blip(f), 0.10, pan=(i - 1.5) * 0.3)

# --- слом парсера -----------------------------------------------------
tr.add(18.33, kit.glass(1.5), 0.55, pan=0.1)
tr.add(18.33, kit.boom(1.4, 120, 34, 0.3), 0.40)

# --- промпт печатается -------------------------------------------------
tr.add_many(kit.typing(20.65, 22.50, rate=22), 0.085)

# --- финал -------------------------------------------------------------
tr.add(23.18, kit.boom(2.8, 190, 32, 0.9), 0.80)
tr.add(23.20, kit.shimmer(2.8), 0.50)

# --- голос, если он уже сгенерирован ----------------------------------
mix = tr.master()
if os.path.exists(VO):
    vo, sr = kit.read_wav(VO)
    n = min(mix.shape[1], len(vo))
    mix = kit.duck(mix, np.pad(vo[:n], (0, mix.shape[1] - n)), depth=0.62)
    mix[0, :n] += vo[:n] * 0.95
    mix[1, :n] += vo[:n] * 0.95
    peak = float(np.max(np.abs(mix))) or 1.0
    mix *= (10 ** (-1.0 / 20)) / peak
    print('подмешал озвучку:', os.path.relpath(VO, ROOT))
else:
    print('озвучки нет (out/%s.vo.wav) — только музыка' % FILM)

import wave
os.makedirs(os.path.dirname(OUT), exist_ok=True)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(kit.SR)
    w.writeframes(pcm.tobytes())
print('wrote', os.path.relpath(OUT, ROOT), '| rms', round(float(np.sqrt((mix ** 2).mean())), 4))
