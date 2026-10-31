#!/usr/bin/env node
/**
 * Новый сценарий из шаблона:
 *   npm run new -- cartier-santos chronicle "История часов" "Cartier"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [slug, style = 'chronicle', kicker = '', brand = ''] = process.argv.slice(2);
if (!slug) { console.error('npm run new -- <slug> [style] [kicker] [brand]'); process.exit(1); }

const dst = path.join(root, 'content', `${slug}.json`);
if (fs.existsSync(dst)) { console.error('уже есть:', dst); process.exit(1); }

const tpl = JSON.parse(fs.readFileSync(path.join(root, 'content', '_template.json'), 'utf8'));
tpl.slug = slug;
tpl.style = style;
tpl.lockup = { kicker: kicker || tpl.lockup.kicker, brand: brand || tpl.lockup.brand, show: true };
fs.writeFileSync(dst, JSON.stringify(tpl, null, 2) + '\n');
console.log('→', path.relative(root, dst));
