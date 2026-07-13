import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export function runtimeAwaitingBothRepliesFixture(): RuntimeSession {
  return {
    decision: {
      nextBeat: 'await_user_action',
      mayAutoAdvance: false,
      blockedReason: 'awaiting_both_replies',
      triggerHint: null,
    },
    session: {
      stage: 'intake',
      outcome: 'ongoing',
      currentGoal: 'SAFE_OPENING',
      activeStrategy: null,
      turnOrdinal: 2,
      isExtensionActive: false,
      participantPresence: {
        hostActive: true,
        partnerActive: true,
        partnerRequired: true,
      },
    },
    progress: {
      percent: 10,
      currentGoalIndex: 0,
      totalGoals: 10,
      questionsAsked: 1,
      questionsTarget: 8,
      completionEstimate: 10,
    },
    presentation: {
      deliverables: [],
      decisionPanel: null,
      inputState: 'awaiting_both_answers',
      waitingDisplay: 'waiting_both',
    },
    proposal: {
      phase: 'none',
      presentedAt: null,
      acceptedBy: [],
      rejectedBy: [],
    },
    closure: {
      directive: 'none',
      suggestedDbStatus: 'live',
    },
    pending: {
      awaiting: 'both_replies',
      awaitingFrom: ['host', 'partner'],
      satisfiedBy: ['host_message', 'partner_message'],
    },
    diagnostics: {
      explainabilityId: null,
      safetyLevel: 'L0',
      fallbackUsed: false,
      validationWarnings: [],
    },
  };
}
