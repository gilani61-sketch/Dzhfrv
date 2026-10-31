import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, random, interpolate } from "remotion";
import { asset } from "../library";

export type OverlaySpec = {
  /** vignette-cine.png, leak-warm-tr.png, dust-01.png … */
  src: string;
  opacity?: number;
  blend?: React.CSSProperties["mixBlendMode"];
  /** медленный дрейф — засветка «дышит», а не стоит наклейкой */
  drift?: boolean;
};

export const Overlay: React.FC<OverlaySpec & { durF?: number }> = ({
  src, opacity = 1, blend = "normal", drift = false, durF = 300,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, durF], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const style: React.CSSProperties = {
    opacity,
    mixBlendMode: blend,
    pointerEvents: "none",
  };
  if (drift) {
    const e = 0.5 - Math.cos(Math.PI * 2 * t) / 2;
    style.transform = `scale(${1.04 + e * 0.03}) translate(${(e - 0.5) * 1.6}%, ${(e - 0.5) * -1.2}%)`;
  }
  return (
    <AbsoluteFill style={style}>
      <Img src={staticFile(asset.overlay(src))}
           style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

/** Зерно тайлами из библиотеки — дёргаем позицию покадрово. */
export const GrainTile: React.FC<{ src?: string; opacity?: number }> = ({
  src = "grain-fine.png", opacity = 0.055,
}) => {
  const frame = useCurrentFrame();
  const x = Math.floor(random(`gx${frame}`) * 256);
  const y = Math.floor(random(`gy${frame}`) * 256);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile(asset.overlay(src))})`,
        backgroundRepeat: "repeat",
        backgroundPosition: `${x}px ${y}px`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * Векторный элемент из elements/ или brand/, окрашенный в любой цвет.
 * SVG грузится как CSS-маска, а не как картинка — только так он берёт цвет
 * палитры; через <Img> он остался бы чёрным.
 */
export const Vector: React.FC<{
  path: string;
  color: string;
  width: number | string;
  height: number | string;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ path, color, width, height, opacity = 1, style }) => {
  const url = staticFile(asset.element(path));
  return (
    <div
      style={{
        width,
        height,
        opacity,
        backgroundColor: color,
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
};

/** То же, но для знаков канала из brand/. */
export const Mark: React.FC<{
  name: string; color: string; size: number; opacity?: number;
}> = ({ name, color, size, opacity = 1 }) => {
  const url = staticFile(asset.mark(name));
  return (
    <div
      style={{
        width: size, height: size, opacity, backgroundColor: color,
        WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
        WebkitMaskSize: "contain", maskSize: "contain",
        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        WebkitMaskPosition: "center", maskPosition: "center",
        pointerEvents: "none",
      }}
    />
  );
};
