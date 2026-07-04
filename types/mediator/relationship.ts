/**
 * Relationship Model types (future-ready) for Mediator AI Engine v2.3.
 *
 * Role: session-scoped pattern detection in v2.3 MVP; cross-session port
 * defined but not implemented until Learning Layer Phase 5.
 */

import type { ConfidenceScore, IsoTimestamp, TurnNumber } from './common';
import type { EvidencedConclusion } from './evidence';
import type { ParticipantRole } from './common';

/** Recurring interaction pattern between partners. */
export type RelationshipPatternType =
  | 'withdraw_press'
  | 'pursue_withdraw'
  | 'blame_defend_cycle'
  | 'fixer_invalidated'
  | 'emotional_lead_follow'
  | 'competitive_suffering'
  | 'silent_treatment';

/** Behaviour label in a relationship pattern sequence step. */
export type PatternBehavior =
  | 'withdraw'
  | 'press'
  | 'escalate'
  | 'apologize'
  | 'silence'
  | 'defend'
  | 'invalidate'
  | 'pursue';

/** Single step in a detected relationship pattern sequence. */
export interface PatternStep {
  actor: ParticipantRole;
  behavior: PatternBehavior;
  turnNumber: TurnNumber;
}

/**
 * Detected in-session relationship pattern.
 *
 * Role: input to TSE and Explainability; no PII exported cross-session.
 */
export interface RelationshipPattern {
  id: string;
  type: RelationshipPatternType;
  confidence: EvidencedConclusion<boolean>;
  occurrences: number;
  firstSeenTurn: TurnNumber;
  lastSeenTurn: TurnNumber;
  participants: ParticipantRole[];
  sequence: PatternStep[];
}

/** Anonymised cross-session pattern summary (Learning Layer future). */
export interface AnonymizedPatternSummary {
  patternType: RelationshipPatternType;
  frequency: number;
  lastSeenSessionAt: IsoTimestamp;
}

/**
 * Port for cross-session relationship insights (not implemented in MVP).
 *
 * Role: architecture seam for Phase 5 opt-in cross-session features.
 */
export interface RelationshipModelPort {
  getHistoricalPatterns: (coupleId: string) => Promise<AnonymizedPatternSummary[]>;
}

/** Session-scoped relationship model state. */
export interface RelationshipModelState {
  detectedPatterns: RelationshipPattern[];
  dominantPatternType: RelationshipPatternType | null;
  confidence: ConfidenceScore;
}
