import type { MediatorRuntimeOutput, ResponseValidationResult } from '@/types/mediator';
import type {
  MediatorRuntimeEdgeDevDiagnostics,
  MediatorRuntimeEdgeResponseValidation,
  MediatorRuntimeEdgeSuccess,
} from '@/services/mediatorEngine/edge/types';
import {
  LOCALIZED_NORMAL_TEXT,
  LOCALIZED_SAFETY_TEXT,
} from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';

/** Strips draft replies and retry instructions from validation output. */
export function sanitizeResponseValidation(
  validation: ResponseValidationResult
): MediatorRuntimeEdgeResponseValidation {
  return {
    valid: validation.valid,
    action: validation.action,
    blockingReasons: [...validation.blockingReasons],
    warningReasons: [...validation.warningReasons],
    validatedAt: validation.validatedAt,
  };
}

function computeDevDiagnostics(output: MediatorRuntimeOutput): MediatorRuntimeEdgeDevDiagnostics {
  const finalSource = output.finalMediatorMessage.source;
  const responseSource: MediatorRuntimeEdgeDevDiagnostics['responseSource'] =
    finalSource === 'llm'
      ? output.retryCount > 0
        ? 'retry_llm'
        : 'llm'
      : finalSource === 'stub'
        ? 'stub'
        : 'fallback';

  const providerModel =
    output.llmOutput.providerResponse?.model && typeof output.llmOutput.providerResponse.model === 'string'
      ? output.llmOutput.providerResponse.model
      : null;

  const providerSucceeded = Boolean(output.llmOutput.providerResponse);

  const reasonCodes = (output.responseValidation.ruleResults ?? [])
    .filter((r) => r && r.passed === false)
    .map((r) => r.ruleId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const uniqueReasonCodes = [...new Set(reasonCodes)];

  const lang = output.finalMediatorMessage.language;
  const text = output.finalMediatorMessage.text;
  const isNormalFallback = text === LOCALIZED_NORMAL_TEXT[lang];
  const isSafetyFallback = text === LOCALIZED_SAFETY_TEXT[lang];

  const finalTextSource: MediatorRuntimeEdgeDevDiagnostics['finalTextSource'] =
    finalSource === 'llm' || finalSource === 'stub'
      ? 'provider'
      : isNormalFallback
        ? 'localized_fallback_normal'
        : isSafetyFallback
          ? 'localized_fallback_safety'
          : 'other_fallback';

  return {
    responseSource,
    fallbackUsed: output.fallbackUsed,
    validationAction: output.responseValidation.action,
    validationReasonCodes: uniqueReasonCodes,
    retryCount: output.retryCount,
    providerSucceeded,
    providerModel,
    finalTextSource,
  };
}

/** Builds the public Edge response from full runtime output — no prompts or provider payloads. */
export function buildMediatorRuntimeEdgeSuccess(
  output: MediatorRuntimeOutput
): MediatorRuntimeEdgeSuccess {
  const { orchestratedTurn } = output;

  return {
    ok: true,
    engineVersion: 'v2.3',
    finalMediatorMessage: output.finalMediatorMessage,
    mediationState: orchestratedTurn.mediationState,
    sessionMemory: orchestratedTurn.sessionMemory,
    intervention: orchestratedTurn.intervention,
    complianceResult: orchestratedTurn.complianceResult,
    responseValidation: sanitizeResponseValidation(output.responseValidation),
    runtimeMetadata: output.runtimeMetadata,
    fallbackUsed: output.fallbackUsed,
    retryCount: output.retryCount,
    runtimeSession: output.runtimeSession,
    devDiagnostics: computeDevDiagnostics(output),
  };
}

/** Returns true when serialized response does not embed prompt or provider payloads. */
export function isMediatorRuntimeResponseSafe(payload: MediatorRuntimeEdgeSuccess): boolean {
  const forbiddenTopLevel = [
    'promptComposerOutput',
    'llmOutput',
    'providerResponse',
    'orchestratedTurn',
  ] as const;

  for (const key of forbiddenTopLevel) {
    if (key in (payload as Record<string, unknown>)) {
      return false;
    }
  }

  const serialized = JSON.stringify(payload);
  const forbiddenSnippets = [
    'promptComposerOutput',
    'providerResponse',
    'systemPrompt',
    'developerPrompt',
    'userPrompt',
    'retryInstruction',
  ];

  for (const snippet of forbiddenSnippets) {
    if (serialized.includes(snippet)) return false;
  }

  return true;
}
