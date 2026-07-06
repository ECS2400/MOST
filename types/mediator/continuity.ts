/**
 * Memory continuity types for Mediator AI Engine v2.3.
 *
 * Role: safe, structural cross-turn hints — no transcript or PII.
 */

import type { InterventionSignature } from './common';
import type { InterventionType } from './engineTypes';

/** Structural continuity snapshot derived from SessionMemory. */
export interface ContinuityContext {
  recentInterventionTypes: InterventionType[];
  recentSignatures: InterventionSignature[];
  effectivePatterns: InterventionType[];
  ineffectivePatterns: InterventionType[];
  repeatedMoveDetected: boolean;
  repeatedMoveReason: string | null;
  staleTopicDetected: boolean;
  staleTopicReason: string | null;
  lastEffectiveInterventionType: InterventionType | null;
  lastIneffectiveInterventionType: InterventionType | null;
  suggestedAvoidTypes: InterventionType[];
  suggestedPreferTypes: InterventionType[];
  continuityHint: string | null;
  confidence: number;
}
