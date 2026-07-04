/**
 * Relationship pattern dictionary types.
 *
 * Role: leaf-level unions for relationship model — no engine imports.
 */

/** Recurring interaction pattern between partners. */
export type RelationshipPatternType =
  | 'withdraw_press'
  | 'pursue_withdraw'
  | 'blame_defend_cycle'
  | 'fixer_invalidated'
  | 'emotional_lead_follow'
  | 'competitive_suffering'
  | 'silent_treatment';
