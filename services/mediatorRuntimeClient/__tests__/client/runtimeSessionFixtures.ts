import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export interface RuntimeSessionFixtureOverrides {
  decision?: Partial<RuntimeSession['decision']>;
  session?: Partial<RuntimeSession['session']>;
  progress?: Partial<RuntimeSession['progress']>;
  presentation?: Partial<RuntimeSession['presentation']>;
  proposal?: Partial<RuntimeSession['proposal']>;
  closure?: Partial<RuntimeSession['closure']>;
  pending?: Partial<RuntimeSession['pending']>;
  diagnostics?: Partial<RuntimeSession['diagnostics']>;
}

/** Canonical RuntimeSession fixture aligned with types/mediator/runtimeSession.ts. */
export function createRuntimeSessionFixture(
  overrides: RuntimeSessionFixtureOverrides = {}
): RuntimeSession {
  const base: RuntimeSession = {
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
      completionEstimate: 10,
      milestone: null,
      goalProgress: {
        completedGoals: [],
        currentGoal: 'SAFE_OPENING',
        currentGoalCompletion: 10,
        estimatedRemainingGoals: 8,
      },
      labelKey: 'runtime.stage.intake',
    },
    presentation: {
      deliverables: [],
      primaryDeliverable: 'public_message',
      hideInput: false,
      showDecisionPanel: null,
      hostOnlyGeneration: true,
    },
    proposal: {
      phase: 'none',
      content: null,
      votes: { host: null, partner: null },
      requiresBothAcceptance: true,
    },
    closure: {
      directive: 'none',
      suggestedDbStatus: 'live',
      closureMessage: null,
      navigateToClosure: false,
    },
    pending: {
      awaiting: 'both_replies',
      awaitingFrom: ['host', 'partner'],
      satisfiedBy: ['host_message', 'partner_message'],
    },
    diagnostics: {
      explainabilityId: null,
      safetyLevel: 'none',
      fallbackUsed: false,
      validationWarnings: [],
    },
  };

  return {
    decision: { ...base.decision, ...overrides.decision },
    session: { ...base.session, ...overrides.session },
    progress: {
      ...base.progress,
      ...overrides.progress,
      goalProgress: {
        ...base.progress.goalProgress,
        ...overrides.progress?.goalProgress,
      },
    },
    presentation: { ...base.presentation, ...overrides.presentation },
    proposal: { ...base.proposal, ...overrides.proposal },
    closure: { ...base.closure, ...overrides.closure },
    pending: { ...base.pending, ...overrides.pending },
    diagnostics: { ...base.diagnostics, ...overrides.diagnostics },
  };
}

export function runtimeAwaitingBothRepliesFixture(): RuntimeSession {
  return createRuntimeSessionFixture();
}
