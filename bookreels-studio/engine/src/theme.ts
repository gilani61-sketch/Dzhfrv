import tokens from "../../brand/tokens.json";
import type { Preset, Mode } from "./types";

export const T = tokens;

export const canvas = (p: Preset) => T.canvas[p];
export const scale = (p: Preset) => (p === "wide" ? T.scale.wide : T.scale.reel);
export const layout = (p: Preset) => (p === "wide" ? T.layout.wide : T.layout.reel);

/** Какой шрифт у субтитра в каждом режиме. */
export const captionStyleFor = (mode: Mode) => {
  if (mode === "punch") return T.type.punch;
  if (mode === "editorial") return T.type.editorial;
  return T.type.caption;
};

export const titleStyleFor = (mode: Mode) =>
  mode === "editorial" ? T.type.editorial : T.type.display;

/** CSS-строка с @font-face для всех шрифтов системы. */
export const fontFaceCss = (url: (f: string) => string) => {
  const face = (
    fam: string,
    file: string,
    weight: number,
    range: "cyrillic" | "latin"
  ) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${weight};
    font-display:block;src:url(${url(file)}) format('woff2');
    unicode-range:${
      range === "cyrillic"
        ? "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"
        : "U+0000-00FF,U+0131,U+2000-206F,U+2122,U+2191,U+2193,U+2212,U+2215"
    };}`;

  const out: string[] = [];
  for (const w of [200, 300, 400, 500]) {
    out.push(face("Jost", `jost-cyrillic-${w}-normal.woff2`, w, "cyrillic"));
    out.push(face("Jost", `jost-latin-${w}-normal.woff2`, w, "latin"));
  }
  for (const w of [600, 700]) {
    out.push(face("Inter", `inter-cyrillic-${w}-normal.woff2`, w, "cyrillic"));
    out.push(face("Inter", `inter-latin-${w}-normal.woff2`, w, "latin"));
  }
  for (const w of [300, 400, 600]) {
    out.push(
      face("Cormorant Garamond", `cormorant-garamond-cyrillic-${w}-normal.woff2`, w, "cyrillic")
    );
    out.push(
      face("Cormorant Garamond", `cormorant-garamond-latin-${w}-normal.woff2`, w, "latin")
    );
  }
  return out.join("\n");
};

export const textShadow = `0 2px 10px ${T.color.shadow}, 0 1px 2px rgba(0,0,0,.4)`;
