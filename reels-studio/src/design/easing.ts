import { Easing, interpolate } from 'remotion';

/** Кривые движения. Больше никаких — иначе ролики перестают быть «одной рукой». */
export const EASE = {
  /** вход предмета в кадр: быстро стартует, мягко садится */
  archive: Easing.bezier(0.16, 1, 0.3, 1),
  /** бумага, вес, инерция */
  paper: Easing.bezier(0.65, 0, 0.35, 1),
  /** резкий щелчок затвора */
  snap: Easing.bezier(0.2, 0, 0, 1),
  /** равномерный дрейф (Кен Бёрнс) */
  drift: Easing.bezier(0.4, 0, 0.6, 1),
  linear: Easing.linear,
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
} as const;

/** 0 → 1 за `dur` кадров начиная с `start`. */
export const ramp = (
  frame: number,
  start: number,
  dur: number,
  easing = EASE.archive,
) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** Прогресс входа и выхода сцены одной функцией: 0 на краях, 1 в середине. */
export const envelope = (
  frame: number,
  duration: number,
  inDur: number,
  outDur: number,
  easing = EASE.archive,
) => {
  const a = ramp(frame, 0, Math.max(1, inDur), easing);
  const b = 1 - ramp(frame, duration - outDur, Math.max(1, outDur), easing);
  return Math.min(a, b);
};

/** Детерминированный псевдослучайный шум: один и тот же кадр → одно и то же число. */
export const hash = (n: number, seed = 1) => {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Плавный шум для дрожания кадра. */
export const smoothNoise = (frame: number, seed = 1, speed = 0.12) => {
  const t = frame * speed;
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return (hash(i, seed) * (1 - u) + hash(i + 1, seed) * u) * 2 - 1;
};
