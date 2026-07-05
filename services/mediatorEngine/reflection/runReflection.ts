/**
 * Reflection Engine — Mediator AI Engine v2.3 pipeline step 3.
 *
 * Role: meta-cognitive evaluation of mediator effectiveness after state update.
 * Phase 1G: deterministic L1 structural reflection — no LLM, no message content.
 */

import type { ReflectionInput, ReflectionOutput } from '@/types/mediator';
import { createEmptyReflectionOutput } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { buildReflectionOutput } from '@/services/mediatorEngine/reflection/evaluate/buildReflectionOutput';
import { safeReflectionInput } from '@/services/mediatorEngine/reflection/lib/safeReflectionInput';

/**
 * Reflects on the previous intervention and state transition.
 *
 * @param input - Intervention, state snapshots, transcript delta, and optional metadata.
 * @returns Reflection assessment consumed by Strategy and Decision engines.
 */
export function runReflection(input: ReflectionInput): ReflectionOutput {
  try {
    const ctx = safeReflectionInput(input);
    return buildReflectionOutput(ctx);
  } catch {
    return createEmptyReflectionOutput();
  }
}
