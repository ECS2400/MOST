import {
  getInterventionContent,
  getInterventionCoreFields,
  getInterventionSignature,
} from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.required_fields';

/** Ensures all mandatory intervention fields are present and non-empty. */
export function validateRequiredFields(ctx: ConstitutionL1Context) {
  const intervention = ctx.intervention;
  const missing: string[] = [];

  if (!intervention || typeof intervention !== 'object') {
    return createViolation(RULE_ID, 'intervention');
  }

  const record = intervention as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id.trim()) missing.push('id');
  if (!record.type) missing.push('type');
  if (!record.target) missing.push('target');
  if (!record.visibility) missing.push('visibility');

  const content = getInterventionContent(intervention);
  if (!content) missing.push('content');
  else if (content.primaryMessage === undefined) missing.push('content.primaryMessage');

  const core = getInterventionCoreFields(intervention);
  if (!core.goal) missing.push('goal');
  if (!core.intent) missing.push('intent');
  if (!core.strategy) missing.push('strategy');
  if (record.rationale === undefined) missing.push('rationale');
  if (!record.expectedEffect) missing.push('expectedEffect');
  if (!getInterventionSignature(intervention).trim()) missing.push('signature');
  if (typeof record.generatedAt !== 'string' || !record.generatedAt.trim()) {
    missing.push('generatedAt');
  }

  if (missing.length === 0) return null;
  return createViolation(RULE_ID, missing.join(', '));
}
