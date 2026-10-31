# BookReels Studio

Движок для роликов про книги, живопись и биографии — в стилистике
референса «Мартин Иден». Ты даёшь текст, на выходе — готовый Reels 1080×1920.

```bash
bash scripts/new_project.sh martin-eden "Мартин Иден" "Джек Лондон"
# пишешь текст в projects/martin-eden/script.md
# кладёшь кадры в projects/martin-eden/shots/
python3 scripts/build_scenes.py projects/martin-eden
bash scripts/render.sh martin-eden
```

## Что где лежит

```
bookreels-studio/
├── README.md              ← ты здесь
├── PIPELINE.md            ← как делается ролик, по шагам
├── docs/
│   ├── feeding.md         ← ЧТО МНЕ СКОРМИТЬ, чтобы стало лучше
│   └── visual-prompts.md  ← промпты для генерации кадров
├── brand/
│   ├── design-system.md   ← шрифты, цвет, сетка, движение — с объяснениями
│   ├── tokens.json        ← те же правила, но машиночитаемо (движок читает это)
│   └── fonts/             ← Jost, Inter, Cormorant (все с кириллицей, OFL)
├── refs/
│   ├── analysis.md        ← разбор твоих трёх референсов
│   └── frames/            ← кадры из них для сверки
├── engine/                ← Remotion: React → видео
│   ├── src/
│   │   ├── Reel.tsx       ← главная композиция
│   │   ├── theme.ts       ← мост между tokens.json и компонентами
│   │   └── components/    ← Shot, TitleCard, Captions, Grain
│   └── public/            ← симлинки на fonts/ и projects/
├── scripts/
│   ├── new_project.sh     ← создать ролик
│   ├── tts_eleven.py      ← озвучка твоим голосом
│   ├── build_scenes.py    ← script.md → scenes.json
│   └── render.sh          ← рендер + нормализация звука
└── projects/
    ├── demo/              ← рабочий пример, можно рендерить прямо сейчас
    └── <твои ролики>/
```

## Один проект = одна папка

```
projects/martin-eden/
├── script.md        ← текст: сцены и субтитры. ЭТО ГЛАВНЫЙ ФАЙЛ
├── shotlist.md      ← промпты для генерации кадров
├── shots/           ← 01.jpg, 02.jpg… (можно и .mp4)
├── audio/           ← voice.mp3, timings.json, музыка
├── scenes.json      ← генерится из script.md, руками не трогать
└── out/             ← готовое видео
```

## Два режима

| Режим | Шрифт | Для чего |
|---|---|---|
| `cinematic` | Jost 200/300, трекинг, кроссфейды | книги, биографии — как «Мартин Иден» |
| `punch` | Inter 700, пословно, встык | разборы и факты — как референс №3 |
| `editorial` | Cormorant Garamond | живопись, музейная интонация |

Режим ставится строкой `mode: cinematic` в `script.md`.

## Что умеет движок

- 1080×1920 / 1920×1080 / 1080×1080, 30 fps
- Ken Burns с чередованием направлений — соседние кадры не качаются одинаково
- Титульная карточка с выходом из размытия
- Субтитры с подложкой-градиентом (белый текст не тонет на светлом кадре)
- Вотермарк, появляющийся после титра
- Зерно плёнки — склеивает AI-картинку и текст в одно изображение
- Озвучка + музыка с дакингом, нормализация до −14 LUFS
- Кадры могут быть как картинками, так и видео

## Чего движок НЕ делает

**Не генерирует картинки и видео.** Доступа к Midjourney / Kling / Sora
у меня нет. Кадры генеришь ты по промптам из `shotlist.md`.

## Требования

Уже стоит: Node 22, ffmpeg, Chromium, Remotion.
Для озвучки нужен `ELEVENLABS_API_KEY` в переменных окружения.

Подробности — в `PIPELINE.md`. Что мне нужно от тебя — в `docs/feeding.md`.
