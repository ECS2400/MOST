import { prepareSupabaseRequest, supabase } from '@/services/supabase';
import {
  parseLoadedMediationRuntimeRow,
  type LoadedMediationRuntimeState,
} from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

/** Loads v2.3 runtime state persisted on mediations (Phase UI-B.1b + UI-B.3b.4). */
export async function loadMediationRuntimeState(
  mediationId: string
): Promise<LoadedMediationRuntimeState> {
  try {
    await prepareSupabaseRequest();
    const { data, error } = await supabase
      .from('mediations')
      .select('mediation_state, session_memory, mediator_runtime_session')
      .eq('id', mediationId)
      .maybeSingle();

    if (error || !data) {
      return { mediationState: null, sessionMemory: null, runtimeSession: null };
    }

    return parseLoadedMediationRuntimeRow(data);
  } catch {
    return { mediationState: null, sessionMemory: null, runtimeSession: null };
  }
}

/** Loads the last persisted RuntimeSession for a mediation, if any. */
export async function loadMediationRuntimeSession(
  mediationId: string
): Promise<RuntimeSession | null> {
  const loaded = await loadMediationRuntimeState(mediationId);
  return loaded.runtimeSession;
}
