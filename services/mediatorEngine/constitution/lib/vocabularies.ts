import type { TherapeuticGoal, TherapeuticIntent } from '@/types/mediator';

export const VALID_THERAPEUTIC_GOALS: readonly TherapeuticGoal[] = [
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

export const VALID_THERAPEUTIC_INTENTS: readonly TherapeuticIntent[] = [
  'increase_emotional_safety',
  'reduce_defensiveness',
  'help_name_emotion',
  'help_explain_emotion',
  'help_partner_feel_heard',
  'help_see_other_perspective',
  'help_name_need',
  'reduce_blame_cycle',
  'restore_trust_in_process',
  'consolidate_breakthrough',
  'prepare_shared_agreement',
  'define_future_coping_plan',
  'close_with_dignity',
  'correct_misunderstanding',
  'invite_pause_and_breathe',
  'acknowledge_exhaustion',
];
