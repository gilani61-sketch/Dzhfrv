import palettesJson from "../../library/palettes/palettes.json";

export type PaletteKey = keyof typeof palettesJson.palettes;

export type Palette = {
  name: string; mood: string;
  ink: string; accent: string; accentAlt: string;
  deep: string; paper: string; scrimTint: string;
};

export const palettes = palettesJson.palettes as unknown as Record<string, Palette>;

export const getPalette = (k?: string): Palette =>
  palettes[k ?? "literature"] ?? palettes.literature;

/** Пути к ассетам библиотеки — всё под public/lib/ (симлинк на library/). */
export const asset = {
  background: (n: string) => `lib/backgrounds/${n}`,
  overlay: (n: string) => `lib/overlays/${n}`,
  element: (p: string) => `lib/elements/${p}`,
  mark: (n: string) => `lib/brand/${n}`,
  music: (n: string) => `lib/music/${n}`,
  sfx: (n: string) => `lib/sfx/${n}`,
};

/** Что лежит в библиотеке — чтобы не искать по папкам. */
export const LIB = {
  backgrounds: [
    "paper-warm.jpg", "paper-cold.jpg", "paper-aged.jpg", "canvas-linen.jpg",
    "gradient-literature.jpg", "gradient-painting.jpg", "gradient-biography.jpg",
    "gradient-nocturne.jpg", "gradient-punch.jpg",
  ],
  vignettes: ["vignette-soft.png", "vignette-strong.png", "vignette-cine.png"],
  grain: ["grain-fine.png", "grain-coarse.png"],
  dust: ["dust-01.png", "dust-02.png", "dust-03.png"],
  leaks: ["leak-warm-tr.png", "leak-cold-bl.png", "leak-amber-top.png"],
  frames: ["frame-hairline.svg", "frame-corners.svg", "frame-museum.svg"],
  dividers: ["rule-thin.svg", "rule-diamond.svg", "rule-dots.svg"],
  marks: ["mark-clapper.svg", "mark-book.svg", "mark-frame.svg"],
} as const;
