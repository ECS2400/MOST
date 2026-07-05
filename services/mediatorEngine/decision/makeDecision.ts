/**
 * Decision Engine — Mediator AI Engine v2.3 pipeline step 6.
 *
 * Role: selects intervention type, intent, and goal transition for the turn.
 * Phase 1D: deterministic L1 decision rules — no LLM.
 */

import type { DecisionEngineInput, DecisionEngineOutput } from '@/types/mediator';
import {
  buildDecisionOutput,
  createMinimalSafeDecisionOutput,
} from '@/services/mediatorEngine/decision/resolve/buildDecisionOutput';

/**
 * Makes the final turn decision from upstream module outputs.
 *
 * @param input - State, reflection, strategy, priority, and safety context.
 * @returns Selected intervention type, intent, strategy, and goal transition.
 */
export function makeDecision(input: DecisionEngineInput): DecisionEngineOutput {
  try {
    return buildDecisionOutput(input);
  } catch {
    return createMinimalSafeDecisionOutput();
  }
}
