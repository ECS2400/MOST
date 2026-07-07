/**
 * Mediator AI Engine v2.3 — turn orchestrator.
 *
 * Role: wires pipeline modules in architecture order without business logic.
 * Phase 0B: sequential placeholder invocation only.
 */

import type {
  MediationState,
  MediatorIntervention,
  OrchestrateTurnRequest,
  OrchestrateTurnResponse,
  SessionMemory,
  StrategyEngineStateContext,
} from '@/types/mediator';
import { validateConstitution } from '@/services/mediatorEngine/constitution/validateConstitution';
import { makeDecision } from '@/services/mediatorEngine/decision/makeDecision';
import { buildContinuityContext } from '@/services/mediatorEngine/memory/continuity';
import { buildGoalContinuityContext } from '@/services/mediatorEngine/goalContinuity';
import { generateIntervention } from '@/services/mediatorEngine/intervention/generateIntervention';
import { updateSessionMemory } from '@/services/mediatorEngine/memory/updateSessionMemory';
import { recordMetrics } from '@/services/mediatorEngine/metrics/recordMetrics';
import { resolvePriority } from '@/services/mediatorEngine/priority/resolvePriority';
import { runReflection } from '@/services/mediatorEngine/reflection/runReflection';
import { evaluateSafety } from '@/services/mediatorEngine/safety/evaluateSafety';
import { selectStrategy } from '@/services/mediatorEngine/strategy/selectStrategy';
import { analyzeState } from '@/services/mediatorEngine/stateAnalyzer/analyzeState';
import {
  createEmptyExplainability,
  createEmptyMediationState,
  createEmptySessionMemory,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';

/** Orchestrator input — request payload plus persisted session memory. */
export interface MediatorEngineTurnInput {
  request: OrchestrateTurnRequest;
  sessionMemory: SessionMemory;
}

/**
 * Builds the lightweight state slice required by Therapeutic Strategy Engine.
 *
 * @param state - Full mediation state after State Analyzer.
 * @param sessionMemory - Operational session memory from prior turns.
 */
function buildStrategyStateContext(
  state: MediationState,
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

/**
 * Placeholder last intervention for Reflection on early turns.
 *
 * @param turnNumber - Current turn index.
 */
function createPlaceholderLastIntervention(turnNumber: number): MediatorIntervention {
  return {
    id: 'skeleton-last-intervention',
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

/**
 * Executes the full Mediator AI Engine v2.3 pipeline for one turn.
 *
 * Pipeline order:
 * State Analyzer → Safety Layer → Reflection Engine → Therapeutic Strategy Engine
 * → Priority Engine → Decision Engine → Intervention Engine → Constitution Validator
 * → Session Memory → Metrics
 *
 * @param input - Turn request and session memory snapshot.
 * @returns Complete turn response with updated state and placeholder outputs.
 */
export function orchestrateTurn(input: MediatorEngineTurnInput): OrchestrateTurnResponse {
  const { request } = input;
  const sessionMemory = input.sessionMemory ?? createEmptySessionMemory();
  const stateBefore =
    request.mediationState ?? createEmptyMediationState(request);

  const stateAnalyzerOutput = analyzeState({
    mediationState: stateBefore,
    transcriptDelta: request.transcriptDelta,
    turnNumber: request.turnNumber,
  });

  let state = stateAnalyzerOutput.updatedState;
  if (request.language && state.meta.language !== request.language) {
    state = {
      ...state,
      meta: { ...state.meta, language: request.language },
    };
  }

  const safetyOutput = evaluateSafety({
    state,
    transcriptDelta: request.transcriptDelta,
    turnNumber: request.turnNumber,
  });

  const reflectionOutput = runReflection({
    lastIntervention: createPlaceholderLastIntervention(request.turnNumber),
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
    turnNumber: request.turnNumber,
  });

  const strategyOutput = selectStrategy({
    state: buildStrategyStateContext(state, sessionMemory),
    reflection: reflectionOutput,
    safety: safetyOutput,
    turnNumber: request.turnNumber,
    goalContinuityContext,
  });

  const priorityOutput = resolvePriority({
    state,
    reflection: reflectionOutput,
    safety: safetyOutput,
    strategy: strategyOutput,
    turnNumber: request.turnNumber,
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
    turnNumber: request.turnNumber,
    sessionMemory,
    continuityContext,
    goalContinuityContext,
  });

  const intervention = generateIntervention({
    state,
    intent: {
      intent: decisionOutput.intent,
      goal: state.currentGoal,
      strategy: decisionOutput.strategy,
      targetParticipant: 'both',
      addressesCheckId: null,
      confidence: 0,
    },
    decision: decisionOutput,
    turnNumber: request.turnNumber,
  });

  const complianceResult = validateConstitution({
    intervention,
    applicableRules: [],
    turnNumber: request.turnNumber,
    attemptNumber: 1,
    recentInterventionSignatures: sessionMemory.askedInterventionSignatures ?? [],
  });

  const updatedSessionMemory = updateSessionMemory({
    previousMemory: sessionMemory,
    state,
    intervention,
    reflection: reflectionOutput,
    complianceResult,
    turnNumber: request.turnNumber,
    goalContinuityContext,
    goalTransition: decisionOutput.goalTransition,
  });

  recordMetrics({
    turnNumber: request.turnNumber,
    sessionId: request.sessionId,
    mediationId: request.mediationId,
    sessionMemory: updatedSessionMemory,
    complianceResult,
  });

  return {
    mediationState: state,
    intervention,
    sessionMemory: updatedSessionMemory,
    evidenceStore: stateAnalyzerOutput.evidenceStore,
    explainability: createEmptyExplainability(request.turnNumber),
    complianceResult,
    engineVersion: request.engineVersion,
  };
}
