import type {
  ComplianceResult,
  DecisionEngineOutput,
  Intervention,
  MediatorLang,
  PriorityOutput,
  PromptComposerInput,
  ReflectionOutput,
  SafetyOutput,
  SessionMemory,
  StrategyEngineOutput,
  TranscriptMessage,
} from '@/types/mediator';
import {
  createEmptyComplianceResult,
  createEmptyDecisionOutput,
  createEmptyIntervention,
  createEmptyReflectionOutput,
  createEmptySafetyOutput,
  createEmptySessionMemory,
  createEmptyStrategyOutput,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createPreemptiveSafetyOutput } from '@/services/mediatorEngine/__tests__/priority/fixtures';
import { PROMPT_LIMITS } from '@/services/mediatorEngine/promptComposer/config/promptLimits';

export const PRIVATE_SESSION_ID = 'secret-session-id-12345';
export const PRIVATE_MEDIATION_ID = 'secret-mediation-id-67890';

export function createTranscriptMessages(count: number, contentPrefix = 'Message'): TranscriptMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-id-${i + 1}`,
    authorRole: i % 2 === 0 ? 'host' : 'partner',
    content: `${contentPrefix} ${i + 1}`,
    turnNumber: i + 1,
    createdAt: '2026-07-05T00:00:00.000Z',
  }));
}

export function createLongMessage(chars: number): TranscriptMessage[] {
  return [
    {
      id: 'long-msg',
      authorRole: 'partner',
      content: 'x'.repeat(chars),
      turnNumber: 3,
      createdAt: '2026-07-05T00:00:00.000Z',
    },
  ];
}

export function createPromptComposerInput(
  overrides: Partial<PromptComposerInput> = {}
): PromptComposerInput {
  const turnNumber = overrides.turnNumber ?? 3;
  const state = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      sessionId: PRIVATE_SESSION_ID,
      mediationId: PRIVATE_MEDIATION_ID,
      currentTurnNumber: turnNumber,
      language: 'en',
    },
  });

  return {
    mediationState: state,
    sessionMemory: createEmptySessionMemory(),
    safetyOutput: null,
    reflectionOutput: createEmptyReflectionOutput(),
    strategyOutput: createEmptyStrategyOutput(),
    priorityOutput: {
      activeSignals: [],
      conversationMode: 'NORMAL',
      allowedInterventionTypes: ['validate'],
      forbiddenInterventionTypes: [],
      preemptsGoalTransition: false,
      recommendedInterventionType: 'validate',
    } as PriorityOutput,
    decisionOutput: createEmptyDecisionOutput(),
    intervention: createEmptyIntervention(turnNumber),
    complianceResult: createEmptyComplianceResult(),
    transcriptWindow: createTranscriptMessages(2),
    language: 'en',
    turnNumber,
    ...overrides,
  };
}

export function createL3SafetyInput(): Partial<PromptComposerInput> {
  return {
    safetyOutput: {
      ...createPreemptiveSafetyOutput(),
      level: 'L3_stop',
      preempted: true,
      recommendedInterventionType: 'safety_response',
      blockGoalTransitions: true,
      blockStandardInterventions: true,
      allowedInterventionTypes: ['safety_response', 'pause_session'],
    } as SafetyOutput,
  };
}

export function createNonCompliantResult(): ComplianceResult {
  return {
    ...createEmptyComplianceResult(),
    compliant: false,
    violations: [
      {
        articleRef: 'Art.1',
        ruleId: 'rule-1',
        severity: 'block',
        confidence: 90,
        matchedText: 'SECRET_VIOLATION_TEXT_should_not_appear',
      },
    ],
  };
}

export function createRichPipelineInput(language: MediatorLang = 'en'): PromptComposerInput {
  const strategy: StrategyEngineOutput = {
    ...createEmptyStrategyOutput(),
    primaryStrategy: 'validate_emotions',
    therapeuticIntent: 'help_partner_feel_heard',
    suggestedGoalTransition: 'stay',
    confidence: 75,
  };

  const decision: DecisionEngineOutput = {
    ...createEmptyDecisionOutput(),
    selectedInterventionType: 'validate',
    intent: 'help_partner_feel_heard',
    goalTransition: 'stay',
    strategy: 'validate_emotions',
    rationale: 'decision=validate',
  };

  const intervention = createEmptyIntervention(3);
  intervention.type = 'validate';
  intervention.expectedEffect.id = 'effect-validate-001';

  const memory: SessionMemory = {
    ...createEmptySessionMemory(),
    completedGoals: ['SAFE_OPENING'],
  };

  const reflection: ReflectionOutput = {
    ...createEmptyReflectionOutput(),
    recommendedStrategyShift: 'continue',
  };

  return createPromptComposerInput({
    language,
    strategyOutput: strategy,
    decisionOutput: decision,
    intervention,
    sessionMemory: memory,
    reflectionOutput: reflection,
    complianceResult: createNonCompliantResult(),
    transcriptWindow: createTranscriptMessages(3, 'Dialogue'),
  });
}

export { PROMPT_LIMITS };
