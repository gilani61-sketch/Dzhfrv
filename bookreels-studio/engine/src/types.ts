export type Mode = "cinematic" | "punch" | "editorial";
export type Preset = "reel" | "wide" | "square";

export type PanDir = "in" | "out" | "left" | "right" | "up" | "down";

/** Одна сцена = один кадр-картинка + субтитры, которые на нём идут. */
export type Scene = {
  /** файл в projects/<slug>/shots/, например "01.png" или "01.mp4" */
  src: string;
  /** длительность в секундах */
  dur: number;
  /** субтитры внутри этой сцены */
  captions: Caption[];
  /** направление движения камеры; по умолчанию чередуется in/out */
  pan?: PanDir;
  /** переход на входе в сцену, кадров; по умолчанию из токенов */
  xfade?: number;
};

export type Caption = {
  text: string;
  /** старт в секундах от начала сцены */
  at: number;
  /** длительность в секундах */
  dur: number;
};

export type TitleCardSpec = {
  title: string;
  author?: string;
  /** на какой секунде ролика появляется */
  at?: number;
  dur?: number;
};

/** Полное описание ролика — это и есть scenes.json проекта. */
export type ReelSpec = {
  slug: string;
  mode: Mode;
  preset: Preset;
  fps?: number;
  titleCard?: TitleCardSpec;
  watermark?: string | null;
  /** путь к озвучке относительно staticFile(), например "proj/martin/voice.mp3" */
  voice?: string | null;
  music?: string | null;
  musicGainDb?: number;
  grain?: boolean;
  scenes: Scene[];
};
