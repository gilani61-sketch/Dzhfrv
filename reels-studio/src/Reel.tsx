import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Reel, Scene, TransitionKind } from './schema/reel';
import { STYLE, pickTransition, secondsToFrames } from './styles';
import { CANVAS, COLOR, TIME } from './design/tokens';
import { useArchiveFonts } from './design/fonts';
import { Grain, Dust, Vignette, FilmGate, Halation } from './overlays/Film';
import { Lockup } from './components/Type';
import { Decor } from './components/Element';
import { Guides } from './components/Guides';
import {
  enterStyle, exitStyle, transitionFrames, tornClipPath, halationAmount, dipAmount,
} from './transitions';
import {
  CollageScene, CoverScene, GalleryScene, MediaScene, NumeralScene,
  OutroScene, QuoteScene, SplitScene, StatementScene,
} from './scenes';

/* ───────────── раскладка по времени ───────────── */
export type Placed = {
  scene: Scene;
  from: number;
  dur: number;
  inKind: TransitionKind;
  outKind: TransitionKind;
  index: number;
};

export const layout = (reel: Reel, fps: number = CANVAS.fps): { placed: Placed[]; total: number } => {
  const preset = STYLE[reel.style];
  const kinds: TransitionKind[] = reel.scenes.map((s, i) => s.in ?? pickTransition(preset, i));
  const placed: Placed[] = [];
  let cursor = 0;
  reel.scenes.forEach((scene, i) => {
    const dur = secondsToFrames(scene.dur ?? preset.dur[scene.type] ?? 3, fps);
    const inKind = kinds[i];
    const overlap = i === 0 ? 0 : transitionFrames(inKind);
    const from = Math.max(0, cursor - overlap);
    placed.push({
      scene, from, dur, index: i,
      inKind,
      outKind: kinds[i + 1] ?? 'cut',
    });
    cursor = from + dur;
  });
  return { placed, total: cursor };
};

export const reelDuration = (reel: Reel, fps: number = CANVAS.fps) => layout(reel, fps).total;

/* ───────────── одна сцена со своим переходом ───────────── */
const SceneShell: React.FC<{ p: Placed; reel: Reel }> = ({ p, reel }) => {
  const f = useCurrentFrame();
  const preset = STYLE[reel.style];
  const inF = transitionFrames(p.inKind);
  const outF = transitionFrames(p.outKind);

  const pIn = inF > 0 ? Math.min(1, f / inF) : 1;
  const pOut = outF > 0 ? Math.max(0, (f - (p.dur - outF)) / outF) : 0;

  const clipId = `tearclip-${p.index}`;
  const needsClip = p.inKind === 'paper' && pIn < 1;

  const style: React.CSSProperties = {
    ...enterStyle(p.inKind, pIn, needsClip ? clipId : undefined),
    ...(pOut > 0 ? exitStyle(p.outKind, pOut) : {}),
  };

  const s = p.scene;
  const common = { preset, duration: p.dur, index: p.index };

  return (
    <AbsoluteFill style={style}>
      {needsClip ? (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <path d={tornClipPath(p.index * 37 + 9)} />
            </clipPath>
          </defs>
        </svg>
      ) : null}

      {s.type === 'cover' ? <CoverScene scene={s} {...common} />
        : s.type === 'footage' || s.type === 'still' ? <MediaScene scene={s} {...common} />
          : s.type === 'collage' ? <CollageScene scene={s} {...common} />
            : s.type === 'statement' ? <StatementScene scene={s} {...common} />
              : s.type === 'numeral' ? <NumeralScene scene={s} {...common} />
                : s.type === 'quote' ? <QuoteScene scene={s} {...common} />
                  : s.type === 'split' ? <SplitScene scene={s} {...common} />
                    : s.type === 'gallery' ? <GalleryScene scene={s} {...common} />
                      : s.type === 'outro' ? <OutroScene scene={s} handle={reel.handle} {...common} />
                        : null}

      <Decor items={(s as any).decor} />
    </AbsoluteFill>
  );
};

/* ───────────── постоянная шапка ───────────── */
/** В каких сценах шапка видна. */
const wantsLockup = (s: Scene) =>
  s.lockup ?? (s.type !== 'outro' && s.type !== 'cover');

/** Непрерывные отрезки времени, на которых шапка должна висеть. */
const lockupSpans = (placed: Placed[]): [number, number][] => {
  const spans: [number, number][] = [];
  placed.forEach((p) => {
    if (!wantsLockup(p.scene)) return;
    const last = spans[spans.length - 1];
    if (last && p.from <= last[1] + 1) last[1] = p.from + p.dur;
    else spans.push([p.from, p.from + p.dur]);
  });
  return spans;
};

const PersistentLockup: React.FC<{ reel: Reel; spans: [number, number][] }> = ({ reel, spans }) => {
  const frame = useCurrentFrame();
  const preset = STYLE[reel.style];
  const span = spans.find(([a, b]) => frame >= a && frame < b);
  if (!span) return null;
  const [a, b] = span;
  const inP = Math.min(1, (frame - a) / TIME.in);
  const outP = Math.min(1, (b - frame) / TIME.out);
  return (
    <AbsoluteFill style={{ opacity: Math.min(inP, outP), pointerEvents: 'none' }}>
      <Lockup kicker={reel.lockup.kicker} brand={reel.lockup.brand}
              color={preset.lockupColor} start={0} />
    </AbsoluteFill>
  );
};

/* ───────────── весь ролик ───────────── */
export const ReelVideo: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const fontsReady = useArchiveFonts();
  const preset = STYLE[reel.style];
  const { placed } = layout(reel, fps);
  const frame = useCurrentFrame();

  // вспышки и провалы считаем глобально — они лежат поверх всех сцен
  let halation = 0;
  let dip = 0;
  placed.forEach((p) => {
    const outF = transitionFrames(p.outKind);
    if (outF > 0) {
      const local = frame - p.from;
      const q = (local - (p.dur - outF)) / outF;
      if (q > 0 && q < 1) {
        halation = Math.max(halation, halationAmount(p.outKind, q));
        dip = Math.max(dip, dipAmount(p.outKind, q));
      }
    }
  });

  if (!fontsReady) return <AbsoluteFill style={{ backgroundColor: preset.bg }} />;

  return (
    <AbsoluteFill style={{ backgroundColor: preset.bg }}>
      <FilmGate>
        <AbsoluteFill style={{ backgroundColor: preset.bg }}>
          {placed.map((p) => (
            <Sequence key={p.index} from={p.from} durationInFrames={p.dur} layout="none">
              <SceneShell p={p} reel={reel} />
            </Sequence>
          ))}
        </AbsoluteFill>

        {reel.lockup.show ? <PersistentLockup reel={reel} spans={lockupSpans(placed)} /> : null}

        <AbsoluteFill style={{ background: COLOR.black, opacity: dip, pointerEvents: 'none' }} />
        <Halation amount={halation} />
        <Vignette strength={preset.vignette} />
        <Dust opacity={preset.dust} />
        <Grain opacity={preset.grain} />
      </FilmGate>

      {reel.voice ? <Audio src={staticFile(reel.voice)} /> : null}
      {reel.music ? <Audio src={staticFile(reel.music)} volume={reel.musicGain} /> : null}

      {reel.guides ? <Guides /> : null}
    </AbsoluteFill>
  );
};
