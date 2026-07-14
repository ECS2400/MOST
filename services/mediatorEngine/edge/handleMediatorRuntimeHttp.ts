import {
  createMediatorRuntimeError,
  mediatorRuntimeErrorStatus,
  MEDIATOR_RUNTIME_ERROR_CODES,
} from '@/services/mediatorEngine/edge/errors';
import { handleMediatorRuntimeTurn } from '@/services/mediatorEngine/edge/handleMediatorRuntimeTurn';
import type { MediatorRuntimeEdgeEnv } from '@/services/mediatorEngine/edge/types';
import {
  MEDIATOR_RUNTIME_CORS_HEADERS,
  createMediatorRuntimeOptionsResponse,
} from '@/services/mediatorEngine/edge/cors';
import { MEDIATOR_RUNTIME_BUILD_ID } from '@/services/mediatorEngine/edge/mediatorRuntimeBuild';
import { logRuntimeRequestContext } from '@/services/mediatorEngine/edge/runtimeRequestTraceDevLog';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...MEDIATOR_RUNTIME_CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function readEdgeEnv(): MediatorRuntimeEdgeEnv {
  return {
    openAiApiKey: Deno.env.get('OPENAI_API_KEY'),
    openAiModel: Deno.env.get('OPENAI_MODEL'),
    openAiTimeoutMs: Deno.env.get('OPENAI_TIMEOUT_MS'),
  };
}

/** HTTP entrypoint for Supabase Edge Function mediator-runtime. */
export async function handleMediatorRuntimeHttpRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return createMediatorRuntimeOptionsResponse();
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON,
        'Only POST is supported'
      ),
      405
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON,
        'Request body must be valid JSON'
      ),
      400
    );
  }

  const bodyRecord =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : null;

  logRuntimeRequestContext({
    method: req.method,
    cfRay: req.headers.get('cf-ray'),
    sbRequestId: req.headers.get('sb-request-id') ?? req.headers.get('x-sb-request-id'),
    mediationId: typeof bodyRecord?.mediationId === 'string' ? bodyRecord.mediationId : null,
    trigger: typeof bodyRecord?.trigger === 'string' ? bodyRecord.trigger : null,
    turnNumber: typeof bodyRecord?.turnNumber === 'number' ? bodyRecord.turnNumber : null,
    engineVersion:
      typeof bodyRecord?.engineVersion === 'string' ? bodyRecord.engineVersion : null,
  });

  console.info('[mediator-runtime-edge]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    method: req.method,
    engineVersion:
      typeof bodyRecord?.engineVersion === 'string' ? bodyRecord.engineVersion : null,
  });

  const result = await handleMediatorRuntimeTurn(body, { env: readEdgeEnv() });

  if ('status' in result && result.ok === false) {
    return jsonResponse(createMediatorRuntimeError(result.error.code, result.error.message), result.status);
  }

  if (result.ok === false) {
    return jsonResponse(result.error, mediatorRuntimeErrorStatus(result.error.code));
  }

  return jsonResponse(result, 200);
}
