import type { InterventionType, SessionMemory } from '@/types/mediator';

export interface StaleTopicDetection {
  staleTopicDetected: boolean;
  staleTopicReason: string | null;
}

/** Detects when open topics persist without forward movement. */
export function detectStaleTopic(
  memory: SessionMemory | null | undefined,
  recentInterventionTypes: readonly InterventionType[],
  ineffectivePatterns: readonly InterventionType[]
): StaleTopicDetection {
  const openTopics = Array.isArray(memory?.openTopics)
    ? memory.openTopics.filter((topic) => typeof topic === 'string' && topic.length > 0)
    : [];

  if (openTopics.length === 0 || recentInterventionTypes.length < 2) {
    return { staleTopicDetected: false, staleTopicReason: null };
  }

  const dominantRecent = recentInterventionTypes[0];
  const repeatedOnTopic =
    typeof dominantRecent === 'string' &&
    recentInterventionTypes.filter((type) => type === dominantRecent).length >= 2 &&
    ineffectivePatterns.includes(dominantRecent);

  if (!repeatedOnTopic) {
    return { staleTopicDetected: false, staleTopicReason: null };
  }

  return {
    staleTopicDetected: true,
    staleTopicReason: 'Open topic unchanged while recent moves appear ineffective',
  };
}
