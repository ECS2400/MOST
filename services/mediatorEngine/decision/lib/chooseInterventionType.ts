import type { InterventionType, PriorityOutput } from '@/types/mediator';
import {
  DEFAULT_ALLOWED_INTERVENTIONS,
  DEFAULT_SAFETY_ALLOWED_INTERVENTIONS,
  SAFE_FALLBACK_INTERVENTION_ORDER,
  SAFETY_FALLBACK_INTERVENTION_ORDER,
} from '@/services/mediatorEngine/decision/config/interventionFallbacks';
import { isAllowedIntervention } from '@/services/mediatorEngine/decision/lib/isAllowedIntervention';
import { isForbiddenIntervention } from '@/services/mediatorEngine/decision/lib/isForbiddenIntervention';

function normalizeInterventionTypes(value: unknown): InterventionType[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is InterventionType => typeof entry === 'string');
}

function permittedTypes(
  allowed: readonly InterventionType[],
  forbidden: readonly InterventionType[]
): InterventionType[] {
  return allowed.filter((type) => !isForbiddenIntervention(type, forbidden));
}

function pickFromFallbackOrder(
  order: readonly InterventionType[],
  permitted: readonly InterventionType[]
): InterventionType | null {
  for (const candidate of order) {
    if (permitted.includes(candidate)) return candidate;
  }
  return null;
}

function safetyTypesInPermitted(permitted: readonly InterventionType[]): InterventionType[] {
  const safetySet = new Set<InterventionType>(SAFETY_FALLBACK_INTERVENTION_ORDER);
  return permitted.filter((type) => safetySet.has(type));
}

export interface ChooseInterventionTypeResult {
  selectedInterventionType: InterventionType;
  usedRecommended: boolean;
  fallbackUsed: boolean;
}

/** Selects an intervention type respecting priority allowed/forbidden constraints. */
export function chooseInterventionType(
  priority: PriorityOutput | null | undefined,
  overrideRecommended?: InterventionType,
  safetyMode = false
): ChooseInterventionTypeResult {
  const allowedRaw = normalizeInterventionTypes(priority?.allowedInterventionTypes);
  const allowed =
    allowedRaw.length > 0
      ? allowedRaw
      : safetyMode
        ? [...DEFAULT_SAFETY_ALLOWED_INTERVENTIONS]
        : [...DEFAULT_ALLOWED_INTERVENTIONS];
  const forbidden = normalizeInterventionTypes(priority?.forbiddenInterventionTypes);
  const permitted = permittedTypes(allowed, forbidden);
  const fallbackOrder = safetyMode
    ? SAFETY_FALLBACK_INTERVENTION_ORDER
    : SAFE_FALLBACK_INTERVENTION_ORDER;

  const recommended =
    overrideRecommended ??
    (typeof priority?.recommendedInterventionType === 'string'
      ? priority.recommendedInterventionType
      : undefined);

  if (
    recommended &&
    isAllowedIntervention(recommended, permitted) &&
    !isForbiddenIntervention(recommended, forbidden)
  ) {
    return {
      selectedInterventionType: recommended,
      usedRecommended: true,
      fallbackUsed: false,
    };
  }

  const fromFallback = pickFromFallbackOrder(fallbackOrder, permitted);
  if (fromFallback) {
    return {
      selectedInterventionType: fromFallback,
      usedRecommended: false,
      fallbackUsed: true,
    };
  }

  if (safetyMode) {
    const safetyPermitted = safetyTypesInPermitted(permitted);
    const safetyPick = pickFromFallbackOrder(SAFETY_FALLBACK_INTERVENTION_ORDER, safetyPermitted);
    if (safetyPick) {
      return {
        selectedInterventionType: safetyPick,
        usedRecommended: false,
        fallbackUsed: true,
      };
    }

    return {
      selectedInterventionType: 'deescalate',
      usedRecommended: false,
      fallbackUsed: true,
    };
  }

  return {
    selectedInterventionType: permitted[0] ?? 'reflect',
    usedRecommended: false,
    fallbackUsed: permitted.length === 0 || permitted[0] !== recommended,
  };
}
