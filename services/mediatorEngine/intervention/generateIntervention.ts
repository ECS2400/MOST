/**
 * Intervention Engine — Mediator AI Engine v2.3 pipeline step 7.
 *
 * Role: generates deliverable intervention content from decision and intent.
 * Phase 1E: deterministic L1 shell — placeholder content, no LLM.
 */

import type { Intervention, InterventionEngineInput } from '@/types/mediator';
import {
  buildIntervention,
  createMinimalIntervention,
} from '@/services/mediatorEngine/intervention/builder/buildIntervention';

/**
 * Generates a complete intervention ready for constitution validation.
 *
 * @param input - State, therapeutic intent, and decision engine output.
 * @returns Fully typed intervention placeholder.
 */
export function generateIntervention(input: InterventionEngineInput): Intervention {
  try {
    return buildIntervention(input);
  } catch {
    const turnNumber =
      typeof input?.turnNumber === 'number' && Number.isFinite(input.turnNumber)
        ? input.turnNumber
        : 1;
    return createMinimalIntervention(turnNumber);
  }
}
