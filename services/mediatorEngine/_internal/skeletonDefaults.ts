/**
 * Phase 0B placeholder structures for Mediator AI Engine v2.3.
 *
 * Role: shared minimal valid objects for skeleton modules — not production logic.
 * @internal
 */

import type {
  ComplianceResult,
  ConfidenceValue,
  DecisionEngineOutput,
  EvidenceStore,
  Explainability,
  Intervention,
  MediationState,
  OrchestrateTurnRequest,
  PriorityOutput,
  ReflectionOutput,
  SafetyOutput,
  SessionMemory,
  StrategyEngineOutput,
} from '@/types/mediator';
import { createDefaultRuntimeFlowControl } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';

const SKELETON_TIMESTAMP = '1970-01-01T00:00:00.000Z';

/** Minimal confidence wrapper for skeleton outputs. */
export function skeletonConfidence<T>(value: T): ConfidenceValue<T> {
  return {
    value,
    confidence: 0,
    source: 'heuristic',
    evidence: [],
    assessedAt: SKELETON_TIMESTAMP,
    stale: false,
  };
}

/** Empty evidence store for skeleton State Analyzer output. */
export function createEmptyEvidenceStore(): EvidenceStore {
  return {
    conclusions: {},
    indexByTurn: {},
    maxConclusions: 80,
  };
}

/** Empty session memory for first-turn orchestration. */
export function createEmptySessionMemory(): SessionMemory {
  return {
    breakthroughs: [],
    confirmedEmotions: [],
    confirmedNeeds: [],
    recurringNeeds: [],
    interventionHistory: [],
    effectivePatterns: [],
    ineffectivePatterns: [],
    completedGoals: [],
    closedTopics: [],
    openTopics: [],
    recentInterventionTypes: [],
    askedInterventionSignatures: [],
    regressHistory: [],
    goalTransitionHistory: [],
    lastGoalTransitionReason: null,
    reflectionLog: [],
    runtimeFlowControl: createDefaultRuntimeFlowControl(),
  };
}

function resolveRequestLanguage(request: OrchestrateTurnRequest): MediationState['meta']['language'] {
  return request.language ?? 'en';
}

/** Placeholder mediation state when none exists yet (session_start). */
export function createEmptyMediationState(request: OrchestrateTurnRequest): MediationState {
  const evidenceStore = createEmptyEvidenceStore();
  return {
    meta: {
      schemaVersion: '2.3',
      sessionId: request.sessionId,
      mediationId: request.mediationId,
      language: resolveRequestLanguage(request),
      startedAt: SKELETON_TIMESTAMP,
      lastUpdatedAt: SKELETON_TIMESTAMP,
      currentTurnNumber: request.turnNumber,
    },
    participants: {
      host: {
        profile: { userId: '', displayName: 'Host', role: 'host' },
        namedEmotion: null,
        emotionConfidence: 0,
        emotionExplanation: null,
        emotionValidated: false,
        emotionAcknowledgedByOther: false,
        namedNeed: null,
        needExplanation: null,
        needValidated: false,
        feelsHeard: false,
        feelsUnderstood: false,
        feelsRespected: false,
        lastMessageTone: 'calm',
        consecutiveEvasiveAnswers: 0,
        consecutiveAccusatoryMessages: 0,
        lastStatementSummary: null,
      },
      partner: {
        profile: { userId: '', displayName: 'Partner', role: 'partner' },
        namedEmotion: null,
        emotionConfidence: 0,
        emotionExplanation: null,
        emotionValidated: false,
        emotionAcknowledgedByOther: false,
        namedNeed: null,
        needExplanation: null,
        needValidated: false,
        feelsHeard: false,
        feelsUnderstood: false,
        feelsRespected: false,
        lastMessageTone: 'calm',
        consecutiveEvasiveAnswers: 0,
        consecutiveAccusatoryMessages: 0,
        lastStatementSummary: null,
      },
    },
    conflict: {
      surfaceTopic: null,
      surfaceTopicConfidence: 0,
      hypothesizedDeepThemes: [],
      confirmedDeepTheme: null,
      conflictSummary: '',
      preAnalysisContext: {
        hostEmotions: [],
        hostNeeds: [],
        partnerEmotions: [],
        partnerNeeds: [],
        keyTrigger: null,
        hostPerspective: null,
        partnerPerspective: null,
      },
    },
    dynamics: {
      mode: 'NORMAL',
      emotionalTemperature: 0,
      temperatureTrend: 'stable',
      breakthroughDetected: false,
      breakthroughQuote: null,
      breakthroughAt: null,
      blameLoopDetected: false,
      blameLoopCount: 0,
      escalationDetected: false,
      escalationLevel: 0,
      mutualUnderstandingScore: 0,
      agreementLevel: 0,
      lastStableGoal: 'SAFE_OPENING',
      pauseSuggested: false,
      pauseAcceptedBy: [],
    },
    memory: {
      askedQuestionSignatures: [],
      recentMediatorMoves: [],
      coveredTopics: [],
      factMemory: [],
      breakthroughHistory: [],
      regressHistory: [],
    },
    currentGoal: 'SAFE_OPENING',
    goals: [],
    sessionObjectives: null,
    pendingAction: null,
    agreements: {
      sharedRule: null,
      hostCommitment: null,
      partnerCommitment: null,
      futurePlan: null,
      acceptedByBoth: false,
    },
    sessionOutcome: 'in_progress',
    pace: {
      current: 'normal',
      confidence: 0,
      reason: '',
      sinceTurn: 1,
      minTurnsBeforeChange: 2,
    },
    load: {
      host: skeletonConfidence(0),
      partner: skeletonConfidence(0),
      overall: 0,
      trend: 'stable',
      exhaustionDetected: skeletonConfidence(false),
      disengagementRisk: skeletonConfidence(false),
    },
    personality: {
      core: {
        calm: 50,
        warm: 50,
        structured: 50,
        neutral: 50,
        empathetic: 50,
        confident: 50,
      },
      profile: 'steady_mediator',
      adaptiveModifiers: {
        warmthBoost: 0,
        structureBoost: 0,
        lastAdjustedTurn: 0,
      },
      immutableRuleRefs: [],
    },
    recovery: null,
    activeStrategy: null,
    lastInterventionMeta: null,
    evidenceStore,
  };
}

/** Placeholder Safety Layer output. */
export function createEmptySafetyOutput(): SafetyOutput {
  return {
    level: 'none',
    preempted: false,
    signals: [],
    recommendedInterventionType: 'welcome_open',
    blockGoalTransitions: false,
    blockStandardInterventions: false,
    allowedInterventionTypes: [],
    assessed: skeletonConfidence(false),
  };
}

/** Placeholder Reflection Engine output. */
export function createEmptyReflectionOutput(): ReflectionOutput {
  const readiness = {
    readyToAdvance: skeletonConfidence(false),
    needsMoreTime: skeletonConfidence(false),
    needsDifferentApproach: skeletonConfidence(false),
    signals: [] as string[],
  };
  return {
    understoodPartners: skeletonConfidence(false),
    lastInterventionHelpful: skeletonConfidence(false),
    conversationMovedForward: skeletonConfidence(false),
    shouldChangeStrategy: false,
    repeatRisk: skeletonConfidence(false),
    drillDownRisk: skeletonConfidence(false),
    stuckRisk: skeletonConfidence(false),
    recommendedStrategyShift: 'continue',
    reflectionNotes: '',
    expectedEffectEvaluation: null,
    partnerReadiness: { host: readiness, partner: readiness },
    strategyRecommendation: {
      preferStrategyChange: false,
      suggestedStrategy: null,
      reason: '',
      confidence: 0,
    },
    paceRecommendation: { suggestedPace: null, reason: '' },
    loadRecommendation: { acknowledgeLoad: false, targetParticipant: null },
  };
}

/** Placeholder Priority Engine output. */
export function createEmptyPriorityOutput(): PriorityOutput {
  return {
    activeSignals: [],
    conversationMode: 'NORMAL',
    allowedInterventionTypes: [],
    forbiddenInterventionTypes: [],
    preemptsGoalTransition: false,
    recommendedInterventionType: 'welcome_open',
  };
}

/** Placeholder Therapeutic Strategy Engine output. */
export function createEmptyStrategyOutput(): StrategyEngineOutput {
  return {
    primaryStrategy: 'build_safety',
    secondaryStrategy: null,
    therapeuticIntent: 'increase_emotional_safety',
    confidence: 0,
    rationale: '',
    blockedStrategies: [],
    suggestedGoalTransition: 'stay',
    strategyDurationHint: 1,
    alignmentWithGoal: 'SAFE_OPENING',
    recoveryStrategy: null,
  };
}

/** Placeholder Decision Engine output. */
export function createEmptyDecisionOutput(): DecisionEngineOutput {
  return {
    selectedInterventionType: 'welcome_open',
    goalTransition: 'stay',
    intent: 'increase_emotional_safety',
    strategy: 'build_safety',
    rationale: '',
  };
}

/** Placeholder Intervention Engine output. */
export function createEmptyIntervention(turnNumber: number): Intervention {
  return {
    id: 'skeleton-intervention',
    type: 'welcome_open',
    target: 'both',
    visibility: 'public',
    content: { primaryMessage: '' },
    goal: 'SAFE_OPENING',
    intent: 'increase_emotional_safety',
    strategy: 'build_safety',
    rationale: '',
    expectedEffect: {
      id: 'skeleton-effect',
      description: '',
      observableSignals: [],
      targetParticipant: 'both',
      verificationMethod: 'next_message',
      successCriteria: { type: 'check_confirmed', threshold: 0, confidenceRequired: 0 },
      timeHorizon: 1,
    },
    libraryPatternId: null,
    signature: 'skeleton',
    generatedAt: SKELETON_TIMESTAMP,
    doNotRepeatBefore: turnNumber,
  };
}

/** Placeholder Constitution Validator output. */
export function createEmptyComplianceResult(): ComplianceResult {
  return {
    compliant: true,
    violations: [],
    attemptNumber: 1,
    fallbackUsed: false,
    validatedAt: SKELETON_TIMESTAMP,
    validatorLayer: 'deterministic',
  };
}

/** Placeholder Explainability bundle for orchestrator response. */
export function createEmptyExplainability(turnNumber: number): Explainability {
  return {
    decisionExplanation: {
      turnNumber,
      timestamp: SKELETON_TIMESTAMP,
      decisionId: 'skeleton-decision',
      outcome: {
        strategy: 'build_safety',
        interventionType: 'welcome_open',
        intent: 'increase_emotional_safety',
        goalTransition: 'stay',
        pace: 'normal',
      },
      reasoning: [],
      constitutionArticleRefs: [],
      evidenceRefs: [],
      moduleInputs: {
        reflection: {
          lastInterventionHelpful: false,
          shouldChangeStrategy: false,
          recommendedStrategyShift: 'continue',
          expectedEffectAchieved: null,
        },
        priority: {
          conversationMode: 'NORMAL',
          topSignalType: null,
          preemptsGoalTransition: false,
          recommendedInterventionType: 'welcome_open',
        },
        strategy: {
          primaryStrategy: 'build_safety',
          secondaryStrategy: null,
          suggestedGoalTransition: 'stay',
          confidence: 0,
        },
        readiness: { hostReadyToAdvance: false, partnerReadyToAdvance: false },
      },
      rejectedAlternatives: [],
    },
    contributions: [],
    currentGoal: 'SAFE_OPENING',
  };
}
