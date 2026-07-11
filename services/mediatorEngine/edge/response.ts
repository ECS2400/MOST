import type { MediatorRuntimeOutput, ResponseValidationResult } from '@/types/mediator';
import type {
  MediatorRuntimeEdgeResponseValidation,
  MediatorRuntimeEdgeSuccess,
} from '@/services/mediatorEngine/edge/types';

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
