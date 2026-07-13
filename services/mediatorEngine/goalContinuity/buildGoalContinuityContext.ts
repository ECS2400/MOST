import type { GoalContinuityContext } from '@/types/mediator/goalContinuity';
import type {
  MediationState,
  OrchestrateTurnRequest,
  ReflectionOutput,
  SafetyOutput,
  SessionMemory,
  TherapeuticGoal,
  TurnNumber,
} from '@/types/mediator';
import { createEmptyMediationState, createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import type { AdaptiveGoalSelectionInput } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/types';
import { buildGoalContinuityHint } from '@/services/mediatorEngine/goalContinuity/buildGoalContinuityHint';
import { chooseGoalContinuityRecommendation } from '@/services/mediatorEngine/goalContinuity/chooseGoalContinuityRecommendation';
import { shouldBlockSolutionGoalAdvance } from '@/services/mediatorEngine/goalContinuity/therapeuticExplorationReadiness';
import { dedupeGoals } from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import { detectGoalCompletion } from '@/services/mediatorEngine/goalContinuity/detectGoalCompletion';
import { detectGoalStagnation } from '@/services/mediatorEngine/goalContinuity/detectGoalStagnation';
import type { BuildGoalContinuityContextInput } from '@/services/mediatorEngine/goalContinuity/types';
import type { GoalCompletionDetection } from '@/services/mediatorEngine/goalContinuity/detectGoalCompletion';
import type { GoalStagnationDetection } from '@/services/mediatorEngine/goalContinuity/detectGoalStagnation';

const EMPTY_STATE_REQUEST: OrchestrateTurnRequest = {
  mediationId: 'goal-continuity',
  sessionId: 'goal-continuity',
  trigger: 'session_start',
  turnNumber: 1,
  mediationState: null,
  transcriptDelta: [],
  engineVersion: 'v2.3',
};

const RECENT_COMPLETED_LIMIT = 5;

function normalizeGoal(value: unknown): TherapeuticGoal {
  const goals: TherapeuticGoal[] = [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'EMOTION_ACKNOWLEDGMENT',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
    'REFRAME',
    'AGREEMENT',
    'FUTURE_PLAN',
    'CLOSURE',
  ];
  if (typeof value === 'string' && goals.includes(value as TherapeuticGoal)) {
    return value as TherapeuticGoal;
  }
  return 'SAFE_OPENING';
}

function lastComplianceFromMemory(
  input: BuildGoalContinuityContextInput
): boolean | null {
  if (typeof input.lastComplianceCompliant === 'boolean') {
    return input.lastComplianceCompliant;
  }
  const history = input.sessionMemory?.interventionHistory ?? [];
  const last = history.at(-1);
  if (last?.compliance && typeof last.compliance.compliant === 'boolean') {
    return last.compliance.compliant;
  }
  return null;
}

function computeConfidence(
  completion: ReturnType<typeof detectGoalCompletion>,
  stagnation: ReturnType<typeof detectGoalStagnation>
): number {
  let score = 0;
  if (completion.completionDetected) score += 45;
  if (stagnation.goalStagnationDetected) score += 30;
  if (stagnation.repeatedGoalDetected) score += 15;
  if (completion.completedGoals.length > 0) score += 10;
  return Math.min(100, score);
}

function resolveState(input: BuildGoalContinuityContextInput): MediationState {
  if (input.state && typeof input.state === 'object' && input.state.currentGoal) {
    return input.state;
  }
  return createEmptyMediationState(EMPTY_STATE_REQUEST);
}

function buildAdaptiveGoalSelectionInput(
  state: MediationState,
  sessionMemory: SessionMemory,
  reflection: ReflectionOutput | null | undefined,
  safety: SafetyOutput | null | undefined,
  currentGoal: TherapeuticGoal,
  completion: GoalCompletionDetection,
  stagnation: GoalStagnationDetection,
  mutualUnderstandingScore: number,
  turnNumber: TurnNumber
): AdaptiveGoalSelectionInput {
  const hostReady = reflection?.partnerReadiness?.host?.readyToAdvance?.value === true;
  const partnerReady = reflection?.partnerReadiness?.partner?.readyToAdvance?.value === true;

  return {
    currentGoal,
    completedGoals: completion.completedGoals,
    mutualUnderstandingScore,
    completionDetected: completion.completionDetected,
    goalStagnationDetected: stagnation.goalStagnationDetected,
    safety,
    bothReady: hostReady && partnerReady,
    acceptedByBoth: state.agreements?.acceptedByBoth === true,
    goalTransitionHistory: Array.isArray(sessionMemory.goalTransitionHistory)
      ? sessionMemory.goalTransitionHistory
      : [],
    turnNumber,
  };
}

/** Builds a privacy-safe goal continuity context from structural session signals. */
export function buildGoalContinuityContext(
  input: BuildGoalContinuityContextInput | null | undefined
): GoalContinuityContext {
  const normalized = input ?? {};
  const state = resolveState(normalized);
  const sessionMemory = normalized.sessionMemory ?? createEmptySessionMemory();
  const turnNumber =
    typeof normalized.turnNumber === 'number' && normalized.turnNumber > 0
      ? normalized.turnNumber
      : 1;
  const currentGoal = normalizeGoal(state.currentGoal);
  const lastCompliance = lastComplianceFromMemory(normalized);

  const completion = detectGoalCompletion(
    { ...state, currentGoal },
    sessionMemory,
    normalized.reflection,
    normalized.safety,
    turnNumber,
    lastCompliance
  );

  const completedGoals = dedupeGoals(completion.completedGoals);
  const recentlyCompletedGoals = completedGoals.slice(-RECENT_COMPLETED_LIMIT);

  const stagnation = detectGoalStagnation(
    currentGoal,
    sessionMemory,
    normalized.reflection,
    turnNumber,
    completedGoals
  );

  const mutualUnderstandingScore =
    typeof state.dynamics?.mutualUnderstandingScore === 'number'
      ? state.dynamics.mutualUnderstandingScore
      : 0;

  const recommendation = chooseGoalContinuityRecommendation(
    currentGoal,
    { ...completion, completedGoals },
    stagnation,
    normalized.safety,
    mutualUnderstandingScore,
    buildAdaptiveGoalSelectionInput(
      state,
      sessionMemory,
      normalized.reflection,
      normalized.safety,
      currentGoal,
      { ...completion, completedGoals },
      stagnation,
      mutualUnderstandingScore,
      turnNumber
    )
  );

  const blockedSolutionAdvance =
    recommendation.recommendedGoalTransition === 'advance' &&
    shouldBlockSolutionGoalAdvance(recommendation.recommendedNextGoal, state, sessionMemory);

  const resolvedRecommendation = blockedSolutionAdvance
    ? {
        recommendedGoalTransition: 'stay' as const,
        recommendedNextGoal: null,
        suggestedStayReason:
          'both perspectives, the real trigger, and the repeating argument pattern must be clear before proposing any deal',
        suggestedAdvanceReason: null,
      }
    : recommendation;

  const partial = {
    recommendedGoalTransition: resolvedRecommendation.recommendedGoalTransition,
    recommendedNextGoal: resolvedRecommendation.recommendedNextGoal,
    currentGoal,
    completionDetected: completion.completionDetected,
    goalStagnationDetected: stagnation.goalStagnationDetected,
    suggestedStayReason: resolvedRecommendation.suggestedStayReason,
    suggestedAdvanceReason: resolvedRecommendation.suggestedAdvanceReason,
  };

  return {
    currentGoal,
    completedGoals,
    recentlyCompletedGoals,
    activeGoalTurnCount: stagnation.activeGoalTurnCount,
    repeatedGoalDetected: stagnation.repeatedGoalDetected,
    repeatedGoalReason: stagnation.repeatedGoalReason,
    goalStagnationDetected: stagnation.goalStagnationDetected,
    goalStagnationReason: stagnation.goalStagnationReason,
    completionDetected: completion.completionDetected,
    completionReason: completion.completionReason,
    recommendedGoalTransition: resolvedRecommendation.recommendedGoalTransition,
    recommendedNextGoal: resolvedRecommendation.recommendedNextGoal,
    suggestedStayReason: resolvedRecommendation.suggestedStayReason,
    suggestedAdvanceReason: resolvedRecommendation.suggestedAdvanceReason,
    goalContinuityHint: buildGoalContinuityHint(partial),
    confidence: computeConfidence({ ...completion, completedGoals }, stagnation),
  };
}
