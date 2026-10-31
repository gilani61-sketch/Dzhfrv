import { COLOR, TIME } from '../design/tokens';
import { GRADES } from '../design/grade';
import type { TransitionKind } from '../schema/reel';
import type { Fit } from '../components/Media';

export type StyleName = 'chronicle' | 'collage' | 'gallery';

export type StylePreset = {
  /** человекочитаемое имя регистра */
  name: string;
  grade: typeof GRADES[string];
  bg: string;
  paper: 'ink' | 'charcoal' | 'cream';
  defaultFit: Fit;
  /** переход по умолчанию между сценами */
  defaultTransition: TransitionKind;
  /** переходы, которые в этом регистре уместны (ротация по кругу) */
  transitionPool: TransitionKind[];
  captionColor: string;
  captionBox: boolean;
  lockupColor: string;
  accent: string;
  grain: number;
  dust: number;
  vignette: number;
  halftone: number;
  /** длительности по умолчанию, секунды */
  dur: Record<string, number>;
};

export const STYLE: Record<StyleName, StylePreset> = {
  /** «ХРОНИКА» — чёрное поле, киношная полоса, сдержанная типографика. */
  chronicle: {
    name: 'Хроника',
    grade: GRADES.chronicle,
    bg: COLOR.ink,
    paper: 'ink',
    defaultFit: 'band',
    defaultTransition: 'dip',
    transitionPool: ['dip', 'fade', 'dip', 'flash', 'zoom', 'dip'],
    captionColor: COLOR.bone,
    captionBox: false,
    lockupColor: COLOR.bone,
    accent: COLOR.gold,
    grain: 0.14,
    dust: 0.2,
    vignette: 0.4,
    halftone: 0,
    dur: { cover: 3, footage: 3, still: 3, statement: 2.5, numeral: 2.5, quote: 4, collage: 3, split: 3.5, gallery: 4, outro: 3 },
  },

  /** «КОЛЛАЖ» — тёмная бумага, вырезки, растр, рваные полосы. */
  collage: {
    name: 'Коллаж',
    grade: GRADES.collage,
    bg: COLOR.charcoal,
    paper: 'charcoal',
    defaultFit: 'full',
    defaultTransition: 'paper',
    transitionPool: ['paper', 'halftone', 'slide', 'paper', 'shutter', 'filmroll'],
    captionColor: COLOR.bone,
    captionBox: false,
    lockupColor: COLOR.cream,
    accent: COLOR.gold,
    grain: 0.2,
    dust: 0.26,
    vignette: 0.3,
    halftone: 0.14,
    dur: { cover: 3, footage: 2.5, still: 2.5, statement: 2.5, numeral: 2, quote: 3.5, collage: 3, split: 3, gallery: 3.5, outro: 3 },
  },

  /** «ГАЛЕРЕЯ» — музейный свет, паспарту, этикетка, медленный ход. */
  gallery: {
    name: 'Галерея',
    grade: GRADES.gallery,
    bg: COLOR.cream,
    paper: 'cream',
    defaultFit: 'card',
    defaultTransition: 'fade',
    transitionPool: ['fade', 'zoom', 'fade', 'slide'],
    captionColor: COLOR.ink,
    captionBox: false,
    lockupColor: COLOR.ink,
    accent: COLOR.oxide,
    grain: 0.08,
    dust: 0.1,
    vignette: 0.18,
    halftone: 0,
    dur: { cover: 3.5, footage: 3.5, still: 4, statement: 3, numeral: 2.5, quote: 4.5, collage: 3.5, split: 4, gallery: 5, outro: 3 },
  },
};

/** Переход для i-й сцены: берём из пула регистра, если не задан вручную. */
export const pickTransition = (preset: StylePreset, i: number): TransitionKind =>
  i === 0 ? 'cut' : preset.transitionPool[(i - 1) % preset.transitionPool.length];

export const secondsToFrames = (s: number, fps: number = 30) => Math.max(TIME.shotMin, Math.round(s * fps));
