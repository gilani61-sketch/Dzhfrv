import React from 'react';
import { interpolate } from 'remotion';
import type { TransitionKind } from '../schema/reel';
import { EASE } from '../design/easing';
import { TIME, CANVAS } from '../design/tokens';
import { tornPoints } from '../components/Paper';

export const transitionFrames = (k: TransitionKind = 'cut') => TIME.trans[k] ?? 0;

/** Рваная маска верхнего края для перехода «бумага». */
export const tornClipPath = (seed: number, amp = 26) => {
  const pts = tornPoints(CANVAS.width, amp, seed, 64);
  let d = `M ${pts[0][0]} ${pts[0][1] + amp}`;
  pts.slice(1).forEach(([x, y]) => { d += ` L ${x} ${y + amp}`; });
  d += ` L ${CANVAS.width} ${CANVAS.height} L 0 ${CANVAS.height} Z`;
  return d;
};

export type Phase = { kind: TransitionKind; p: number };

/**
 * Стиль ВХОДЯЩЕЙ сцены. p: 0 — сцены ещё нет, 1 — сцена на месте.
 * clipId подставляется снаружи: для «бумаги» нужен реальный <clipPath> в DOM.
 */
export const enterStyle = (kind: TransitionKind, pRaw: number, clipId?: string): React.CSSProperties => {
  const p = Math.max(0, Math.min(1, pRaw));
  switch (kind) {
    case 'cut':
      return {};
    case 'fade':
      return { opacity: EASE.inOut(p) };
    case 'dip':
      return { opacity: interpolate(p, [0, 0.5, 1], [0, 0, 1]) };
    case 'flash':
      return {
        opacity: interpolate(p, [0, 0.35, 1], [0, 1, 1]),
        transform: `scale(${interpolate(EASE.archive(p), [0, 1], [1.05, 1])})`,
      };
    case 'zoom':
      return {
        opacity: interpolate(p, [0, 0.45, 1], [0, 1, 1]),
        transform: `scale(${interpolate(EASE.archive(p), [0, 1], [1.2, 1])})`,
      };
    case 'slide':
      return {
        transform: `translateX(${interpolate(EASE.paper(p), [0, 1], [100, 0])}%)`,
      };
    case 'filmroll':
      return {
        transform: `translateY(${interpolate(EASE.snap(p), [0, 1], [100, 0])}%)`,
        filter: `blur(${interpolate(p, [0, 0.6, 1], [10, 2, 0])}px)`,
      };
    case 'paper':
      return {
        transform: `translateY(${interpolate(EASE.paper(p), [0, 1], [102, 0])}%)`,
        clipPath: clipId ? `url(#${clipId})` : undefined,
      };
    case 'halftone': {
      const r = interpolate(EASE.archive(p), [0, 1], [0, 22]);
      const mask = `radial-gradient(circle at center, #000 ${r}px, rgba(0,0,0,0) ${r + 1.5}px)`;
      return {
        WebkitMaskImage: mask, maskImage: mask,
        WebkitMaskSize: '26px 26px', maskSize: '26px 26px',
        WebkitMaskRepeat: 'repeat', maskRepeat: 'repeat',
      };
    }
    case 'shutter': {
      const h = interpolate(EASE.paper(p), [0, 1], [0, 64]);
      const mask = `repeating-linear-gradient(to bottom, #000 0px ${h}px, rgba(0,0,0,0) ${h}px 64px)`;
      return { WebkitMaskImage: mask, maskImage: mask };
    }
    default:
      return { opacity: p };
  }
};

/** Стиль УХОДЯЩЕЙ сцены. p: 0 — сцена на месте, 1 — ушла. */
export const exitStyle = (kind: TransitionKind, pRaw: number): React.CSSProperties => {
  const p = Math.max(0, Math.min(1, pRaw));
  switch (kind) {
    case 'cut':
      return {};
    case 'dip':
      return { opacity: interpolate(p, [0, 0.5, 1], [1, 0, 0]) };
    case 'fade':
      return { opacity: 1 - EASE.inOut(p) * 0.35 };
    case 'flash':
      return { opacity: interpolate(p, [0, 0.45, 1], [1, 1, 0]) };
    case 'zoom':
      return { transform: `scale(${interpolate(EASE.archive(p), [0, 1], [1, 0.9])})`, opacity: 1 - p * 0.6 };
    case 'slide':
      return { transform: `translateX(${interpolate(EASE.paper(p), [0, 1], [0, -22])}%)` };
    case 'filmroll':
      return {
        transform: `translateY(${interpolate(EASE.snap(p), [0, 1], [0, -100])}%)`,
        filter: `blur(${interpolate(p, [0, 1], [0, 8])}px)`,
      };
    case 'paper':
      return { transform: `scale(${interpolate(p, [0, 1], [1, 0.985])})`, filter: `brightness(${1 - p * 0.3})` };
    case 'halftone':
      return { filter: `brightness(${1 - p * 0.25}) contrast(${1 + p * 0.3})` };
    case 'shutter':
      return { filter: `brightness(${1 - p * 0.2})` };
    default:
      return {};
  }
};

/** Нужна ли вспышка-засветка поверх склейки. */
export const halationAmount = (kind: TransitionKind, p: number) => {
  if (kind !== 'flash') return 0;
  return interpolate(p, [0, 0.35, 1], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

/** Нужен ли провал в чёрное поверх склейки. */
export const dipAmount = (kind: TransitionKind, p: number) => {
  if (kind !== 'dip') return 0;
  return interpolate(p, [0, 0.5, 1], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};
