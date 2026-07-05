import type {
  GoalState,
  MediationState,
  NeedLabel,
  SessionMemory,
  SessionMemoryUpdateInput,
  TherapeuticGoal,
} from '@/types/mediator';
import { SESSION_MEMORY_LIMITS } from '@/services/mediatorEngine/memory/config/memoryLimits';
import {
  appendLimited,
  dedupeAppendLimited,
} from '@/services/mediatorEngine/memory/lib/listHelpers';

function asGoalStates(state: MediationState): GoalState[] {
  return Array.isArray(state?.goals) ? state.goals : [];
}

function completedGoalsFromState(state: MediationState): TherapeuticGoal[] {
  return asGoalStates(state)
    .filter((goalState) => goalState?.status === 'completed' && typeof goalState.goal === 'string')
    .map((goalState) => goalState.goal);
}

function closedTopicsFromState(state: MediationState): string[] {
  const closed = new Set<string>();
  for (const goalState of asGoalStates(state)) {
    if (
      goalState?.status === 'completed' ||
      goalState?.status === 'skipped' ||
      goalState?.status === 'blocked'
    ) {
      if (typeof goalState.goal === 'string') closed.add(goalState.goal);
    }
  }
  const objectives = state?.sessionObjectives?.objectives;
  if (Array.isArray(objectives)) {
    for (const objective of objectives) {
      if (objective?.status === 'achieved' || objective?.status === 'abandoned') {
        if (typeof objective.id === 'string') closed.add(objective.id);
      }
    }
  }
  return [...closed];
}

function openTopicsFromState(state: MediationState): string[] {
  const open = new Set<string>();
  const surfaceTopic = state?.conflict?.surfaceTopic;
  if (typeof surfaceTopic === 'string' && surfaceTopic.length > 0) {
    open.add(surfaceTopic);
  }
  const deepTheme = state?.conflict?.confirmedDeepTheme;
  if (typeof deepTheme === 'string' && deepTheme.length > 0) {
    open.add(deepTheme);
  }
  const covered = state?.memory?.coveredTopics;
  if (Array.isArray(covered)) {
    for (const topic of covered) {
      if (typeof topic === 'string' && topic.length > 0) open.add(topic);
    }
  }
  for (const goalState of asGoalStates(state)) {
    if (goalState?.status === 'in_progress' || goalState?.status === 'pending') {
      if (typeof goalState.goal === 'string') open.add(goalState.goal);
    }
  }
  return [...open];
}

function mergeLimitedTopics(existing: readonly string[], incoming: readonly string[], max: number): string[] {
  let merged = [...existing];
  for (const topic of incoming) {
    merged = dedupeAppendLimited(merged, topic, max);
  }
  return merged.slice(-max);
}

function collectConfirmedEmotions(
  memory: SessionMemory,
  state: MediationState
): SessionMemory['confirmedEmotions'] {
  const entries = [...memory.confirmedEmotions];
  const participants = [
    { role: 'host' as const, participant: state?.participants?.host },
    { role: 'partner' as const, participant: state?.participants?.partner },
  ];

  for (const { role, participant } of participants) {
    if (!participant?.emotionValidated || !participant.namedEmotion) continue;
    const exists = entries.some(
      (entry) => entry.participant === role && entry.value === participant.namedEmotion
    );
    if (exists) continue;
    entries.push({
      participant: role,
      value: participant.namedEmotion,
      confidence: typeof participant.emotionConfidence === 'number' ? participant.emotionConfidence : 0,
      source: 'user_signal',
      evidence: [],
      assessedAt: state?.meta?.lastUpdatedAt ?? '1970-01-01T00:00:00.000Z',
      stale: false,
    });
  }

  return entries.slice(-SESSION_MEMORY_LIMITS.maxConfirmedEmotions);
}

function collectConfirmedNeeds(
  memory: SessionMemory,
  state: MediationState
): SessionMemory['confirmedNeeds'] {
  const entries = [...memory.confirmedNeeds];
  const participants = [
    { role: 'host' as const, participant: state?.participants?.host },
    { role: 'partner' as const, participant: state?.participants?.partner },
  ];

  for (const { role, participant } of participants) {
    if (!participant?.needValidated || !participant.namedNeed) continue;
    const exists = entries.some(
      (entry) => entry.participant === role && entry.value === participant.namedNeed
    );
    if (exists) continue;
    entries.push({
      participant: role,
      value: participant.namedNeed,
      confidence: 0,
      source: 'user_signal',
      evidence: [],
      assessedAt: state?.meta?.lastUpdatedAt ?? '1970-01-01T00:00:00.000Z',
      stale: false,
    });
  }

  return entries.slice(-SESSION_MEMORY_LIMITS.maxConfirmedNeeds);
}

function deriveRecurringNeeds(confirmedNeeds: SessionMemory['confirmedNeeds']): NeedLabel[] {
  const counts = new Map<NeedLabel, number>();
  for (const entry of confirmedNeeds) {
    if (!entry?.value) continue;
    counts.set(entry.value, (counts.get(entry.value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([need]) => need)
    .slice(-SESSION_MEMORY_LIMITS.maxRecurringNeeds);
}

function mergeRegressHistory(memory: SessionMemory, state: MediationState): SessionMemory['regressHistory'] {
  const incoming = Array.isArray(state?.memory?.regressHistory) ? state.memory.regressHistory : [];
  let merged = [...memory.regressHistory];
  for (const transition of incoming) {
    if (!transition || typeof transition.turnNumber !== 'number') continue;
    const duplicate = merged.some(
      (existing) =>
        existing.turnNumber === transition.turnNumber &&
        existing.fromGoal === transition.fromGoal &&
        existing.toGoal === transition.toGoal
    );
    if (duplicate) continue;
    merged = appendLimited(merged, transition, SESSION_MEMORY_LIMITS.maxRegressHistory);
  }
  return merged;
}

/** Syncs goals, topics, regress history, and confirmed emotions/needs from state. */
export function collectGoalMemory(
  memory: SessionMemory,
  input: SessionMemoryUpdateInput
): SessionMemory {
  const { state } = input;
  const confirmedEmotions = collectConfirmedEmotions(memory, state);
  const confirmedNeeds = collectConfirmedNeeds(memory, state);

  return {
    ...memory,
    completedGoals: completedGoalsFromState(state),
    closedTopics: mergeLimitedTopics(
      memory.closedTopics,
      closedTopicsFromState(state),
      SESSION_MEMORY_LIMITS.maxClosedTopics
    ),
    openTopics: mergeLimitedTopics(
      memory.openTopics,
      openTopicsFromState(state),
      SESSION_MEMORY_LIMITS.maxOpenTopics
    ),
    regressHistory: mergeRegressHistory(memory, state),
    confirmedEmotions,
    confirmedNeeds,
    recurringNeeds: deriveRecurringNeeds(confirmedNeeds),
  };
}
