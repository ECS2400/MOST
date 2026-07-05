import type {
  ComplianceResultSummary,
  ExpectedEffect,
  Intervention,
  MediationState,
  ReflectionInput,
  ReflectionOutput,
  TranscriptMessage,
} from '@/types/mediator';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createBaselineIntervention } from '@/services/mediatorEngine/__tests__/memory/fixtures';
import { skeletonConfidence } from '@/services/mediatorEngine/_internal/skeletonDefaults';

export const PRIVATE_TEXT = '__PRIVATE_TRANSCRIPT_CONTENT__';

export function createReflectionInput(
  overrides: Partial<ReflectionInput> = {}
): ReflectionInput {
  const turnNumber = overrides.turnNumber ?? 4;
  const stateBefore = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      currentTurnNumber: turnNumber - 1,
    },
  });
  const stateAfter = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      currentTurnNumber: turnNumber,
    },
  });

  return {
    lastIntervention: toMediatorIntervention(createBaselineIntervention(turnNumber - 1)),
    stateBefore,
    stateAfter,
    transcriptDelta: [],
    goalChecksDelta: [],
    turnNumber,
    ...overrides,
  };
}

export function toMediatorIntervention(intervention: Intervention) {
  return {
    id: intervention.id,
    type: intervention.type,
    target: intervention.target,
    visibility: intervention.visibility,
    content: intervention.content,
    goal: intervention.goal,
    rationale: intervention.rationale,
    expectedEffectSummary: intervention.expectedEffect.description,
    doNotRepeatBefore: intervention.doNotRepeatBefore,
  };
}

export function createTranscriptDelta(
  messages: Partial<TranscriptMessage>[]
): TranscriptMessage[] {
  return messages.map((message, index) => ({
    id: message.id ?? `msg-${index + 1}`,
    authorRole: message.authorRole ?? 'host',
    content: message.content ?? PRIVATE_TEXT,
    turnNumber: message.turnNumber ?? 1,
    createdAt: message.createdAt ?? '2026-07-05T00:00:00.000Z',
  }));
}

export function withLastInterventionMeta(
  state: MediationState,
  expectedEffect: Partial<ExpectedEffect> = {}
): MediationState {
  const intervention = createBaselineIntervention(state.meta.currentTurnNumber - 1);
  return {
    ...state,
    lastInterventionMeta: {
      interventionId: intervention.id,
      type: intervention.type,
      intent: intervention.intent,
      expectedEffect: {
        ...intervention.expectedEffect,
        ...expectedEffect,
      },
      strategy: intervention.strategy,
      deliveredAt: '2026-07-05T00:00:00.000Z',
      turnNumber: state.meta.currentTurnNumber - 1,
    },
  };
}

export function compliantResult(): ComplianceResultSummary {
  return {
    compliant: true,
    violationCount: 0,
    blockingViolationCount: 0,
    fallbackUsed: false,
    attemptNumber: 1,
  };
}

export function nonCompliantResult(): ComplianceResultSummary {
  return {
    compliant: false,
    violationCount: 2,
    blockingViolationCount: 1,
    fallbackUsed: false,
    attemptNumber: 1,
  };
}

export function createPreviousIneffectiveReflection(): ReflectionOutput {
  const unhelpful = skeletonConfidence(false);
  unhelpful.confidence = 80;
  return {
    lastInterventionHelpful: unhelpful,
    conversationMovedForward: skeletonConfidence(false),
    shouldChangeStrategy: true,
    repeatRisk: skeletonConfidence(true),
    drillDownRisk: skeletonConfidence(false),
    stuckRisk: skeletonConfidence(true),
    recommendedStrategyShift: 'recover',
    reflectionNotes: 'prior-ineffective',
    expectedEffectEvaluation: null,
    understoodPartners: skeletonConfidence(false),
    partnerReadiness: {
      host: {
        readyToAdvance: skeletonConfidence(false),
        needsMoreTime: skeletonConfidence(true),
        needsDifferentApproach: skeletonConfidence(true),
        signals: [],
      },
      partner: {
        readyToAdvance: skeletonConfidence(false),
        needsMoreTime: skeletonConfidence(true),
        needsDifferentApproach: skeletonConfidence(true),
        signals: [],
      },
    },
    strategyRecommendation: {
      preferStrategyChange: true,
      suggestedStrategy: null,
      reason: '',
      confidence: 70,
    },
    paceRecommendation: { suggestedPace: null, reason: '' },
    loadRecommendation: { acknowledgeLoad: false, targetParticipant: null },
  };
}
