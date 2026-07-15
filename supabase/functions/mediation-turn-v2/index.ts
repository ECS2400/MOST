/**
 * mediation-turn-v2 — minimal skeleton (no LLM, no DB, no auth).
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 4000;

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  correlationId: string
): Response {
  return new Response(JSON.stringify({ ...body, correlationId }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function logError(correlationId: string, error: string): void {
  console.error('[mediation-turn-v2]', { correlationId, error });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function validateBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  if (!isUuid(record.sessionId) || !isUuid(record.requestId)) return false;
  if (typeof record.message !== 'string') return false;
  const trimmed = record.message.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) return false;
  return true;
}

Deno.serve(async (req) => {
  const correlationId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    logError(correlationId, 'METHOD_NOT_ALLOWED');
    return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, correlationId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    logError(correlationId, 'INVALID_REQUEST');
    return jsonResponse({ ok: false, error: 'INVALID_REQUEST' }, 400, correlationId);
  }

  if (!validateBody(body)) {
    logError(correlationId, 'INVALID_REQUEST');
    return jsonResponse({ ok: false, error: 'INVALID_REQUEST' }, 400, correlationId);
  }

  return jsonResponse(
    {
      ok: false,
      error: 'NOT_IMPLEMENTED',
      message: 'mediation-turn-v2 skeleton is active',
    },
    501,
    correlationId
  );
});
