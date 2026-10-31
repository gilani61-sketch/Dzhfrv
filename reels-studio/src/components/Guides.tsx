import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SAFE, GRID, CANVAS, COLOR } from '../design/tokens';

/** Служебная разметка: безопасные зоны Instagram и опорные линии. Только для превью. */
export const Guides: React.FC = () => {
  const line = (s: React.CSSProperties) => <div style={{ position: 'absolute', background: 'rgba(201,162,39,.6)', ...s }} />;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, border: `1px dashed rgba(255,255,255,.2)` }} />
      {/* небезопасные зоны */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: SAFE.top, background: 'rgba(155,59,46,.18)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: SAFE.bottom, background: 'rgba(155,59,46,.18)' }} />
      <div style={{ position: 'absolute', right: 0, top: SAFE.top, bottom: SAFE.bottom, width: SAFE.rightRail, background: 'rgba(155,59,46,.12)' }} />
      {line({ left: SAFE.side, top: 0, bottom: 0, width: 1 })}
      {line({ right: SAFE.side, top: 0, bottom: 0, width: 1 })}
      {line({ left: 0, right: 0, top: GRID.lockupTop, height: 1 })}
      {line({ left: 0, right: 0, top: GRID.band.top, height: 1 })}
      {line({ left: 0, right: 0, top: GRID.band.top + GRID.band.height, height: 1 })}
      {line({ left: 0, right: 0, top: GRID.captionBaseline, height: 1 })}
      {line({ left: 0, right: 0, top: CANVAS.height / 2, height: 1, background: 'rgba(255,255,255,.25)' })}
      <div style={{
        position: 'absolute', left: SAFE.side, top: GRID.lockupTop - 34,
        color: COLOR.gold, font: "500 22px Inter, sans-serif", letterSpacing: '.2em',
      }}>LOCKUP</div>
      <div style={{
        position: 'absolute', left: SAFE.side, top: GRID.captionBaseline - 34,
        color: COLOR.gold, font: "500 22px Inter, sans-serif", letterSpacing: '.2em',
      }}>CAPTION</div>
    </AbsoluteFill>
  );
};
