import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLOR, TYPE, GRID, SAFE, TIME, DEPTH } from '../design/tokens';
import { EASE, ramp } from '../design/easing';

type Step = keyof typeof TYPE;

/** Применить ступень шкалы как CSS. */
export const typeStyle = (step: Step, color: string = COLOR.cream): React.CSSProperties => {
  const t = TYPE[step] as any;
  return {
    fontFamily: t.family,
    fontSize: t.size,
    lineHeight: t.lh,
    letterSpacing: `${t.ls}em`,
    fontWeight: t.weight,
    fontStyle: t.italic ? 'italic' : 'normal',
    textTransform: t.upper ? 'uppercase' : 'none',
    color,
    margin: 0,
  };
};

/**
 * Субтитр-подпись. Слова проявляются по очереди — так читается быстрее,
 * чем целая строка, и держит взгляд в нижней трети.
 */
export const Caption: React.FC<{
  text: string;
  /** кадр начала относительно сцены */
  start?: number;
  color?: string;
  box?: boolean;
  size?: number;
  y?: number;
  align?: 'center' | 'left';
}> = ({ text, start = 0, color = COLOR.bone, box = false, size, y = GRID.captionBaseline, align = 'center' }) => {
  const f = useCurrentFrame();
  const words = text.trim().split(/\s+/);
  const base = typeStyle('caption', color);

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.side,
        right: SAFE.side,
        top: y,
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${(size ?? (base.fontSize as number)) * 0.14}px ${(size ?? (base.fontSize as number)) * 0.28}px`,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        alignItems: 'baseline',
      }}
    >
      {words.map((w, i) => {
        const p = ramp(f, start + i * TIME.wordStagger, TIME.inFast, EASE.archive);
        return (
          <span
            key={i}
            style={{
              ...base,
              fontSize: size ?? base.fontSize,
              opacity: p,
              transform: `translateY(${(1 - p) * 14}px)`,
              display: 'inline-block',
              textShadow: box ? 'none' : DEPTH.textShadow,
              background: box ? 'rgba(18,17,16,.82)' : 'none',
              padding: box ? '0.06em 0.22em' : 0,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Постоянная шапка ролика: рубрика + имя бренда.
 * Это якорь серии — её положение и кегль не меняются никогда.
 */
export const Lockup: React.FC<{
  kicker?: string;
  brand?: string;
  start?: number;
  color?: string;
  top?: number;
}> = ({ kicker, brand, start = 0, color = COLOR.bone, top = GRID.lockupTop }) => {
  const f = useCurrentFrame();
  const a = ramp(f, start, TIME.in, EASE.archive);
  const b = ramp(f, start + 4, TIME.in + 4, EASE.archive);
  if (!kicker && !brand) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, textAlign: 'center' }}>
      {kicker ? (
        <div
          style={{
            ...typeStyle('kicker', color),
            opacity: a * 0.92,
            transform: `translateY(${(1 - a) * 10}px)`,
            textShadow: DEPTH.textShadow,
          }}
        >
          {kicker}
        </div>
      ) : null}
      {brand ? (
        <div
          style={{
            ...typeStyle('brand', color),
            marginTop: 10,
            opacity: b,
            transform: `translateY(${(1 - b) * 14}px)`,
            textShadow: DEPTH.textShadow,
          }}
        >
          {brand}
        </div>
      ) : null}
    </div>
  );
};

/** Мелкая служебная строка: год, город, источник. С линейкой слева. */
export const Label: React.FC<{
  text: string;
  start?: number;
  color?: string;
  x?: number;
  y?: number;
}> = ({ text, start = 0, color = COLOR.tea, x = SAFE.side, y = GRID.captionBaseline + 110 }) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, TIME.in, EASE.archive);
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      display: 'flex', alignItems: 'center', gap: 16, opacity: p,
    }}>
      <div style={{
        width: interpolate(p, [0, 1], [0, 54]), height: 2, background: COLOR.gold, opacity: 0.8,
      }} />
      <span style={{ ...typeStyle('label', color), textShadow: DEPTH.textShadow }}>{text}</span>
    </div>
  );
};

/** Крупный текст-мысль: строки въезжают снизу из-под «маски строки». */
export const StatementText: React.FC<{
  text: string;
  start?: number;
  color?: string;
  step?: Step;
  align?: 'left' | 'center';
}> = ({ text, start = 0, color = COLOR.cream, step = 'title', align = 'left' }) => {
  const f = useCurrentFrame();
  const lines = text.split('\n');
  return (
    <div style={{ textAlign: align, width: '100%' }}>
      {lines.map((line, i) => {
        const p = ramp(f, start + i * 4, 14, EASE.archive);
        return (
          <div key={i} style={{ overflow: 'hidden', paddingBottom: '0.06em' }}>
            <div
              style={{
                ...typeStyle(step, color),
                transform: `translateY(${(1 - p) * 100}%)`,
                opacity: interpolate(p, [0, 0.25, 1], [0, 1, 1]),
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Счётчик-год: цифры «перещёлкиваются» до нужной. */
export const Numeral: React.FC<{ value: string; start?: number; color?: string }> = ({
  value, start = 0, color = COLOR.gold,
}) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, 26, EASE.snap);
  const digits = value.split('');
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>
      {digits.map((d, i) => {
        const dp = ramp(f, start + i * 3, 22, EASE.snap);
        const isNum = /\d/.test(d);
        const shown = isNum && dp < 1
          ? String(Math.floor(interpolate(dp, [0, 1], [0, Number(d) + 10]) % 10))
          : d;
        return (
          <span key={i} style={{
            ...typeStyle('numeral', color),
            opacity: interpolate(dp, [0, 0.2, 1], [0, 1, 1]),
            transform: `translateY(${(1 - dp) * 24}px)`,
            display: 'inline-block',
            textShadow: '0 10px 40px rgba(0,0,0,.6)',
          }}>
            {shown}
          </span>
        );
      })}
      <span style={{ opacity: p * 0 }} />
    </div>
  );
};
