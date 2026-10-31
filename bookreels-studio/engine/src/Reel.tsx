import React from "react";
import {
  AbsoluteFill, Sequence, Audio, staticFile, useVideoConfig,
  useCurrentFrame, interpolate, delayRender, continueRender,
} from "remotion";
import { Shot } from "./components/Shot";
import { Grain, Vignette } from "./components/Grain";
import { TitleCard } from "./components/TitleCard";
import { Captions, Scrim, Watermark } from "./components/Captions";
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
            <Shot src={s.src} durF={s.durF} pan={s.pan} projectSlug={spec.slug} />
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

      {spec.grain !== false ? <Grain /> : null}

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
  return Math.max(cursor, 30);
};
