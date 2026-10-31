import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { FILM, COLOR } from '../design/tokens';
import { hash, smoothNoise } from '../design/easing';

/** Зерно плёнки: четыре тайла по кругу + случайный сдвиг каждый кадр. */
export const Grain: React.FC<{ opacity?: number; scale?: number }> = ({
  opacity = FILM.grainOpacity,
  scale = 1.4,
}) => {
  const f = useCurrentFrame();
  const i = f % 4;
  const dx = (hash(f, 3) - 0.5) * 240;
  const dy = (hash(f, 7) - 0.5) * 240;
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: FILM.grainBlend,
        pointerEvents: 'none',
        backgroundImage: `url(${staticFile(`textures/grain-${i}.png`)})`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${512 * scale}px ${512 * scale}px`,
        backgroundPosition: `${dx}px ${dy}px`,
      }}
    />
  );
};

/** Пыль, волос и царапины — меняются 6 раз в секунду, а не каждый кадр. */
export const Dust: React.FC<{ opacity?: number }> = ({ opacity = FILM.dustOpacity }) => {
  const f = useCurrentFrame();
  const i = Math.floor(f / 5) % 6;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none', mixBlendMode: 'screen' }}>
      <Img src={staticFile(`textures/dust-${i}.png`)}
           style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </AbsoluteFill>
  );
};

/** Виньетка. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = FILM.vignette }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background:
        `radial-gradient(118% 78% at 50% 44%, rgba(0,0,0,0) 38%, rgba(0,0,0,${strength * 0.5}) 74%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

/** Растровая точка — поверх коллажа, чтобы фото читалось как типографский оттиск. */
export const Halftone: React.FC<{ opacity?: number; size?: number }> = ({
  opacity = 0.18,
  size = 7,
}) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      opacity,
      mixBlendMode: 'multiply',
      backgroundImage: `url(${staticFile('textures/halftone.png')})`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${size}px ${size}px`,
    }}
  />
);

/**
 * Кадровое окно: микродрожание и мерцание экспозиции.
 * Оборачивает весь ролик один раз — внутри сцен не повторяем.
 */
export const FilmGate: React.FC<{ children: React.ReactNode; weave?: number; flicker?: number }> = ({
  children,
  weave = FILM.gateWeave,
  flicker = FILM.flicker,
}) => {
  const f = useCurrentFrame();
  const x = smoothNoise(f, 11, 0.18) * weave;
  const y = smoothNoise(f, 29, 0.14) * weave * 0.7;
  const b = 1 + smoothNoise(f, 53, 0.5) * flicker;
  return (
    <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(1.006)`, filter: `brightness(${b})` }}>
      {children}
    </AbsoluteFill>
  );
};

/** Тонкая золотая рамка-рейка «архивной карточки». */
export const ArchiveRule: React.FC<{ inset?: number; color?: string; opacity?: number }> = ({
  inset = 36,
  color = COLOR.gold,
  opacity = 0.35,
}) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div style={{
      position: 'absolute', inset, border: `2px solid ${color}`, opacity,
    }} />
  </AbsoluteFill>
);

/** Засветка краёв плёнки на склейке. */
export const Halation: React.FC<{ amount: number }> = ({ amount }) => {
  if (amount <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: interpolate(amount, [0, 1], [0, 0.9]),
        background:
          'radial-gradient(70% 50% at 50% 50%, rgba(255,246,228,.95), rgba(255,236,200,.35) 45%, rgba(255,220,170,0) 72%)',
        mixBlendMode: 'screen',
      }}
    />
  );
};
