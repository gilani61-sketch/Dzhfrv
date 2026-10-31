/**
 * ДИЗАЙН-СИСТЕМА «АРХИВ»
 * Единственный источник правды по цвету, типографике, сетке и ритму.
 * Любая сцена берёт значения отсюда и ниоткуда больше.
 */

/* ── ХОЛСТ ───────────────────────────────────────────────────────────── */
export const CANVAS = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/** Безопасные зоны Instagram Reels (пиксели от края холста 1080×1920). */
export const SAFE = {
  top: 180,        // аватар/шапка поверх ролика
  bottom: 400,     // подпись, кнопки, музыка
  side: 72,        // левый/правый отступ контента
  rightRail: 180,  // колонка лайк/коммент/шер
} as const;

/** Опорные линии композиции. */
export const GRID = {
  colGutter: 24,
  cols: 6,
  get colWidth() {
    return (CANVAS.width - SAFE.side * 2 - this.colGutter * (this.cols - 1)) / this.cols;
  },
  /** Куда садится основная подпись (базовая линия). */
  captionBaseline: CANVAS.height - 560,
  /** Куда садится шапка-локап. */
  lockupTop: 360,
  /** Киношная полоса 16:9 по центру верхней половины. */
  band: { top: 644, height: 608 },
  /** Оптический центр кадра — выше геометрического. */
  opticalCenter: CANVAS.height * 0.44,
} as const;

/* ── ЦВЕТ ────────────────────────────────────────────────────────────── */
export const COLOR = {
  // тёмные подложки
  ink: '#121110',        // кинорежим, абсолютная подложка
  charcoal: '#1E1C1A',   // тёмная бумага коллажа
  soot: '#2B2825',       // слой выше подложки
  // светлые подложки
  bone: '#FFFCF5',
  cream: '#F4EEE2',
  paper: '#EAE2D2',
  // сепия / дерево / металл
  sepia: '#8A6A46',
  tea: '#C2A585',
  rust: '#7A4A30',
  // акценты (ровно три, больше не вводим)
  gold: '#C9A227',       // главный акцент: год, цифра, рамка
  oxide: '#9B3B2E',      // штамп, пометка, «красный карандаш»
  indigo: '#27456E',     // архивная синь, небо коллажа
  // служебное
  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Разрешённые пары «подложка → текст». Контраст проверен. */
export const ON = {
  ink: COLOR.cream,
  charcoal: COLOR.cream,
  cream: COLOR.ink,
  paper: COLOR.ink,
  gold: COLOR.ink,
  oxide: COLOR.bone,
  indigo: COLOR.bone,
} as const;

/* ── ТИПОГРАФИКА ─────────────────────────────────────────────────────── */
export const FONT = {
  display: "'Playfair Display', Georgia, serif",
  script: "'Playfair Display', Georgia, serif", // italic-начертание = «рукописный» локап
  quote: "'Cormorant Garamond', Georgia, serif",
  caption: "'Oswald', 'Arial Narrow', sans-serif",
  ui: "'Inter', system-ui, sans-serif",
} as const;

/**
 * Шкала кегля. Пять ступеней, между ними ничего не изобретаем.
 * lh — межстрочное, ls — трекинг в em.
 */
export const TYPE = {
  display: { size: 132, lh: 0.94, ls: -0.02, weight: 700, family: FONT.display },
  title:   { size: 88,  lh: 1.02, ls: -0.01, weight: 700, family: FONT.display },
  brand:   { size: 104, lh: 1.0,  ls: 0.0,   weight: 400, family: FONT.script, italic: true },
  quote:   { size: 76,  lh: 1.18, ls: 0.0,   weight: 400, family: FONT.quote, italic: true },
  caption: { size: 62,  lh: 1.1,  ls: 0.0,   weight: 600, family: FONT.caption, upper: true },
  body:    { size: 44,  lh: 1.34, ls: 0.0,   weight: 400, family: FONT.ui },
  kicker:  { size: 34,  lh: 1.2,  ls: 0.22,  weight: 500, family: FONT.caption, upper: true },
  label:   { size: 26,  lh: 1.2,  ls: 0.30,  weight: 500, family: FONT.ui, upper: true },
  numeral: { size: 240, lh: 0.86, ls: -0.03, weight: 900, family: FONT.display },
} as const;

/* ── РИТМ ────────────────────────────────────────────────────────────── */
/** Всё время в системе кратно доле: 1 бит = 0.5 c = 15 кадров @30fps. */
export const BEAT = 15;
export const TIME = {
  beat: BEAT,
  /** минимальная длина плана — ниже этого зритель не успевает прочесть */
  shotMin: BEAT * 3,       // 1.5 c
  shotShort: BEAT * 4,     // 2.0 c
  shotMed: BEAT * 6,       // 3.0 c
  shotLong: BEAT * 9,      // 4.5 c
  /** вход/выход элемента внутри сцены */
  inFast: 7,
  in: 10,
  out: 8,
  /** длительности переходов между сценами */
  trans: { cut: 0, dip: 6, flash: 7, fade: 12, paper: 16, slide: 14, halftone: 18, zoom: 14, shutter: 14, filmroll: 16 },
  /** задержка между словами в кинетической подписи */
  wordStagger: 2,
} as const;

/* ── ГЛУБИНА И ОБВОДКА ───────────────────────────────────────────────── */
export const DEPTH = {
  cutout: '0 18px 38px rgba(0,0,0,.45), 0 2px 0 rgba(255,255,255,.14)',
  card: '0 24px 60px rgba(0,0,0,.55)',
  frame: '0 0 0 2px rgba(201,162,39,.55)',
  textShadow: '0 2px 18px rgba(0,0,0,.55)',
} as const;

/* ── ПЛЁНКА ──────────────────────────────────────────────────────────── */
export const FILM = {
  grainOpacity: 0.16,
  grainBlend: 'overlay' as const,
  dustOpacity: 0.3,
  vignette: 0.42,
  /** лёгкое дрожание кадра, пиксели */
  gateWeave: 1.6,
  /** мерцание экспозиции */
  flicker: 0.035,
} as const;

/* ── ЛОГОТИП АККАУНТА ────────────────────────────────────────────────── */
export const MARK = {
  /** подставляется из конфигурации ролика, это значения по умолчанию */
  handle: '@archive',
  line: 'АРХИВ',
} as const;
