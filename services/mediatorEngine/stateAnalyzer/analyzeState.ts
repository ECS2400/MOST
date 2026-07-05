/**
 * State Analyzer — Mediator AI Engine v2.3 pipeline step 1.
 *
 * Role: ingests transcript delta and prior state; produces updated {@link MediationState}
 * and refreshed {@link EvidenceStore}. Phase 1F: deterministic L1 — no LLM.
 */

import type { StateAnalyzerInput, StateAnalyzerOutput } from '@/types/mediator';
import {
  buildStateAnalyzerOutput,
  createMinimalStateAnalyzerOutput,
} from '@/services/mediatorEngine/stateAnalyzer/analyze/buildStateAnalyzerOutput';

/**
 * Analyzes incoming messages and updates mediation state.
 *
 * @param input - Prior state, transcript delta, and turn index.
 * @returns Updated state snapshot and evidence store delta metadata.
 */
export function analyzeState(input: StateAnalyzerInput): StateAnalyzerOutput {
  try {
    return buildStateAnalyzerOutput(input);
  } catch {
    return createMinimalStateAnalyzerOutput(input);
  }
}
