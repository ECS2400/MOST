import { STRATEGY_INTERVENTION_COMPATIBILITY } from '@/services/mediatorEngine/constitution/config/strategyInterventionMap';
import { getInterventionCoreFields } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';
import type { InterventionType, TherapeuticStrategy } from '@/types/mediator';

const RULE_ID = 'l1.strategy_intervention_type';

/** Ensures intervention type is allowed for the selected therapeutic strategy. */
export function validateStrategyInterventionType(ctx: ConstitutionL1Context) {
  const { strategy, type } = getInterventionCoreFields(ctx.intervention);
  if (!strategy || !type) return null;

  const allowed = STRATEGY_INTERVENTION_COMPATIBILITY[strategy as TherapeuticStrategy];
  if (!allowed) return createViolation(RULE_ID, `${strategy} → ${type}`);
  if (allowed.includes(type as InterventionType)) return null;
  return createViolation(RULE_ID, `${strategy} → ${type}`);
}
