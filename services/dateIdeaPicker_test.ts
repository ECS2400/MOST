import { getDateIdeasCatalog } from '../constants/dateIdeas/catalog.ts';
import { DATE_IDEA_COUNT } from '../constants/dateIdeas/meta.ts';
import {
  allLanguagesHaveCompleteCatalog,
  buildNextRecentIds,
  filterIdeasByMoods,
  pickDateIdeaFromCatalog,
  pickRandomFromPool,
  preferredMoodsForOutcome,
  resolveAvailableIdeas,
  MAX_RECENT_DATE_IDEAS,
} from '../constants/dateIdeas/pickerLogic.ts';
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('pickDateIdeaFromCatalog does not return same id twice in a row', () => {
  const first = pickDateIdeaFromCatalog({ language: 'pl', outcome: 'resolved', recentIds: [] });
  const second = pickDateIdeaFromCatalog({
    language: 'pl',
    outcome: 'resolved',
    recentIds: first.nextRecentIds,
    excludeIds: [],
  });
  assertEquals(first.idea.id === second.idea.id, false);
});

Deno.test('ten picks without repeats when catalog is large enough', () => {
  const seen = new Set<string>();
  let recent: string[] = [];

  for (let i = 0; i < 10; i += 1) {
    const picked = pickDateIdeaFromCatalog({
      language: 'pl',
      outcome: 'resolved',
      recentIds: recent,
    });
    assertEquals(seen.has(picked.idea.id), false);
    seen.add(picked.idea.id);
    recent = picked.nextRecentIds;
  }
});

Deno.test('exhausted recent list resets history', () => {
  const catalog = getDateIdeasCatalog('pl');
  const allIds = catalog.map((idea) => idea.id);
  const { pool, resetRecent } = resolveAvailableIdeas(catalog, allIds);
  assertEquals(resetRecent, true);
  assertEquals(pool.length, catalog.length);
});

Deno.test('resolved outcome prefers romantic and playful moods', () => {
  const moods = preferredMoodsForOutcome('resolved');
  assertEquals(moods.includes('romantic'), true);
  assertEquals(moods.includes('playful'), true);
  const filtered = filterIdeasByMoods(getDateIdeasCatalog('pl'), moods);
  assertEquals(filtered.every((idea) => moods.includes(idea.mood)), true);
});

Deno.test('unresolved outcome prefers calm and repair moods', () => {
  const moods = preferredMoodsForOutcome('unresolved_but_closed');
  assertEquals(moods.includes('calm'), true);
  assertEquals(moods.includes('repair'), true);
  const filtered = filterIdeasByMoods(getDateIdeasCatalog('pl'), moods);
  assertEquals(filtered.every((idea) => moods.includes(idea.mood)), true);
});

Deno.test('each supported language has complete catalog', () => {
  assertEquals(allLanguagesHaveCompleteCatalog(), true);
  assertEquals(DATE_IDEA_COUNT >= 40, true);
});

Deno.test('shuffle excludes current idea id', () => {
  const catalog = getDateIdeasCatalog('en');
  const current = catalog[0];
  const { pool } = resolveAvailableIdeas(catalog, [], [current.id]);
  assertEquals(pool.some((idea) => idea.id === current.id), false);
  assertEquals(pool.length > 0, true);
});

Deno.test('buildNextRecentIds keeps max recent entries', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `idea-${i}`);
  const next = buildNextRecentIds(ids, 'idea-new', false);
  assertEquals(next.length, MAX_RECENT_DATE_IDEAS);
  assertEquals(next[next.length - 1], 'idea-new');
});

Deno.test('pickRandomFromPool returns item from pool', () => {
  const catalog = getDateIdeasCatalog('pl').slice(0, 3);
  const picked = pickRandomFromPool(catalog);
  assertEquals(catalog.some((idea) => idea.id === picked.id), true);
});
