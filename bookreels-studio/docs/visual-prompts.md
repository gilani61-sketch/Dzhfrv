# Промпты для кадров

Кадры внутри одного ролика должны выглядеть как сделанные одной рукой.
Это достигается не талантом, а **дисциплиной: общий префикс + общий суффикс,
меняется только середина.**

## Формула

```
[СТИЛЬ] + [СЦЕНА] + [КАМЕРА] + [СВЕТ] + [ТЕХНИЧЕСКОЕ]
```

Меняется только `[СЦЕНА]`. Остальное копируется между кадрами слово в слово.

## Пресет A — «Акварель» (под референс R1)

Это стиль акварельного ролика, который ты прислала.

**Префикс (не меняется):**
```
2D hand-painted animation still, watercolor and gouache textures,
soft muted palette, visible brush strokes, cel-shaded characters
with simple expressive faces, painterly backgrounds,
Studio Ghibli meets Cartoon Saloon
```

**Суффикс (не меняется):**
```
vertical 9:16 composition, cinematic framing, generous headroom,
soft diffused daylight, film grain, no text, no watermark, no signature
--ar 9:16
```

**Середина — пример:**
```
a young woman in a cream coat and red scarf standing on a city sidewalk,
looking down at her phone, bakery window glowing behind her
```

## Пресет B — «Ретро-мультфильм» (под референс R2)

Стиль «Мартина Идена» — классическая рисованная анимация 90-х.

**Префикс:**
```
classic 90s traditional cel animation still, clean ink outlines,
flat painted cels, rich saturated colors, dramatic lighting,
Don Bluth meets early Disney renaissance
```

**Суффикс:**
```
vertical 9:16 composition, cinematic wide shot, strong foreground element,
deep atmospheric background, no text, no watermark --ar 9:16
```

## Пресет C — «Музей» (для живописи и биографий художников)

```
cinematic still, museum-lit oil painting aesthetic, chiaroscuro lighting,
deep shadows, warm amber highlights, visible canvas texture,
Dutch Golden Age palette
```
Суффикс тот же.

---

## Правила, без которых ролик развалится

1. **Один персонаж — одно описание на весь ролик.** Выпиши внешность героя
   один раз («young man, dark tousled hair, worn sailor's jacket, mid-20s»)
   и вставляй дословно в каждый кадр, где он есть. Иначе в кадре 7
   это будет уже другой человек.

2. **Чередуй крупность.** Общий → средний → крупный → общий. Пять общих
   планов подряд — и зритель уходит, даже если каждый красив.

3. **Оставляй воздух снизу.** Нижние 25 % кадра займёт субтитр. Если туда
   попало лицо — кадр испорчен. В промпт: `generous negative space in lower third`.

4. **Без текста в кадре.** AI пишет нечитаемую псевдокириллицу. Всегда
   `no text, no letters, no signage`.

5. **Первый кадр — самый сильный.** Он решает, досмотрят ли. Генери его
   последним, когда уже видно весь ролик, и не жалей попыток.

## Движение

Если генеришь видео (Kling, Runway, Sora) — проси **минимальное движение**:
`subtle camera drift, slow push in, character barely moves`.
Резкое движение в кадре + Ken Burns движка = каша. Движок сам добавит
дрейф картинке, его задача — оживить статику, а не усилить анимацию.

Для видеокадров ставь в `scenes.json` `"pan": "in"` с малой амплитудой
или вовсе отключи Ken Burns, уменьшив `motion.kenBurns.zoomTo` до `1.0`.
