import { MEDIATOR_RUNTIME_ENGINE_VERSION } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import type {
  PersistRecoveredRuntimeSession,
  PersistRecoveredRuntimeSessionInput,
  PersistRecoveredRuntimeSessionResult,
} from '@/services/mediatorRuntimeClient/recoverMediationRuntimeSessionCore';
import { prepareSupabaseRequest, supabase } from '@/services/supabase';

export async function persistRecoveredRuntimeSessionDefault(
  input: PersistRecoveredRuntimeSessionInput
): Promise<PersistRecoveredRuntimeSessionResult> {
  await prepareSupabaseRequest();
  const { data, error } = await supabase
    .from('mediations')
    .update({
      session_memory: input.sessionMemory,
      mediator_runtime_session: input.runtimeSession,
      mediator_engine_version: MEDIATOR_RUNTIME_ENGINE_VERSION,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.mediationId)
    .select('mediator_runtime_session')
    .single();

  return {
    rawRuntimeSession: data?.mediator_runtime_session ?? null,
    error: error
      ? {
          code: error.code ?? 'unknown',
          message: error.message ?? 'unknown',
        }
      : null,
  };
}

export type { PersistRecoveredRuntimeSession };
