/**
 * Session personality types for Mediator AI Engine v2.3.
 *
 * Role: stable stylistic identity of the mediator within one session.
 * Used by Intervention Library tone selection and MediationState persistence.
 */

import type { TurnNumber } from './common';
import type { SessionPersonalityProfile } from './engineTypes';

/** Core stylistic trait scores (0–100), fixed after SAFE_OPENING. */
export interface SessionPersonalityCore {
  calm: number;
  warm: number;
  structured: number;
  neutral: number;
  empathetic: number;
  confident: number;
}

/** Bounded micro-adjustments applied during the session (max ±15 per trait). */
export interface SessionPersonalityAdaptiveModifiers {
  warmthBoost: number;
  structureBoost: number;
  lastAdjustedTurn: TurnNumber;
}

/**
 * Stable stylistic identity of the mediator for one session.
 *
 * Role: modulates Intervention Library tone without changing Constitution rules.
 * Established at SAFE_OPENING; core values are immutable thereafter.
 */
export interface SessionPersonality {
  core: SessionPersonalityCore;
  profile: SessionPersonalityProfile;
  adaptiveModifiers: SessionPersonalityAdaptiveModifiers;
  /** Reference IDs pointing to Constitution articles — not free text. */
  immutableRuleRefs: string[];
}
