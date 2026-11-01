import React from 'react';
import { staticFile, useCurrentFrame, interpolate } from 'remotion';
import { COLOR } from '../design/tokens';
import { EASE, ramp } from '../design/easing';
import catalog from '../../public/library/elements/catalog.json';

export const TONE: Record<string, string> = {
  gold: COLOR.gold, oxide: COLOR.oxide, indigo: COLOR.indigo,
  cream: COLOR.cream, bone: COLOR.bone, ink: COLOR.ink,
  sepia: COLOR.sepia, tea: COLOR.tea, rust: COLOR.rust,
};

export type DecorAnim = 'none' | 'stampIn' | 'fadeIn' | 'draw' | 'drift' | 'pop';

/**
 * Элемент из библиотеки public/library/elements.
 * SVG используется как маска, поэтому цвет берётся из палитры,
 * а не зашит в файл: один элемент работает в любом регистре.
 */
export const Element: React.FC<{
  name: string;
  /** положение центра и ширина в процентах холста */
  x: number; y: number; w: number;
  rotate?: number;
  tone?: keyof typeof TONE;
  opacity?: number;
  anim?: DecorAnim;
  start?: number;
}> = ({ name, x, y, w, rotate = 0, tone = 'gold', opacity = 1, anim = 'fadeIn', start = 0 }) => {
  const f = useCurrentFrame();
  const url = `url(${staticFile(`library/elements/${name}`)})`;
  const aspect = (catalog as Record<string, { aspect: number }>)[name]?.aspect ?? 1;
  const p = ramp(f, start, anim === 'stampIn' ? 9 : 14, anim === 'stampIn' ? EASE.snap : EASE.archive);

  let scale = 1, a = 1, extraRot = 0, dy = 0;
  switch (anim) {
    case 'stampIn': scale = interpolate(p, [0, 1], [1.5, 1]); a = interpolate(p, [0, 0.35, 1], [0, 1, 1]); extraRot = (1 - p) * 8; break;
    case 'pop': scale = interpolate(p, [0, 1], [0.7, 1]); a = p; break;
    case 'fadeIn': a = p; dy = (1 - p) * 18; break;
    case 'draw': a = p; scale = interpolate(p, [0, 1], [0.92, 1]); break;
    case 'drift': a = 1; dy = Math.sin(f / 34) * 7; extraRot = Math.sin(f / 46) * 1.2; break;
    default: a = 1;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`, top: `${y}%`, width: `${w}%`,
        transform: `translate(-50%, -50%) translateY(${dy}px) rotate(${rotate + extraRot}deg) scale(${scale})`,
        opacity: opacity * a,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%', paddingBottom: `${100 / aspect}%`,
          backgroundColor: TONE[tone] ?? COLOR.gold,
          WebkitMaskImage: url, maskImage: url,
          WebkitMaskSize: 'contain', maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center', maskPosition: 'center',
        }}
      />
    </div>
  );
};

/** Набор элементов поверх сцены. */
export const Decor: React.FC<{ items?: any[] }> = ({ items }) => {
  if (!items?.length) return null;
  return (
    <>
      {items.map((d, i) => (
        <Element key={i} name={d.name} x={d.x} y={d.y} w={d.w}
                 rotate={d.rotate} tone={d.tone} opacity={d.opacity}
                 anim={d.anim} start={d.start ?? 6 + i * 3} />
      ))}
    </>
  );
};
