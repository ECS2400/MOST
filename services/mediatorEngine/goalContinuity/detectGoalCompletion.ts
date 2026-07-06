import type { MediationState, ReflectionOutput, SafetyOutput, SessionMemory, TherapeuticGoal } from '@/types/mediator';
import {
  AGREEMENT_LEVEL_COMPLETE_THRESHOLD,
  MUTUAL_UNDERSTANDING_COMPLETE_THRESHOLD,
} from '@/services/mediatorEngine/goalContinuity/config/goalFlow';

export interface GoalCompletionDetection {
  completionDetected: boolean;
  completionReason: string | null;
  completedGoals: TherapeuticGoal[];
}

function isSafetyActive(safety: SafetyOutput | null | undefined): boolean {
  if (!safety) return false;
  if (safety.preempted === true) return true;
  const level = safety.level;
  return level === 'L1_gentle' || level === 'L2_pause' || level === 'L3_stop';
}

function movedForward(reflection: ReflectionOutput | null | undefined): boolean {
  const moved = reflection?.conversationMovedForward;
  return moved?.value === true;
}

function effectAchieved(reflection: ReflectionOutput | null | undefined): boolean {
  const evaluation = reflection?.expectedEffectEvaluation;
  return evaluation?.achieved === true;
}

function isSafeOpeningComplete(
  turnNumber: number,
  safety: SafetyOutput | null | undefined,
  lastComplianceCompliant: boolean | null | undefined,
  reflection: ReflectionOutput | null | undefined
): boolean {
  if (turnNumber < 2) return false;
  if (isSafetyActive(safety)) return false;
  if (lastComplianceCompliant === false) return false;
  return movedForward(reflection) || effectAchieved(reflection) || lastComplianceCompliant === true;
}

function isAgreementComplete(state: MediationState): boolean {
  return state.agreements?.acceptedByBoth === true;
}

function isPerspectiveSharingComplete(state: MediationState): boolean {
  const score = state.dynamics?.mutualUnderstandingScore;
  const agreementLevel = state.dynamics?.agreementLevel;
  return (
    (typeof score === 'number' && score >= MUTUAL_UNDERSTANDING_COMPLETE_THRESHOLD) ||
    (typeof agreementLevel === 'number' && agreementLevel >= AGREEMENT_LEVEL_COMPLETE_THRESHOLD)
  );
}

function isClosureComplete(state: MediationState): boolean {
  if (state.agreements?.acceptedByBoth === true) return true;
  return state.sessionOutcome === 'completed' || state.sessionOutcome === 'agreement_reached';
}

function isGoalCompleteForCurrent(
  goal: TherapeuticGoal,
  state: MediationState,
  turnNumber: number,
  safety: SafetyOutput | null | undefined,
  lastComplianceCompliant: boolean | null | undefined,
  reflection: ReflectionOutput | null | undefined
): { complete: boolean; reason: string | null } {
  switch (goal) {
    case 'SAFE_OPENING':
      if (isSafeOpeningComplete(turnNumber, safety, lastComplianceCompliant, reflection)) {
        return { complete: true, reason: 'Opening phase complete with safety clear and forward movement' };
      }
      return { complete: false, reason: null };
    case 'AGREEMENT':
    case 'FUTURE_PLAN':
      if (isAgreementComplete(state)) {
        return { complete: true, reason: 'Agreement accepted by both participants' };
      }
      return { complete: false, reason: null };
    case 'PERSPECTIVE_SHARING':
      if (isPerspectiveSharingComplete(state)) {
        return { complete: true, reason: 'Mutual understanding threshold reached' };
      }
      return { complete: false, reason: null };
    case 'CLOSURE':
      if (isClosureComplete(state)) {
        return { complete: true, reason: 'Session outcome supports closure' };
      }
      return { complete: false, reason: null };
    case 'EMOTION_NAMING':
    case 'EMOTION_UNDERSTANDING':
    case 'EMOTION_ACKNOWLEDGMENT':
    case 'NEED_NAMING':
    case 'REFRAME':
      if (movedForward(reflection) && effectAchieved(reflection)) {
        return { complete: true, reason: `${goal} effect achieved with forward movement` };
      }
      return { complete: false, reason: null };
    default:
      return { complete: false, reason: null };
  }
}

/** Detects completed goals from structural signals only. */
export function detectGoalCompletion(
  state: MediationState,
  sessionMemory: SessionMemory,
  reflection: ReflectionOutput | null | undefined,
  safety: SafetyOutput | null | undefined,
  turnNumber: number,
  lastComplianceCompliant: boolean | null | undefined
): GoalCompletionDetection {
  const memoryCompleted = Array.isArray(sessionMemory.completedGoals)
    ? sessionMemory.completedGoals.filter((g): g is TherapeuticGoal => typeof g === 'string')
    : [];

  const current = state.currentGoal;
  const currentCheck = isGoalCompleteForCurrent(
    current,
    state,
    turnNumber,
    safety,
    lastComplianceCompliant,
    reflection
  );

  const completedGoals = [...memoryCompleted];
  if (currentCheck.complete && !completedGoals.includes(current)) {
    completedGoals.push(current);
  }

  return {
    completionDetected: currentCheck.complete,
    completionReason: currentCheck.reason,
    completedGoals,
  };
}
