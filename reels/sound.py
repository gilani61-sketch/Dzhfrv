import numpy as np, wave, struct

SR = 48000
DUR = 26.0
N = int(SR * DUR)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

BEATS = [0.0, 3.40, 5.90, 9.40, 12.80, 16.60, 20.20, 23.20]

def place(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i < 0:
        sig = sig[-i:]; i = 0
    j = min(N, i + len(sig))
    if j > i:
        buf[i:j] += sig[:j - i] * gain

def stereo(start, sig, gain=1.0, pan=0.0):
    place(L, start, sig, gain * (1 - max(0.0, pan)))
    place(R, start, sig, gain * (1 + min(0.0, pan)))

def env(n, a, d, curve=2.5):
    e = np.ones(n)
    na = max(1, int(a * SR)); nd = max(1, int(d * SR))
    e[:na] = np.linspace(0, 1, na) ** 1.2
    tail = np.linspace(0, 1, min(nd, n))
    e[-len(tail):] *= (1 - tail) ** curve
    return e

# ---------------------------------------------------------------- drone
f0 = 55.0
drone = np.zeros(N)
for mult, amp, det in [(1, 1.0, 0.0), (1, 0.6, 0.17), (2, 0.34, 0.0),
                       (3, 0.13, 0.11), (1.5, 0.16, 0.0)]:
    ph = 2 * np.pi * (f0 * mult + det) * t
    drone += amp * np.sin(ph + 0.6 * np.sin(2 * np.pi * 0.07 * t * mult))
drone /= 2.2
swell = 0.25 + 0.75 * np.clip(t / 20.0, 0, 1) ** 0.7
swell *= 1 - 0.55 * np.clip((t - 24.6) / 1.4, 0, 1)
drone *= swell * (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t))
L += drone * 0.34; R += drone * 0.34

# ------------------------------------------------------------------ pad
pad = np.zeros(N)
for k, (fr, amp, sp) in enumerate([(220, .5, .043), (330, .34, .031), (440, .22, .052),
                                   (660, .12, .027), (880, .07, .061), (1320, .04, .037)]):
    lfo = 0.55 + 0.45 * np.sin(2 * np.pi * sp * t + k)
    pad += amp * np.sin(2 * np.pi * fr * t + k) * lfo
pad /= 1.8
padenv = np.clip((t - 1.0) / 6.0, 0, 1) ** 1.3 * (1 - 0.7 * np.clip((t - 24.0) / 2.0, 0, 1))
# duck the pad under the warm beat so the "parser breaks" moment feels colder
padenv *= 1 - 0.45 * np.clip((t - 16.4) / 1.2, 0, 1) * (1 - np.clip((t - 19.4) / 1.0, 0, 1))
pad *= padenv
L += pad * 0.055; R += np.roll(pad, 311) * 0.055

# ------------------------------------------------------- impacts / booms
def boom(dur=1.6, f_hi=150, f_lo=38, click=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    k = np.exp(-tt * 5.0)
    f = f_lo + (f_hi - f_lo) * k
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-tt * 2.6)
    sub = np.sin(2 * np.pi * 41 * tt) * np.exp(-tt * 1.7) * 0.8
    noise = rng.standard_normal(n)
    # cheap low-pass on the transient
    for _ in range(3):
        noise = np.convolve(noise, np.ones(9) / 9, mode='same')
    tr = noise * np.exp(-tt * 42.0) * click
    return (body + sub + tr) * 0.5

def riser(dur=1.0, f_start=180, f_end=2400, noise_amt=0.6):
    n = int(dur * SR); tt = np.arange(n) / SR
    u = (tt / dur) ** 2.1
    out = np.zeros(n)
    for h, a in [(1, 1.0), (2, .45), (3, .22), (5, .1)]:
        f = (f_start + (f_end - f_start) * u) * h
        out += a * np.sin(2 * np.pi * np.cumsum(f) / SR)
    nz = rng.standard_normal(n)
    nz = np.convolve(nz, np.ones(5) / 5, mode='same')
    out = out / 1.8 + nz * noise_amt * u
    return out * (u ** 1.1) * 0.35

for i, b in enumerate(BEATS):
    if i > 0:
        stereo(b - 0.95, riser(0.98, 160 + i * 40, 2200 + i * 160), 0.30, pan=(-1) ** i * 0.25)
    stereo(b - 0.02, boom(1.7, 150 + i * 6, 36, 0.55), 0.55 if i else 0.42)

# ------------------------------------------------------------- the close
stereo(23.18, boom(2.8, 190, 32, 0.9), 0.80)
tail_n = int(2.9 * SR); tt = np.arange(tail_n) / SR
shimmer = sum(np.sin(2 * np.pi * f * tt) * a for f, a in
              [(880, .5), (1320, .3), (1760, .2), (2640, .1)])
shimmer *= np.exp(-tt * 1.1) * 0.10
stereo(23.2, shimmer, 0.5, 0.0)

# ------------------------------------------------------------ typing ticks
def tick(hi=3200, dur=0.045, amp=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    nz = rng.standard_normal(n)
    nz = np.convolve(nz, np.ones(3) / 3, mode='same')
    body = np.sin(2 * np.pi * hi * tt) * 0.35 + nz * 0.65
    return body * np.exp(-tt * 120) * amp

for start, end, rate in [(6.65, 7.95, 26), (20.65, 22.50, 22)]:
    k = 0
    tt2 = start
    while tt2 < end:
        stereo(tt2, tick(2400 + rng.integers(0, 1800), amp=0.5 + rng.random() * 0.5),
               0.085, pan=(rng.random() - 0.5) * 0.5)
        tt2 += 1.0 / rate * (0.7 + rng.random() * 0.7)
        k += 1

# -------------------------------------------- log-line blips (step 02)
for i in range(8):
    stereo(9.68 + i * 0.13, tick(1200 + i * 110, 0.12, 0.7), 0.075, pan=(i % 2 - 0.5) * 0.6)

# -------------------------------------------- language chips (step 03)
for i, f in enumerate([880, 1100, 1320, 1600]):
    n = int(0.30 * SR); tt3 = np.arange(n) / SR
    blip = np.sin(2 * np.pi * f * tt3) * np.exp(-tt3 * 14) * 0.5
    stereo(14.72 + i * 0.22, blip, 0.10, pan=(i - 1.5) * 0.3)

# ------------------------------------------------------------- the break
n = int(1.5 * SR); tt4 = np.arange(n) / SR
glass = rng.standard_normal(n) * np.exp(-tt4 * 9.0)
glass += sum(np.sin(2 * np.pi * f * tt4 + rng.random() * 6) * np.exp(-tt4 * (5 + f / 500)) * 0.25
             for f in [1870, 2430, 3110, 4260, 5580])
stereo(18.33, glass * 0.22, 0.55, 0.1)
stereo(18.33, boom(1.4, 120, 34, 0.3), 0.40)

# --------------------------------------------------------- click (step 01)
stereo(8.35, tick(1800, 0.09, 1.0), 0.16)
n = int(0.9 * SR); tt5 = np.arange(n) / SR
whoosh = rng.standard_normal(n)
whoosh = np.convolve(whoosh, np.ones(7) / 7, mode='same')
stereo(8.33, whoosh * np.exp(-tt5 * 6.0) * 0.25, 0.35)

# ----------------------------------------------------------------- mix
mix = np.stack([L, R])
mix *= 0.92
mix = np.tanh(mix * 1.25) / 1.25               # gentle soft-clip glue
fade_in = np.clip(t / 0.35, 0, 1)
fade_out = np.clip((DUR - t) / 0.7, 0, 1)
mix *= fade_in * fade_out
peak = np.max(np.abs(mix))
mix *= (10 ** (-1.0 / 20)) / peak
print(f'peak {peak:.3f} -> normalised, rms {np.sqrt((mix**2).mean()):.4f}')

pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open('out/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote out/score.wav')
