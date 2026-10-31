import { z } from 'zod';

/* ───────────────────────── ПЕРЕХОДЫ ───────────────────────── */
export const transitionKind = z.enum([
  'cut',       // встык
  'dip',       // провал в чёрное/бумагу
  'flash',     // склейка плёнки, вспышка
  'fade',      // наплыв
  'paper',     // рваная бумага наезжает сверху
  'slide',     // сдвиг вбок
  'halftone',  // проявка растровой точкой
  'zoom',      // наезд с подменой
  'shutter',   // ламели затвора
  'filmroll',  // протяжка плёнки по вертикали
]);
export type TransitionKind = z.infer<typeof transitionKind>;

/* ───────────────────────── ОБЩЕЕ ДЛЯ СЦЕН ─────────────────── */
const sceneBase = {
  /** длительность в секундах; если не задана — берётся из стиля */
  dur: z.number().positive().optional(),
  /** переход, которым сцена ВХОДИТ (выход предыдущей подстраивается) */
  in: transitionKind.optional(),
  /** подпись-субтитр внизу кадра */
  caption: z.string().optional(),
  /** мелкая служебная строка (год, город, источник) */
  label: z.string().optional(),
  /** показывать постоянную шапку-локап поверх сцены */
  lockup: z.boolean().optional(),
  /** звуковой акцент из public/media/audio/sfx */
  sfx: z.string().optional(),
};

const media = {
  /** путь относительно public/, напр. media/footage/cartier-01.mp4 */
  src: z.string(),
  /** стартовая секунда исходника */
  from: z.number().min(0).optional(),
  /** как вписать: band — киношная полоса, full — на весь кадр */
  fit: z.enum(['band', 'full', 'card']).optional(),
  /** скорость движения камеры по кадру */
  move: z.enum(['none', 'push', 'pull', 'panL', 'panR', 'driftUp']).optional(),
};

/* ───────────────────────── СЦЕНЫ ──────────────────────────── */
export const scene = z.discriminatedUnion('type', [
  /** Обложка: крючок первых трёх секунд */
  z.object({
    type: z.literal('cover'),
    title: z.string(),
    kicker: z.string().optional(),
    brand: z.string().optional(),
    bg: z.object(media).partial({ src: true }).optional(),
    ...sceneBase,
  }),

  /** Видеоплан */
  z.object({ type: z.literal('footage'), ...media, ...sceneBase }),

  /** Фотоплан с медленным наездом */
  z.object({ type: z.literal('still'), ...media, ...sceneBase }),

  /** Коллаж из вырезок */
  z.object({
    type: z.literal('collage'),
    bg: z.enum(['charcoal', 'cream', 'indigo', 'gold']).optional(),
    layers: z.array(z.object({
      src: z.string(),
      /** положение и размер в процентах холста */
      x: z.number(), y: z.number(), w: z.number(),
      rotate: z.number().optional(),
      /** глубина параллакса: 0 — фон, 1 — передний план */
      depth: z.number().min(0).max(1).optional(),
      /** обработка вырезки */
      treat: z.enum(['none', 'duotone', 'engrave', 'cutout']).optional(),
      /** собственное движение слоя */
      anim: z.enum(['none', 'rise', 'swing', 'slideL', 'slideR', 'pop']).optional(),
    })).default([]),
    /** полосы рваной бумаги */
    strips: z.array(z.object({
      y: z.number(), h: z.number(),
      tone: z.enum(['cream', 'charcoal', 'gold', 'indigo', 'oxide']).optional(),
    })).optional(),
    headline: z.string().optional(),
    ...sceneBase,
  }),

  /** Крупная мысль текстом */
  z.object({
    type: z.literal('statement'),
    text: z.string(),
    bg: z.enum(['ink', 'charcoal', 'cream', 'gold', 'oxide', 'indigo']).optional(),
    align: z.enum(['left', 'center']).optional(),
    ...sceneBase,
  }),

  /** Год или число во весь кадр */
  z.object({
    type: z.literal('numeral'),
    value: z.string(),
    note: z.string().optional(),
    bg: z.object(media).partial({ src: true }).optional(),
    ...sceneBase,
  }),

  /** Цитата */
  z.object({
    type: z.literal('quote'),
    text: z.string(),
    author: z.string().optional(),
    ...sceneBase,
  }),

  /** Два кадра рядом: было / стало */
  z.object({
    type: z.literal('split'),
    top: z.object(media),
    bottom: z.object(media),
    topLabel: z.string().optional(),
    bottomLabel: z.string().optional(),
    ...sceneBase,
  }),

  /** Картина в паспарту с музейной этикеткой */
  z.object({
    type: z.literal('gallery'),
    src: z.string(),
    artist: z.string().optional(),
    work: z.string().optional(),
    year: z.string().optional(),
    detail: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
    ...sceneBase,
  }),

  /** Финал */
  z.object({
    type: z.literal('outro'),
    line: z.string().optional(),
    cta: z.string().optional(),
    ...sceneBase,
  }),
]);
export type Scene = z.infer<typeof scene>;

/* ───────────────────────── РОЛИК ──────────────────────────── */
export const reelSchema = z.object({
  slug: z.string(),
  /** визуальный регистр */
  style: z.enum(['chronicle', 'collage', 'gallery']).default('chronicle'),
  /** шапка-локап, как «История часов / Cartier» */
  lockup: z.object({
    kicker: z.string().optional(),
    brand: z.string().optional(),
    show: z.boolean().default(true),
  }).default({ show: true }),
  handle: z.string().default('@archive'),
  /** закадровый голос: public/media/audio/vo/... */
  voice: z.string().optional(),
  /** музыка: public/media/audio/music/... */
  music: z.string().optional(),
  musicGain: z.number().min(0).max(1).default(0.22),
  /** показать служебную разметку безопасных зон */
  guides: z.boolean().default(false),
  scenes: z.array(scene).min(1),
});
export type Reel = z.infer<typeof reelSchema>;
