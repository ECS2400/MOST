import type { MediatorEngineVersion } from '@/types/mediator';

/** Relative path for mediator-runtime Edge Function (no domain). */
export const MEDIATOR_RUNTIME_FUNCTION_PATH = '/functions/v1/mediator-runtime';

/** Engine version sent to mediator-runtime Edge Function. */
export const MEDIATOR_RUNTIME_ENGINE_VERSION = 'v2.3' as const satisfies MediatorEngineVersion;

/** Single flag controlling legacy live-mediator vs mediator-runtime path. */
export type MediatorEnginePath = 'legacy' | 'runtime';

const ENGINE_PATH_ENV = 'EXPO_PUBLIC_MEDIATOR_ENGINE_PATH';

/** Default path — legacy until runtime rollout is enabled. */
export const DEFAULT_MEDIATOR_ENGINE_PATH: MediatorEnginePath = 'legacy';

/** Safe env access for React Native (no process) and Node test runners. */
export function getDefaultEnv(): Record<string, string | undefined> {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return {};
}

/** Reads mediator engine path from env; defaults to legacy (no app switch yet). */
export function getMediatorEnginePath(
  env: Record<string, string | undefined> = getDefaultEnv()
): MediatorEnginePath {
  const raw = env[ENGINE_PATH_ENV]?.trim().toLowerCase();
  if (raw === 'runtime' || raw === 'v2.3' || raw === 'v2') {
    return 'runtime';
  }
  if (raw === 'legacy' || raw === 'v1') {
    return 'legacy';
  }
  return DEFAULT_MEDIATOR_ENGINE_PATH;
}

/** Returns true when runtime path is selected via feature flag. */
export function isMediatorRuntimeEnabled(
  env: Record<string, string | undefined> = getDefaultEnv()
): boolean {
  return getMediatorEnginePath(env) === 'runtime';
}

/** Default request timeout for mediator-runtime Edge calls (ms). */
export const MEDIATOR_RUNTIME_DEFAULT_TIMEOUT_MS = 60_000;

/** Max automatic retries for transient mediator-runtime failures. */
export const MEDIATOR_RUNTIME_MAX_RETRIES = 2;

/** Backoff delays between retries (ms). */
export const MEDIATOR_RUNTIME_RETRY_DELAYS_MS = [500, 1_500] as const;

/** Builds full mediator-runtime URL from Supabase project base URL. */
export function resolveMediatorRuntimeEndpoint(supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}${MEDIATOR_RUNTIME_FUNCTION_PATH}`;
}
