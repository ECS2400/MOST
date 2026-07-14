import { persistRecoveredRuntimeSessionDefault } from '@/services/mediatorRuntimeClient/persistRecoveredRuntimeSession';
import {
  recoverMediationRuntimeSessionCore,
  type PersistRecoveredRuntimeSession,
  type RecoverMediationRuntimeSessionInput,
  type RecoverMediationRuntimeSessionResult,
} from '@/services/mediatorRuntimeClient/recoverMediationRuntimeSessionCore';

export type {
  PersistRecoveredRuntimeSession,
  PersistRecoveredRuntimeSessionInput,
  PersistRecoveredRuntimeSessionResult,
  RecoverMediationRuntimeSessionInput,
  RecoverMediationRuntimeSessionResult,
} from '@/services/mediatorRuntimeClient/recoverMediationRuntimeSessionCore';

/** Host-only recovery when mediator_runtime_session is missing but state/memory exist. */
export async function recoverMediationRuntimeSession(
  input: RecoverMediationRuntimeSessionInput,
  persist: PersistRecoveredRuntimeSession = persistRecoveredRuntimeSessionDefault
): Promise<RecoverMediationRuntimeSessionResult> {
  return recoverMediationRuntimeSessionCore(input, persist);
}
