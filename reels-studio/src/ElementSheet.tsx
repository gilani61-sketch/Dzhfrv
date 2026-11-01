import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { COLOR } from './design/tokens';
import { useArchiveFonts } from './design/fonts';
import { typeStyle } from './components/Type';
import { PaperBg } from './components/Paper';
import catalog from '../public/library/elements/catalog.json';

/** Все элементы библиотеки одной страницей. */
export const ELEMENTS = [
  'stamp-archive.svg', 'stamp-checked.svg', 'stamp-origin.svg', 'stamp-no-1.svg',
  'corner-marks.svg', 'frame-deco.svg', 'index-card.svg', 'ribbon.svg',
  'rule-double.svg', 'rule-dotted.svg', 'divider-ornament.svg', 'sprocket-strip.svg',
  'arrow-hand.svg', 'arrow-straight.svg', 'tape.svg', 'paperclip.svg', 'burst.svg',
];

const TINTS = [COLOR.gold, COLOR.oxide, COLOR.cream, COLOR.tea];

export const ElementSheet: React.FC = () => {
  const ready = useArchiveFonts();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: COLOR.ink }} />;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.charcoal, padding: 72 }}>
      <PaperBg tone="charcoal" />
      {/* позиционированный фон рисуется поверх статичных соседей — поднимаем контент */}
      <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ ...typeStyle('kicker', COLOR.tea) }}>БИБЛИОТЕКА</div>
      <div style={{ ...typeStyle('display', COLOR.bone), fontSize: 96, marginTop: 6 }}>ЭЛЕМЕНТЫ</div>
      <div style={{ ...typeStyle('body', COLOR.sepia), marginTop: 12, maxWidth: 820 }}>
        Нарисованы кодом, не скачаны. Цвет подставляется из палитры при вставке,
        поэтому один файл работает в любом регистре.
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, marginTop: 56,
      }}>
        {ELEMENTS.map((name, i) => {
          const url = `url(${staticFile(`library/elements/${name}`)})`;
          return (
            <div key={name} style={{ background: 'rgba(255,255,255,.04)', padding: 18,
              boxShadow: 'inset 0 0 0 1px rgba(201,162,39,.25)' }}>
              <div style={{
                height: 190,
                width: `${Math.min(100, ((catalog as any)[name]?.aspect ?? 1) * 190 / 190 * 100)}%`,
                backgroundColor: TINTS[i % TINTS.length],
                WebkitMaskImage: url, maskImage: url,
                WebkitMaskSize: 'contain', maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center', maskPosition: 'center',
              }} />
              <div style={{ ...typeStyle('label', COLOR.bone), fontSize: 19, marginTop: 14 }}>
                {name.replace('.svg', '')}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </AbsoluteFill>
  );
};
