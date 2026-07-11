import type {
  ComplianceResult,
  FinalMediatorMessage,
  Intervention,
  MediationState,
  MediatorLang,
  OrchestrateTurnTrigger,
  ResponseValidationAction,
  RuntimeMetadata,
  RuntimeClientEvent,
  SessionMemory,
  TranscriptMessage,
} from '@/types/mediator';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

/** Minimal request body accepted by mediator-runtime Edge Function. */
export interface MediatorRuntimeEdgeRequest {
  mediationId: string;
  sessionId: string;
  turnNumber: number;
  trigger: OrchestrateTurnTrigger;
  mediationState: MediationState | null;
  sessionMemory: SessionMemory | null;
  transcriptDelta: TranscriptMessage[];
  language: MediatorLang;
  engineVersion: 'v2.3';
  clientEvents: RuntimeClientEvent[];
}

/** Sanitized post-LLM validation summary — no prompts or draft replies. */
export interface MediatorRuntimeEdgeResponseValidation {
  valid: boolean;
  action: ResponseValidationAction;
  blockingReasons: string[];
  warningReasons: string[];
  validatedAt: string;
}

/** Successful mediator-runtime Edge response — no raw prompts or provider payloads. */
export interface MediatorRuntimeEdgeSuccess {
  ok: true;
  engineVersion: 'v2.3';
  finalMediatorMessage: FinalMediatorMessage;
  mediationState: MediationState;
  sessionMemory: SessionMemory;
  intervention: Intervention;
  complianceResult: ComplianceResult;
  responseValidation: MediatorRuntimeEdgeResponseValidation;
  runtimeMetadata: RuntimeMetadata;
  fallbackUsed: boolean;
  retryCount: number;
  runtimeSession: RuntimeSession;
}

export type MediatorRuntimeEdgeResult = MediatorRuntimeEdgeSuccess | import('./errors').MediatorRuntimeErrorBody;

/** Environment variables consumed by the Edge runtime handler. */
export interface MediatorRuntimeEdgeEnv {
  openAiApiKey?: string | null;
  openAiModel?: string | null;
  openAiTimeoutMs?: string | null;
}
