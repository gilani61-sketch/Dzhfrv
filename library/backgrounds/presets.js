/**
 * Пресеты мира: фон, коридор, пыль, пакеты.
 * film.js выбирает один и, если надо, гнёт его по тайм-лайну.
 */
import { palettes } from '../brand/tokens.js';

export const backgrounds = {
  /* дефолт: глубокий космос, еле заметная туманность */
  'deep-space': {
    base: [0.0016, 0.0032, 0.0072],
    nebula: palettes['cold-tech'].nebula,
    nebulaHot: palettes['cold-tech'].nebulaHot,
    nebulaStrength: [0.085, 0.055],
    well: 0.055, tintHue: 0.60,
    dust: 0.42, corridor: [0.16, 0.45], packets: 0.0,
  },
  /* сцена разогрета: один тёплый блок на весь ролик */
  'ember': {
    base: [0.006, 0.0025, 0.0015],
    nebula: [0.40, 0.13, 0.03],
    nebulaHot: [0.52, 0.10, 0.02],
    nebulaStrength: [0.11, 0.06],
    well: 0.07, tintHue: 0.045,
    dust: 0.5, corridor: [0.10, 0.30], packets: 0.0,
  },
  /* чистая студия: почти пусто, вся работа на типографике */
  'clean-studio': {
    base: [0.012, 0.014, 0.018],
    nebula: [0.10, 0.12, 0.16],
    nebulaHot: [0.16, 0.14, 0.12],
    nebulaStrength: [0.05, 0.02],
    well: 0.10, tintHue: 0.58,
    dust: 0.22, corridor: [0.06, 0.14], packets: 0.0,
  },
  /* сетка-пустота: много коридора, читается скорость */
  'grid-void': {
    base: [0.001, 0.002, 0.005],
    nebula: [0.03, 0.10, 0.30],
    nebulaHot: [0.30, 0.08, 0.02],
    nebulaStrength: [0.05, 0.03],
    well: 0.03, tintHue: 0.60,
    dust: 0.30, corridor: [0.45, 0.85], packets: 0.35,
  },
  /* трафик: воздух забит пакетами, для «потоков данных» */
  'data-storm': {
    base: [0.0016, 0.0032, 0.0090],
    nebula: [0.05, 0.16, 0.42],
    nebulaHot: [0.42, 0.12, 0.03],
    nebulaStrength: [0.10, 0.07],
    well: 0.07, tintHue: 0.58,
    dust: 0.55, corridor: [0.30, 0.60], packets: 1.0,
  },
  /* неоновая ночь: для hype и запусков */
  'neon-night': {
    base: [0.004, 0.002, 0.010],
    nebula: palettes['neon-night'].nebula,
    nebulaHot: palettes['neon-night'].nebulaHot,
    nebulaStrength: [0.14, 0.09],
    well: 0.09, tintHue: 0.76,
    dust: 0.6, corridor: [0.25, 0.55], packets: 0.3,
  },
};

export const DEFAULT_BACKGROUND = 'deep-space';
export const background = (name = DEFAULT_BACKGROUND) => backgrounds[name] ?? backgrounds[DEFAULT_BACKGROUND];
