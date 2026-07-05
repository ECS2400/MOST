import type {
  ExplainabilityGoalTransition,
  InterventionType,
  TherapeuticIntent,
  TherapeuticStrategy,
} from '@/types/mediator';

export interface DecisionRationaleContext {
  safetyActive: boolean;
  usedRecommended: boolean;
  recommended?: InterventionType;
  selectedInterventionType: InterventionType;
  goalTransition: ExplainabilityGoalTransition;
  goalTransitionBlocked: boolean;
  fallbackUsed: boolean;
  intent: TherapeuticIntent;
  strategy: TherapeuticStrategy;
}

/** Builds a short technical rationale for logs and explainability. */
export function buildDecisionRationale(context: DecisionRationaleContext): string {
  const parts: string[] = [];

  if (context.safetyActive) {
    parts.push('mode=safety');
  }

  if (context.goalTransitionBlocked) {
    parts.push('goal_transition=blocked');
  } else {
    parts.push(`goal_transition=${context.goalTransition ?? 'stay'}`);
  }

  if (context.usedRecommended && context.recommended) {
    parts.push(`intervention=recommended:${context.recommended}`);
  } else if (context.fallbackUsed) {
    parts.push(`intervention=fallback:${context.selectedInterventionType}`);
  } else {
    parts.push(`intervention=${context.selectedInterventionType}`);
  }

  parts.push(`intent=${context.intent}`);
  parts.push(`strategy=${context.strategy}`);

  return parts.join('; ');
}
