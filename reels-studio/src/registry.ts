import { reelSchema, type Reel } from './schema/reel';

declare const require: any;

/**
 * Все сценарии из папки content/ подхватываются автоматически.
 * Добавил JSON — в Studio появилась новая композиция.
 */
export const loadReels = (): Reel[] => {
  const ctx = require.context('../content', false, /\.json$/);
  const out: Reel[] = [];
  ctx.keys().forEach((k: string) => {
    if (k.includes('_template')) return;
    const raw = ctx(k);
    const parsed = reelSchema.safeParse(raw.default ?? raw);
    if (parsed.success) {
      out.push(parsed.data);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[reels-studio] ${k} не прошёл схему:`, parsed.error.issues);
    }
  });
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
};
