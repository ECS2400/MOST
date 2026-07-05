import type {
  ConstitutionRule,
  ConstitutionViolation,
} from '@/types/mediator';
import type { L1ViolationDraft } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionValidatorInput, InterventionSignature } from '@/types/mediator';
import type { SessionPersonality } from '@/types/mediator';
import type { L1Limits } from '@/services/mediatorEngine/constitution/config/l1Limits';

/** Shared context passed to every L1 rule function. */
export interface ConstitutionL1Context {
  intervention: ConstitutionValidatorInput['intervention'];
  turnNumber: ConstitutionValidatorInput['turnNumber'];
  attemptNumber: ConstitutionValidatorInput['attemptNumber'];
  sessionPersonality: SessionPersonality | null;
  recentInterventionSignatures: InterventionSignature[];
  limits: L1Limits;
}

/** Single deterministic L1 rule — extensible registry entry. */
export interface ConstitutionL1Rule {
  ruleId: string;
  articleRef: string;
  defaultSeverity: ConstitutionViolation['severity'];
  validate: (ctx: ConstitutionL1Context) => L1ViolationDraft | null;
}

/** Applies registry defaults (severity + articleRef) to a rule violation draft. */
export function finalizeViolationFromRegistry(
  draft: L1ViolationDraft,
  rule: ConstitutionL1Rule
): ConstitutionViolation {
  return {
    ruleId: draft.ruleId,
    articleRef: rule.articleRef,
    severity: rule.defaultSeverity,
    confidence: 100,
    matchedText: draft.matchedText,
  };
}

/** Applies severity/articleRef override from applicable {@link ConstitutionRule} entries. */
export function applyRuleSeverity(
  violation: ConstitutionViolation,
  applicableRules: ConstitutionRule[]
): ConstitutionViolation {
  const override = applicableRules.find((rule) => rule.ruleId === violation.ruleId);
  if (!override) return violation;
  return { ...violation, severity: override.severity, articleRef: override.articleRef };
}
