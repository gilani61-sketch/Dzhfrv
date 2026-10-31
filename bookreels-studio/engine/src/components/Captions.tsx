import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { T, scale, layout, captionStyleFor, textShadow } from "../theme";
import type { Preset, Mode, Caption } from "../types";

/** Градиентная подложка под субтитром — без неё белый текст тонет в светлом кадре. */
export const Scrim: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <AbsoluteFill style={{ background: T.color.scrim, opacity, pointerEvents: "none" }} />
);

export const Captions: React.FC<{
  captions: Caption[];
  preset: Preset;
  mode: Mode;
}> = ({ captions, preset, mode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const S = scale(preset);
  const L = layout(preset);
  const cs = captionStyleFor(mode);
  const isPunch = mode === "punch";

  const sizeKey = isPunch ? S.punch : S.caption;
  const inF = T.motion.captionIn.durF;
  const outF = T.motion.captionOut.durF;

  return (
    <>
      {captions.map((c, i) => {
        const start = Math.round(c.at * fps);
        const end = Math.round((c.at + c.dur) * fps);
        if (frame < start - 1 || frame > end + 1) return null;

        const local = frame - start;
        const len = end - start;

        // punch — резкое появление без сдвига, cinematic — мягкое с подъёмом
        const opIn = isPunch
          ? interpolate(local, [0, 2], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
          : interpolate(local, [0, inF], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        const opOut = isPunch
          ? interpolate(local, [len - 2, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : interpolate(local, [len - outF, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        const y = isPunch
          ? 0
          : interpolate(local, [0, inF], [T.motion.captionIn.yFrom, 0], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            });

        const popScale = isPunch
          ? interpolate(local, [0, 3], [0.94, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
          : 1;

        return (
          <AbsoluteFill
            key={i}
            style={{
              alignItems: "center",
              justifyContent: "flex-end",
              paddingBottom: isPunch
                ? L.captionBaselineFromBottom * 1.25
                : L.captionBaselineFromBottom,
              paddingLeft: L.sideMargin,
              paddingRight: L.sideMargin,
            }}
          >
            <div
              style={{
                opacity: opIn * opOut,
                transform: `translateY(${y}px) scale(${popScale})`,
                textAlign: "center",
                fontFamily: `'${cs.family}'`,
                fontWeight: cs.weight,
                fontSize: sizeKey.size,
                letterSpacing: `${sizeKey.tracking}em`,
                marginRight: `-${sizeKey.tracking}em`,
                lineHeight: cs.lineHeight,
                textTransform: cs.case === "uppercase" ? "uppercase" : "none",
                color: T.color.ink,
                textShadow: isPunch
                  ? `0 4px 18px rgba(0,0,0,.75), 0 0 2px rgba(0,0,0,.9)`
                  : textShadow,
                maxWidth: "88%",
              }}
            >
              {c.text}
            </div>
          </AbsoluteFill>
        );
      })}
    </>
  );
};

export const Watermark: React.FC<{ text: string; preset: Preset }> = ({ text, preset }) => {
  const S = scale(preset);
  const L = layout(preset);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: L.watermarkPos.x,
          top: L.watermarkPos.y,
          fontFamily: `'${T.type.caption.family}'`,
          fontWeight: 300,
          fontSize: S.watermark.size,
          letterSpacing: `${S.watermark.tracking}em`,
          textTransform: "uppercase",
          color: T.color.watermark,
          textShadow: `0 1px 6px rgba(0,0,0,.5)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
