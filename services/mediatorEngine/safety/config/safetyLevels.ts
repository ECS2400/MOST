import type { InterventionType, SafetyLevel, SafetySignalCategory } from '@/types/mediator';

/** Numeric rank for comparing safety levels — higher is more severe. */
export const SAFETY_LEVEL_RANK: Record<SafetyLevel, number> = {
  none: 0,
  L1_gentle: 1,
  L2_pause: 2,
  L3_stop: 3,
};

/** Default level assigned to each signal category. */
export const CATEGORY_DEFAULT_LEVEL: Record<SafetySignalCategory, SafetyLevel> = {
  suicide: 'L3_stop',
  immediate_danger: 'L3_stop',
  child_safety: 'L3_stop',
  violence_threat: 'L3_stop',
  self_harm: 'L2_pause',
  abuse_disclosure: 'L2_pause',
  coercion_control: 'L2_pause',
  severe_distress: 'L2_pause',
};

/** Per-level output policy for Safety Layer L1. */
export interface SafetyLevelPolicy {
  preempted: boolean;
  blockGoalTransitions: boolean;
  blockStandardInterventions: boolean;
  recommendedInterventionType: InterventionType;
  allowedInterventionTypes: InterventionType[];
}

export const SAFETY_LEVEL_POLICIES: Record<Exclude<SafetyLevel, 'none'>, SafetyLevelPolicy> = {
  L3_stop: {
    preempted: true,
    blockGoalTransitions: true,
    blockStandardInterventions: true,
    recommendedInterventionType: 'safety_response',
    allowedInterventionTypes: ['safety_response', 'pause_session'],
  },
  L2_pause: {
    preempted: true,
    blockGoalTransitions: true,
    blockStandardInterventions: true,
    recommendedInterventionType: 'pause_session',
    allowedInterventionTypes: ['pause_session', 'safety_response', 'deescalate'],
  },
  L1_gentle: {
    preempted: false,
    blockGoalTransitions: true,
    blockStandardInterventions: false,
    recommendedInterventionType: 'deescalate',
    allowedInterventionTypes: ['deescalate', 'validate', 'reflect', 'pause_session'],
  },
};

/** Resolves the highest safety level from a list of levels. */
export function maxSafetyLevel(levels: SafetyLevel[]): SafetyLevel {
  if (levels.length === 0) return 'none';
  return levels.reduce((max, level) =>
    SAFETY_LEVEL_RANK[level] > SAFETY_LEVEL_RANK[max] ? level : max
  );
}

/** Resolves effective level for a signal — pattern level is authoritative. */
export function resolveSignalLevel(
  _category: SafetySignalCategory,
  patternLevel: SafetyLevel
): SafetyLevel {
  return patternLevel;
}
