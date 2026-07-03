// @ts-check
import { writeFileSync, mkdirSync } from 'fs';

globalThis.__DEV__ = true;
const { ACHIEVEMENTS } = await import('../constants/achievements.ts');

mkdirSync('constants/i18n/achievementItems', { recursive: true });
const pl = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, { title: a.titleKey, description: a.descriptionKey }]),
);
writeFileSync('constants/i18n/achievementItems/pl.json', JSON.stringify(pl, null, 2));
console.log('exported', Object.keys(pl).length, 'achievements');
