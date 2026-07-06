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

  const result = await handleMediatorRuntimeTurn(body, { env: readEdgeEnv() });

  if ('status' in result && result.ok === false) {
    return jsonResponse(createMediatorRuntimeError(result.error.code, result.error.message), result.status);
  }

  if (result.ok === false) {
    return jsonResponse(result.error, mediatorRuntimeErrorStatus(result.error.code));
  }

  return jsonResponse(result, 200);
}
