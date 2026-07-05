import type {
  Intervention,
  InterventionContent,
  InterventionEngineInput,
  InterventionTarget,
  InterventionType,
  TherapeuticGoal,
  TherapeuticIntent,
  TherapeuticStrategy,
  TurnNumber,
} from '@/types/mediator';
import { buildDoNotRepeatBefore } from '@/services/mediatorEngine/intervention/lib/buildDoNotRepeatBefore';
import { buildExpectedEffect } from '@/services/mediatorEngine/intervention/lib/buildExpectedEffect';
import { buildLibraryPatternId } from '@/services/mediatorEngine/intervention/lib/buildLibraryPatternId';
import { buildRationale } from '@/services/mediatorEngine/intervention/lib/buildRationale';
import { buildSignature } from '@/services/mediatorEngine/intervention/lib/buildSignature';

export const INTERVENTION_PLACEHOLDER_MESSAGE = '[INTERVENTION_PLACEHOLDER]';

function placeholderContent(): InterventionContent {
  return {
    primaryMessage: INTERVENTION_PLACEHOLDER_MESSAGE,
    secondaryMessage: undefined,
  };
}

function buildInterventionId(turnNumber: TurnNumber, type: InterventionType, signature: string): string {
  return `intervention-${turnNumber}-${type}-${signature.replace(/\|/g, '-')}`;
}

export interface CreateInterventionParams {
  turnNumber: TurnNumber;
  type: InterventionType;
  target: InterventionTarget;
  goal: TherapeuticGoal;
  intent: TherapeuticIntent;
  strategy: TherapeuticStrategy;
  generatedAt: string;
}

/** Assembles a complete Intervention object from normalized parameters. */
export function createIntervention(params: CreateInterventionParams): Intervention {
  const signature = buildSignature({
    type: params.type,
    goal: params.goal,
    target: params.target,
    strategy: params.strategy,
  });

  return {
    id: buildInterventionId(params.turnNumber, params.type, signature),
    type: params.type,
    target: params.target,
    visibility: 'public',
    content: placeholderContent(),
    goal: params.goal,
    intent: params.intent,
    strategy: params.strategy,
    rationale: buildRationale({ type: params.type, strategy: params.strategy }),
    expectedEffect: buildExpectedEffect(params.type, params.target),
    libraryPatternId: buildLibraryPatternId(params.type),
    doNotRepeatBefore: buildDoNotRepeatBefore(params.type, params.turnNumber),
    signature,
    generatedAt: params.generatedAt,
  };
}

function normalizeTurnNumber(value: unknown): TurnNumber {
  return typeof value === 'number' && Number.isFinite(value) ? value : 1;
}

function normalizeTarget(value: unknown): InterventionTarget {
  if (value === 'host' || value === 'partner' || value === 'both') return value;
  return 'both';
}

/** Normalizes partial InterventionEngineInput into createIntervention params. */
export function normalizeInterventionInput(input: Partial<InterventionEngineInput>): CreateInterventionParams {
  const turnNumber = normalizeTurnNumber(input.turnNumber);
  const type =
    typeof input.decision?.selectedInterventionType === 'string'
      ? input.decision.selectedInterventionType
      : 'reflect';
  const goal =
    typeof input.intent?.goal === 'string'
      ? input.intent.goal
      : typeof input.state?.currentGoal === 'string'
        ? input.state.currentGoal
        : 'SAFE_OPENING';
  const intent =
    typeof input.intent?.intent === 'string'
      ? input.intent.intent
      : typeof input.decision?.intent === 'string'
        ? input.decision.intent
        : 'increase_emotional_safety';
  const strategy =
    typeof input.decision?.strategy === 'string'
      ? input.decision.strategy
      : typeof input.intent?.strategy === 'string'
        ? input.intent.strategy
        : 'build_safety';
  const target = normalizeTarget(input.intent?.targetParticipant);

  return {
    turnNumber,
    type,
    target,
    goal,
    intent,
    strategy,
    generatedAt: new Date().toISOString(),
  };
}
