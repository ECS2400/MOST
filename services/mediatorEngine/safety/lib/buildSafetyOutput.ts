import type { ConfidenceValue, SafetyLevel, SafetyOutput, SafetySignal } from '@/types/mediator';
import { skeletonConfidence } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import {
  maxSafetyLevel,
  resolveSignalLevel,
  SAFETY_LEVEL_POLICIES,
} from '@/services/mediatorEngine/safety/config/safetyLevels';
import { ALL_SAFETY_PATTERNS } from '@/services/mediatorEngine/safety/rules/index';

function levelFromSignals(signals: SafetySignal[]): SafetyLevel {
  if (signals.length === 0) return 'none';

  const patternLevelById = new Map(ALL_SAFETY_PATTERNS.map((p) => [p.id, p.level]));
  const levels = signals.map((signal) => {
    const patternLevel = patternLevelById.get(signal.matchedPatternId) ?? 'L2_pause';
    return resolveSignalLevel(signal.category, patternLevel);
  });

  return maxSafetyLevel(levels);
}

function buildAssessed(level: SafetyLevel, signals: SafetySignal[]): ConfidenceValue<boolean> {
  const active = level !== 'none';
  const maxConfidence = signals.reduce((max, s) => Math.max(max, s.confidence), 0);
  const confidence = active
    ? Math.max(maxConfidence, level === 'L3_stop' ? 95 : level === 'L2_pause' ? 85 : 70)
    : 0;

  return {
    ...skeletonConfidence(active),
    confidence,
    evidence: signals.map((s) => s.evidenceRef).slice(0, 3),
  };
}

/** Assembles SafetyOutput from detected signals. */
export function buildSafetyOutput(signals: SafetySignal[]): SafetyOutput {
  const level = levelFromSignals(signals);

  if (level === 'none') {
    return {
      level: 'none',
      preempted: false,
      signals: [],
      recommendedInterventionType: 'welcome_open',
      blockGoalTransitions: false,
      blockStandardInterventions: false,
      allowedInterventionTypes: [],
      assessed: buildAssessed('none', []),
    };
  }

  const policy = SAFETY_LEVEL_POLICIES[level];

  return {
    level,
    preempted: policy.preempted,
    signals,
    recommendedInterventionType: policy.recommendedInterventionType,
    blockGoalTransitions: policy.blockGoalTransitions,
    blockStandardInterventions: policy.blockStandardInterventions,
    allowedInterventionTypes: [...policy.allowedInterventionTypes],
    assessed: buildAssessed(level, signals),
  };
}
