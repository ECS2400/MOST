import type { ComplianceResult, ComplianceResultSummary } from '@/types/mediator';

/** Builds a structural compliance snapshot without violation text content. */
export function summarizeComplianceResult(compliance: ComplianceResult): ComplianceResultSummary {
  const violations = Array.isArray(compliance.violations) ? compliance.violations : [];
  return {
    compliant: compliance.compliant === true,
    violationCount: violations.length,
    blockingViolationCount: violations.filter((violation) => violation.severity === 'block').length,
    fallbackUsed: compliance.fallbackUsed === true,
    attemptNumber: typeof compliance.attemptNumber === 'number' ? compliance.attemptNumber : 1,
  };
}
