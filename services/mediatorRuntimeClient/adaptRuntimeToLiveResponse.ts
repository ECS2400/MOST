import type { InterventionType } from '@/types/mediator';
import type { LiveMediatorResponse } from '@/services/liveMediation';
import type { MediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/types';
import type { QuestionTarget } from '@/services/mediatorRuntimeClient/types';

const QUESTION_INTERVENTION_TYPES = new Set<InterventionType>([
  'welcome_open',
  'choice_emotion',
  'choice_need',
  'open_deepen',
  'invite_reflection',
  'gentle_redirect_evasion',
  'remind_goal',
  'recover_acknowledge',
  'validate',
  'reflect',
  'mirror',
  'reframe',
  'redirect_blame',
  'propose_rule',
  'propose_future_plan',
]);

const SUMMARY_INTERVENTION_TYPES = new Set<InterventionType>([
  'summarize_close',
  'confirm_agreement',
  'celebrate_breakthrough',
]);

const SAFETY_INTERVENTION_TYPES = new Set<InterventionType>([
  'safety_response',
  'deescalate',
  'pause_session',
]);

function mapQuestionTarget(
  target: MediatorRuntimeEdgeSuccess['intervention']['target']
): QuestionTarget {
  if (target === 'host') return 'ty';
  if (target === 'partner') return 'partner';
  return 'oboje';
}

function mapSummaryType(
  type: InterventionType
): NonNullable<LiveMediatorResponse['summaryType']> {
  if (type === 'confirm_agreement' || type === 'celebrate_breakthrough') {
    return 'final';
  }
  return 'mid';
}

/**
 * Maps sanitized mediator-runtime success payload to legacy LiveMediatorResponse.
 * Does not mutate existing live mediation models.
 */
export function adaptRuntimeToLiveResponse(
  success: MediatorRuntimeEdgeSuccess
): LiveMediatorResponse {
  const text = success.finalMediatorMessage.text.trim();
  const interventionType = success.intervention.type;
  const source = success.finalMediatorMessage.source;

  const base: LiveMediatorResponse = {
    source,
    phase: success.runtimeMetadata.turnNumber,
    progress: undefined,
    nextQuestionIndex: success.runtimeMetadata.turnNumber,
  };

  if (SAFETY_INTERVENTION_TYPES.has(interventionType)) {
    return {
      ...base,
      publicMessage: text,
      escalationDetected: true,
      escalationMessage: text,
    };
  }

  if (SUMMARY_INTERVENTION_TYPES.has(interventionType)) {
    return {
      ...base,
      publicMessage: text,
      summaryType: mapSummaryType(interventionType),
    };
  }

  if (QUESTION_INTERVENTION_TYPES.has(interventionType)) {
    return {
      ...base,
      aiQuestion: text,
      questionTarget: mapQuestionTarget(success.intervention.target),
    };
  }

  if (success.intervention.visibility === 'private') {
    if (success.intervention.target === 'host') {
      return {
        ...base,
        privateHint: { suggestion: text },
      };
    }
    if (success.intervention.target === 'partner') {
      return {
        ...base,
        partnerPrivateHint: { suggestion: text },
      };
    }
  }

  return {
    ...base,
    publicMessage: text,
  };
}
