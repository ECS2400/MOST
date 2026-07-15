import { randomUUID } from 'expo-crypto';
import { EdgeFunctionError } from '@/utils/edgeFunctionError';
import { callEdge, EDGE } from '@/services/supabase';
import type {
  ActionTypeV2,
  MediationTurnV2BootstrapBody,
  MediationTurnV2Envelope,
  MediationTurnV2RequestBody,
  MediationTurnV2SessionBody,
  VoteValueV2,
} from '@/services/mediationTurnV2.types';

export class MediationTurnV2Error extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = 'MediationTurnV2Error';
    this.code = code;
    this.status = status;
  }
}

/** One UUID per intentional user action (reuse on HTTP retry of the same action). */
export function createMediationTurnRequestId(): string {
  return randomUUID();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPublicEnvelope(value: unknown): value is MediationTurnV2Envelope {
  if (!isRecord(value)) return false;
  return (
    value.ok === true &&
    typeof value.sessionId === 'string' &&
    typeof value.screen === 'string' &&
    typeof value.sessionVersion === 'number' &&
    typeof value.correlationId === 'string' &&
    isRecord(value.content) &&
    Array.isArray(value.actions) &&
    isRecord(value.progress)
  );
}

function toTurnError(error: unknown): MediationTurnV2Error {
  if (error instanceof MediationTurnV2Error) return error;
  if (error instanceof EdgeFunctionError) {
    return new MediationTurnV2Error(error.code, error.status, error.message);
  }
  if (error instanceof Error) {
    return new MediationTurnV2Error('INTERNAL_ERROR', 500, error.message);
  }
  return new MediationTurnV2Error('INTERNAL_ERROR', 500);
}

/**
 * POST mediation-turn-v2 with JWT via callEdge.
 * Parses public envelope; maps HTTP errors to MediationTurnV2Error.
 */
export async function postMediationTurnV2(
  body: MediationTurnV2RequestBody
): Promise<MediationTurnV2Envelope> {
  try {
    const raw = await callEdge<unknown>(EDGE.mediationTurnV2, body);
    if (!isPublicEnvelope(raw)) {
      throw new MediationTurnV2Error(
        'INTERNAL_ERROR',
        500,
        'Invalid mediation-turn-v2 envelope'
      );
    }
    return raw;
  } catch (error) {
    throw toTurnError(error);
  }
}

export async function startOrResumeMediationTurnV2(input: {
  mediationId: string;
  requestId: string;
}): Promise<MediationTurnV2Envelope> {
  const body: MediationTurnV2BootstrapBody = {
    action: 'START_OR_RESUME',
    mediationId: input.mediationId,
    requestId: input.requestId,
  };
  return postMediationTurnV2(body);
}

export async function sendMediationTurnV2Action(input: {
  sessionId: string;
  requestId: string;
  type: ActionTypeV2;
  optionId?: string | null;
  voteValue?: VoteValueV2 | null;
}): Promise<MediationTurnV2Envelope> {
  const body: MediationTurnV2SessionBody = {
    sessionId: input.sessionId,
    requestId: input.requestId,
    action: {
      type: input.type,
      optionId: input.optionId ?? null,
      voteValue: input.voteValue ?? null,
    },
  };
  return postMediationTurnV2(body);
}

export async function loadMediationTurnV2Session(input: {
  sessionId: string;
  requestId: string;
}): Promise<MediationTurnV2Envelope> {
  return sendMediationTurnV2Action({
    sessionId: input.sessionId,
    requestId: input.requestId,
    type: 'LOAD_SESSION',
  });
}
