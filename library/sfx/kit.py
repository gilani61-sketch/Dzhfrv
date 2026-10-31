"""
Звуковой набор студии. Ничего не сэмплится — всё синтезируется,
поэтому у библиотеки нет лицензионных хвостов и любой звук можно
подогнать под тайминг ролика.

    from kit import Track, boom, riser, tick, glass, drone, pad, whoosh, blip

    tr = Track(26.0)
    tr.add(0.0, drone(26.0), 0.34)
    for b in beats:
        tr.add(b - 0.95, riser(0.98), 0.30, pan=-0.25)
        tr.add(b, boom(), 0.55)
    tr.write('out/film.score.wav')
"""
import numpy as np, wave, os

SR = 48000
_rng = np.random.default_rng(7)


def seed(n):
    """Фиксируем шум, чтобы рендеры совпадали кадр в кадр и звук в звук."""
    global _rng
    _rng = np.random.default_rng(n)


def _t(dur):
    return np.arange(int(dur * SR)) / SR


def _smooth(x, k=9):
    return np.convolve(x, np.ones(k) / k, mode='same')


# ---------------------------------------------------------------- тон
def drone(dur, f0=55.0, partials=((1, 1.0, 0.0), (1, .6, .17), (2, .34, 0), (3, .13, .11), (1.5, .16, 0))):
    """Нижний гул, на котором держится вся сцена."""
    t = _t(dur)
    out = np.zeros_like(t)
    for mult, amp, det in partials:
        out += amp * np.sin(2 * np.pi * (f0 * mult + det) * t
                            + 0.6 * np.sin(2 * np.pi * 0.07 * t * mult))
    return out / 2.2


def pad(dur, harmonics=((220, .5, .043), (330, .34, .031), (440, .22, .052),
                        (660, .12, .027), (880, .07, .061), (1320, .04, .037))):
    """Воздух над дроном: тихие гармоники с медленными качелями."""
    t = _t(dur)
    out = np.zeros_like(t)
    for k, (fr, amp, sp) in enumerate(harmonics):
        lfo = 0.55 + 0.45 * np.sin(2 * np.pi * sp * t + k)
        out += amp * np.sin(2 * np.pi * fr * t + k) * lfo
    return out / 1.8


# -------------------------------------------------------------- удары
def boom(dur=1.6, f_hi=150, f_lo=38, click=0.5):
    """Кинематографичный удар: падающий тон + саб + короткий транзиент."""
    t = _t(dur)
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 5.0)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    sub = np.sin(2 * np.pi * 41 * t) * np.exp(-t * 1.7) * 0.8
    tr = _smooth(_rng.standard_normal(len(t)), 9) * np.exp(-t * 42.0) * click
    return (body + sub + tr) * 0.5


def riser(dur=1.0, f_start=180, f_end=2400, noise=0.6):
    """Разгон перед склейкой или перед прилётом камеры."""
    t = _t(dur)
    u = (t / dur) ** 2.1
    out = np.zeros_like(t)
    for h, a in ((1, 1.0), (2, .45), (3, .22), (5, .1)):
        f = (f_start + (f_end - f_start) * u) * h
        out += a * np.sin(2 * np.pi * np.cumsum(f) / SR)
    return (out / 1.8 + _smooth(_rng.standard_normal(len(t)), 5) * noise * u) * (u ** 1.1) * 0.35


def whoosh(dur=0.9, decay=6.0):
    """Пролёт мимо камеры."""
    t = _t(dur)
    return _smooth(_rng.standard_normal(len(t)), 7) * np.exp(-t * decay) * 0.25


def glass(dur=1.5, partials=(1870, 2430, 3110, 4260, 5580)):
    """Слом: стекло и осколки."""
    t = _t(dur)
    out = _rng.standard_normal(len(t)) * np.exp(-t * 9.0)
    for f in partials:
        out += np.sin(2 * np.pi * f * t + _rng.random() * 6) * np.exp(-t * (5 + f / 500)) * 0.25
    return out * 0.22


# -------------------------------------------------------- мелкая механика
def tick(hi=3200, dur=0.045, amp=1.0, decay=120):
    """Клавиша, клик, засечка."""
    t = _t(dur)
    body = np.sin(2 * np.pi * hi * t) * 0.35 + _smooth(_rng.standard_normal(len(t)), 3) * 0.65
    return body * np.exp(-t * decay) * amp


def blip(f=1100, dur=0.30, decay=14):
    """Появление элемента интерфейса."""
    t = _t(dur)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * decay) * 0.5


def shimmer(dur=2.9, partials=((880, .5), (1320, .3), (1760, .2), (2640, .1)), decay=1.1):
    """Хвост после финального удара."""
    t = _t(dur)
    out = sum(np.sin(2 * np.pi * f * t) * a for f, a in partials)
    return out * np.exp(-t * decay) * 0.10


def typing(start, end, rate=24, lo=2400, hi=4200, jitter=0.7):
    """Готовая россыпь кликов набора: вернёт список (время, сигнал)."""
    events, t = [], start
    while t < end:
        events.append((t, tick(lo + _rng.integers(0, hi - lo), amp=0.5 + _rng.random() * 0.5)))
        t += 1.0 / rate * (1 - jitter / 2 + _rng.random() * jitter)
    return events


# ------------------------------------------------------------- микшер
class Track:
    def __init__(self, dur, sr=SR):
        self.sr = sr
        self.n = int(dur * sr)
        self.dur = dur
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, at, sig, gain=1.0, pan=0.0):
        """pan: -1 слева, +1 справа."""
        i = int(at * self.sr)
        if i < 0:
            sig = sig[-i:]
            i = 0
        j = min(self.n, i + len(sig))
        if j <= i:
            return self
        chunk = sig[:j - i] * gain
        self.L[i:j] += chunk * (1 - max(0.0, pan))
        self.R[i:j] += chunk * (1 + min(0.0, pan))
        return self

    def add_many(self, events, gain=1.0, pan=0.0):
        for at, sig in events:
            self.add(at, sig, gain, pan)
        return self

    def bed(self, sig, gain=1.0, envelope=None, width=311):
        """Подложка на всю длину: стерео-ширина за счёт сдвига правого канала."""
        sig = sig[:self.n]
        if envelope is not None:
            sig = sig * envelope[:len(sig)]
        self.L[:len(sig)] += sig * gain
        self.R[:len(sig)] += np.roll(sig, width) * gain
        return self

    def t(self):
        return np.arange(self.n) / self.sr

    def master(self, headroom_db=-1.0, glue=1.25, fade_in=0.35, fade_out=0.7):
        mix = np.stack([self.L, self.R]) * 0.92
        mix = np.tanh(mix * glue) / glue
        t = self.t()
        mix *= np.clip(t / fade_in, 0, 1) * np.clip((self.dur - t) / fade_out, 0, 1)
        peak = float(np.max(np.abs(mix))) or 1.0
        mix *= (10 ** (headroom_db / 20)) / peak
        return mix

    def write(self, path, **kw):
        mix = self.master(**kw)
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
        with wave.open(path, 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(self.sr)
            w.writeframes(pcm.tobytes())
        rms = float(np.sqrt((mix ** 2).mean()))
        print(f'{path}  {self.dur:.1f}s  rms {rms:.4f}')
        return path


def read_wav(path):
    """Читает wav (например, озвучку) в моно-массив и его частоту."""
    with wave.open(path, 'rb') as w:
        sr, ch, nf = w.getframerate(), w.getnchannels(), w.getnframes()
        raw = np.frombuffer(w.readframes(nf), dtype='<i2').astype(np.float32) / 32768
    if ch > 1:
        raw = raw.reshape(-1, ch).mean(axis=1)
    return raw, sr


def duck(bed, voice, sr=SR, depth=0.65, attack=0.05, release=0.35):
    """Пригибает музыку под голосом: простой огибающий компрессор."""
    env = np.abs(voice)
    k_a = np.exp(-1.0 / (attack * sr))
    k_r = np.exp(-1.0 / (release * sr))
    out = np.zeros_like(env)
    prev = 0.0
    for i, v in enumerate(env):
        k = k_a if v > prev else k_r
        prev = k * prev + (1 - k) * v
        out[i] = prev
    out /= (out.max() or 1.0)
    gain = 1.0 - depth * out
    n = min(len(bed[0]) if bed.ndim > 1 else len(bed), len(gain))
    if bed.ndim > 1:
        bed[:, :n] *= gain[:n]
    else:
        bed[:n] *= gain[:n]
    return bed
