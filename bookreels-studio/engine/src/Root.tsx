import React from "react";
import { Composition, getInputProps } from "remotion";
import { Reel, totalFrames } from "./Reel";
import { canvas } from "./theme";
import type { ReelSpec } from "./types";
import demo from "./demo.json";

/**
 * Спека ролика приходит через --props=projects/<slug>/scenes.json.
 * Без неё показываем демо, чтобы студия всегда открывалась.
 */
export const RemotionRoot: React.FC = () => {
  const input = getInputProps() as Partial<ReelSpec>;
  const spec: ReelSpec = { ...(demo as ReelSpec), ...input };
  const c = canvas(spec.preset ?? "reel");
  const fps = spec.fps ?? c.fps;

  return (
    <>
      <Composition
        id="Reel"
        component={Reel as any}
        width={c.w}
        height={c.h}
        fps={fps}
        durationInFrames={totalFrames(spec, fps)}
        defaultProps={{ spec } as any}
      />
    </>
  );
};
