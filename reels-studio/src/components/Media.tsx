import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLOR, GRID, CANVAS } from '../design/tokens';
import { EASE } from '../design/easing';
import { Grade, gradeFilter } from '../design/grade';

export type Move = 'none' | 'push' | 'pull' | 'panL' | 'panR' | 'driftUp';
export type Fit = 'band' | 'full' | 'card';

/** Медленное движение камеры по кадру. Всегда линейно — рывок выдаёт подделку. */
export const useKenBurns = (move: Move = 'push', duration = 90, amount = 1) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, Math.max(1, duration)], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.drift,
  });
  const a = amount;
  switch (move) {
    case 'push': return { scale: 1 + 0.085 * a * t, x: 0, y: 0 };
    case 'pull': return { scale: 1 + 0.085 * a * (1 - t), x: 0, y: 0 };
    case 'panL': return { scale: 1 + 0.08 * a, x: interpolate(t, [0, 1], [30 * a, -30 * a]), y: 0 };
    case 'panR': return { scale: 1 + 0.08 * a, x: interpolate(t, [0, 1], [-30 * a, 30 * a]), y: 0 };
    case 'driftUp': return { scale: 1 + 0.07 * a, x: 0, y: interpolate(t, [0, 1], [26 * a, -26 * a]) };
    default: return { scale: 1.01, x: 0, y: 0 };
  }
};

const Source: React.FC<{ src: string; from?: number; style: React.CSSProperties }> = ({
  src, from = 0, style,
}) => {
  const { fps } = useVideoConfig();
  const url = /^https?:/.test(src) ? src : staticFile(src);
  const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(src);
  return isVideo ? (
    <OffthreadVideo src={url} startFrom={Math.round(from * fps)} style={style} muted />
  ) : (
    <Img src={url} style={style} />
  );
};

/**
 * Кадр с медиа. `band` — киношная полоса как в «Хронике»,
 * `full` — на весь экран, `card` — карточка со скруглением и рамкой.
 */
export const MediaFrame: React.FC<{
  src: string;
  from?: number;
  fit?: Fit;
  move?: Move;
  duration?: number;
  grade: Grade;
  radius?: number;
  children?: React.ReactNode;
}> = ({ src, from, fit = 'full', move = 'push', duration = 90, grade, radius, children }) => {
  const kb = useKenBurns(move, duration);
  const media: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${kb.scale}) translate(${kb.x}px, ${kb.y}px)`,
    filter: gradeFilter(grade),
  };

  const box: React.CSSProperties =
    fit === 'band'
      ? { position: 'absolute', left: 0, right: 0, top: GRID.band.top, height: GRID.band.height }
      : fit === 'card'
        ? {
          position: 'absolute',
          left: 96, right: 96, top: 520, height: 880,
          borderRadius: radius ?? 6,
          boxShadow: '0 30px 70px rgba(0,0,0,.6)',
        }
        : { position: 'absolute', inset: 0 };

  return (
    <div style={{ ...box, overflow: 'hidden', backgroundColor: COLOR.ink }}>
      <Source src={src} from={from} style={media} />
      {grade.washOpacity > 0 ? (
        <div style={{
          position: 'absolute', inset: 0, background: grade.wash,
          opacity: grade.washOpacity, mixBlendMode: grade.washBlend,
        }} />
      ) : null}
      {children}
    </div>
  );
};

/** Полноэкранный фон, затемнённый под текст. */
export const MediaBackdrop: React.FC<{
  src?: string; from?: number; grade: Grade; dim?: number; move?: Move; duration?: number;
}> = ({ src, from, grade, dim = 0.55, move = 'push', duration = 90 }) => {
  if (!src) return <AbsoluteFill style={{ backgroundColor: COLOR.ink }} />;
  return (
    <AbsoluteFill>
      <MediaFrame src={src} from={from} fit="full" move={move} duration={duration} grade={grade} />
      <AbsoluteFill style={{ background: `rgba(10,9,8,${dim})` }} />
    </AbsoluteFill>
  );
};

export const BAND_ASPECT = CANVAS.width / GRID.band.height;
