import type { MediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/types';
import { MEDIATOR_RUNTIME_ENGINE_VERSION } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import { isRecord, isRuntimeSessionShape } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
import { normalizeStoredRuntimeSession } from '@/services/mediatorRuntimeClient/normalizeStoredRuntimeSession';
import type { MediationState } from '@/types/mediator/mediationState';
import type { SafetyLevel } from '@/types/mediator/safety';
import type { SessionMemory } from '@/types/mediator/sessionMemory';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export interface LoadedMediationRuntimeState {
  mediationState: MediationState | null;
  sessionMemory: SessionMemory | null;
  runtimeSession: RuntimeSession | null;
}

function parseStoredJsonObject<T extends object>(value: unknown): T | null {
  if (!isRecord(value)) {
    return null;
  }
  return value as T;
}

/** Parses a JSONB column value into RuntimeSession; normalizes older compatible shapes. */
export function parseStoredRuntimeSession(value: unknown): RuntimeSession | null {
  const normalized = normalizeStoredRuntimeSession(value);
  if (normalized) {
    return normalized;
  }
  return isRuntimeSessionShape(value) ? value : null;
}

export function parseLoadedMediationRuntimeRow(row: {
  mediation_state?: unknown;
  session_memory?: unknown;
  mediator_runtime_session?: unknown;
}): LoadedMediationRuntimeState {
  return {
    mediationState: parseStoredJsonObject<MediationState>(row.mediation_state),
    sessionMemory: parseStoredJsonObject<SessionMemory>(row.session_memory),
    runtimeSession: parseStoredRuntimeSession(row.mediator_runtime_session),
  };
}

const SAFETY_LEVEL_VALUES: readonly SafetyLevel[] = [
  'none',
  'L1_gentle',
  'L2_pause',
  'L3_stop',
];

function isSafetyLevel(value: unknown): value is SafetyLevel {
  return typeof value === 'string' && SAFETY_LEVEL_VALUES.includes(value as SafetyLevel);
}

function resolveMediatorLastSafetyLevel(runtime: MediatorRuntimeEdgeSuccess): SafetyLevel | null {
  const messageSafety = runtime.finalMediatorMessage?.safetyLevel;
  if (isSafetyLevel(messageSafety)) {
    return messageSafety;
  }

  const compliance = runtime.complianceResult;
  if (compliance && typeof compliance === 'object' && 'safetyLevel' in compliance) {
    const complianceSafety = (compliance as { safetyLevel?: unknown }).safetyLevel;
    if (isSafetyLevel(complianceSafety)) {
      return complianceSafety;
    }
  }

  return null;
}

/** Supabase update patch for v2.3 runtime state after a successful turn. */
export function buildMediationRuntimePersistencePatch(runtime: MediatorRuntimeEdgeSuccess) {
  const base = {
    mediation_state: runtime.mediationState,
    session_memory: runtime.sessionMemory,
    mediator_engine_version: runtime.engineVersion ?? MEDIATOR_RUNTIME_ENGINE_VERSION,
    mediator_runtime_session: runtime.runtimeSession,
    mediator_runtime_metadata: {
      turnNumber: runtime.runtimeMetadata.turnNumber,
      providerId: runtime.runtimeMetadata.providerId,
      fallbackUsed: runtime.fallbackUsed,
      retryCount: runtime.retryCount,
      ...(typeof __DEV__ !== 'undefined' && __DEV__
        ? { devDiagnostics: runtime.devDiagnostics ?? null }
        : {}),
      persistedAt: new Date().toISOString(),
    },
    mediator_last_goal: runtime.mediationState.currentGoal,
    mediator_last_strategy: runtime.mediationState.activeStrategy?.primary ?? null,
    mediator_last_safety_level: resolveMediatorLastSafetyLevel(runtime),
    updated_at: new Date().toISOString(),
  };

  return base;
}
