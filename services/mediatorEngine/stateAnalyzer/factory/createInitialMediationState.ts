import type {
  MediationId,
  MediationState,
  OrchestrateTurnRequest,
  OrchestrateTurnTrigger,
  SessionId,
  TurnNumber,
} from '@/types/mediator';
import { createEmptyEvidenceStore } from '@/services/mediatorEngine/_internal/skeletonDefaults';

export interface CreateInitialMediationStateInput {
  turnNumber: TurnNumber;
  mediationId?: MediationId;
  sessionId?: SessionId;
  trigger?: OrchestrateTurnTrigger;
  language?: 'pl' | 'en';
}

/** Creates a fresh MediationState for the first turn of a session. */
export function createInitialMediationState(input: CreateInitialMediationStateInput): MediationState {
  const turnNumber = typeof input.turnNumber === 'number' ? input.turnNumber : 1;
  const mediationId = input.mediationId ?? 'initial-mediation';
  const sessionId = input.sessionId ?? 'initial-session';
  const startedAt = new Date().toISOString();

  const evidenceStore = createEmptyEvidenceStore();

  return {
    meta: {
      schemaVersion: '2.3',
      sessionId,
      mediationId,
      language: input.language ?? 'pl',
      startedAt,
      lastUpdatedAt: startedAt,
      currentTurnNumber: turnNumber,
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
      sinceTurn: turnNumber,
      minTurnsBeforeChange: 2,
    },
    load: {
      host: {
        value: 0,
        confidence: 0,
        source: 'heuristic',
        evidence: [],
        assessedAt: startedAt,
        stale: false,
      },
      partner: {
        value: 0,
        confidence: 0,
        source: 'heuristic',
        evidence: [],
        assessedAt: startedAt,
        stale: false,
      },
      overall: 0,
      trend: 'stable',
      exhaustionDetected: {
        value: false,
        confidence: 0,
        source: 'heuristic',
        evidence: [],
        assessedAt: startedAt,
        stale: false,
      },
      disengagementRisk: {
        value: false,
        confidence: 0,
        source: 'heuristic',
        evidence: [],
        assessedAt: startedAt,
        stale: false,
      },
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

/** Builds a minimal orchestrate request for legacy skeleton helpers. */
export function toOrchestrateRequest(input: CreateInitialMediationStateInput): OrchestrateTurnRequest {
  return {
    mediationId: input.mediationId ?? 'initial-mediation',
    sessionId: input.sessionId ?? 'initial-session',
    trigger: input.trigger ?? 'session_start',
    turnNumber: input.turnNumber,
    mediationState: null,
    transcriptDelta: [],
    engineVersion: 'v2.3',
  };
}
