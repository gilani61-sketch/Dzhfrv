import React from "react";
import { AbsoluteFill, Img, Video, staticFile, useCurrentFrame, interpolate } from "remotion";
import { T } from "../theme";
import type { PanDir } from "../types";

/**
 * Кадр сцены с медленным движением камеры (Ken Burns).
 * Картинка всегда перекрывает холст с запасом, чтобы паннинг не обнажил край.
 */
export const Shot: React.FC<{
  src: string;
  durF: number;
  pan: PanDir;
  projectSlug: string;
}> = ({ src, durF, pan, projectSlug }) => {
  const frame = useCurrentFrame();
  const kb = T.motion.kenBurns;
  const p = interpolate(frame, [0, durF], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // easeInOutSine — камера трогается и останавливается мягко
  const e = 0.5 - Math.cos(Math.PI * p) / 2;

  let zoom = 1;
  let tx = 0;
  let ty = 0;
  const m = kb.panMaxPct;

  switch (pan) {
    case "in":
      zoom = kb.zoomFrom + (kb.zoomTo - kb.zoomFrom) * e;
      break;
    case "out":
      zoom = kb.zoomTo - (kb.zoomTo - kb.zoomFrom) * e;
      break;
    case "left":
      zoom = kb.zoomTo;
      tx = interpolate(e, [0, 1], [m, -m]);
      break;
    case "right":
      zoom = kb.zoomTo;
      tx = interpolate(e, [0, 1], [-m, m]);
      break;
    case "up":
      zoom = kb.zoomTo;
      ty = interpolate(e, [0, 1], [m, -m]);
      break;
    case "down":
      zoom = kb.zoomTo;
      ty = interpolate(e, [0, 1], [-m, m]);
      break;
  }

  const url = staticFile(`proj/${projectSlug}/shots/${src}`);
  const isVideo = /\.(mp4|mov|webm)$/i.test(src);
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${zoom}) translate(${tx}%, ${ty}%)`,
    transformOrigin: "center center",
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: T.color.cardBg }}>
      {isVideo ? <Video src={url} style={style} muted /> : <Img src={url} style={style} />}
    </AbsoluteFill>
  );
};
