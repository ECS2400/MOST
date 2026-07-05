import type { ConfidenceScore, SafetyLevel, SafetySignalCategory } from '@/types/mediator';

/** Declarative safety pattern — matched internally, never stored in output. */
export interface SafetyPatternDefinition {
  id: string;
  category: SafetySignalCategory;
  level: SafetyLevel;
  confidence: ConfidenceScore;
  phrases: string[];
  /** Regex source strings — compiled at scan time. */
  regexSources?: string[];
}

export type { SafetyPatternDefinition as SafetyPattern };
