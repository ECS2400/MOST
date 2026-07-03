import type { Language } from '@/constants/i18n';
import { getDateIdeasCatalog } from '@/constants/dateIdeas/catalog';
import {
  pickDateIdeaFromCatalog,
} from '@/constants/dateIdeas/pickerLogic';
import type {
  DateIdeaCatalogItem,
  MediationClosureOutcome,
} from '@/constants/dateIdeas/types';
import {
  loadRecentDateIdeaIds,
  saveRecentDateIdeaIds,
} from '@/services/dateIdeaRecentStorage';
import type { DateIdea } from '@/services/disputeClosure';

export {
  allLanguagesHaveCompleteCatalog,
  buildNextRecentIds,
  filterIdeasByMoods,
  inferClosureOutcomeFromStatus,
  pickDateIdeaFromCatalog,
  pickRandomFromPool,
  preferredMoodsForOutcome,
  resolveAvailableIdeas,
} from '@/constants/dateIdeas/pickerLogic';

export function catalogItemToDateIdea(item: DateIdeaCatalogItem): DateIdea {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    whyItFits: item.whyItFits,
    estimatedCost: item.costLabel,
    durationMinutes: item.durationMinutes,
    budget: item.budget,
  };
}

export async function pickDateIdea(params: {
  language: Language;
  outcome?: MediationClosureOutcome;
  userId?: string;
  excludeIds?: string[];
}): Promise<{ dateIdea: DateIdea; source: string; resetRecent: boolean }> {
  const recentIds = await loadRecentDateIdeaIds(params.userId);
  const { idea, nextRecentIds, resetRecent } = pickDateIdeaFromCatalog({
    language: params.language,
    outcome: params.outcome,
    recentIds,
    excludeIds: params.excludeIds,
  });

  await saveRecentDateIdeaIds(nextRecentIds, params.userId);

  return {
    dateIdea: catalogItemToDateIdea(idea),
    source: 'catalog',
    resetRecent,
  };
}

export function getCatalogSize(language: Language = 'pl'): number {
  return getDateIdeasCatalog(language).length;
}
