/**
 * Единый источник правды по стилю. Фильмы берут значения отсюда,
 * а не прописывают цвета и тайминги руками.
 */

export const palettes = {
  /* дефолт: холодная техно-ночь — для продуктовых и tech-роликов */
  'cold-tech': {
    void:      0x02040a,
    ink:       0xffffff,
    muted:     0xbcd2ea,
    dim:       0x7e94ad,
    accent:    0x7cc4ff,
    accent2:   0x6e8cff,
    hot:       0xffb27a,
    ok:        0x7ee7b2,
    nebula:    [0.04, 0.14, 0.38],
    nebulaHot: [0.46, 0.11, 0.015],
    css: { ink: '#ffffff', muted: '#bcd2ea', accent: '#7cc4ff', hot: '#ffd3b0', ok: '#7ee7b2' },
  },
  /* неон: для hype-роликов, запусков, «вау» */
  'neon-night': {
    void:      0x05020c,
    ink:       0xffffff,
    muted:     0xd8c8ff,
    dim:       0x9a86c4,
    accent:    0xb48cff,
    accent2:   0xff6ec7,
    hot:       0x5ce1e6,
    ok:        0x9bff9b,
    nebula:    [0.18, 0.06, 0.38],
    nebulaHot: [0.42, 0.06, 0.28],
    css: { ink: '#ffffff', muted: '#d8c8ff', accent: '#b48cff', hot: '#5ce1e6', ok: '#9bff9b' },
  },
  /* тёплый документальный: интервью, кейсы, «человеческие» истории */
  'warm-doc': {
    void:      0x0a0603,
    ink:       0xfff6ec,
    muted:     0xe4cdb4,
    dim:       0xa88e74,
    accent:    0xffb46b,
    accent2:   0xff8a5c,
    hot:       0x8fd0ff,
    ok:        0xc9e38a,
    nebula:    [0.34, 0.16, 0.05],
    nebulaHot: [0.08, 0.20, 0.42],
    css: { ink: '#fff6ec', muted: '#e4cdb4', accent: '#ffb46b', hot: '#8fd0ff', ok: '#c9e38a' },
  },
  /* моно: строгие цифры, финансы, отчёты */
  'mono-noir': {
    void:      0x060709,
    ink:       0xffffff,
    muted:     0xc9ced6,
    dim:       0x7b828c,
    accent:    0xe8edf5,
    accent2:   0xa9b2bf,
    hot:       0xff7a59,
    ok:        0x8fe3a8,
    nebula:    [0.10, 0.11, 0.13],
    nebulaHot: [0.30, 0.12, 0.06],
    css: { ink: '#ffffff', muted: '#c9ced6', accent: '#e8edf5', hot: '#ff7a59', ok: '#8fe3a8' },
  },
};

export const DEFAULT_PALETTE = 'cold-tech';
export const palette = (name = DEFAULT_PALETTE) => palettes[name] ?? palettes[DEFAULT_PALETTE];

/**
 * Типографика. Размеры — в canvas-пикселях при PX = 300.
 * Правило кадра: при самом близком положении камеры в кадр влезает ~700 px,
 * поэтому maxWidth строки не задираем выше 620.
 */
export const type = {
  display: "'Inter Display','Inter',sans-serif",
  body:    "'Inter','Inter Display',sans-serif",
  mono:    "'JetBrains Mono',monospace",
  size: {
    hero:    132,  // один-два слова, главный удар
    title:    96,  // заголовок станции
    subtitle: 72,  // подзаголовок / описание шага
    body:     56,  // пояснение
    caption:  44,  // подпись, мелочь
    mono:     40,  // код и логи
  },
  maxWidth: { hero: 620, title: 620, body: 600, narrow: 520 },
  tracking: { tight: -1.5, normal: 0, wide: 2.5 },
  weight: { black: 800, bold: 700, medium: 500 },
};

/** Тайминги движения. Всё остальное производно от них. */
export const motion = {
  fps: 30,
  sub: 3,            // суб-кадры на кадр (смаз)
  shutter: 0.72,     // выдержка
  stagger: { tight: 0.035, normal: 0.055, loose: 0.09 },
  dur:     { snap: 0.55, normal: 0.85, slow: 1.2 },
  station: { gap: 16, hold: [8.2, 6.0] },   // шаг по -Z и дистанции камеры
  rail:    { lead: 0.28, tail: 0.46 },      // когда камера приходит и когда уходит
};

/** Оптика и грейд по умолчанию. */
export const lensDefaults = {
  fov: 38,
  focusLag: 0.05,
  aperture: [0.075, 0.150],   // покой → разгон
  maxBlur:  [0.026, 0.038],
};

export const grade = {
  bloom: 0.26, bloomWhoosh: 0.12,
  threshold: 0.90, soft: 0.40,
  aberration: 0.0013, aberrationWhoosh: 0.0042,
  grain: 0.022, vignette: 1.0, exposure: 1.0,
};

/** Безопасные зоны вертикального формата (доли высоты кадра). */
export const safeArea = {
  top: 0.10,      // системный UI / шапка
  bottom: 0.18,   // подпись, кнопки, прогресс-бар
  note: 'Ключевой текст держим между 18% и 78% высоты кадра.',
};
