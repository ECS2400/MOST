import type {
  MediatorIntervention,
  MediatorLang,
  OrchestrateTurnRequest,
  OrchestrateTurnResponse,
  PromptComposerInput,
  SessionMemory,
  StrategyEngineStateContext,
} from '@/types/mediator';
import { makeDecision } from '@/services/mediatorEngine/decision/makeDecision';
import { buildContinuityContext } from '@/services/mediatorEngine/memory/continuity';
import { buildGoalContinuityContext } from '@/services/mediatorEngine/goalContinuity';
import { runReflection } from '@/services/mediatorEngine/reflection/runReflection';
import { resolvePriority } from '@/services/mediatorEngine/priority/resolvePriority';
import { evaluateSafety } from '@/services/mediatorEngine/safety/evaluateSafety';
import { selectStrategy } from '@/services/mediatorEngine/strategy/selectStrategy';
import {
  createEmptyMediationState,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';

function createPlaceholderLastIntervention(turnNumber: number): MediatorIntervention {
  return {
    id: 'runtime-last-intervention',
    type: 'welcome_open',
    target: 'both',
    visibility: 'public',
    content: { primaryMessage: '' },
    goal: 'SAFE_OPENING',
    rationale: '',
    expectedEffectSummary: '',
    doNotRepeatBefore: turnNumber,
  };
}

function buildStrategyStateContext(
  state: OrchestrateTurnResponse['mediationState'],
  sessionMemory: SessionMemory
): StrategyEngineStateContext {
  const goalChecks = state.goals.flatMap((goal) => goal.checks);
  return {
    currentGoal: state.currentGoal,
    goalChecks,
    dynamics: {
      temperature: state.load.host,
      escalation: state.load.exhaustionDetected,
      blameLoop: state.load.disengagementRisk,
      breakthrough: { ...state.load.host, value: null },
      evasion: state.load.disengagementRisk,
      mutualUnderstanding: {
        value: state.dynamics.mutualUnderstandingScore,
        confidence: 0,
        source: 'heuristic',
        evidence: [],
        assessedAt: state.meta.lastUpdatedAt,
        stale: false,
      },
    },
    pace: state.pace.current,
    load: state.load,
    recovery: state.recovery,
    sessionPersonality: state.personality,
    sessionMemory,
    sessionObjectives: state.sessionObjectives,
  };
}

/** Builds PromptComposerInput from orchestrator outputs and pipeline context. */
export function buildPromptComposerInputFromTurn(
  request: OrchestrateTurnRequest,
  sessionMemory: SessionMemory,
  orchestrated: OrchestrateTurnResponse,
  language: MediatorLang
): PromptComposerInput {
  const stateBefore = request.mediationState ?? createEmptyMediationState(request);
  const state = orchestrated.mediationState;
  const turnNumber = request.turnNumber;

  const safetyOutput = evaluateSafety({
    state,
    transcriptDelta: request.transcriptDelta,
    turnNumber,
  });

  const reflectionOutput = runReflection({
    lastIntervention: createPlaceholderLastIntervention(turnNumber),
    stateBefore,
    stateAfter: state,
    transcriptDelta: request.transcriptDelta,
    goalChecksDelta: [],
  });

  const goalContinuityContext = buildGoalContinuityContext({
    state,
    sessionMemory,
    reflection: reflectionOutput,
    safety: safetyOutput,
    turnNumber,
  });

  const strategyOutput = selectStrategy({
    state: buildStrategyStateContext(state, sessionMemory),
    reflection: reflectionOutput,
    safety: safetyOutput,
    turnNumber,
    goalContinuityContext,
  });

  const priorityOutput = resolvePriority({
    state,
    reflection: reflectionOutput,
    safety: safetyOutput,
    strategy: strategyOutput,
    turnNumber,
  });

  const continuityContext = buildContinuityContext({
    sessionMemory,
    recommendedInterventionType: priorityOutput.recommendedInterventionType,
  });

  const decisionOutput = makeDecision({
    state,
    reflection: reflectionOutput,
    strategy: strategyOutput,
    priority: priorityOutput,
    safety: safetyOutput,
    turnNumber,
    sessionMemory,
    continuityContext,
    goalContinuityContext,
  });

  return {
    mediationState: state,
    sessionMemory: orchestrated.sessionMemory,
    safetyOutput,
    reflectionOutput,
    strategyOutput,
    priorityOutput,
    decisionOutput,
    intervention: orchestrated.intervention,
    complianceResult: orchestrated.complianceResult,
    transcriptWindow: Array.isArray(request.transcriptDelta) ? request.transcriptDelta : [],
    language,
    turnNumber,
    continuityContext,
    goalContinuityContext,
  };
}

export { buildStrategyStateContext };
