import React from "react";
import { AbsoluteFill, useCurrentFrame, random } from "remotion";
import { T } from "../theme";

/**
 * Зерно плёнки. Нужно, чтобы AI-картинка и наложенный текст выглядели
 * снятыми на один носитель, а не склеенными в редакторе.
 * Рисуем один SVG-шум и дёргаем его позицию покадрово — дёшево и убедительно.
 */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const x = Math.floor(random(`gx${frame}`) * 180);
  const y = Math.floor(random(`gy${frame}`) * 180);

  const noise = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
      <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
      <feColorMatrix type="saturate" values="0"/></filter>
      <rect width="180" height="180" filter="url(#n)"/></svg>`
  )}`;

  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("${noise}")`,
        backgroundPosition: `${x}px ${y}px`,
        opacity: T.motion.grainOpacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

/** Виньетка — притемняет края, уводит взгляд в центр. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, ${T.color.vignette} 100%)`,
      pointerEvents: "none",
    }}
  />
);
