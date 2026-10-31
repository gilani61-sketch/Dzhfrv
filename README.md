# cine — кинематографичный движок для вертикальных роликов

Отдельная база, **никак не связанная с Remotion-проектами**: ни общих зависимостей,
ни общих файлов, ни общей сборки. Здесь всё рендерится как 3D-сцена, а не как
анимированные HTML-слои.

```
three.js (WebGL2) + свои GLSL-шейдеры
        ↓  покадрово, детерминированно
headless Chromium (Playwright, SwiftShader)
        ↓  поток PNG без записи на диск
ffmpeg → мастер → сведение со звуком → готовый reel
```

## Структура

```
cine/
├── engine/                     общий движок — меняется редко
│   ├── engine.js               DOF-материал, текст→меш, пост-обработка, тайминг
│   ├── world.js                фон, пыль, коридор, пакеты, handheld-камера
│   └── three.module.js         вендоренный three (r169)
├── films/
│   └── reverse-api-engineer/   один ролик = одна папка
│       ├── index.html          точка входа
│       ├── film.js             сценарий: станции, путь камеры, фокус-рэки
│       ├── content.js          canvas-арт этого ролика
│       ├── sound.py            своя звуковая дорожка
│       └── NOTES.md            раскадровка и тайминг
├── library/                    студийная библиотека — общая для всех роликов
│   ├── library.json            каталог: что есть и для чего
│   ├── brand/tokens.js         палитры, типографика, тайминги, грейд, safe-зоны
│   ├── brand/logos/            знаки (SVG, тонируются на лету)
│   ├── elements/ui.js          16 элементов интерфейса
│   ├── characters/             агент, сервер, человек, призрак UI, пакет
│   ├── backgrounds/presets.js  6 пресетов мира
│   ├── sfx/kit.py              синтезируемый звуковой набор + микшер
│   └── voice/voices.json       реестр голосов ElevenLabs по ролям
├── tools/
│   ├── render.mjs              рендер-драйвер (превью и полный проход)
│   ├── sheet.mjs               каталог библиотеки картинкой
│   ├── voice.mjs               озвучка через ElevenLabs
│   └── mux.sh                  сведение картинки со звуком, выдача
└── out/                        результаты, в git не попадают
```

## Библиотека

Один взгляд на весь набор:

```bash
node tools/sheet.mjs      # → out/library-sheet.png
```

Правило: цвета, размеры шрифта и тайминги не пишутся в ролике руками —
они берутся из `library/brand/tokens.js`. Поэтому ролики разных тем
всё равно выглядят как один стиль, а смена палитры — это одна строка.

```js
import { palette, type, motion } from '../../library/brand/tokens.js';
import { elements } from '../../library/elements/ui.js';
import { characters } from '../../library/characters/characters.js';
import { background } from '../../library/backgrounds/presets.js';

const p = palette('neon-night');          // весь ролик в неоне
const bg = background('data-storm');      // воздух забит пакетами
elements.codePane(ctx, w, h, { lines, progress, palette: 'neon-night' });
```

## Озвучка

```bash
node tools/voice.mjs list                          # голоса аккаунта → voice_id
node tools/voice.mjs say --film <имя> --dry        # проверить текст и тайминг
node tools/voice.mjs say --film <имя>              # → out/<имя>.vo.wav
python3 films/<имя>/sound.py                       # подмешает голос, пригнёт музыку
```

Реплики лежат в `films/<имя>/voice.json`: текст плюс поле `at` — секунда,
на которой реплика должна начаться. Голоса назначаются ролями
(`self`, `narrator`, `hype`, `calm`, `agent`) в `library/voice/voices.json`,
чтобы в сценарии не было захардкоженных id.

Чтобы это заработало, среде нужны две вещи: `ELEVENLABS_API_KEY` в секретах
и `api.elevenlabs.io` в Allowed domains сетевой политики.

## Как собрать ролик

```bash
node tools/render.mjs --preview 1.9,7.3,14.2,21.8   # контрольные кадры
node tools/render.mjs --film reverse-api-engineer   # полный проход (~25 мин на 26 с)
python3 films/reverse-api-engineer/sound.py         # out/<film>.score.wav
tools/mux.sh reverse-api-engineer                   # out/<film>.mp4
cat out/.progress                                   # прогресс идущего рендера
```

## Как завести новый ролик

1. `cp -r films/reverse-api-engineer films/<новое-имя>` — движок общий, трогать не надо.
2. В `film.js` переписать `ST` (станции и тайминг), текст и содержимое станций.
3. В `content.js` — свой canvas-арт.
4. `node tools/render.mjs --film <новое-имя> --preview 2,8,16`.

Правки в `engine/` подхватываются всеми роликами — там живёт только оптика,
типографика и грейд, ничего сюжетного.

## Чем это отличается от Remotion-базы

| | Remotion | cine |
|---|---|---|
| единица кадра | DOM-слой | 3D-сцена с камерой и светом |
| глубина | z-index | настоящая перспектива + DOF из глубины |
| смаз | нет | накопление суб-кадров (выдержка) |
| свечение/грейд | CSS-фильтры | HDR-буфер, bloom, ACES, аберрация, зерно |
| сильная сторона | субтитры, UGC, быстрые монтажи | сцена, свет, камера, «дорогая» картинка |

Это не замена Remotion, а вторая, параллельная база под другой стиль.
