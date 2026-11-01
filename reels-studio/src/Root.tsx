import React from 'react';
import { Composition, Still } from 'remotion';
import { CANVAS } from './design/tokens';
import { ReelVideo, reelDuration } from './Reel';
import { loadReels } from './registry';
import { reelSchema } from './schema/reel';
import { StyleGuide } from './StyleGuide';
import { ElementSheet } from './ElementSheet';

export const RemotionRoot: React.FC = () => {
  const reels = loadReels();

  return (
    <>
      {reels.map((reel) => (
        <Composition
          key={reel.slug}
          id={reel.slug}
          component={ReelVideo as any}
          width={CANVAS.width}
          height={CANVAS.height}
          fps={CANVAS.fps}
          durationInFrames={reelDuration(reel)}
          defaultProps={{ reel } as any}
          schema={undefined}
        />
      ))}

      <Still
        id="elements"
        component={ElementSheet as any}
        width={CANVAS.width}
        height={2150}
      />

      <Still
        id="style-guide"
        component={StyleGuide as any}
        width={CANVAS.width}
        height={3500}
      />
    </>
  );
};
