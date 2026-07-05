/**
 * Therapeutic Strategy Engine — Mediator AI Engine v2.3 pipeline step 4.
 *
 * Role: selects primary/secondary therapeutic strategies for the current turn.
 * Phase 1H: deterministic L1 strategy selection — no LLM, no message content.
 */

import type { StrategyEngineInput, StrategyEngineOutput } from '@/types/mediator';
import { createEmptyStrategyOutput } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { buildStrategyOutput } from '@/services/mediatorEngine/strategy/resolve/buildStrategyOutput';
import { safeStrategyInput } from '@/services/mediatorEngine/strategy/lib/safeStrategyInput';

/**
 * Selects therapeutic strategies given state context and upstream module outputs.
 *
 * @param input - State slice, reflection, safety context, and turn index.
 * @returns Strategy recommendation with goal transition hint.
 */
export function selectStrategy(input: StrategyEngineInput): StrategyEngineOutput {
  try {
    const ctx = safeStrategyInput(input);
    return buildStrategyOutput(ctx);
  } catch {
    return createEmptyStrategyOutput();
  }
}
