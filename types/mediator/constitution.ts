/**
 * Konstytucja Mediatora — compliance types for Mediator AI Engine v2.3.
 *
 * Role: ethical guardrails enforced by Constitution Compliance Validator
 * after Intervention Engine generation. Constitution > ADR > implementation.
 */

import type { ConfidenceScore, IsoTimestamp, TurnNumber } from './common';
import type { Intervention } from './interventions';

/** Severity of a constitution violation detected by the validator. */
export type ConstitutionViolationSeverity = 'block' | 'warn';

/** Validator layer — deterministic rules vs optional LLM review (future). */
export type ConstitutionValidatorLayer = 'deterministic' | 'llm';

/**
 * Single enforceable rule derived from Konstytucja Mediatora articles.
 *
 * Role: declarative rules checked against generated intervention content.
 * Stored in constants/mediator/constitutionRules (future), typed here.
 */
export interface ConstitutionRule {
  /** Article reference, e.g. `Art. 4`. */
  articleRef: string;
  ruleId: string;
  description: string;
  severity: ConstitutionViolationSeverity;
  /** Pattern IDs or phrase categories this rule guards against. */
  guardCategories: string[];
  /** Intervention types this rule applies to; empty = all types. */
  applicableInterventionTypes: string[];
}

/** Full constitution article metadata for documentation and validator mapping. */
export interface ConstitutionArticle {
  ref: string;
  chapter: string;
  title: string;
  text: string;
  relatedRuleIds: string[];
}

/** Single violation detected during compliance validation. */
export interface ConstitutionViolation {
  articleRef: string;
  ruleId: string;
  severity: ConstitutionViolationSeverity;
  confidence: ConfidenceScore;
  matchedText: string;
}

/**
 * Result of Constitution Compliance Validator for one generation attempt.
 *
 * Role: when compliant=false, orchestrator regenerates (max 2 retries) or
 * falls back to deterministic template.
 */
export interface ComplianceResult {
  compliant: boolean;
  violations: ConstitutionViolation[];
  attemptNumber: number;
  fallbackUsed: boolean;
  validatedAt: IsoTimestamp;
  validatorLayer: ConstitutionValidatorLayer;
}

/** Input to Constitution Compliance Validator. */
export interface ConstitutionValidatorInput {
  intervention: Intervention;
  applicableRules: ConstitutionRule[];
  turnNumber: TurnNumber;
  attemptNumber: number;
}

/** Output alias for validator pipeline step. */
export type ConstitutionComplianceResult = ComplianceResult;
