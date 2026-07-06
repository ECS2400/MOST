/** CORS headers for mediator-runtime Edge Function. */
export const MEDIATOR_RUNTIME_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} as const;

/** Builds a CORS preflight response for OPTIONS requests. */
export function createMediatorRuntimeOptionsResponse(): Response {
  return new Response('ok', { status: 200, headers: MEDIATOR_RUNTIME_CORS_HEADERS });
}
