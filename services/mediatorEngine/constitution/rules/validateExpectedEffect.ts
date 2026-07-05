import {
  getExpectedEffect,
  getObservableSignals,
} from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.expected_effect';

/** Ensures structured ExpectedEffect fields are present and non-empty. */
export function validateExpectedEffect(ctx: ConstitutionL1Context) {
  const effect = getExpectedEffect(ctx.intervention);
  if (!effect) return null;

  const missing: string[] = [];

  if (typeof effect.id !== 'string' || !effect.id.trim()) missing.push('id');
  if (typeof effect.description !== 'string' || !effect.description.trim()) {
    missing.push('description');
  }
  if (!getObservableSignals(effect).some((signal) => signal.trim().length > 0)) {
    missing.push('observableSignals');
  }
  if (!effect.targetParticipant) missing.push('targetParticipant');
  if (!effect.verificationMethod) missing.push('verificationMethod');
  if (!effect.successCriteria || typeof effect.successCriteria !== 'object') {
    missing.push('successCriteria');
  } else if (!effect.successCriteria.type) {
    missing.push('successCriteria.type');
  }
  if (effect.timeHorizon !== 1 && effect.timeHorizon !== 2) missing.push('timeHorizon');

  if (missing.length === 0) return null;
  return createViolation(RULE_ID, missing.join(', '));
}
