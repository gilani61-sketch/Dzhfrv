import { continueRender, delayRender, staticFile } from 'remotion';
import React from 'react';

let handle: number | null = null;
let injected = false;

/**
 * Шрифты лежат локально в public/fonts — рендер не зависит от сети
 * и всегда даёт один и тот же результат.
 */
export const useArchiveFonts = () => {
  const [ready, setReady] = React.useState(injected);

  React.useEffect(() => {
    if (injected) return;
    injected = true;
    handle = delayRender('fonts');

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = staticFile('fonts/fonts.css');
    document.head.appendChild(link);

    const families = [
      "400 100px 'Playfair Display'",
      "700 100px 'Playfair Display'",
      "italic 400 100px 'Playfair Display'",
      "italic 700 100px 'Playfair Display'",
      "400 100px 'Oswald'",
      "600 100px 'Oswald'",
      "700 100px 'Oswald'",
      "400 100px 'Inter'",
      "500 100px 'Inter'",
      "700 100px 'Inter'",
      "400 100px 'Cormorant Garamond'",
      "italic 400 100px 'Cormorant Garamond'",
    ];
    const probe = 'Абвгдеё AaBbCc 1234';

    Promise.all(families.map((f) => document.fonts.load(f, probe)))
      .then(() => document.fonts.ready)
      .then(() => {
        setReady(true);
        if (handle !== null) continueRender(handle);
        handle = null;
      })
      .catch(() => {
        setReady(true);
        if (handle !== null) continueRender(handle);
        handle = null;
      });
  }, []);

  return ready;
};
