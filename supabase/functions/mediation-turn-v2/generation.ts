/**
 * Shared claim → Claude → finalize / fail pipeline (one screen = one kind).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { buildEnvelope, isPublicEnvelope } from './envelope.ts';
import { AppError, mapRpcErrorMessage } from './errors.ts';
import {
  getFirstDealVote,
  markFailedAt,
  readSummaryText,
  withCompromiseOnPayload,
  withDateOnPayload,
  withEasyChoicesRoundsOnPayload,
  withFirstDealOnPayload,
  withLessonOnPayload,
  withSummaryOnPayload,
} from './payload.ts';
import {
  asSessionRow,
  parseClaimOutcome,
  parseStartGenerationResult,
  type StartGenerationResult,
} from './sessionParse.ts';
import {
  generateCompromise,
  generateDate,
  generateEasyChoicesRounds,
  generateFirstDeal,
  generateLesson,
  generateSummaryText,
} from './summaryLlm.ts';
import type {
  ClaimOutcome,
  CommitClaimedResult,
  GenerationKind,
  MediationRow,
  MediationScreen,
  MediationSessionRow,
  MediationTurnV2Envelope,
  Talker,
} from './types.ts';

export {
  asSessionRow,
  parseClaimOutcome,
  parseStartGenerationResult,
  type StartGenerationResult,
} from './sessionParse.ts';

function throwRpc(error: { message?: string } | null, stage: string): never {
  throw mapRpcErrorMessage(error?.message ?? 'UNKNOWN_RPC_ERROR', stage);
}

export async function claimGeneration(
  admin: SupabaseClient,
  input: {
    session: MediationSessionRow;
    requestId: string;
    generationKind: GenerationKind;
    expectedScreen: string;
  }
): Promise<ClaimOutcome> {
  const { data, error } = await admin.rpc('claim_mediation_generation', {
    p_session_id: input.session.session_id,
    p_request_id: input.requestId,
    p_generation_kind: input.generationKind,
    p_expected_session_version: input.session.session_version,
    p_expected_screen: input.expectedScreen,
    p_expected_generation_status: input.session.generation_status,
  });
  if (error) throwRpc(error, 'claim_mediation_generation');
  return parseClaimOutcome(data);
}

/**
 * Atomic Case B / RETRY: kickoff transition + claim under the same client requestId.
 * Does not write mediation_session_idempotency (finalize does).
 */
export async function startMediationGeneration(
  admin: SupabaseClient,
  input: {
    session: MediationSessionRow;
    requestId: string;
    expectedScreen: string;
    nextScreen: string;
    sessionPayload: Record<string, unknown>;
    generationStatus: string;
    generationKind: GenerationKind;
    progressTotal: number;
  }
): Promise<StartGenerationResult> {
  const { data, error } = await admin.rpc('start_mediation_generation', {
    p_session_id: input.session.session_id,
    p_request_id: input.requestId,
    p_expected_session_version: input.session.session_version,
    p_expected_screen: input.expectedScreen,
    p_next_screen: input.nextScreen,
    p_session_payload: input.sessionPayload,
    p_generation_status: input.generationStatus,
    p_generation_kind: input.generationKind,
    p_progress_total: input.progressTotal,
  });
  if (error) throwRpc(error, 'start_mediation_generation');
  return parseStartGenerationResult(data);
}

export async function failGenerationClaim(
  admin: SupabaseClient,
  input: {
    sessionId: string;
    requestId: string;
    claimToken: string;
    generationKind: GenerationKind;
  }
): Promise<void> {
  const { error } = await admin.rpc('fail_mediation_generation_claim', {
    p_session_id: input.sessionId,
    p_request_id: input.requestId,
    p_claim_token: input.claimToken,
    p_generation_kind: input.generationKind,
  });
  if (error) {
    console.error('[mediation-turn-v2]', {
      publicCode: 'INTERNAL_ERROR',
      stage: 'fail_mediation_generation_claim',
      requestId: input.requestId,
      rpcMessage: error.message ?? null,
    });
  }
}

async function finalizeClaimedGeneration(
  admin: SupabaseClient,
  input: {
    session: MediationSessionRow;
    requestId: string;
    claimToken: string;
    generationKind: GenerationKind;
    expectedScreen: string;
    nextScreen: MediationScreen;
    sessionPayload: Record<string, unknown>;
    responsePayload: MediationTurnV2Envelope;
    progressTotal: number;
  }
): Promise<{ envelope: MediationTurnV2Envelope; session: MediationSessionRow }> {
  const { data, error } = await admin.rpc(
    'commit_claimed_mediation_generation',
    {
      p_session_id: input.session.session_id,
      p_request_id: input.requestId,
      p_claim_token: input.claimToken,
      p_generation_kind: input.generationKind,
      p_expected_session_version: input.session.session_version,
      p_expected_screen: input.expectedScreen,
      p_next_screen: input.nextScreen,
      p_session_payload: input.sessionPayload,
      p_generation_status: 'IDLE',
      p_last_generation_kind: input.generationKind,
      p_progress_total: input.progressTotal,
      p_response_payload: input.responsePayload,
    }
  );
  if (error) throwRpc(error, 'commit_claimed_mediation_generation');

  const result = data as CommitClaimedResult;
  if (!result || typeof result !== 'object') {
    throw new AppError('INTERNAL_ERROR', 500, 'commit_shape');
  }

  if (result.replayed === true) {
    if (!isPublicEnvelope(result.response)) {
      throw new AppError('INTERNAL_ERROR', 500, 'commit_replay_shape');
    }
    return {
      envelope: { ...result.response, replayed: true },
      session: input.session,
    };
  }

  const session = asSessionRow(result.session) ?? {
    ...input.session,
    session_version: input.session.session_version + 1,
    current_screen: input.nextScreen,
    generation_status: 'IDLE',
    last_generation_kind: input.generationKind,
    session_payload: input.sessionPayload,
  };

  if (isPublicEnvelope(result.response)) {
    return { envelope: result.response, session };
  }
  return { envelope: input.responsePayload, session };
}

export async function commitFailedGeneration(
  admin: SupabaseClient,
  input: {
    session: MediationSessionRow;
    requestId: string;
    talker: Talker;
  }
): Promise<MediationTurnV2Envelope> {
  const payload = markFailedAt(input.session.session_payload);
  const envelope = buildEnvelope({
    session: {
      ...input.session,
      generation_status: 'FAILED',
      session_payload: payload,
      session_version: input.session.session_version + 1,
    },
    talker: input.talker,
    correlationId: input.requestId,
  });

  const kind = input.session.last_generation_kind;
  if (!kind) {
    throw new AppError('INTERNAL_ERROR', 500, 'fail_commit_no_kind');
  }

  const { data, error } = await admin.rpc('commit_mediation_action', {
    p_session_id: input.session.session_id,
    p_request_id: input.requestId,
    p_expected_session_version: input.session.session_version,
    p_expected_screen: input.session.current_screen,
    p_next_screen: input.session.current_screen,
    p_session_payload: payload,
    p_generation_status: 'FAILED',
    p_last_generation_kind: kind,
    p_progress_total: input.session.progress_total || 6,
    p_response_payload: envelope,
  });
  if (error) throwRpc(error, 'commit_mediation_action_failed');

  const result = data as { replayed?: boolean; response?: unknown };
  if (result?.replayed === true && isPublicEnvelope(result.response)) {
    return { ...result.response, replayed: true };
  }
  return envelope;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function resolveLanguage(
  admin: SupabaseClient,
  hostUserId: string
): Promise<string> {
  const { data } = await admin
    .from('profiles')
    .select('preferred_language')
    .eq('id', hostUserId)
    .maybeSingle();
  const lang =
    data && typeof data.preferred_language === 'string'
      ? data.preferred_language.trim()
      : '';
  return lang || 'pl';
}

function nextScreenForKind(kind: GenerationKind): MediationScreen {
  switch (kind) {
    case 'SUMMARY':
      return 'SUMMARY';
    case 'EASY_CHOICES':
      return 'EASY_CHOICES';
    case 'FIRST_DEAL':
      return 'FIRST_DEAL';
    case 'COMPROMISE':
      return 'COMPROMISE';
    case 'LESSON':
      return 'LESSON';
    case 'DATE':
      return 'DATE';
  }
}

/**
 * Run Claude for a claimed kind and finalize. On LLM failure: fail claim +
 * commit FAILED (caller should use distinct requestId for fail commit — we
 * use requestId + fail path that fails claim then throws; fail session commit
 * uses a derived approach: same request cannot double-commit idempotency.
 *
 * SM: fail_claim then separate commit_mediation_action FAILED.
 * Idempotency is per request_id — SUCCESS path uses requestId for finalize.
 * Failure commit must use a different request id OR we only fail the claim
 * and return error, letting RETRY handle re-entry.
 *
 * Plan: fail claim + commit FAILED. To avoid idempotency collision, failure
 * commit uses the same requestId only if finalize never ran. Claim fail does
 * not insert idempotency. So commit FAILED with same requestId is OK if we
 * never finalized.
 */
export async function runClaimedGeneration(input: {
  admin: SupabaseClient;
  session: MediationSessionRow;
  mediation: MediationRow;
  talker: Talker;
  requestId: string;
  anthropicKey: string;
  claimToken: string;
  generationKind: GenerationKind;
}): Promise<MediationTurnV2Envelope> {
  const language = await resolveLanguage(
    input.admin,
    input.session.host_user_id
  );
  const expectedScreen = input.session.current_screen;
  const nextScreen = nextScreenForKind(input.generationKind);
  const progressTotal = input.session.progress_total || 6;
  const payload = input.session.session_payload;

  let nextPayload: Record<string, unknown> = payload;

  try {
    if (input.generationKind === 'SUMMARY') {
      const text = await generateSummaryText({
        mediation: input.mediation,
        language,
        apiKey: input.anthropicKey,
      });
      nextPayload = withSummaryOnPayload(payload, text);
    } else if (input.generationKind === 'EASY_CHOICES') {
      const summaryText = readSummaryText(payload);
      if (!summaryText) {
        throw new AppError(
          'UNSUPPORTED_SESSION_STATE',
          422,
          'easy_choices_missing_summary'
        );
      }
      const rounds = await generateEasyChoicesRounds({
        summaryText,
        conflictCategory: input.session.conflict_category,
        language,
        apiKey: input.anthropicKey,
      });
      nextPayload = withEasyChoicesRoundsOnPayload(payload, rounds);
    } else if (input.generationKind === 'FIRST_DEAL') {
      const summaryText = readSummaryText(payload) ?? '';
      const result = await generateFirstDeal({
        summaryText,
        conflictCategory: input.session.conflict_category,
        language,
        apiKey: input.anthropicKey,
      });
      nextPayload = withFirstDealOnPayload(payload, result.dealText);
    } else if (input.generationKind === 'COMPROMISE') {
      const fd = asRecord(payload.firstDeal);
      const firstDealText =
        (typeof fd?.dealText === 'string' ? fd.dealText : '') ||
        (typeof fd?.text === 'string' ? fd.text : '');
      const result = await generateCompromise({
        summaryText: readSummaryText(payload) ?? '',
        firstDealText,
        hostVote: getFirstDealVote(payload, 'HOST') ?? 'unknown',
        partnerVote: getFirstDealVote(payload, 'PARTNER') ?? 'unknown',
        conflictCategory: input.session.conflict_category,
        language,
        apiKey: input.anthropicKey,
      });
      nextPayload = withCompromiseOnPayload(payload, result);
    } else if (input.generationKind === 'LESSON') {
      const agreement = asRecord(payload.agreement);
      const agreementText =
        typeof agreement?.text === 'string'
          ? agreement.text
          : (() => {
              const fd = asRecord(payload.firstDeal);
              return typeof fd?.dealText === 'string' ? fd.dealText : '';
            })();
      const result = await generateLesson({
        summaryText: readSummaryText(payload) ?? '',
        agreementText,
        language,
        apiKey: input.anthropicKey,
      });
      nextPayload = withLessonOnPayload(payload, result);
    } else if (input.generationKind === 'DATE') {
      const lesson = asRecord(payload.lesson);
      const lessonText =
        typeof lesson?.lesson === 'string' ? lesson.lesson : '';
      const result = await generateDate({
        summaryText: readSummaryText(payload) ?? '',
        lessonText,
        language,
        apiKey: input.anthropicKey,
      });
      nextPayload = withDateOnPayload(payload, result);
    }
  } catch (error) {
    await failGenerationClaim(input.admin, {
      sessionId: input.session.session_id,
      requestId: input.requestId,
      claimToken: input.claimToken,
      generationKind: input.generationKind,
    });
    // Failure commit (SM T34/T52/T62/T74) — same requestId OK (no finalize yet)
    try {
      await commitFailedGeneration(input.admin, {
        session: input.session,
        requestId: input.requestId,
        talker: input.talker,
      });
    } catch (failCommitError) {
      console.error('[mediation-turn-v2]', {
        stage: 'fail_commit_after_llm',
        requestId: input.requestId,
        error:
          failCommitError instanceof Error
            ? failCommitError.message
            : 'unknown',
      });
    }
    throw error;
  }

  const provisionalSession: MediationSessionRow = {
    ...input.session,
    session_payload: nextPayload,
    current_screen: nextScreen,
    generation_status: 'IDLE',
    last_generation_kind: input.generationKind,
    session_version: input.session.session_version + 1,
    progress_total: progressTotal,
  };

  const responsePayload = buildEnvelope({
    session: provisionalSession,
    talker: input.talker,
    correlationId: input.requestId,
  });

  const finalized = await finalizeClaimedGeneration(input.admin, {
    session: input.session,
    requestId: input.requestId,
    claimToken: input.claimToken,
    generationKind: input.generationKind,
    expectedScreen,
    nextScreen,
    sessionPayload: nextPayload,
    responsePayload,
    progressTotal,
  });

  return finalized.envelope;
}

/**
 * claim → generate or PROCESSING / replay.
 */
export async function runGenerationPipeline(input: {
  admin: SupabaseClient;
  session: MediationSessionRow;
  mediation: MediationRow;
  talker: Talker;
  requestId: string;
  anthropicKey: string;
  generationKind: GenerationKind;
}): Promise<
  | { kind: 'envelope'; envelope: MediationTurnV2Envelope }
  | { kind: 'processing' }
> {
  const claim = await claimGeneration(input.admin, {
    session: input.session,
    requestId: input.requestId,
    generationKind: input.generationKind,
    expectedScreen: input.session.current_screen,
  });

  if (claim.outcome === 'IN_PROGRESS' || claim.outcome === 'ALREADY_CLAIMED') {
    return { kind: 'processing' };
  }

  if (claim.outcome === 'ALREADY_COMPLETED') {
    if (isPublicEnvelope(claim.response)) {
      return { kind: 'envelope', envelope: claim.response };
    }
    // Legacy response shapes from older builds — rebuild from session reload
    throw new AppError('INTERNAL_ERROR', 500, 'claim_completed_shape');
  }

  const envelope = await runClaimedGeneration({
    ...input,
    claimToken: claim.claimToken,
  });
  return { kind: 'envelope', envelope };
}
