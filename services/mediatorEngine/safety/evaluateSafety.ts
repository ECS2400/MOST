/**
 * Human Safety Layer — Mediator AI Engine v2.3 pipeline step 2.
 *
 * Role: detects exceptional partner distress and may preempt the standard pipeline.
 * Phase 1I: deterministic L1 pattern matching — no LLM, no content in output.
 */

import type { SafetyInput, SafetyOutput } from '@/types/mediator';
import { createEmptySafetyOutput } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { buildSafetyOutput } from '@/services/mediatorEngine/safety/lib/buildSafetyOutput';
import { safeSafetyInput } from '@/services/mediatorEngine/safety/lib/safeSafetyInput';
import {
  scanStateSafetyMode,
  scanTranscriptMessages,
} from '@/services/mediatorEngine/safety/lib/scanTranscript';

/**
 * Evaluates safety signals in the current turn context.
 *
 * @param input - Current state and transcript delta for signal detection.
 * @returns Safety assessment with preemption flags and allowed intervention types.
 */
export function evaluateSafety(input: SafetyInput): SafetyOutput {
  try {
    const ctx = safeSafetyInput(input);
    const transcriptSignals = scanTranscriptMessages(ctx.messages, ctx.turnNumber);
    const stateSignals = scanStateSafetyMode(ctx.stateSafetyMode, ctx.turnNumber);
    return buildSafetyOutput([...transcriptSignals, ...stateSignals]);
  } catch {
    return createEmptySafetyOutput();
  }
}
