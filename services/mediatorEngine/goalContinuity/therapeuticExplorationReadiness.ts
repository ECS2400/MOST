import type { MediationState, SessionMemory, TherapeuticGoal } from '@/types/mediator';

const EARLY_EXPLORATION_GOALS: ReadonlySet<TherapeuticGoal> = new Set([
  'SAFE_OPENING',
  'EMOTION_NAMING',
  'PERSPECTIVE_SHARING',
  'EMOTION_UNDERSTANDING',
  'NEED_NAMING',
  'EMOTION_ACKNOWLEDGMENT',
]);

const SOLUTION_PLANNING_GOALS: ReadonlySet<TherapeuticGoal> = new Set([
  'AGREEMENT',
  'FUTURE_PLAN',
]);

export function isEarlyExplorationGoal(goal: TherapeuticGoal | string | null | undefined): boolean {
  return typeof goal === 'string' && EARLY_EXPLORATION_GOALS.has(goal as TherapeuticGoal);
}

export function isSolutionPlanningGoal(goal: TherapeuticGoal | string | null | undefined): boolean {
  return typeof goal === 'string' && SOLUTION_PLANNING_GOALS.has(goal as TherapeuticGoal);
}

function hasParticipantPerspective(
  state: MediationState,
  role: 'host' | 'partner'
): boolean {
  const summary = state.participants?.[role]?.lastStatementSummary?.trim();
  if (summary) return true;

  const pre = state.conflict?.preAnalysisContext;
  if (role === 'host') {
    return Boolean(state.conflict?.conflictSummary?.trim() || pre?.keyTrigger?.trim());
  }
  return Boolean(pre?.partnerEmotions?.length || pre?.partnerNeeds?.length);
}

function hasParticipantEmotions(
  state: MediationState,
  sessionMemory: SessionMemory,
  role: 'host' | 'partner'
): boolean {
  if (sessionMemory.confirmedEmotions.some((entry) => entry.participant === role)) {
    return true;
  }
  const pre = state.conflict?.preAnalysisContext;
  const emotions = role === 'host' ? pre?.hostEmotions : pre?.partnerEmotions;
  return Array.isArray(emotions) && emotions.length > 0;
}

function hasParticipantNeeds(
  state: MediationState,
  sessionMemory: SessionMemory,
  role: 'host' | 'partner'
): boolean {
  if (sessionMemory.confirmedNeeds.some((entry) => entry.participant === role)) {
    return true;
  }
  const pre = state.conflict?.preAnalysisContext;
  const needs = role === 'host' ? pre?.hostNeeds : pre?.partnerNeeds;
  return Array.isArray(needs) && needs.length > 0;
}

function hasSharedConflictCycle(state: MediationState, sessionMemory: SessionMemory): boolean {
  if (state.dynamics?.blameLoopDetected) return true;
  if (sessionMemory.recurringNeeds.length > 0) return true;
  if ((state.dynamics?.mutualUnderstandingScore ?? 0) >= 25) return true;
  return sessionMemory.interventionHistory.length >= 2;
}

/** True when host/partner perspectives, emotions, needs, and a shared cycle signal exist. */
export function isTherapeuticExplorationComplete(
  state: MediationState,
  sessionMemory: SessionMemory
): boolean {
  return (
    hasParticipantPerspective(state, 'host') &&
    hasParticipantPerspective(state, 'partner') &&
    hasParticipantEmotions(state, sessionMemory, 'host') &&
    hasParticipantEmotions(state, sessionMemory, 'partner') &&
    hasParticipantNeeds(state, sessionMemory, 'host') &&
    hasParticipantNeeds(state, sessionMemory, 'partner') &&
    hasSharedConflictCycle(state, sessionMemory)
  );
}

export function shouldBlockSolutionGoalAdvance(
  nextGoal: TherapeuticGoal | null | undefined,
  state: MediationState,
  sessionMemory: SessionMemory
): boolean {
  if (!nextGoal || !isSolutionPlanningGoal(nextGoal)) {
    return false;
  }
  return !isTherapeuticExplorationComplete(state, sessionMemory);
}
