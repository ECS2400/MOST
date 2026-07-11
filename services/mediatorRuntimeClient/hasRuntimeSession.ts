import type { RuntimeSession } from '@/types/mediator/runtimeSession';

/** Returns true when a persisted runtime session contract is available. */
export function hasRuntimeSession(
  runtimeSession: RuntimeSession | null | undefined
): boolean {
  return runtimeSession != null;
}
