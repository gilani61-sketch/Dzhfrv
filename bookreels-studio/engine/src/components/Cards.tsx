import React from "react";
import {
  AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig,
  spring, interpolate,
} from "remotion";
import { T, canvas, scale, layout, textShadow } from "../theme";
import { getPalette, asset } from "../library";
import { Vector, Mark } from "./Overlays";
import type { Preset } from "../types";

const useEnter = (durF = 20) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 200, mass: 0.9 }, durationInFrames: durF });
};

/**
 * Карточка цитаты — на фоне бумаги из библиотеки.
 * Для прямой речи героя или строки из книги.
 */
export const QuoteCard: React.FC<{
  text: string;
  source?: string;
  preset: Preset;
  palette?: string;
  paper?: string;
}> = ({ text, source, preset, palette, paper = "paper-aged.jpg" }) => {
  const p = getPalette(palette);
  const S = scale(preset);
  const L = layout(preset);
  const e = useEnter(24);

  return (
    <AbsoluteFill>
      <Img
        src={staticFile(asset.background(paper))}
        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: e }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center", justifyContent: "center",
          paddingLeft: L.sideMargin * 1.4, paddingRight: L.sideMargin * 1.4,
          opacity: e,
          transform: `translateY(${interpolate(e, [0, 1], [16, 0])}px)`,
        }}
      >
        <Vector path="quotes/quote-serif.svg" color={p.deep}
                width={S.title.size * 0.9} height={S.title.size * 0.72}
                opacity={0.3} style={{ marginBottom: S.author.size * 0.6 }} />
        <div
          style={{
            fontFamily: "'Cormorant Garamond'", fontWeight: 400,
            fontSize: S.title.size * 0.52, lineHeight: 1.3,
            color: p.deep, textAlign: "center", fontStyle: "italic",
          }}
        >
          {text}
        </div>
        <Vector path="dividers/rule-diamond.svg" color={p.deep}
                width="46%" height={S.author.size * 0.5} opacity={0.6}
                style={{ marginTop: S.author.size * 0.9 }} />
        {source ? (
          <div
            style={{
              marginTop: S.author.size * 0.5,
              fontFamily: "'Jost'", fontWeight: 300,
              fontSize: S.caption.size * 0.9,
              letterSpacing: `${S.caption.tracking}em`,
              textTransform: "uppercase", color: p.deep, opacity: 0.68,
            }}
          >
            {source}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Плашка с фактом или датой — поверх кадра, в верхней трети. */
export const Badge: React.FC<{
  label: string;
  value: string;
  preset: Preset;
  palette?: string;
}> = ({ label, value, preset, palette }) => {
  const p = getPalette(palette);
  const S = scale(preset);
  const L = layout(preset);
  const e = useEnter(18);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: canvas(preset).safeTop * 1.9,
      }}
    >
      <div
        style={{
          opacity: e,
          transform: `translateY(${interpolate(e, [0, 1], [14, 0])}px)`,
          padding: `${S.caption.size * 0.55}px ${S.caption.size * 1.1}px`,
          background: p.scrimTint,
          backdropFilter: "blur(6px)",
          border: `1px solid ${p.accent}55`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Jost'", fontWeight: 300,
            fontSize: S.watermark.size, letterSpacing: "0.22em",
            textTransform: "uppercase", color: p.accent, opacity: 0.9,
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: S.watermark.size * 0.4,
            fontFamily: "'Jost'", fontWeight: 200,
            fontSize: S.title.size * 0.42, letterSpacing: "0.06em",
            color: p.ink, textShadow,
          }}
        >
          {value}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Финальная плашка: знак канала + ник + призыв. */
export const EndCard: React.FC<{
  handle: string;
  line?: string;
  preset: Preset;
  palette?: string;
  mark?: string;
}> = ({ handle, line, preset, palette, mark = "mark-clapper.svg" }) => {
  const p = getPalette(palette);
  const S = scale(preset);
  const e = useEnter(26);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${p.deep}EE 0%, ${p.deep} 100%)`,
        alignItems: "center", justifyContent: "center", opacity: e,
      }}
    >
      <Mark name={mark} color={p.accent} size={S.title.size * 0.9} opacity={0.92} />
      <div
        style={{
          marginTop: S.title.size * 0.4,
          fontFamily: "'Jost'", fontWeight: 200,
          fontSize: S.title.size * 0.46, letterSpacing: "0.12em",
          textTransform: "uppercase", color: p.ink,
          transform: `translateY(${interpolate(e, [0, 1], [12, 0])}px)`,
        }}
      >
        {handle}
      </div>
      {line ? (
        <div
          style={{
            marginTop: S.author.size * 0.7,
            fontFamily: "'Jost'", fontWeight: 300,
            fontSize: S.caption.size, letterSpacing: `${S.caption.tracking}em`,
            textTransform: "uppercase", color: p.accent, opacity: 0.85,
          }}
        >
          {line}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
