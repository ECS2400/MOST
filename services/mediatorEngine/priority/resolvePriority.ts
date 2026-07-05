/**
 * Priority Engine — Mediator AI Engine v2.3 pipeline step 5.
 *
 * Role: resolves competing dynamic signals into a single ranked decision context.
 * Phase 1B: deterministic L1 signal ranking — no LLM.
 */

import type { PriorityInput, PriorityOutput } from '@/types/mediator';
import {
  buildPriorityOutput,
  createMinimalSafePriorityOutput,
} from '@/services/mediatorEngine/priority/resolve/buildPriorityOutput';
import { collectPrioritySignals } from '@/services/mediatorEngine/priority/signals/index';

/**
 * Resolves active priority signals and constrains intervention selection.
 *
 * @param input - State, reflection, safety, strategy output, and turn index.
 * @returns Ranked signals, conversation mode, and intervention constraints.
 */
export function resolvePriority(input: PriorityInput): PriorityOutput {
  try {
    const signals = collectPrioritySignals({ input });
    return buildPriorityOutput(signals, input);
  } catch {
    try {
      return buildPriorityOutput([], input);
    } catch {
      return createMinimalSafePriorityOutput(input);
    }
  }
}
