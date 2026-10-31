# Reels: Reverse API Engineer

Кинематографичный вертикальный ролик, собранный **не** на Remotion:
three.js + собственные GLSL-шейдеры + headless Chromium + ffmpeg.

## Движок

| слой | чем сделано |
|---|---|
| сцена | three.js (WebGL2), один непрерывный мир вдоль коридора по −Z |
| оптика | свой DOF-шейдер: CoC считается во вершинном шейдере из view-space глубины, 13-тапный poisson-бокэ во фрагментном |
| motion blur | накопление 3 суб-кадров на кадр с выдержкой 0.72 в HDR-буфер |
| свечение | bright-pass + 3 октавы гауссова блюра (1/4, 1/8, 1/16) |
| грейд | ACES-тонмаппинг, хроматическая аберрация по радиусу, зерно, виньетка, data-glitch |
| типографика | Inter Display / JetBrains Mono → canvas-текстуры, каждое слово — отдельный меш |
| рендер | Playwright (SwiftShader) по кадрам → PNG-поток → ffmpeg x264 CRF 17 |
| звук | синтез в numpy: дрон, райзеры, бумы, тики набора, бой стекла |

## Сборка

```bash
node render.mjs --preview 1.9,7.3,14.2   # контрольные кадры в out/preview
node render.mjs -o out/reel_silent.mp4   # полный рендер (780 кадров, ~20 мин)
python3 sound.py                         # out/score.wav
./mux.sh                                 # out/reverse-api-engineer.mp4
```

## Файлы

- `src/engine.js` — DOF-материал, текст-в-меш, пост-обработка, тайминг
- `src/world.js` — фон, пыль, коридор, пакеты запросов, handheld-камера
- `src/content.js` — canvas-арт: окно браузера, сетевой лог, панель кода, чипы, промпт, знак
- `src/film.js` — сценарий: 8 станций, единый путь камеры, фокус-рэки
- `sound.py` — звуковая дорожка
