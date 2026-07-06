import { getDefaultEnv } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import { isMediatorRuntimeEnabled } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';

const SHADOW_MODE_ENV = 'EXPO_PUBLIC_MEDIATOR_SHADOW_MODE';

/** Shadow invocation timeout — does not block legacy user response. */
export const MEDIATOR_SHADOW_TIMEOUT_MS = 2_000;

/** Reads shadow mode flag; independent of EXPO_PUBLIC_MEDIATOR_ENGINE_PATH. */
export function isMediatorShadowEnabled(
  env: Record<string, string | undefined> = getDefaultEnv()
): boolean {
  const raw = env[SHADOW_MODE_ENV]?.trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

/** Shadow runs only when legacy is the active engine path. */
export function shouldRunMediatorShadow(
  env: Record<string, string | undefined> = getDefaultEnv()
): boolean {
  return isMediatorShadowEnabled(env) && !isMediatorRuntimeEnabled(env);
}
