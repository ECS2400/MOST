import type {
  DecisionEngineInput,
  DecisionEngineOutput,
  InterventionType,
  TherapeuticStrategy,
} from '@/types/mediator';
import { buildDecisionRationale } from '@/services/mediatorEngine/decision/lib/buildDecisionRationale';
import { chooseInterventionType } from '@/services/mediatorEngine/decision/lib/chooseInterventionType';
import { chooseIntent } from '@/services/mediatorEngine/decision/lib/chooseIntent';
import {
  chooseGoalTransition,
  isSafetyDecisionMode,
} from '@/services/mediatorEngine/decision/lib/chooseGoalTransition';
import { isGoalTransitionBlocked } from '@/services/mediatorEngine/decision/config/goalTransitionRules';

function resolvePrimaryStrategy(input: DecisionEngineInput): TherapeuticStrategy {
  const strategy = input.strategy?.primaryStrategy;
  if (typeof strategy === 'string') return strategy;
  return 'build_safety';
}

function resolveCurrentGoal(input: DecisionEngineInput) {
  return input.state?.currentGoal ?? 'SAFE_OPENING';
}

function resolveSafetyRecommendedType(input: DecisionEngineInput): InterventionType | undefined {
  const fromPriority =
    typeof input.priority?.recommendedInterventionType === 'string'
      ? input.priority.recommendedInterventionType
      : undefined;
  const fromSafety =
    typeof input.safety?.recommendedInterventionType === 'string'
      ? input.safety.recommendedInterventionType
      : undefined;
  return fromPriority ?? fromSafety ?? 'safety_response';
}

/** Builds deterministic Decision Engine output from upstream module results. */
export function buildDecisionOutput(input: DecisionEngineInput): DecisionEngineOutput {
  const safetyActive = isSafetyDecisionMode(input);
  const primaryStrategy = safetyActive ? 'build_safety' : resolvePrimaryStrategy(input);
  const currentGoal = resolveCurrentGoal(input);

  const interventionChoice = chooseInterventionType(
    input.priority,
    safetyActive ? resolveSafetyRecommendedType(input) : undefined,
    safetyActive,
    primaryStrategy
  );

  const goalTransition = chooseGoalTransition(input);
  const goalTransitionBlocked = isGoalTransitionBlocked({
    safetyPreempted: input.safety?.preempted === true,
    safetyBlockGoalTransitions: input.safety?.blockGoalTransitions === true,
    priorityPreemptsGoalTransition: input.priority?.preemptsGoalTransition === true,
    conversationModeSafety: input.priority?.conversationMode === 'SAFETY',
  });

  const intent = chooseIntent({
    selectedInterventionType: interventionChoice.selectedInterventionType,
    primaryStrategy,
    currentGoal,
    safetyActive,
  });

  const rationale = buildDecisionRationale({
    safetyActive,
    usedRecommended: interventionChoice.usedRecommended,
    recommended: input.priority?.recommendedInterventionType,
    selectedInterventionType: interventionChoice.selectedInterventionType,
    goalTransition,
    goalTransitionBlocked,
    fallbackUsed: interventionChoice.fallbackUsed,
    intent,
    strategy: primaryStrategy,
  });

  return {
    selectedInterventionType: interventionChoice.selectedInterventionType,
    goalTransition,
    intent,
    strategy: primaryStrategy,
    rationale,
  };
}

/** Last-resort decision when input normalization fails. */
export function createMinimalSafeDecisionOutput(): DecisionEngineOutput {
  return {
    selectedInterventionType: 'deescalate',
    goalTransition: 'stay',
    intent: 'increase_emotional_safety',
    strategy: 'build_safety',
    rationale:
      'mode=fallback; goal_transition=stay; intervention=deescalate; intent=increase_emotional_safety; strategy=build_safety',
  };
}
