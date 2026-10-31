import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { COLOR, TYPE, SAFE, GRID, TIME, FILM } from './design/tokens';
import { STYLE } from './styles';
import { useArchiveFonts } from './design/fonts';
import { typeStyle } from './components/Type';
import { TornStrip } from './components/Paper';

const Row: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 64 }}>
    <div style={{ ...typeStyle('label', COLOR.gold), marginBottom: 22 }}>{title}</div>
    {children}
  </div>
);

export const StyleGuide: React.FC = () => {
  const ready = useArchiveFonts();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: COLOR.ink }} />;

  const swatches = Object.entries(COLOR).filter(([k]) => k !== 'black');

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ink, padding: `80px ${SAFE.side}px` }}>
      <div style={{ ...typeStyle('kicker', COLOR.tea) }}>ДИЗАЙН-СИСТЕМА</div>
      <div style={{ ...typeStyle('display', COLOR.bone), fontSize: 110, marginTop: 8 }}>АРХИВ</div>
      <div style={{ ...typeStyle('body', COLOR.sepia), marginTop: 14, maxWidth: 860 }}>
        Один набор правил на все ролики. Меняется регистр подачи — не меняется рука.
      </div>

      <div style={{ height: 2, background: COLOR.gold, opacity: 0.5, margin: '48px 0 64px' }} />

      <Row title="ПАЛИТРА">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {swatches.map(([name, hex]) => (
            <div key={name} style={{ width: 164 }}>
              <div style={{
                height: 94, background: hex as string,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)',
              }} />
              <div style={{ ...typeStyle('label', COLOR.bone), fontSize: 20, marginTop: 8 }}>{name}</div>
              <div style={{ ...typeStyle('body', COLOR.sepia), fontSize: 22 }}>{hex as string}</div>
            </div>
          ))}
        </div>
      </Row>

      <Row title="ШКАЛА КЕГЛЯ">
        {(['display', 'title', 'brand', 'quote', 'caption', 'body', 'kicker', 'label'] as const).map((k) => {
          const t = TYPE[k] as any;
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 28, marginBottom: 16 }}>
              <div style={{ ...typeStyle('label', COLOR.tea), width: 180, flexShrink: 0, fontSize: 20 }}>
                {k} · {t.size}
              </div>
              <div style={{ ...typeStyle(k, COLOR.bone), fontSize: Math.min(t.size, 78) }}>
                Бренд и его история
              </div>
            </div>
          );
        })}
      </Row>

      <Row title="РЕГИСТРЫ ПОДАЧИ">
        <div style={{ display: 'flex', gap: 20 }}>
          {Object.entries(STYLE).map(([key, s]) => (
            <div key={key} style={{ flex: 1, background: s.bg, padding: 26, minHeight: 240,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>
              <div style={{ ...typeStyle('title', key === 'gallery' ? COLOR.ink : COLOR.bone), fontSize: 46 }}>
                {s.name}
              </div>
              <div style={{ ...typeStyle('body', key === 'gallery' ? COLOR.rust : COLOR.tea), fontSize: 26, marginTop: 14 }}>
                переход по умолчанию: {s.defaultTransition}<br />
                кадр: {s.defaultFit}<br />
                зерно {s.grain} · пыль {s.dust} · виньетка {s.vignette}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                {[s.accent, s.captionColor, s.bg].map((c, i) => (
                  <div key={i} style={{ width: 40, height: 40, background: c,
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Row>

      <Row title="ПЕРЕХОДЫ И ИХ ДЛИНА (кадры @30fps)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.entries(TIME.trans).map(([k, v]) => (
            <div key={k} style={{
              padding: '12px 18px', background: COLOR.soot,
              boxShadow: 'inset 0 0 0 1px rgba(201,162,39,.35)',
            }}>
              <span style={{ ...typeStyle('label', COLOR.bone), fontSize: 22 }}>{k}</span>
              <span style={{ ...typeStyle('body', COLOR.gold), fontSize: 24, marginLeft: 12 }}>{v}</span>
            </div>
          ))}
        </div>
      </Row>

      <Row title="РИТМ">
        <div style={{ ...typeStyle('body', COLOR.cream), fontSize: 30, lineHeight: 1.6 }}>
          1 бит = {TIME.beat} кадров = 0.5 c · минимальный план {TIME.shotMin} кадров ·
          короткий {TIME.shotShort} · средний {TIME.shotMed} · длинный {TIME.shotLong}<br />
          слова подписи выходят с шагом {TIME.wordStagger} кадра · вход элемента {TIME.in} кадров
        </div>
      </Row>

      <Row title="ФАКТУРЫ">
        <div style={{ display: 'flex', gap: 16 }}>
          {['textures/paper-cream.jpg', 'textures/paper-charcoal.jpg', 'textures/grain-0.png', 'textures/dust-0.png'].map((t) => (
            <div key={t} style={{ width: 210, height: 150, overflow: 'hidden', background: COLOR.soot }}>
              <img src={staticFile(t)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
          <div style={{ ...typeStyle('body', COLOR.sepia), fontSize: 24, maxWidth: 300 }}>
            зерно {FILM.grainOpacity} · пыль {FILM.dustOpacity}<br />
            дрожание кадра {FILM.gateWeave}px · мерцание {FILM.flicker}
          </div>
        </div>
      </Row>

      <Row title="БЕЗОПАСНЫЕ ЗОНЫ INSTAGRAM (1080×1920)">
        <div style={{ ...typeStyle('body', COLOR.cream), fontSize: 28, lineHeight: 1.7 }}>
          сверху {SAFE.top} · снизу {SAFE.bottom} · по бокам {SAFE.side} · правая колонка {SAFE.rightRail}<br />
          локап на {GRID.lockupTop} · киношная полоса {GRID.band.top}…{GRID.band.top + GRID.band.height} ·
          подпись на {GRID.captionBaseline}
        </div>
      </Row>

      <div style={{ position: 'relative', height: 220, marginTop: 20 }}>
        <TornStrip y={0} h={6} tone="cream" seed={5} />
      </div>
    </AbsoluteFill>
  );
};
