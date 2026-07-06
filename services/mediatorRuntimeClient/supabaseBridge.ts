import {
  getSupabaseRequestHeaders,
  prepareSupabaseRequest,
  SUPABASE_URL,
} from '@/services/supabase';
import {
  resolveMediatorRuntimeEndpoint,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';

/** mediator-runtime Edge Function URL — derived from existing Supabase client config. */
export function getMediatorRuntimeEndpoint(): string {
  return resolveMediatorRuntimeEndpoint(SUPABASE_URL);
}

/** Auth headers for mediator-runtime Edge calls via existing Supabase session. */
export async function getMediatorRuntimeRequestHeaders(): Promise<Record<string, string>> {
  await prepareSupabaseRequest();
  return getSupabaseRequestHeaders();
}
