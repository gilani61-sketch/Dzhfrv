import React from "react";
import {
  AbsoluteFill, Sequence, Audio, staticFile, useVideoConfig,
  useCurrentFrame, interpolate, delayRender, continueRender,
} from "remotion";
import { Shot } from "./components/Shot";
import { Grain, Vignette } from "./components/Grain";
import { TitleCard } from "./components/TitleCard";
import { Captions, Scrim, Watermark } from "./components/Captions";
import { Overlay, GrainTile } from "./components/Overlays";
import { QuoteCard, Badge, EndCard } from "./components/Cards";
import { getPalette } from "./library";
import { T, fontFaceCss } from "./theme";
import type { ReelSpec, PanDir } from "./types";

const DEFAULT_PANS: PanDir[] = ["in", "left", "out", "right", "in", "up", "out", "down"];

/** Шрифты лежат в public/fonts/ движка. Грузим один раз на композицию. */
const Fonts: React.FC = () => {
  const [handle] = React.useState(() => delayRender("fonts"));
  React.useEffect(() => {
    const css = fontFaceCss((f) => staticFile(`fonts/${f}`));
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    // ждём, пока браузер реально растеризует начертания
    (document as any).fonts.ready.then(() => continueRender(handle));
  }, [handle]);
  return null;
};

export const Reel: React.FC<{ spec: ReelSpec }> = ({ spec }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const xfadeDefault = spec.mode === "punch" ? 0 : T.motion.crossfade.durF;

  // стартовые кадры сцен с учётом нахлёста на кроссфейд
  let cursor = 0;
  const placed = spec.scenes.map((s, i) => {
    const durF = Math.round(s.dur * fps);
    const xf = i === 0 ? 0 : s.xfade ?? xfadeDefault;
    const from = Math.max(0, cursor - xf);
    cursor = from + durF;
    return { ...s, from, durF, xf, pan: s.pan ?? DEFAULT_PANS[i % DEFAULT_PANS.length] };
  });

  const total = totalFrames(spec, fps);
  const tc = spec.titleCard;
  const tcAt = Math.round((tc?.at ?? 0) * fps);
  const tcDur = Math.round((tc?.dur ?? 4) * fps);

  // вотермарк появляется после титра — чтобы не спорить с ним
  const wmStart = tc ? tcAt + tcDur - 10 : 0;
  const wmOpacity = interpolate(frame, [wmStart, wmStart + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: T.color.cardBg }}>
      <Fonts />

      {placed.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.durF} name={`shot ${i + 1}`}>
          <CrossfadeIn frames={s.xf}>
            {s.quote ? (
              <QuoteCard text={s.quote.text} source={s.quote.source}
                         paper={s.quote.paper} preset={spec.preset}
                         palette={spec.palette} />
            ) : (
              <Shot src={s.src} durF={s.durF} pan={s.pan} projectSlug={spec.slug} />
            )}
            {(s.overlays ?? []).map((o, oi) => (
              <Overlay key={oi} {...o} durF={s.durF} />
            ))}
          </CrossfadeIn>
        </Sequence>
      ))}

      <Vignette />

      {placed.map((s, i) =>
        s.captions.length ? (
          <Sequence key={`c${i}`} from={s.from} durationInFrames={s.durF} name={`subs ${i + 1}`}>
            <Scrim opacity={spec.mode === "punch" ? 0.55 : 1} />
            <Captions captions={s.captions} preset={spec.preset} mode={spec.mode} />
          </Sequence>
        ) : null
      )}

      {tc ? (
        <Sequence from={tcAt} durationInFrames={tcDur} name="title">
          <TitleCard spec={tc} preset={spec.preset} mode={spec.mode} />
        </Sequence>
      ) : null}

      {spec.watermark ? (
        <AbsoluteFill style={{ opacity: wmOpacity }}>
          <Watermark text={spec.watermark} preset={spec.preset} />
        </AbsoluteFill>
      ) : null}

      {(spec.overlays ?? []).map((o, i) => (
        <Overlay key={`go${i}`} {...o} durF={total} />
      ))}

      {placed.map((s, i) =>
        s.badge ? (
          <Sequence
            key={`b${i}`}
            from={s.from + Math.round((s.badge.at ?? 0.3) * fps)}
            durationInFrames={Math.round((s.badge.dur ?? 2.6) * fps)}
            name={`badge ${i + 1}`}
          >
            <Badge label={s.badge.label} value={s.badge.value}
                   preset={spec.preset} palette={spec.palette} />
          </Sequence>
        ) : null
      )}

      {spec.endCard ? (
        <Sequence
          from={total - Math.round((spec.endCard.dur ?? 2.5) * fps)}
          durationInFrames={Math.round((spec.endCard.dur ?? 2.5) * fps)}
          name="endcard"
        >
          <EndCard handle={spec.endCard.handle} line={spec.endCard.line}
                   mark={spec.endCard.mark} preset={spec.preset}
                   palette={spec.palette} />
        </Sequence>
      ) : null}

      {spec.grain !== false ? <GrainTile /> : null}

      {spec.voice ? <Audio src={staticFile(spec.voice)} /> : null}
      {spec.music ? (
        <Audio
          src={staticFile(spec.music)}
          volume={dbToGain(spec.musicGainDb ?? -10)}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const dbToGain = (db: number) => Math.pow(10, db / 20);

/** Плавное проявление сцены поверх предыдущей. */
const CrossfadeIn: React.FC<{ frames: number; children: React.ReactNode }> = ({
  frames,
  children,
}) => {
  const frame = useCurrentFrame();
  if (frames <= 0) return <>{children}</>;
  const o = interpolate(frame, [0, frames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/** Общая длительность ролика в кадрах — нужна Root для Composition. */
export const totalFrames = (spec: ReelSpec, fps: number) => {
  const xfadeDefault = spec.mode === "punch" ? 0 : T.motion.crossfade.durF;
  let cursor = 0;
  spec.scenes.forEach((s, i) => {
    const durF = Math.round(s.dur * fps);
    const xf = i === 0 ? 0 : s.xfade ?? xfadeDefault;
    cursor = Math.max(0, cursor - xf) + durF;
  });
  // финальная плашка идёт ПОСЛЕ последней сцены, а не поверх неё
  if (spec.endCard) cursor += Math.round((spec.endCard.dur ?? 2.5) * fps);
  return Math.max(cursor, 30);
};
