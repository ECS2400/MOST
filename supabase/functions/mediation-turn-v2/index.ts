/**
 * mediation-turn-v2 — SUMMARY + EASY_CHOICES (one screen = one Claude call).
 *
 * Vertical slice:
 * POST → Auth → mediations → create/load mediation_session
 * → claim → Anthropic (single screen) → finalize → public envelope
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildEasyChoicesResponse,
  classifyEasyChoicesBootstrap,
  isPublicEasyChoicesResponse,
  readEasyChoicesCurrentRound,
  withEasyChoicesRoundsOnPayload,
} from './easyChoicesBootstrap.ts';
import { AppError, logStageError, mapRpcErrorMessage } from './errors.ts';
import { parseBootstrapRequest } from './request.ts';
import {
  buildSummaryResponse,
  classifySummaryBootstrap,
  isPublicSummaryResponse,
  readSummaryText,
  withSummaryOnPayload,
} from './summaryBootstrap.ts';
import {
  generateEasyChoicesRounds,
  generateSummaryText,
  SUMMARY_MODEL_VERSION,
  SUMMARY_PROMPT_VERSION,
} from './summaryLlm.ts';
import type {
  ClaimOutcome,
  CommitClaimedResult,
  EasyChoiceRound,
  MediationRow,
  MediationSessionRow,
  MediationTurnV2Response,
  PublicErrorCode,
} from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SUMMARY_GENERATION_KIND = 'SUMMARY';
const EASY_CHOICES_GENERATION_KIND = 'EASY_CHOICES';

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

function asSessionRow(value: unknown): MediationSessionRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.session_id !== 'string') return null;
  if (typeof row.session_version !== 'number') return null;
  if (typeof row.current_screen !== 'string') return null;
  if (typeof row.generation_status !== 'string') return null;
  if (!row.session_payload || typeof row.session_payload !== 'object') {
    return null;
  }
  return {
    session_id: row.session_id,
    mediation_id: String(row.mediation_id ?? ''),
    couple_id: String(row.couple_id ?? ''),
    host_user_id: String(row.host_user_id ?? ''),
    partner_user_id:
      typeof row.partner_user_id === 'string' ? row.partner_user_id : null,
    conflict_category: String(row.conflict_category ?? ''),
    session_payload: row.session_payload as Record<string, unknown>,
    session_version: row.session_version,
    current_screen: row.current_screen,
    generation_status: row.generation_status,
    last_generation_kind:
      typeof row.last_generation_kind === 'string'
        ? row.last_generation_kind
        : null,
    progress_total:
      typeof row.progress_total === 'number' ? row.progress_total : 6,
    prompt_version: String(row.prompt_version ?? ''),
    model_version: String(row.model_version ?? ''),
  };
}

function throwRpc(error: { message?: string } | null, stage: string): never {
  throw mapRpcErrorMessage(error?.message ?? 'UNKNOWN_RPC_ERROR', stage);
}

function parseClaimOutcome(value: unknown): ClaimOutcome {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('INTERNAL_ERROR', 500, 'claim_shape');
  }
  const row = value as Record<string, unknown>;
  const outcome = row.outcome;

  if (outcome === 'CLAIMED') {
    if (typeof row.claimToken !== 'string' || row.claimToken.length === 0) {
      throw new AppError('INTERNAL_ERROR', 500, 'claim_token_missing');
    }
    return { outcome: 'CLAIMED', claimToken: row.claimToken };
  }

  if (outcome === 'ALREADY_CLAIMED') {
    return { outcome: 'ALREADY_CLAIMED' };
  }

  if (outcome === 'IN_PROGRESS') {
    return { outcome: 'IN_PROGRESS' };
  }

  if (outcome === 'ALREADY_COMPLETED') {
    return { outcome: 'ALREADY_COMPLETED', response: row.response };
  }

  throw new AppError('INTERNAL_ERROR', 500, 'claim_outcome');
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

  if (error) {
    throw new AppError('INTERNAL_ERROR', 500, 'load_mediation');
  }
  if (!data) {
    throw new AppError('MEDIATION_NOT_FOUND', 404, 'load_mediation');
  }
  return data as unknown as MediationRow;
}

function assertMembership(userId: string, mediation: MediationRow): void {
  if (userId === mediation.user_id) return;
  if (mediation.partner_id && userId === mediation.partner_id) return;
  throw new AppError('FORBIDDEN', 403, 'membership');
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

  if (error) {
    throw new AppError('INTERNAL_ERROR', 500, 'find_session');
  }
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

async function claimGeneration(
  admin: SupabaseClient,
  input: {
    session: MediationSessionRow;
    requestId: string;
    generationKind: string;
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

async function failGenerationClaim(
  admin: SupabaseClient,
  input: {
    sessionId: string;
    requestId: string;
    claimToken: string;
    generationKind: string;
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
    generationKind: string;
    expectedScreen: string;
    nextScreen: string;
    sessionPayload: Record<string, unknown>;
    responsePayload: MediationTurnV2Response;
  }
): Promise<MediationTurnV2Response> {
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
      p_progress_total: 6,
      p_response_payload: input.responsePayload,
    }
  );

  if (error) throwRpc(error, 'commit_claimed_mediation_generation');

  const result = data as CommitClaimedResult;
  if (!result || typeof result !== 'object') {
    throw new AppError('INTERNAL_ERROR', 500, 'commit_shape');
  }

  if (result.replayed === true) {
    if (
      !isPublicSummaryResponse(result.response) &&
      !isPublicEasyChoicesResponse(result.response)
    ) {
      throw new AppError('INTERNAL_ERROR', 500, 'commit_replay_shape');
    }
    return { ...result.response, replayed: true };
  }

  if (isPublicSummaryResponse(result.response)) {
    return result.response;
  }
  if (isPublicEasyChoicesResponse(result.response)) {
    return result.response;
  }

  return input.responsePayload;
}

function isPublicBootstrapResponse(
  value: unknown
): value is MediationTurnV2Response {
  return (
    isPublicSummaryResponse(value) || isPublicEasyChoicesResponse(value)
  );
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

async function runSummaryGeneration(input: {
  admin: SupabaseClient;
  session: MediationSessionRow;
  mediation: MediationRow;
  hostUserId: string;
  requestId: string;
  anthropicKey: string;
  claimToken: string;
}): Promise<MediationTurnV2Response> {
  const language = await resolveLanguage(input.admin, input.hostUserId);

  let summaryText: string;
  try {
    summaryText = await generateSummaryText({
      mediation: input.mediation,
      language,
      apiKey: input.anthropicKey,
    });
  } catch (error) {
    await failGenerationClaim(input.admin, {
      sessionId: input.session.session_id,
      requestId: input.requestId,
      claimToken: input.claimToken,
      generationKind: SUMMARY_GENERATION_KIND,
    });
    throw error;
  }

  const nextVersion = input.session.session_version + 1;
  const responsePayload = buildSummaryResponse({
    sessionId: input.session.session_id,
    sessionVersion: nextVersion,
    summaryText,
    replayed: false,
  });

  return finalizeClaimedGeneration(input.admin, {
    session: input.session,
    requestId: input.requestId,
    claimToken: input.claimToken,
    generationKind: SUMMARY_GENERATION_KIND,
    expectedScreen: 'SUMMARY',
    nextScreen: 'SUMMARY',
    sessionPayload: withSummaryOnPayload(
      input.session.session_payload,
      summaryText
    ),
    responsePayload,
  });
}

async function runEasyChoicesGeneration(input: {
  admin: SupabaseClient;
  session: MediationSessionRow;
  hostUserId: string;
  requestId: string;
  anthropicKey: string;
  claimToken: string;
}): Promise<MediationTurnV2Response> {
  const language = await resolveLanguage(input.admin, input.hostUserId);
  const summaryText = readSummaryText(input.session.session_payload);
  if (summaryText === null) {
    await failGenerationClaim(input.admin, {
      sessionId: input.session.session_id,
      requestId: input.requestId,
      claimToken: input.claimToken,
      generationKind: EASY_CHOICES_GENERATION_KIND,
    });
    throw new AppError(
      'UNSUPPORTED_SESSION_STATE',
      422,
      'easy_choices_missing_summary'
    );
  }

  let rounds: EasyChoiceRound[];
  try {
    rounds = await generateEasyChoicesRounds({
      language,
      summaryText,
      conflictCategory: input.session.conflict_category,
      apiKey: input.anthropicKey,
    });
  } catch (error) {
    await failGenerationClaim(input.admin, {
      sessionId: input.session.session_id,
      requestId: input.requestId,
      claimToken: input.claimToken,
      generationKind: EASY_CHOICES_GENERATION_KIND,
    });
    throw error;
  }

  const nextVersion = input.session.session_version + 1;
  const currentRound = readEasyChoicesCurrentRound(
    input.session.session_payload
  );
  const responsePayload = buildEasyChoicesResponse({
    sessionId: input.session.session_id,
    sessionVersion: nextVersion,
    rounds,
    currentRound,
    replayed: false,
  });

  return finalizeClaimedGeneration(input.admin, {
    session: input.session,
    requestId: input.requestId,
    claimToken: input.claimToken,
    generationKind: EASY_CHOICES_GENERATION_KIND,
    expectedScreen: 'EASY_CHOICES',
    nextScreen: 'EASY_CHOICES',
    sessionPayload: withEasyChoicesRoundsOnPayload(
      input.session.session_payload,
      rounds
    ),
    responsePayload,
  });
}

async function handleClaimedOutcomes(input: {
  claim: ClaimOutcome;
  mediationId: string;
  requestId: string;
  onClaimed: (claimToken: string) => Promise<MediationTurnV2Response>;
}): Promise<{
  response: Response;
  mediationId: string;
  requestId: string;
}> {
  if (
    input.claim.outcome === 'ALREADY_CLAIMED' ||
    input.claim.outcome === 'IN_PROGRESS'
  ) {
    throw new AppError(
      'GENERATION_ALREADY_RUNNING',
      409,
      'claim_already_running'
    );
  }

  if (input.claim.outcome === 'ALREADY_COMPLETED') {
    if (!isPublicBootstrapResponse(input.claim.response)) {
      throw new AppError('INTERNAL_ERROR', 500, 'claim_completed_shape');
    }
    return {
      mediationId: input.mediationId,
      requestId: input.requestId,
      response: jsonResponse(input.claim.response, 200),
    };
  }

  const envelope = await input.onClaimed(input.claim.claimToken);
  return {
    mediationId: input.mediationId,
    requestId: input.requestId,
    response: jsonResponse(envelope, 200),
  };
}

async function handleBootstrap(req: Request): Promise<{
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

  const parsed = parseBootstrapRequest(body);
  if (!parsed.ok) {
    throw new AppError('INVALID_REQUEST', 400, 'request_contract');
  }

  const { mediationId, requestId } = parsed.value;

  try {
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

    if (session.current_screen === 'EASY_CHOICES') {
      const easyCase = classifyEasyChoicesBootstrap(session);
      if (easyCase.kind === 'unsupported') {
        throw new AppError(
          'UNSUPPORTED_SESSION_STATE',
          422,
          'easy_choices_bootstrap_state'
        );
      }

      if (easyCase.kind === 'resume') {
        return {
          mediationId,
          requestId,
          response: jsonResponse(
            buildEasyChoicesResponse({
              sessionId: session.session_id,
              sessionVersion: session.session_version,
              rounds: easyCase.rounds,
              currentRound: easyCase.currentRound,
              replayed: false,
            }),
            200
          ),
        };
      }

      const claim = await claimGeneration(admin, {
        session,
        requestId,
        generationKind: EASY_CHOICES_GENERATION_KIND,
        expectedScreen: 'EASY_CHOICES',
      });

      return handleClaimedOutcomes({
        claim,
        mediationId,
        requestId,
        onClaimed: (claimToken) =>
          runEasyChoicesGeneration({
            admin,
            session,
            hostUserId,
            requestId,
            anthropicKey,
            claimToken,
          }),
      });
    }

    if (session.current_screen !== 'SUMMARY') {
      throw new AppError(
        'UNSUPPORTED_SESSION_STATE',
        422,
        'unsupported_screen'
      );
    }

    const bootstrapCase = classifySummaryBootstrap(session);

    if (bootstrapCase.kind === 'unsupported') {
      throw new AppError(
        'UNSUPPORTED_SESSION_STATE',
        422,
        'summary_bootstrap_state'
      );
    }

    if (bootstrapCase.kind === 'resume') {
      return {
        mediationId,
        requestId,
        response: jsonResponse(
          buildSummaryResponse({
            sessionId: session.session_id,
            sessionVersion: session.session_version,
            summaryText: bootstrapCase.summaryText,
            replayed: false,
          }),
          200
        ),
      };
    }

    const claim = await claimGeneration(admin, {
      session,
      requestId,
      generationKind: SUMMARY_GENERATION_KIND,
      expectedScreen: 'SUMMARY',
    });

    return handleClaimedOutcomes({
      claim,
      mediationId,
      requestId,
      onClaimed: (claimToken) =>
        runSummaryGeneration({
          admin,
          session,
          mediation,
          hostUserId,
          requestId,
          anthropicKey,
          claimToken,
        }),
    });
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
    const result = await handleBootstrap(req);
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
