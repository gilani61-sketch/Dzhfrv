import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { COLOR, CANVAS } from '../design/tokens';
import { hash } from '../design/easing';

/** Точки рваного края. Один и тот же seed — один и тот же разрыв. */
export const tornPoints = (
  width: number,
  amp: number,
  seed: number,
  segments = 56,
): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (width / segments) * i;
    const coarse = (hash(i, seed) - 0.5) * amp;
    const fine = (hash(i * 3.7, seed + 17) - 0.5) * amp * 0.4;
    const micro = (hash(i * 11.3, seed + 71) - 0.5) * amp * 0.15;
    pts.push([x, coarse + fine + micro]);
  }
  return pts;
};

const TONE: Record<string, string> = {
  cream: COLOR.cream,
  paper: COLOR.paper,
  bone: COLOR.bone,
  charcoal: COLOR.charcoal,
  ink: COLOR.ink,
  gold: COLOR.gold,
  indigo: COLOR.indigo,
  oxide: COLOR.oxide,
};
export type Tone = keyof typeof TONE;

const isLight = (t: Tone) => t === 'cream' || t === 'paper' || t === 'bone' || t === 'gold';

/**
 * Горизонтальная полоса бумаги с рваными верхом и низом.
 * y, h — проценты высоты холста.
 */
export const TornStrip: React.FC<{
  y: number;
  h: number;
  tone?: Tone;
  seed?: number;
  amp?: number;
  shadow?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ y, h, tone = 'cream', seed = 1, amp = 16, shadow = true, children, style }) => {
  const W = CANVAS.width;
  const top = (y / 100) * CANVAS.height;
  const height = (h / 100) * CANVAS.height;
  const pad = amp + 8;
  const boxH = height + pad * 2;

  const topPts = tornPoints(W, amp, seed);
  const botPts = tornPoints(W, amp, seed + 101);

  let d = `M ${topPts[0][0]} ${pad + topPts[0][1]}`;
  topPts.slice(1).forEach(([x, py]) => { d += ` L ${x} ${pad + py}`; });
  d += ` L ${W} ${pad + height + botPts[botPts.length - 1][1]}`;
  [...botPts].reverse().forEach(([x, py]) => { d += ` L ${x} ${pad + height + py}`; });
  d += ' Z';

  const clipId = `torn-${seed}-${Math.round(y * 10)}-${Math.round(h * 10)}`;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: top - pad,
        width: W,
        height: boxH,
        filter: shadow ? 'drop-shadow(0 12px 24px rgba(0,0,0,.42))' : undefined,
        ...style,
      }}
    >
      <svg width={W} height={boxH} style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <defs>
          <clipPath id={clipId}><path d={d} /></clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect x={0} y={0} width={W} height={boxH} fill={TONE[tone] ?? COLOR.cream} />
          <image
            href={staticFile(isLight(tone) ? 'textures/paper-cream.jpg' : 'textures/paper-charcoal.jpg')}
            x={0} y={-(top - pad)} width={W} height={CANVAS.height}
            preserveAspectRatio="xMidYMid slice"
            opacity={isLight(tone) ? 0.5 : 0.35}
            style={{ mixBlendMode: isLight(tone) ? 'multiply' : 'screen' }}
          />
          {/* тень от надрыва по верхней кромке */}
          <path d={d} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={3} />
        </g>
      </svg>
      {children ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: pad, height }}>{children}</div>
      ) : null}
    </div>
  );
};

/** Фон-бумага на весь кадр. */
export const PaperBg: React.FC<{ tone?: Tone; opacity?: number }> = ({
  tone = 'charcoal',
  opacity = 1,
}) => {
  const file = tone === 'cream' || tone === 'paper' || tone === 'bone'
    ? 'textures/paper-cream.jpg'
    : tone === 'ink' ? 'textures/paper-ink.jpg'
      : 'textures/paper-charcoal.jpg';
  return (
    <AbsoluteFill style={{ backgroundColor: TONE[tone] ?? COLOR.charcoal, opacity }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${staticFile(file)})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          mixBlendMode: isLight(tone) ? 'multiply' : 'screen',
          opacity: isLight(tone) ? 0.5 : 0.38,
        }}
      />
    </AbsoluteFill>
  );
};

/** Неровный край «вырезано ножницами» — clip-path в процентах. */
export const roughClip = (seed: number, amp = 1.4, n = 14): string => {
  const pts: string[] = [];
  const jit = (i: number, s: number) => (hash(i, seed + s) - 0.5) * amp * 2;
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * 100}% ${jit(i, 0)}%`);
  for (let i = 0; i <= n; i++) pts.push(`${100 + jit(i, 5)}% ${(i / n) * 100}%`);
  for (let i = n; i >= 0; i--) pts.push(`${(i / n) * 100}% ${100 + jit(i, 9)}%`);
  for (let i = n; i >= 0; i--) pts.push(`${jit(i, 13)}% ${(i / n) * 100}%`);
  return `polygon(${pts.join(',')})`;
};

/** Вырезка: фото в бумажной «рубашке» с тенью и лёгким поворотом. */
export const Cutout: React.FC<{
  children: React.ReactNode;
  seed?: number;
  border?: number;
  rotate?: number;
  tone?: Tone;
  style?: React.CSSProperties;
}> = ({ children, seed = 1, border = 12, rotate = 0, tone = 'bone', style }) => (
  <div
    style={{
      position: 'relative',
      transform: `rotate(${rotate}deg)`,
      filter: 'drop-shadow(0 18px 30px rgba(0,0,0,.48))',
      ...style,
    }}
  >
    <div
      style={{
        padding: border,
        background: TONE[tone],
        clipPath: roughClip(seed, 1.2),
        lineHeight: 0,
      }}
    >
      {children}
    </div>
  </div>
);
