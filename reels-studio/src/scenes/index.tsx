import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Scene } from '../schema/reel';
import type { StylePreset } from '../styles';
import { COLOR, GRID, SAFE, TIME, TYPE, DEPTH } from '../design/tokens';
import { EASE, ramp, hash } from '../design/easing';
import { Caption, Label, Lockup, Numeral, StatementText, typeStyle } from '../components/Type';
import { MediaFrame, MediaBackdrop, useKenBurns } from '../components/Media';
import { PaperBg, TornStrip, Cutout, roughClip, type Tone } from '../components/Paper';
import { Halftone, ArchiveRule } from '../overlays/Film';

export type SceneProps<T extends Scene = Scene> = {
  scene: T;
  preset: StylePreset;
  duration: number;
  index: number;
};

/* ───────────────────── ОБЛОЖКА ───────────────────── */
export const CoverScene: React.FC<SceneProps<Extract<Scene, { type: 'cover' }>>> = ({ scene, preset, duration }) => {
  const f = useCurrentFrame();
  const p = ramp(f, 2, 18, EASE.archive);
  return (
    <AbsoluteFill style={{ backgroundColor: preset.bg }}>
      <MediaBackdrop src={scene.bg?.src} from={scene.bg?.from} grade={preset.grade}
                     dim={0.58} move={scene.bg?.move ?? 'push'} duration={duration} />
      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: 'center',
        padding: `0 ${SAFE.side}px`, textAlign: 'center',
      }}>
        {scene.kicker ? (
          <div style={{
            ...typeStyle('kicker', preset.accent),
            opacity: p, transform: `translateY(${(1 - p) * 16}px)`, marginBottom: 28,
          }}>{scene.kicker}</div>
        ) : null}
        <StatementText text={scene.title} start={6} step="display" align="center" color={COLOR.bone} />
        {scene.brand ? (
          <div style={{
            ...typeStyle('brand', COLOR.bone), marginTop: 30,
            opacity: ramp(f, 16, 16, EASE.archive), textShadow: DEPTH.textShadow,
          }}>{scene.brand}</div>
        ) : null}
      </AbsoluteFill>
      <ArchiveRule opacity={0.22} />
    </AbsoluteFill>
  );
};

/* ───────────────────── ВИДЕО / ФОТО ───────────────────── */
export const MediaScene: React.FC<SceneProps<Extract<Scene, { type: 'footage' | 'still' }>>> = ({
  scene, preset, duration,
}) => {
  const fit = scene.fit ?? preset.defaultFit;
  return (
    <AbsoluteFill style={{ backgroundColor: preset.bg }}>
      <MediaFrame src={scene.src} from={scene.from} fit={fit}
                  move={scene.move ?? (scene.type === 'still' ? 'push' : 'none')}
                  duration={duration} grade={preset.grade} />
      {preset.halftone > 0 && fit === 'full' ? <Halftone opacity={preset.halftone} /> : null}
      {scene.caption ? (
        <Caption text={scene.caption} start={TIME.inFast} color={preset.captionColor}
                 box={preset.captionBox}
                 y={fit === 'band' ? GRID.band.top + GRID.band.height + 64 : GRID.captionBaseline} />
      ) : null}
      {scene.label ? <Label text={scene.label} start={12} color={preset.accent} /> : null}
    </AbsoluteFill>
  );
};

/* ───────────────────── КОЛЛАЖ ───────────────────── */
const layerAnim = (anim: string | undefined, f: number, i: number, duration: number) => {
  const p = ramp(f, 2 + i * 3, 16, EASE.archive);
  switch (anim) {
    case 'rise': return { opacity: p, t: `translateY(${(1 - p) * 90}px)` };
    case 'slideL': return { opacity: p, t: `translateX(${(1 - p) * -160}px)` };
    case 'slideR': return { opacity: p, t: `translateX(${(1 - p) * 160}px)` };
    case 'pop': return { opacity: p, t: `scale(${interpolate(p, [0, 1], [0.78, 1])})` };
    case 'swing': {
      const a = Math.sin((f / 30) * 1.1) * 1.6 * p;
      return { opacity: p, t: `rotate(${a}deg)` };
    }
    default: return { opacity: p, t: 'none' };
  }
};

export const CollageScene: React.FC<SceneProps<Extract<Scene, { type: 'collage' }>>> = ({
  scene, preset, duration,
}) => {
  const f = useCurrentFrame();
  const drift = interpolate(f, [0, duration], [0, 1], { extrapolateRight: 'clamp', easing: EASE.drift });
  const bgTone = (scene.bg ?? preset.paper) as Tone;

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.charcoal }}>
      <PaperBg tone={bgTone} />

      {(scene.strips ?? []).map((s, i) => (
        <TornStrip key={`s${i}`} y={s.y} h={s.h} tone={(s.tone ?? 'cream') as Tone}
                   seed={13 + i * 7}
                   style={{ transform: `translateY(${drift * (4 + i * 3)}px)` }} />
      ))}

      {scene.layers.map((l, i) => {
        const a = layerAnim(l.anim, f, i, duration);
        const depth = l.depth ?? 0.5;
        const par = drift * (10 + depth * 46);
        const treat =
          l.treat === 'duotone' ? 'grayscale(1) sepia(.5) contrast(1.25)'
            : l.treat === 'engrave' ? 'grayscale(1) contrast(1.9) brightness(1.05)'
              : 'saturate(.85) contrast(1.08)';
        return (
          <div key={`l${i}`} style={{
            position: 'absolute',
            left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`,
            transform: `translate(-50%, -50%) translateY(${-par}px) rotate(${l.rotate ?? 0}deg) ${a.t}`,
            opacity: a.opacity,
          }}>
            <Cutout seed={i * 31 + 5} border={l.treat === 'cutout' ? 14 : 0} rotate={0}>
              <img src={l.src.startsWith('http') ? l.src : `/${l.src}`}
                   style={{ width: '100%', display: 'block', filter: treat, clipPath: roughClip(i * 17 + 3, 0.9) }} />
            </Cutout>
          </div>
        );
      })}

      <Halftone opacity={preset.halftone || 0.12} />

      {scene.headline ? (
        <div style={{ position: 'absolute', left: SAFE.side, right: SAFE.side, top: 420 }}>
          <StatementText text={scene.headline} start={4} step="title"
                         color={bgTone === 'cream' ? COLOR.ink : COLOR.bone} align="left" />
        </div>
      ) : null}
      {scene.caption ? (
        <Caption text={scene.caption} start={TIME.inFast}
                 color={bgTone === 'cream' ? COLOR.ink : preset.captionColor} box={preset.captionBox} />
      ) : null}
      {scene.label ? <Label text={scene.label} start={12} color={preset.accent} /> : null}
    </AbsoluteFill>
  );
};

/* ───────────────────── ТЕКСТОВАЯ МЫСЛЬ ───────────────────── */
export const StatementScene: React.FC<SceneProps<Extract<Scene, { type: 'statement' }>>> = ({ scene, preset }) => {
  const tone = (scene.bg ?? preset.paper) as Tone;
  const light = tone === 'cream' || tone === 'gold';
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ink }}>
      <PaperBg tone={tone} />
      <AbsoluteFill style={{
        justifyContent: 'center',
        padding: `0 ${SAFE.side}px`,
        paddingBottom: SAFE.bottom - 120,
      }}>
        <StatementText text={scene.text} start={2} step="title"
                       color={light ? COLOR.ink : COLOR.cream}
                       align={scene.align ?? 'left'} />
      </AbsoluteFill>
      {scene.label ? <Label text={scene.label} start={14} color={light ? COLOR.rust : preset.accent} /> : null}
    </AbsoluteFill>
  );
};

/* ───────────────────── ГОД / ЦИФРА ───────────────────── */
export const NumeralScene: React.FC<SceneProps<Extract<Scene, { type: 'numeral' }>>> = ({ scene, preset, duration }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: preset.bg }}>
      {scene.bg?.src
        ? <MediaBackdrop src={scene.bg.src} from={scene.bg.from} grade={preset.grade} dim={0.66} duration={duration} />
        : <PaperBg tone={preset.paper as Tone} />}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Numeral value={scene.value} start={2} color={preset.accent} />
        {scene.note ? (
          <div style={{
            ...typeStyle('kicker', COLOR.bone), marginTop: 52,
            opacity: ramp(f, 16, 14, EASE.archive), textAlign: 'center',
            maxWidth: 740, textShadow: DEPTH.textShadow,
          }}>{scene.note}</div>
        ) : null}
      </AbsoluteFill>
      {scene.caption ? <Caption text={scene.caption} start={20} color={preset.captionColor} /> : null}
    </AbsoluteFill>
  );
};

/* ───────────────────── ЦИТАТА ───────────────────── */
export const QuoteScene: React.FC<SceneProps<Extract<Scene, { type: 'quote' }>>> = ({ scene, preset }) => {
  const f = useCurrentFrame();
  const tone = preset.paper as Tone;
  const light = tone === 'cream';
  const color = light ? COLOR.ink : COLOR.cream;
  const q = ramp(f, 0, 18, EASE.archive);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ink }}>
      <PaperBg tone={tone} />
      <AbsoluteFill style={{ justifyContent: 'center', padding: `0 ${SAFE.side + 20}px`, paddingBottom: 160 }}>
        <div style={{
          ...typeStyle('display', preset.accent), fontSize: 180, lineHeight: 0.6,
          opacity: q * 0.5, marginBottom: 10,
        }}>«</div>
        <StatementText text={scene.text} start={4} step="quote" color={color} align="left" />
        {scene.author ? (
          <div style={{
            ...typeStyle('label', light ? COLOR.rust : COLOR.tea), marginTop: 44,
            opacity: ramp(f, 26, 14, EASE.archive),
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ width: 54, height: 2, background: preset.accent, display: 'inline-block' }} />
            {scene.author}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ───────────────────── БЫЛО / СТАЛО ───────────────────── */
export const SplitScene: React.FC<SceneProps<Extract<Scene, { type: 'split' }>>> = ({ scene, preset, duration }) => {
  const f = useCurrentFrame();
  const a = ramp(f, 0, 16, EASE.archive);
  const b = ramp(f, 6, 16, EASE.archive);
  const H = 640;
  const frame = (m: any, label: string | undefined, top: number, p: number, dir: number) => (
    <div style={{
      position: 'absolute', left: SAFE.side, right: SAFE.side, top, height: H,
      overflow: 'hidden', opacity: p,
      transform: `translateX(${(1 - p) * 60 * dir}px)`,
      boxShadow: '0 22px 50px rgba(0,0,0,.55)',
    }}>
      <MediaFrame src={m.src} from={m.from} fit="full" move={m.move ?? 'push'}
                  duration={duration} grade={preset.grade} />
      {label ? (
        <div style={{
          position: 'absolute', left: 24, bottom: 20,
          ...typeStyle('label', COLOR.bone),
          background: 'rgba(18,17,16,.72)', padding: '10px 16px',
        }}>{label}</div>
      ) : null}
    </div>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: preset.bg }}>
      <PaperBg tone={preset.paper as Tone} opacity={0.9} />
      {frame(scene.top, scene.topLabel, 330, a, -1)}
      {frame(scene.bottom, scene.bottomLabel, 330 + H + 28, b, 1)}
      {scene.caption ? <Caption text={scene.caption} start={18} color={preset.captionColor} y={GRID.captionBaseline + 300} /> : null}
    </AbsoluteFill>
  );
};

/* ───────────────────── ГАЛЕРЕЯ ───────────────────── */
export const GalleryScene: React.FC<SceneProps<Extract<Scene, { type: 'gallery' }>>> = ({ scene, preset, duration }) => {
  const f = useCurrentFrame();
  const p = ramp(f, 0, 20, EASE.archive);
  const kb = useKenBurns('push', duration, scene.detail ? 2.2 : 0.7);
  const matTop = 420, matH = 1000;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.cream }}>
      <PaperBg tone="cream" />
      {/* паспарту */}
      <div style={{
        position: 'absolute', left: 90, right: 90, top: matTop, height: matH,
        background: COLOR.bone, boxShadow: '0 26px 60px rgba(0,0,0,.28)',
        padding: 58, opacity: p, transform: `translateY(${(1 - p) * 30}px)`,
      }}>
        <div style={{
          width: '100%', height: '100%', overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.25), 0 0 0 10px rgba(122,74,48,.9)',
        }}>
          <img src={scene.src.startsWith('http') ? scene.src : `/${scene.src}`}
               style={{
                 width: '100%', height: '100%', objectFit: 'cover',
                 transform: scene.detail
                   ? `scale(${scene.detail.zoom * kb.scale}) translate(${-scene.detail.x}%, ${-scene.detail.y}%)`
                   : `scale(${kb.scale})`,
                 filter: 'contrast(1.02) saturate(.96)',
               }} />
        </div>
      </div>
      {/* музейная этикетка */}
      <div style={{
        position: 'absolute', left: 90, top: matTop + matH + 46, width: 700,
        opacity: ramp(f, 14, 16, EASE.archive),
        transform: `translateY(${(1 - ramp(f, 14, 16, EASE.archive)) * 16}px)`,
        borderLeft: `3px solid ${COLOR.oxide}`, paddingLeft: 26,
      }}>
        {scene.artist ? <div style={{ ...typeStyle('label', COLOR.rust) }}>{scene.artist}</div> : null}
        {scene.work ? <div style={{ ...typeStyle('quote', COLOR.ink), fontSize: 54, marginTop: 10 }}>{scene.work}</div> : null}
        {scene.year ? <div style={{ ...typeStyle('body', COLOR.sepia), fontSize: 34, marginTop: 8 }}>{scene.year}</div> : null}
      </div>
      {scene.caption ? <Caption text={scene.caption} start={22} color={COLOR.ink} y={GRID.captionBaseline + 300} /> : null}
    </AbsoluteFill>
  );
};

/* ───────────────────── ФИНАЛ ───────────────────── */
export const OutroScene: React.FC<SceneProps<Extract<Scene, { type: 'outro' }>> & { handle: string }> = ({
  scene, preset, handle,
}) => {
  const f = useCurrentFrame();
  const a = ramp(f, 2, 18, EASE.archive);
  const b = ramp(f, 12, 18, EASE.archive);
  const w = interpolate(a, [0, 1], [0, 320]);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ink }}>
      <PaperBg tone={preset.paper as Tone} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 28 }}>
        <div style={{ width: w, height: 2, background: preset.accent, opacity: 0.85 }} />
        {scene.line ? (
          <div style={{
            ...typeStyle('title', COLOR.cream), textAlign: 'center',
            maxWidth: 860, opacity: a, transform: `translateY(${(1 - a) * 18}px)`,
          }}>{scene.line}</div>
        ) : null}
        <div style={{
          ...typeStyle('brand', COLOR.bone), fontSize: 78, opacity: b,
          transform: `translateY(${(1 - b) * 14}px)`,
        }}>{handle}</div>
        {scene.cta ? (
          <div style={{ ...typeStyle('kicker', preset.accent), opacity: b, marginTop: 6 }}>{scene.cta}</div>
        ) : null}
        <div style={{ width: w, height: 2, background: preset.accent, opacity: 0.85 }} />
      </AbsoluteFill>
      <ArchiveRule opacity={0.25} />
    </AbsoluteFill>
  );
};
