/**
 * Session Memory — Mediator AI Engine v2.3 pipeline step 9.
 *
 * Role: accumulates operational session knowledge after each turn.
 * Phase 0B: returns the previous memory unchanged.
 */

import type { SessionMemory, SessionMemoryUpdateInput } from '@/types/mediator';

/**
 * Updates session memory with turn outcomes.
 *
 * @param input - Prior memory, state, intervention, reflection, and compliance.
 * @returns Updated session memory for persistence and downstream modules.
 */
export function updateSessionMemory(input: SessionMemoryUpdateInput): SessionMemory {
  // TODO(Phase 1): append intervention history, breakthroughs, and reflection log.
  return input.previousMemory;
}
