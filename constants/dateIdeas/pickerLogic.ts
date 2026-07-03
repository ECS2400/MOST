import type { Language } from '@/constants/i18n';
import { getDateIdeasCatalog } from '@/constants/dateIdeas/catalog';
import type {
  DateIdeaCatalogItem,
  DateIdeaMood,
  MediationClosureOutcome,
} from '@/constants/dateIdeas/types';

export const MAX_RECENT_DATE_IDEAS = 15;

const RESOLVED_MOODS: DateIdeaMood[] = ['romantic', 'playful'];
const UNRESOLVED_MOODS: DateIdeaMood[] = ['calm', 'repair'];

export function preferredMoodsForOutcome(
  outcome: MediationClosureOutcome
): DateIdeaMood[] {
  return outcome === 'resolved' ? RESOLVED_MOODS : UNRESOLVED_MOODS;
}

export function filterIdeasByMoods(
  ideas: DateIdeaCatalogItem[],
  moods: DateIdeaMood[]
): DateIdeaCatalogItem[] {
  const filtered = ideas.filter((idea) => moods.includes(idea.mood));
  return filtered.length > 0 ? filtered : ideas;
}

export function resolveAvailableIdeas(
  ideas: DateIdeaCatalogItem[],
  recentIds: string[],
  excludeIds: string[] = []
): { pool: DateIdeaCatalogItem[]; resetRecent: boolean } {
  const blocked = new Set([...recentIds, ...excludeIds]);
  let pool = ideas.filter((idea) => !blocked.has(idea.id));
  if (pool.length > 0) {
    return { pool, resetRecent: false };
  }

  pool = ideas.filter((idea) => !excludeIds.includes(idea.id));
  return { pool, resetRecent: true };
}

export function pickRandomFromPool(pool: DateIdeaCatalogItem[]): DateIdeaCatalogItem {
  if (pool.length === 0) {
    throw new Error('Date idea pool is empty');
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

export function buildNextRecentIds(
  recentIds: string[],
  pickedId: string,
  resetRecent: boolean
): string[] {
  const base = resetRecent ? [] : recentIds;
  return [...base.filter((id) => id !== pickedId), pickedId].slice(-MAX_RECENT_DATE_IDEAS);
}

export function pickDateIdeaFromCatalog(params: {
  language: Language;
  outcome?: MediationClosureOutcome;
  recentIds?: string[];
  excludeIds?: string[];
}): { idea: DateIdeaCatalogItem; nextRecentIds: string[]; resetRecent: boolean } {
  const outcome = params.outcome || 'resolved';
  const catalog = getDateIdeasCatalog(params.language);
  const moodFiltered = filterIdeasByMoods(
    catalog,
    preferredMoodsForOutcome(outcome)
  );
  const recentIds = params.recentIds || [];
  const { pool, resetRecent } = resolveAvailableIdeas(
    moodFiltered,
    recentIds,
    params.excludeIds || []
  );
  const picked = pickRandomFromPool(pool);
  const nextRecentIds = buildNextRecentIds(recentIds, picked.id, resetRecent);

  return { idea: picked, nextRecentIds, resetRecent };
}

export function inferClosureOutcomeFromStatus(
  status?: string | null
): MediationClosureOutcome {
  if (status === 'resolved') return 'resolved';
  if (status === 'pending_agreements') return 'unresolved_but_closed';
  return 'resolved';
}

export function allLanguagesHaveCompleteCatalog(): boolean {
  const langs: Language[] = ['pl', 'en', 'it', 'de', 'fr', 'es'];
  const plCount = getDateIdeasCatalog('pl').length;
  return langs.every((lang) => getDateIdeasCatalog(lang).length === plCount);
}
