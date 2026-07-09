import type {
  ComplianceResult,
  DecisionEngineOutput,
  Explainability,
  MediationState,
  PriorityOutput,
  ReflectionOutput,
  StrategyEngineOutput,
  TurnNumber,
} from '@/types/mediator';

export interface BuildExplainabilityInput {
  turnNumber: TurnNumber;
  mediationId: string;
  state: MediationState;
  reflectionOutput: ReflectionOutput;
  strategyOutput: StrategyEngineOutput;
  priorityOutput: PriorityOutput;
  decisionOutput: DecisionEngineOutput;
  complianceResult: ComplianceResult;
}

/** Builds explainability from real pipeline module outputs for a completed turn. */
export function buildExplainability(input: BuildExplainabilityInput): Explainability {
  const {
    turnNumber,
    mediationId,
    state,
    reflectionOutput,
    strategyOutput,
    priorityOutput,
    decisionOutput,
    complianceResult,
  } = input;

  const topSignalType = priorityOutput.activeSignals[0]?.type ?? null;

  return {
    currentGoal: state.currentGoal,
    contributions: [],
    decisionExplanation: {
      turnNumber,
      timestamp: new Date().toISOString(),
      decisionId: `${mediationId}-turn-${turnNumber}`,
      outcome: {
        strategy: decisionOutput.strategy,
        interventionType: decisionOutput.selectedInterventionType,
        intent: decisionOutput.intent,
        goalTransition: decisionOutput.goalTransition,
        pace: state.pace?.current ?? 'normal',
      },
      reasoning: decisionOutput.rationale
        ? [{ order: 1, module: 'decision', statement: decisionOutput.rationale }]
        : [],
      constitutionArticleRefs: [],
      evidenceRefs: [],
      moduleInputs: {
        reflection: {
          lastInterventionHelpful: reflectionOutput.lastInterventionHelpful.value,
          shouldChangeStrategy: reflectionOutput.shouldChangeStrategy,
          recommendedStrategyShift: reflectionOutput.recommendedStrategyShift,
          expectedEffectAchieved: reflectionOutput.expectedEffectEvaluation?.achieved ?? null,
        },
        priority: {
          conversationMode: priorityOutput.conversationMode,
          topSignalType,
          preemptsGoalTransition: priorityOutput.preemptsGoalTransition,
          recommendedInterventionType: priorityOutput.recommendedInterventionType,
        },
        strategy: {
          primaryStrategy: strategyOutput.primaryStrategy,
          secondaryStrategy: strategyOutput.secondaryStrategy,
          suggestedGoalTransition: strategyOutput.suggestedGoalTransition,
          confidence: strategyOutput.confidence,
        },
        readiness: {
          hostReadyToAdvance: reflectionOutput.partnerReadiness.host.readyToAdvance.value,
          partnerReadyToAdvance: reflectionOutput.partnerReadiness.partner.readyToAdvance.value,
        },
      },
      rejectedAlternatives: [],
      complianceResult,
    },
  };
}
