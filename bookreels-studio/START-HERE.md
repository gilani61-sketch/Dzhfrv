# Запуск на своём компьютере

Распаковала архив — дальше по шагам. Займёт минут десять, в основном
это установка зависимостей.

## 1. Что должно стоять в системе

| Нужно | Проверить | Если нет |
|---|---|---|
| **Node.js 20+** | `node -v` | nodejs.org — взять LTS |
| **ffmpeg** | `ffmpeg -version` | Mac: `brew install ffmpeg` · Windows: `winget install ffmpeg` |
| **Python 3.10+** | `python3 --version` | python.org (на Mac уже есть) |

Chromium для рендера Remotion скачает сам при первом запуске.

## 2. Поставить зависимости движка

```bash
cd bookreels-studio/engine
npm install
cd ..
python3 scripts/setup_links.py
```

`npm install` качает около 300 МБ, один раз. Второй командой движок
связывается со шрифтами, библиотекой и проектами — на Windows она
подстрахует, если архив распаковался без симлинков.

## 3. Проверить, что всё работает

```bash
cd bookreels-studio
bash scripts/render.sh demo
```

Через пару минут появится `projects/demo/out/demo.mp4`. Сравни с
`examples/demo-reference.mp4` — должно выглядеть так же. Если да, конвейер
собран правильно.

## 4. Подключить голос

```bash
export ELEVENLABS_API_KEY=твой_ключ        # Windows: set ELEVENLABS_API_KEY=...
python3 scripts/tts_eleven.py projects/demo --list-models
python3 scripts/tts_eleven.py projects/demo --list-voices
```

Первая команда покажет, какие модели доступны аккаунту — там и будет видно,
под каким именем у тебя новейшая версия. Вторая покажет голоса с их `voice_id`.

Скопируй нужный `voice_id` в `library/voices/voices.json`, в роль `julia`.

Чтобы не писать ключ каждый раз, добавь строку в `~/.zshrc` (Mac)
или в переменные среды Windows.

**В облаке это не работало** — там сетевая политика блокировала
`api.elevenlabs.io`. Локально такого ограничения нет.

## 5. Открыть новую сессию Claude Code

```bash
cd bookreels-studio
claude
```

В корне лежит `CLAUDE.md` — Claude прочитает его сам и сразу будет
в курсе проекта: откуда взялась дизайн-система, что работает, что нет,
какие правила у текста. Объяснять заново не придётся.

Первое, что стоит сказать новой сессии:

> Прочитай CLAUDE.md и docs/feeding.md. Вот текст для первого ролика: …

## 6. Сделать первый ролик

```bash
bash scripts/new_project.sh anna-karenina "Анна Каренина" "Лев Толстой"
```

Дальше: написать текст в `projects/anna-karenina/script.md`, сгенерировать
кадры по промптам из `shotlist.md`, положить их в `shots/` как `01.jpg`,
`02.jpg`… и запустить:

```bash
python3 scripts/tts_eleven.py projects/anna-karenina
python3 scripts/build_scenes.py projects/anna-karenina
bash scripts/render.sh anna-karenina
```

---

## Куда смотреть

| Вопрос | Файл |
|---|---|
| Как вообще делается ролик | `PIPELINE.md` |
| Шрифты, цвета, сетка, анимация | `brand/design-system.md` |
| Промпты для генерации кадров | `docs/visual-prompts.md` |
| Что скормить Claude для роста качества | `docs/feeding.md` |
| Что лежит в библиотеке | `library/README.md` |
| Разбор твоих референсов | `refs/analysis.md` |

## Если что-то сломалось

**`npm install` падает** — проверь версию Node, нужна 20+.

**Рендер падает на Chromium** — `cd engine && npx remotion browser ensure`.

**Рендер очень медленный** — открой `engine/remotion.config.ts`
и подними `setConcurrency` до числа ядер минус один.

**Кириллица не отображается, кадры не находятся** — порвалась связь
движка с папками. Чинится одной командой:

```bash
python3 scripts/setup_links.py
```
