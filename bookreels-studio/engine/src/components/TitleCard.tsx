import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { T, scale, layout, titleStyleFor, textShadow } from "../theme";
import type { Preset, Mode, TitleCardSpec } from "../types";

/**
 * Титульная карточка: название произведения + автор.
 * Вход — из размытия, с лёгким «отъездом» и подъёмом. Без отскока:
 * damping 200 даёт движение, которое приходит и замирает.
 */
export const TitleCard: React.FC<{
  spec: TitleCardSpec;
  preset: Preset;
  mode: Mode;
}> = ({ spec, preset, mode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const S = scale(preset);
  const L = layout(preset);
  const M = T.motion.titleIn;
  const ts = titleStyleFor(mode);

  const totalF = Math.round((spec.dur ?? 4) * fps);

  const inS = spring({
    frame,
    fps,
    config: { damping: M.damping, mass: M.mass },
    durationInFrames: M.durF,
  });

  const outStart = totalF - T.motion.titleOut.durF;
  const outP = interpolate(frame, [outStart, totalF], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = inS * (1 - outP);
  const blur = (1 - inS) * M.blurPx + outP * T.motion.titleOut.blurPx;
  const sc = interpolate(inS, [0, 1], [M.scaleFrom, 1]);
  const y = interpolate(inS, [0, 1], [M.yFrom, 0]);

  return (
    <>
      {/* Затемнение под титром: без него светлый кадр съедает тонкий Jost 200. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 70% 34% at 50% " +
            `${L.titleBlockY * 100 + 8}%, rgba(0,0,0,.52) 0%, rgba(0,0,0,.34) 45%, rgba(0,0,0,0) 78%)`,
          opacity,
          pointerEvents: "none",
        }}
      />
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: `${L.titleBlockY * 100}%`,
        paddingLeft: L.sideMargin,
        paddingRight: L.sideMargin,
      }}
    >
      <div
        style={{
          opacity,
          filter: `blur(${blur}px)`,
          transform: `scale(${sc}) translateY(${y}px)`,
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            fontFamily: `'${ts.family}'`,
            fontWeight: ts.weight,
            fontSize: S.title.size,
            letterSpacing: `${S.title.tracking}em`,
            lineHeight: T.type.display.lineHeight,
            textTransform: "uppercase",
            color: T.color.ink,
            textShadow,
            // трекинг добавляет пробел справа от последней буквы — компенсируем
            marginRight: `-${S.title.tracking}em`,
          }}
        >
          {spec.title}
        </div>

        {spec.author ? (
          <div
            style={{
              marginTop: S.title.size * 0.2,
              fontFamily: `'${T.type.subdisplay.family}'`,
              fontWeight: T.type.subdisplay.weight,
              fontSize: S.author.size,
              letterSpacing: `${S.author.tracking}em`,
              color: T.color.inkSoft,
              textShadow,
            }}
          >
            {spec.author}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
    </>
  );
};
