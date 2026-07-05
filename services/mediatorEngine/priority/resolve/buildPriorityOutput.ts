import type {
  ConversationMode,
  InterventionType,
  PriorityInput,
  PriorityOutput,
  PrioritySignal,
} from '@/types/mediator';
import {
  ALL_INTERVENTION_TYPES,
  allowedInterventionsForStrategy,
  BLAME_LOOP_INTERVENTIONS,
  BREAKTHROUGH_INTERVENTIONS,
  ESCALATION_FORBIDDEN,
  ESCALATION_INTERVENTIONS,
  EXHAUSTION_INTERVENTIONS,
  SAFETY_INTERVENTIONS,
} from '@/services/mediatorEngine/priority/config/strategyInterventions';
import type { PrioritySignalDraft } from '@/services/mediatorEngine/priority/signals/types';
import { collectDefaultStrategySignal } from '@/services/mediatorEngine/priority/signals/collectDefaultStrategySignal';
import { activeSignalConfidence } from '@/services/mediatorEngine/priority/lib/confidence';

function intersectAllowed(base: InterventionType[], allowed: readonly InterventionType[]): InterventionType[] {
  const allowedSet = new Set(allowed);
  const intersection = base.filter((type) => allowedSet.has(type));
  return intersection.length > 0 ? intersection : [...allowed];
}

/** Removes overlap — forbidden wins when a type appears in both lists. */
function ensureDisjointConstraints(
  allowed: InterventionType[],
  forbidden: InterventionType[]
): { allowedInterventionTypes: InterventionType[]; forbiddenInterventionTypes: InterventionType[] } {
  const forbiddenSet = new Set(forbidden);
  return {
    allowedInterventionTypes: allowed.filter((type) => !forbiddenSet.has(type)),
    forbiddenInterventionTypes: forbidden,
  };
}

function computeForbidden(allowed: InterventionType[]): InterventionType[] {
  const allowedSet = new Set(allowed);
  return ALL_INTERVENTION_TYPES.filter((type) => !allowedSet.has(type));
}

function conversationModeForSignal(type: PrioritySignal['type']): ConversationMode {
  switch (type) {
    case 'safety':
      return 'SAFETY';
    case 'escalation':
      return 'DE_ESCALATING';
    case 'blame_loop':
      return 'REDIRECTING';
    case 'breakthrough':
      return 'BREAKTHROUGH';
    default:
      return 'NORMAL';
  }
}

function blocksGoalTransition(
  top: PrioritySignalDraft,
  input: PriorityInput
): boolean {
  if (input.safety?.blockGoalTransitions) return true;
  switch (top.type) {
    case 'safety':
    case 'escalation':
    case 'recovery':
    case 'blame_loop':
    case 'exhaustion':
      return true;
    case 'breakthrough':
    case 'readiness':
    case 'default_strategy':
      return false;
    default:
      return false;
  }
}

function resolveAllowedInterventions(
  top: PrioritySignalDraft,
  input: PriorityInput
): InterventionType[] {
  const strategyAllowed = allowedInterventionsForStrategy(
    input.strategy?.primaryStrategy ?? 'build_safety'
  );

  switch (top.type) {
    case 'safety': {
      const safetyAllowed = input.safety?.allowedInterventionTypes ?? [];
      if (safetyAllowed.length > 0) {
        return intersectAllowed(strategyAllowed, safetyAllowed);
      }
      return intersectAllowed(strategyAllowed, SAFETY_INTERVENTIONS);
    }
    case 'escalation': {
      const escalationForbidden = new Set(ESCALATION_FORBIDDEN);
      return [...new Set([...ESCALATION_INTERVENTIONS, ...strategyAllowed])].filter(
        (type) => !escalationForbidden.has(type)
      );
    }
    case 'recovery':
      return [...new Set(['recover_acknowledge', 'reflect', 'validate', 'reframe', ...strategyAllowed])];
    case 'blame_loop':
      return [...new Set([...BLAME_LOOP_INTERVENTIONS, ...strategyAllowed])];
    case 'breakthrough':
      return intersectAllowed(strategyAllowed, BREAKTHROUGH_INTERVENTIONS);
    case 'exhaustion':
      return intersectAllowed(strategyAllowed, EXHAUSTION_INTERVENTIONS);
    default:
      return strategyAllowed;
  }
}

function resolveForbiddenInterventions(
  top: PrioritySignalDraft,
  allowed: InterventionType[],
  input: PriorityInput
): InterventionType[] {
  const forbidden = computeForbidden(allowed);
  if (top.type === 'escalation') {
    return [...new Set([...forbidden, ...ESCALATION_FORBIDDEN])];
  }
  if (top.type === 'safety' && input.safety?.blockStandardInterventions) {
    return ALL_INTERVENTION_TYPES.filter(
      (type) => !SAFETY_INTERVENTIONS.includes(type) && !allowed.includes(type)
    );
  }
  return forbidden;
}

/** Builds final Priority Engine output from collected signals. */
export function buildPriorityOutput(
  signals: PrioritySignalDraft[],
  input: PriorityInput
): PriorityOutput {
  const resolvedSignals =
    signals.length > 0
      ? signals
      : (() => {
          const fallback = collectDefaultStrategySignal.collect({ input });
          return fallback ? [fallback] : [];
        })();

  const activeSignals: PrioritySignal[] = resolvedSignals.map((signal) => ({
    type: signal.type,
    priority: signal.priority,
    confidence: signal.confidence,
    reason: signal.reason,
    recommendedInterventionType: signal.recommendedInterventionType,
  }));

  const top = resolvedSignals[0] ?? {
    type: 'default_strategy' as const,
    priority: 7,
    confidence: activeSignalConfidence(50),
    reason: 'Empty fallback',
    recommendedInterventionType: 'reflect' as InterventionType,
  };

  const rawAllowed = resolveAllowedInterventions(top, input);
  const rawForbidden = resolveForbiddenInterventions(top, rawAllowed, input);
  const { allowedInterventionTypes, forbiddenInterventionTypes } = ensureDisjointConstraints(
    rawAllowed,
    rawForbidden
  );

  return {
    activeSignals,
    conversationMode: conversationModeForSignal(top.type),
    allowedInterventionTypes,
    forbiddenInterventionTypes,
    preemptsGoalTransition: blocksGoalTransition(top, input),
    recommendedInterventionType: top.recommendedInterventionType,
  };
}

const MINIMAL_SAFE_ALLOWED: readonly InterventionType[] = ['reflect', 'validate', 'deescalate'];

/** Last-resort output when signal collection and fallback both fail. */
export function createMinimalSafePriorityOutput(input: PriorityInput): PriorityOutput {
  const recommended =
    input.strategy?.primaryStrategy === 'build_safety' ? 'welcome_open' : ('reflect' as InterventionType);
  const allowedInterventionTypes = [...MINIMAL_SAFE_ALLOWED];
  const allowedSet = new Set(allowedInterventionTypes);

  return {
    activeSignals: [
      {
        type: 'default_strategy',
        priority: 7,
        confidence: activeSignalConfidence(50),
        reason: 'Minimal safe fallback',
        recommendedInterventionType: recommended,
      },
    ],
    conversationMode: 'NORMAL',
    allowedInterventionTypes,
    forbiddenInterventionTypes: ALL_INTERVENTION_TYPES.filter((type) => !allowedSet.has(type)),
    preemptsGoalTransition: false,
    recommendedInterventionType: recommended,
  };
}
