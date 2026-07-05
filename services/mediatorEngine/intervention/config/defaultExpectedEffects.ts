import type {
  ExpectedEffect,
  InterventionTarget,
  InterventionType,
} from '@/types/mediator';

type ExpectedEffectTemplate = Omit<ExpectedEffect, 'id'>;

const DEFAULT_TEMPLATE: ExpectedEffectTemplate = {
  description: 'Participant responds constructively to the mediator move.',
  observableSignals: ['participant_response', 'tone_shift'],
  targetParticipant: 'both',
  verificationMethod: 'next_message',
  successCriteria: { type: 'check_confirmed', threshold: 0, confidenceRequired: 60 },
  timeHorizon: 1,
};

const EXPECTED_EFFECT_TEMPLATES: Partial<Record<InterventionType, Partial<ExpectedEffectTemplate>>> = {
  welcome_open: {
    description: 'Both participants engage with the opening frame.',
    observableSignals: ['engagement', 'calm_tone'],
  },
  choice_emotion: {
    description: 'Participant selects or names an emotion.',
    observableSignals: ['emotion_named'],
    verificationMethod: 'checklist_delta',
  },
  choice_need: {
    description: 'Participant selects or names a need.',
    observableSignals: ['need_named'],
    verificationMethod: 'checklist_delta',
  },
  open_deepen: {
    description: 'Participant shares deeper emotional content.',
    observableSignals: ['deeper_share'],
    timeHorizon: 2,
  },
  validate: {
    description: 'Participant feels acknowledged after validation.',
    observableSignals: ['acknowledgment', 'calmer_tone'],
  },
  reflect: {
    description: 'Participant confirms the reflection is accurate.',
    observableSignals: ['confirmation'],
  },
  mirror: {
    description: 'Participant recognizes their perspective mirrored back.',
    observableSignals: ['recognition'],
  },
  reframe: {
    description: 'Participant considers an alternative framing.',
    observableSignals: ['perspective_shift'],
    timeHorizon: 2,
  },
  propose_rule: {
    description: 'Participants accept or discuss a shared rule.',
    observableSignals: ['rule_discussion'],
  },
  propose_future_plan: {
    description: 'Participants engage with a future coping plan.',
    observableSignals: ['plan_discussion'],
    timeHorizon: 2,
  },
  celebrate_breakthrough: {
    description: 'Breakthrough moment is acknowledged by both partners.',
    observableSignals: ['mutual_acknowledgment'],
  },
  deescalate: {
    description: 'Emotional intensity decreases after de-escalation.',
    observableSignals: ['lower_intensity', 'calmer_tone'],
  },
  redirect_blame: {
    description: 'Blame cycle softens after redirect.',
    observableSignals: ['less_blame', 'self_focus'],
  },
  gentle_redirect_evasion: {
    description: 'Participant returns to the therapeutic thread.',
    observableSignals: ['return_to_topic'],
  },
  pause_session: {
    description: 'Participants accept or benefit from a pause.',
    observableSignals: ['pause_acceptance'],
  },
  remind_goal: {
    description: 'Participants re-orient to the current therapeutic goal.',
    observableSignals: ['goal_reference'],
  },
  invite_reflection: {
    description: 'Participant reflects on their experience.',
    observableSignals: ['reflective_response'],
    timeHorizon: 2,
  },
  summarize_close: {
    description: 'Participants accept the session summary.',
    observableSignals: ['summary_acceptance'],
  },
  confirm_agreement: {
    description: 'Both participants confirm the agreement.',
    observableSignals: ['agreement_confirmed'],
  },
  safety_response: {
    description: 'Immediate safety concern is stabilized.',
    observableSignals: ['distress_reduced', 'engagement_restored'],
    targetParticipant: 'both',
    successCriteria: { type: 'tone_shift', threshold: 1, confidenceRequired: 70 },
  },
  recover_acknowledge: {
    description: 'Misinterpretation is acknowledged and trust restored.',
    observableSignals: ['correction_accepted'],
  },
};

function mergeTemplate(
  type: InterventionType,
  targetParticipant: InterventionTarget
): ExpectedEffectTemplate {
  const overrides = EXPECTED_EFFECT_TEMPLATES[type] ?? {};
  return {
    ...DEFAULT_TEMPLATE,
    ...overrides,
    targetParticipant: overrides.targetParticipant ?? targetParticipant,
    successCriteria: overrides.successCriteria ?? DEFAULT_TEMPLATE.successCriteria,
    observableSignals: overrides.observableSignals ?? DEFAULT_TEMPLATE.observableSignals,
  };
}

/** Returns the deterministic expected-effect template for an intervention type. */
export function expectedEffectTemplateForType(
  type: InterventionType,
  targetParticipant: InterventionTarget = 'both'
): ExpectedEffect {
  const template = mergeTemplate(type, targetParticipant);
  return {
    id: `effect-${type}-v1`,
    ...template,
  };
}
