/** Цветокоррекция: один грейд на стиль, руками в сценах не трогаем. */
export type Grade = {
  contrast: number;
  saturate: number;
  sepia: number;
  brightness: number;
  /** цвет и сила тёплой заливки поверх кадра */
  wash: string;
  washOpacity: number;
  washBlend: React.CSSProperties['mixBlendMode'];
};

export const GRADES: Record<string, Grade> = {
  /** «Хроника» — тёплая киноплёнка, приглушённый цвет */
  chronicle: {
    contrast: 1.06, saturate: 0.82, sepia: 0.14, brightness: 0.98,
    wash: '#8A6A46', washOpacity: 0.12, washBlend: 'soft-light',
  },
  /** «Коллаж» — бумага, выцветшая краска, высокий контраст */
  collage: {
    contrast: 1.14, saturate: 0.7, sepia: 0.22, brightness: 1.0,
    wash: '#C2A585', washOpacity: 0.16, washBlend: 'multiply',
  },
  /** «Галерея» — музейный свет, почти без сепии */
  gallery: {
    contrast: 1.02, saturate: 0.94, sepia: 0.05, brightness: 1.01,
    wash: '#F4EEE2', washOpacity: 0.06, washBlend: 'soft-light',
  },
  /** без грейда */
  none: {
    contrast: 1, saturate: 1, sepia: 0, brightness: 1,
    wash: '#000000', washOpacity: 0, washBlend: 'normal',
  },
};

export const gradeFilter = (g: Grade) =>
  `contrast(${g.contrast}) saturate(${g.saturate}) sepia(${g.sepia}) brightness(${g.brightness})`;
