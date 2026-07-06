import type { ContinuityContext } from '@/types/mediator/continuity';
import type { InterventionType, SessionMemory } from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { detectRepeatedMove } from '@/services/mediatorEngine/memory/continuity/detectRepeatedMove';
import { detectStaleTopic } from '@/services/mediatorEngine/memory/continuity/detectStaleTopic';
import { scoreInterventionEffectiveness } from '@/services/mediatorEngine/memory/continuity/scoreInterventionEffectiveness';
import { selectContinuityHint } from '@/services/mediatorEngine/memory/continuity/selectContinuityHint';
import { summarizeRecentInterventions } from '@/services/mediatorEngine/memory/continuity/summarizeRecentInterventions';
import type { BuildContinuityContextInput } from '@/services/mediatorEngine/memory/continuity/types';

const REPEATED_TYPE_THRESHOLD = 3;

function dedupeTypes(types: readonly InterventionType[]): InterventionType[] {
  const seen = new Set<InterventionType>();
  const result: InterventionType[] = [];
  for (const type of types) {
    if (!seen.has(type)) {
      seen.add(type);
      result.push(type);
    }
  }
  return result;
}

function countRecentType(recent: readonly InterventionType[], type: InterventionType): number {
  return recent.filter((entry) => entry === type).length;
}

function buildSuggestedAvoidTypes(
  memory: SessionMemory,
  recent: readonly InterventionType[],
  effectiveness: ReturnType<typeof scoreInterventionEffectiveness>,
  repeated: ReturnType<typeof detectRepeatedMove>,
  recommended?: InterventionType
): InterventionType[] {
  const avoid: InterventionType[] = [];

  if (
    effectiveness.lastIneffectiveInterventionType &&
    typeof effectiveness.lastIneffectiveInterventionType === 'string'
  ) {
    avoid.push(effectiveness.lastIneffectiveInterventionType);
  }

  for (const type of effectiveness.ineffectivePatterns) {
    avoid.push(type);
  }

  if (repeated.repeatedMoveDetected && recent[0]) {
    avoid.push(recent[0]);
  }

  for (const type of recent) {
    if (countRecentType(recent, type) >= REPEATED_TYPE_THRESHOLD) {
      avoid.push(type);
    }
  }

  if (recommended && countRecentType(recent, recommended) >= 2) {
    const signatures = memory.askedInterventionSignatures ?? [];
    if (signatures.length > 0) {
      avoid.push(recommended);
    }
  }

  return dedupeTypes(avoid);
}

function buildSuggestedPreferTypes(
  effectiveness: ReturnType<typeof scoreInterventionEffectiveness>
): InterventionType[] {
  const prefer: InterventionType[] = [];
  if (effectiveness.lastEffectiveInterventionType) {
    prefer.push(effectiveness.lastEffectiveInterventionType);
  }
  for (const type of effectiveness.effectivePatterns) {
    prefer.push(type);
  }
  return dedupeTypes(prefer);
}

function computeConfidence(
  repeated: ReturnType<typeof detectRepeatedMove>,
  stale: ReturnType<typeof detectStaleTopic>,
  effectiveness: ReturnType<typeof scoreInterventionEffectiveness>
): number {
  let score = 0;
  if (repeated.repeatedMoveDetected) score += 40;
  if (stale.staleTopicDetected) score += 20;
  if (effectiveness.lastIneffectiveInterventionType) score += 25;
  if (effectiveness.lastEffectiveInterventionType) score += 15;
  return Math.min(100, score);
}

/** Builds a privacy-safe continuity context from session memory. */
export function buildContinuityContext(
  input: BuildContinuityContextInput | SessionMemory | null | undefined
): ContinuityContext {
  const normalizedInput: BuildContinuityContextInput =
    input && typeof input === 'object' && 'sessionMemory' in input
      ? input
      : { sessionMemory: input as SessionMemory | null | undefined };

  const memory = normalizedInput.sessionMemory ?? createEmptySessionMemory();
  const { recentInterventionTypes, recentSignatures } = summarizeRecentInterventions(memory);
  const effectiveness = scoreInterventionEffectiveness(memory);
  const repeated = detectRepeatedMove(recentInterventionTypes);
  const stale = detectStaleTopic(memory, recentInterventionTypes, effectiveness.ineffectivePatterns);

  const suggestedAvoidTypes = buildSuggestedAvoidTypes(
    memory,
    recentInterventionTypes,
    effectiveness,
    repeated,
    normalizedInput.recommendedInterventionType
  );
  const suggestedPreferTypes = buildSuggestedPreferTypes(effectiveness);

  const partial = {
    repeatedMoveDetected: repeated.repeatedMoveDetected,
    staleTopicDetected: stale.staleTopicDetected,
    lastIneffectiveInterventionType: effectiveness.lastIneffectiveInterventionType,
    suggestedAvoidTypes,
    suggestedPreferTypes,
  };

  return {
    recentInterventionTypes,
    recentSignatures,
    effectivePatterns: effectiveness.effectivePatterns,
    ineffectivePatterns: effectiveness.ineffectivePatterns,
    repeatedMoveDetected: repeated.repeatedMoveDetected,
    repeatedMoveReason: repeated.repeatedMoveReason,
    staleTopicDetected: stale.staleTopicDetected,
    staleTopicReason: stale.staleTopicReason,
    lastEffectiveInterventionType: effectiveness.lastEffectiveInterventionType,
    lastIneffectiveInterventionType: effectiveness.lastIneffectiveInterventionType,
    suggestedAvoidTypes,
    suggestedPreferTypes,
    continuityHint: selectContinuityHint(partial),
    confidence: computeConfidence(repeated, stale, effectiveness),
  };
}
