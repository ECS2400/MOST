import type {
  InterventionType,
  TherapeuticGoal,
  TherapeuticIntent,
  TherapeuticStrategy,
} from '@/types/mediator';
import { INTERVENTION_DEFAULT_INTENT } from '@/services/mediatorEngine/decision/config/interventionIntents';
import { STRATEGY_DEFAULT_INTENT } from '@/services/mediatorEngine/decision/config/strategyIntents';

const GOAL_DEFAULT_INTENT: Partial<Record<TherapeuticGoal, TherapeuticIntent>> = {
  SAFE_OPENING: 'increase_emotional_safety',
  EMOTION_NAMING: 'help_name_emotion',
  EMOTION_UNDERSTANDING: 'help_explain_emotion',
  EMOTION_ACKNOWLEDGMENT: 'help_partner_feel_heard',
  NEED_NAMING: 'help_name_need',
  PERSPECTIVE_SHARING: 'help_see_other_perspective',
  REFRAME: 'help_see_other_perspective',
  AGREEMENT: 'prepare_shared_agreement',
  FUTURE_PLAN: 'define_future_coping_plan',
  CLOSURE: 'close_with_dignity',
};

/** Maps strategy, intervention type, and goal to a deterministic therapeutic intent. */
export function chooseIntent(input: {
  selectedInterventionType: InterventionType;
  primaryStrategy: TherapeuticStrategy;
  currentGoal: TherapeuticGoal;
  safetyActive: boolean;
}): TherapeuticIntent {
  if (input.safetyActive) {
    if (input.selectedInterventionType === 'pause_session') {
      return 'invite_pause_and_breathe';
    }
    return 'increase_emotional_safety';
  }

  const fromIntervention = INTERVENTION_DEFAULT_INTENT[input.selectedInterventionType];
  if (fromIntervention) return fromIntervention;

  const fromStrategy = STRATEGY_DEFAULT_INTENT[input.primaryStrategy];
  if (fromStrategy) return fromStrategy;

  const fromGoal = GOAL_DEFAULT_INTENT[input.currentGoal];
  if (fromGoal) return fromGoal;

  return 'increase_emotional_safety';
}
