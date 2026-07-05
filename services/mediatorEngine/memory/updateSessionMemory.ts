/**
 * Session Memory — Mediator AI Engine v2.3 pipeline step 9.
 *
 * Role: accumulates operational session knowledge after each turn.
 * Phase 1C: deterministic L1 updates — no LLM, no transcript storage.
 */

import type { SessionMemory, SessionMemoryUpdateInput } from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { buildSessionMemoryUpdate } from '@/services/mediatorEngine/memory/update/buildSessionMemoryUpdate';
import { normalizeMemory } from '@/services/mediatorEngine/memory/lib/normalizeMemory';

/**
 * Updates session memory with turn outcomes.
 *
 * @param input - Prior memory, state, intervention, reflection, and compliance.
 * @returns Updated session memory for persistence and downstream modules.
 */
export function updateSessionMemory(input: SessionMemoryUpdateInput): SessionMemory {
  try {
    return buildSessionMemoryUpdate(input);
  } catch {
    return normalizeMemory(input.previousMemory ?? createEmptySessionMemory());
  }
}
