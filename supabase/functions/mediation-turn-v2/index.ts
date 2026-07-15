/**
 * mediation-turn-v2 — full closed flow SUMMARY → … → END
 *
 * Pipelines:
 * - content: claim → Claude → finalize (bootstrap / LOAD resume)
 * - user action (Case A): deterministic transition → commit_mediation_action
 * - generation kickoff (Case B / RETRY): start_mediation_generation (same client requestId)
 *   → Claude → finalize
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildEnvelope,
  isPublicEnvelope,
  processingEnvelope,
} from './envelope.ts';
import { AppError, logStageError, mapRpcErrorMessage } from './errors.ts';
import {
  asSessionRow,
  runClaimedGeneration,
  runGenerationPipeline,
  startMediationGeneration,
} from './generation.ts';
import { hasScreenContent } from './payload.ts';
import { parseTurnRequest } from './request.ts';
import {
  SUMMARY_MODEL_VERSION,
  SUMMARY_PROMPT_VERSION,
} from './summaryLlm.ts';
import { applyUserTransition, retryTransition } from './transitions.ts';
import type {
  CommitActionResult,
  GenerationKind,
  MediationRow,
  MediationSessionRow,
  MediationTurnV2Envelope,
  PublicErrorCode,
  Talker,
} from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const MEDIATION_SELECT = [
  'id',
  'couple_id',
  'user_id',
  'partner_id',
  'conflict_category',
  'what_happened',
  'what_angered',
  'how_felt',
  'what_needed',
  'what_to_say',
  'combined_description',
  'analysis',
  'partner_what_happened',
  'partner_what_angered',
  'partner_how_felt',
  'partner_what_needed',
  'partner_what_to_say',
  'partner_combined_description',
  'partner_analysis',
].join(', ');

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  publicCode: PublicErrorCode,
  httpStatus: number
): Response {
  return jsonResponse({ error: publicCode }, httpStatus);
}

function throwRpc(error: { message?: string } | null, stage: string): never {
  throw mapRpcErrorMessage(error?.message ?? 'UNKNOWN_RPC_ERROR', stage);
}

async function loadMediation(
  admin: SupabaseClient,
  mediationId: string
): Promise<MediationRow> {
  const { data, error } = await admin
    .from('mediations')
    .select(MEDIATION_SELECT)
    .eq('id', mediationId)
    .maybeSingle();
  if (error) throw new AppError('INTERNAL_ERROR', 500, 'load_mediation');
  if (!data) throw new AppError('MEDIATION_NOT_FOUND', 404, 'load_mediation');
  return data as unknown as MediationRow;
}

function assertMembership(userId: string, mediation: MediationRow): void {
  if (userId === mediation.user_id) return;
  if (mediation.partner_id && userId === mediation.partner_id) return;
  throw new AppError('FORBIDDEN', 403, 'membership');
}

function assertSessionMembership(
  userId: string,
  session: MediationSessionRow
): Talker {
  if (userId === session.host_user_id) return 'HOST';
  if (session.partner_user_id && userId === session.partner_user_id) {
    return 'PARTNER';
  }
  throw new AppError('FORBIDDEN', 403, 'session_membership');
}

function requireConflictCategory(mediation: MediationRow): string {
  const value = mediation.conflict_category;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(
      'CONFLICT_CATEGORY_MISSING',
      422,
      'conflict_category'
    );
  }
  return value.trim();
}

function requirePartnerId(mediation: MediationRow): string {
  if (!mediation.partner_id || mediation.partner_id === mediation.user_id) {
    throw new AppError('PARTNER_NOT_READY', 409, 'partner');
  }
  return mediation.partner_id;
}

function requireCoupleId(mediation: MediationRow): string {
  if (!mediation.couple_id) {
    throw new AppError('INVALID_REQUEST', 400, 'couple_id');
  }
  return mediation.couple_id;
}

async function findSessionIdByMediationId(
  admin: SupabaseClient,
  mediationId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from('mediation_sessions')
    .select('session_id')
    .eq('mediation_id', mediationId)
    .maybeSingle();
  if (error) throw new AppError('INTERNAL_ERROR', 500, 'find_session');
  if (!data || typeof data.session_id !== 'string') return null;
  return data.session_id;
}

async function loadSession(
  admin: SupabaseClient,
  sessionId: string
): Promise<MediationSessionRow> {
  const { data, error } = await admin.rpc('load_mediation_session', {
    p_session_id: sessionId,
  });
  if (error) throwRpc(error, 'load_mediation_session');
  const row = asSessionRow(data);
  if (!row) {
    throw new AppError('INTERNAL_ERROR', 500, 'load_mediation_session_shape');
  }
  return row;
}

async function createSession(
  admin: SupabaseClient,
  input: {
    mediationId: string;
    coupleId: string;
    hostUserId: string;
    partnerUserId: string;
    conflictCategory: string;
  }
): Promise<MediationSessionRow> {
  const { data, error } = await admin.rpc('create_mediation_session', {
    p_mediation_id: input.mediationId,
    p_couple_id: input.coupleId,
    p_host_user_id: input.hostUserId,
    p_partner_user_id: input.partnerUserId,
    p_conflict_category: input.conflictCategory,
    p_prompt_version: SUMMARY_PROMPT_VERSION,
    p_model_version: SUMMARY_MODEL_VERSION,
  });
  if (error) throwRpc(error, 'create_mediation_session');
  const row = asSessionRow(data);
  if (!row) {
    throw new AppError('INTERNAL_ERROR', 500, 'create_mediation_session_shape');
  }
  return row;
}

async function commitAction(
  admin: SupabaseClient,
  input: {
    session: MediationSessionRow;
    requestId: string;
    expectedScreen: string;
    nextScreen: string;
    sessionPayload: Record<string, unknown>;
    generationStatus: string;
    lastGenerationKind: string;
    progressTotal: number;
    responsePayload: MediationTurnV2Envelope;
  }
): Promise<{ envelope: MediationTurnV2Envelope; session: MediationSessionRow }> {
  const { data, error } = await admin.rpc('commit_mediation_action', {
    p_session_id: input.session.session_id,
    p_request_id: input.requestId,
    p_expected_session_version: input.session.session_version,
    p_expected_screen: input.expectedScreen,
    p_next_screen: input.nextScreen,
    p_session_payload: input.sessionPayload,
    p_generation_status: input.generationStatus,
    p_last_generation_kind: input.lastGenerationKind,
    p_progress_total: input.progressTotal,
    p_response_payload: input.responsePayload,
  });
  if (error) throwRpc(error, 'commit_mediation_action');

  const result = data as CommitActionResult;
  if (!result || typeof result !== 'object') {
    throw new AppError('INTERNAL_ERROR', 500, 'commit_action_shape');
  }

  if (result.replayed === true) {
    if (!isPublicEnvelope(result.response)) {
      throw new AppError('INTERNAL_ERROR', 500, 'commit_action_replay');
    }
    return {
      envelope: { ...result.response, replayed: true },
      session: input.session,
    };
  }

  const session = asSessionRow(result.session);
  if (!session) {
    throw new AppError('INTERNAL_ERROR', 500, 'commit_action_session');
  }
  if (isPublicEnvelope(result.response)) {
    return { envelope: result.response, session };
  }
  return { envelope: input.responsePayload, session };
}

function needsGeneration(
  session: MediationSessionRow
): GenerationKind | null {
  const status = session.generation_status;
  if (status !== 'GENERATING_CONTENT' && status !== 'GENERATING_COMPROMISE') {
    return null;
  }
  const kind = session.last_generation_kind as GenerationKind | null;
  if (!kind) return null;
  if (hasScreenContent(session.session_payload, kind)) return null;
  return kind;
}

async function resumeOrProcessGeneration(input: {
  admin: SupabaseClient;
  session: MediationSessionRow;
  mediation: MediationRow;
  talker: Talker;
  requestId: string;
  anthropicKey: string;
}): Promise<MediationTurnV2Envelope> {
  const kind = needsGeneration(input.session);
  if (!kind) {
    return processingEnvelope({
      session: input.session,
      correlationId: input.requestId,
    });
  }

  const result = await runGenerationPipeline({
    admin: input.admin,
    session: input.session,
    mediation: input.mediation,
    talker: input.talker,
    requestId: input.requestId,
    anthropicKey: input.anthropicKey,
    generationKind: kind,
  });

  if (result.kind === 'processing') {
    return processingEnvelope({
      session: input.session,
      correlationId: input.requestId,
    });
  }
  return result.envelope;
}

async function commitTransitionAndMaybeGenerate(input: {
  admin: SupabaseClient;
  session: MediationSessionRow;
  mediation: MediationRow;
  talker: Talker;
  clientRequestId: string;
  anthropicKey: string;
  transition: ReturnType<typeof applyUserTransition>;
}): Promise<MediationTurnV2Envelope> {
  const t = input.transition;
  const lastKind =
    t.lastGenerationKind ??
    (input.session.last_generation_kind as GenerationKind | null) ??
    'SUMMARY';

  if (!t.kickoffGeneration) {
    const provisional: MediationSessionRow = {
      ...input.session,
      current_screen: t.nextScreen,
      session_payload: t.sessionPayload,
      generation_status: t.generationStatus,
      last_generation_kind: lastKind,
      progress_total: t.progressTotal,
      session_version: input.session.session_version + 1,
    };
    const responsePayload = buildEnvelope({
      session: provisional,
      talker: input.talker,
      correlationId: input.clientRequestId,
    });
    const committed = await commitAction(input.admin, {
      session: input.session,
      requestId: input.clientRequestId,
      expectedScreen: input.session.current_screen,
      nextScreen: t.nextScreen,
      sessionPayload: t.sessionPayload,
      generationStatus: t.generationStatus,
      lastGenerationKind: lastKind,
      progressTotal: t.progressTotal,
      responsePayload,
    });
    return committed.envelope;
  }

  // One client requestId: atomic kickoff + claim (no server UUID).
  const started = await startMediationGeneration(input.admin, {
    session: input.session,
    requestId: input.clientRequestId,
    expectedScreen: input.session.current_screen,
    nextScreen: t.nextScreen,
    sessionPayload: t.sessionPayload,
    generationStatus: t.generationStatus,
    generationKind: t.kickoffGeneration,
    progressTotal: t.progressTotal,
  });

  if (started.outcome === 'ALREADY_COMPLETED') {
    if (isPublicEnvelope(started.response)) {
      return started.response;
    }
    throw new AppError('INTERNAL_ERROR', 500, 'start_completed_shape');
  }

  if (
    started.outcome === 'ALREADY_CLAIMED' ||
    started.outcome === 'IN_PROGRESS'
  ) {
    return processingEnvelope({
      session: started.session ?? input.session,
      correlationId: input.clientRequestId,
    });
  }

  // CLAIMED — session_version already +1 from kickoff; finalize expects this version.
  return runClaimedGeneration({
    admin: input.admin,
    session: started.session,
    mediation: input.mediation,
    talker: input.talker,
    requestId: input.clientRequestId,
    anthropicKey: input.anthropicKey,
    claimToken: started.claimToken,
    generationKind: t.kickoffGeneration,
  });
}

async function handleTurn(req: Request): Promise<{
  response: Response;
  mediationId?: string;
  requestId?: string;
}> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 401, 'auth_header');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')?.trim();

  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new AppError('INTERNAL_ERROR', 500, 'server_config');
  }
  if (!anthropicKey) {
    throw new AppError('INTERNAL_ERROR', 500, 'llm_config');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('INVALID_REQUEST', 400, 'json_body');
  }

  const parsed = parseTurnRequest(body);
  if (!parsed.ok) {
    throw new AppError('INVALID_REQUEST', 400, 'request_contract');
  }

  const request = parsed.value;
  const requestId = request.requestId;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    throw new AppError('UNAUTHORIZED', 401, 'get_user');
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // ─── Bootstrap START_OR_RESUME ───────────────────────────────────────────
  if (request.kind === 'bootstrap') {
    const mediationId = request.mediationId;
    try {
      const mediation = await loadMediation(admin, mediationId);
      assertMembership(user.id, mediation);
      const conflictCategory = requireConflictCategory(mediation);
      const coupleId = requireCoupleId(mediation);
      const partnerUserId = requirePartnerId(mediation);
      const hostUserId = mediation.user_id;

      let session: MediationSessionRow;
      const existingSessionId = await findSessionIdByMediationId(
        admin,
        mediationId
      );
      if (existingSessionId) {
        session = await loadSession(admin, existingSessionId);
      } else {
        session = await createSession(admin, {
          mediationId,
          coupleId,
          hostUserId,
          partnerUserId,
          conflictCategory,
        });
      }

      const talker = assertSessionMembership(user.id, session);

      if (session.generation_status === 'FAILED') {
        return {
          mediationId,
          requestId,
          response: jsonResponse(
            buildEnvelope({
              session,
              talker,
              correlationId: requestId,
            }),
            200
          ),
        };
      }

      if (needsGeneration(session)) {
        const envelope = await resumeOrProcessGeneration({
          admin,
          session,
          mediation,
          talker,
          requestId,
          anthropicKey,
        });
        return {
          mediationId,
          requestId,
          response: jsonResponse(envelope, 200),
        };
      }

      if (session.generation_status.startsWith('GENERATING_')) {
        return {
          mediationId,
          requestId,
          response: jsonResponse(
            processingEnvelope({ session, correlationId: requestId }),
            200
          ),
        };
      }

      return {
        mediationId,
        requestId,
        response: jsonResponse(
          buildEnvelope({
            session,
            talker,
            correlationId: requestId,
          }),
          200
        ),
      };
    } catch (error) {
      if (error instanceof AppError) {
        error.mediationId = mediationId;
        error.requestId = requestId;
      }
      throw error;
    }
  }

  // ─── Session actions ─────────────────────────────────────────────────────
  const sessionId = request.sessionId;
  let mediationId: string | undefined;

  try {
    let session = await loadSession(admin, sessionId);
    mediationId = session.mediation_id;
    const talker = assertSessionMembership(user.id, session);
    const mediation = await loadMediation(admin, session.mediation_id);
    assertMembership(user.id, mediation);

    const action = request.action;

    // LOAD_SESSION
    if (action.type === 'LOAD_SESSION') {
      if (session.generation_status === 'FAILED') {
        return {
          mediationId,
          requestId,
          response: jsonResponse(
            buildEnvelope({ session, talker, correlationId: requestId }),
            200
          ),
        };
      }
      if (needsGeneration(session)) {
        const envelope = await resumeOrProcessGeneration({
          admin,
          session,
          mediation,
          talker,
          requestId,
          anthropicKey,
        });
        return {
          mediationId,
          requestId,
          response: jsonResponse(envelope, 200),
        };
      }
      if (session.generation_status.startsWith('GENERATING_')) {
        return {
          mediationId,
          requestId,
          response: jsonResponse(
            processingEnvelope({ session, correlationId: requestId }),
            200
          ),
        };
      }
      return {
        mediationId,
        requestId,
        response: jsonResponse(
          buildEnvelope({ session, talker, correlationId: requestId }),
          200
        ),
      };
    }

    // Concurrent user action during generation → PROCESSING
    if (session.generation_status.startsWith('GENERATING_')) {
      if (action.type === 'RETRY') {
        throw new AppError('INVALID_TRANSITION', 409, 'retry_while_generating');
      }
      return {
        mediationId,
        requestId,
        response: jsonResponse(
          processingEnvelope({ session, correlationId: requestId }),
          200
        ),
      };
    }

    // RETRY
    if (action.type === 'RETRY') {
      const transition = retryTransition({ session });
      const envelope = await commitTransitionAndMaybeGenerate({
        admin,
        session,
        mediation,
        talker,
        clientRequestId: requestId,
        anthropicKey,
        transition,
      });
      return {
        mediationId,
        requestId,
        response: jsonResponse(envelope, 200),
      };
    }

    // Deterministic user transitions
    const transition = applyUserTransition({
      session,
      talker,
      action,
    });

    const envelope = await commitTransitionAndMaybeGenerate({
      admin,
      session,
      mediation,
      talker,
      clientRequestId: requestId,
      anthropicKey,
      transition,
    });

    return {
      mediationId,
      requestId,
      response: jsonResponse(envelope, 200),
    };
  } catch (error) {
    if (error instanceof AppError) {
      error.mediationId = mediationId;
      error.requestId = requestId;
    }
    throw error;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    logStageError({ publicCode: 'METHOD_NOT_ALLOWED', stage: 'method' });
    return errorResponse('METHOD_NOT_ALLOWED', 405);
  }

  let mediationId: string | undefined;
  let requestId: string | undefined;

  try {
    const result = await handleTurn(req);
    return result.response;
  } catch (error) {
    if (error instanceof AppError) {
      mediationId = error.mediationId;
      requestId = error.requestId;
      logStageError({
        publicCode: error.publicCode,
        stage: error.stage,
        requestId,
        mediationId,
      });
      return errorResponse(error.publicCode, error.httpStatus);
    }

    logStageError({
      publicCode: 'INTERNAL_ERROR',
      stage: 'unhandled',
      requestId,
      mediationId,
    });
    return errorResponse('INTERNAL_ERROR', 500);
  }
});
