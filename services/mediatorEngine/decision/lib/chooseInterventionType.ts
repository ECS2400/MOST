import type { ContinuityContext, InterventionType, PriorityOutput, TherapeuticStrategy } from '@/types/mediator';
import { STRATEGY_INTERVENTION_COMPATIBILITY } from '@/services/mediatorEngine/constitution/config/strategyInterventionMap';
import { chooseAdaptiveInterventionType } from '@/services/mediatorEngine/decision/adaptiveInterventionSelection';
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

function continuityAvoidTypes(
  continuity: ContinuityContext | null | undefined,
  safetyMode: boolean
): InterventionType[] {
  if (!continuity || safetyMode) return [];
  return continuity.suggestedAvoidTypes ?? [];
}

function continuityPreferTypes(
  continuity: ContinuityContext | null | undefined,
  safetyMode: boolean
): InterventionType[] {
  if (!continuity || safetyMode) return [];
  return continuity.suggestedPreferTypes ?? [];
}

function shouldAvoidForContinuity(
  type: InterventionType,
  avoid: readonly InterventionType[],
  safetyMode: boolean
): boolean {
  if (safetyMode && SAFETY_FALLBACK_INTERVENTION_ORDER.includes(type)) {
    return false;
  }
  return avoid.includes(type);
}

function pickWithContinuityAwareness(
  order: readonly InterventionType[],
  permitted: readonly InterventionType[],
  avoid: readonly InterventionType[],
  prefer: readonly InterventionType[],
  safetyMode: boolean
): InterventionType | null {
  for (const candidate of prefer) {
    if (
      permitted.includes(candidate) &&
      !shouldAvoidForContinuity(candidate, avoid, safetyMode)
    ) {
      return candidate;
    }
  }

  for (const candidate of order) {
    if (
      permitted.includes(candidate) &&
      !shouldAvoidForContinuity(candidate, avoid, safetyMode)
    ) {
      return candidate;
    }
  }

  return pickFromFallbackOrder(order, permitted);
}

export interface ChooseInterventionTypeResult {
  selectedInterventionType: InterventionType;
  usedRecommended: boolean;
  fallbackUsed: boolean;
}

function filterByStrategyCompatibility(
  permitted: InterventionType[],
  strategy: TherapeuticStrategy | undefined,
  forbidden: readonly InterventionType[]
): InterventionType[] {
  if (!strategy) return permitted;
  const compatible = STRATEGY_INTERVENTION_COMPATIBILITY[strategy];
  if (!compatible?.length) return permitted;
  const compatibleSet = new Set<InterventionType>(compatible);
  const filtered = permitted.filter((type) => compatibleSet.has(type));
  if (filtered.length > 0) return filtered;
  return compatible.filter((type) => !isForbiddenIntervention(type, forbidden));
}

function pickLastResortNonForbidden(
  forbidden: readonly InterventionType[],
  allowed: readonly InterventionType[],
  fallbackOrder: readonly InterventionType[]
): InterventionType {
  const allowedNotForbidden = permittedTypes(allowed, forbidden);
  if (allowedNotForbidden.length > 0) return allowedNotForbidden[0];

  const fallbackNotForbidden = fallbackOrder.filter(
    (type) => !isForbiddenIntervention(type, forbidden)
  );
  const fromFallback = pickFromFallbackOrder(fallbackOrder, fallbackNotForbidden);
  if (fromFallback) return fromFallback;

  const defaultNotForbidden = permittedTypes(
    [...DEFAULT_ALLOWED_INTERVENTIONS, ...SAFE_FALLBACK_INTERVENTION_ORDER],
    forbidden
  );
  return defaultNotForbidden[0] ?? 'deescalate';
}

/** Selects an intervention type respecting priority allowed/forbidden constraints. */
export function chooseInterventionType(
  priority: PriorityOutput | null | undefined,
  overrideRecommended?: InterventionType,
  safetyMode = false,
  primaryStrategy?: TherapeuticStrategy,
  continuity?: ContinuityContext | null
): ChooseInterventionTypeResult {
  const allowedRaw = normalizeInterventionTypes(priority?.allowedInterventionTypes);
  const allowed =
    allowedRaw.length > 0
      ? allowedRaw
      : safetyMode
        ? [...DEFAULT_SAFETY_ALLOWED_INTERVENTIONS]
        : [...DEFAULT_ALLOWED_INTERVENTIONS];
  const forbidden = normalizeInterventionTypes(priority?.forbiddenInterventionTypes);
  const permitted = filterByStrategyCompatibility(
    permittedTypes(allowed, forbidden),
    safetyMode ? 'build_safety' : primaryStrategy,
    forbidden
  );
  const fallbackOrder = safetyMode
    ? SAFETY_FALLBACK_INTERVENTION_ORDER
    : SAFE_FALLBACK_INTERVENTION_ORDER;
  const avoid = continuityAvoidTypes(continuity, safetyMode);
  const prefer = continuityPreferTypes(continuity, safetyMode);

  const recommended =
    overrideRecommended ??
    (typeof priority?.recommendedInterventionType === 'string'
      ? priority.recommendedInterventionType
      : undefined);

  let baselineType: InterventionType;
  let usedRecommended = false;
  let fallbackUsed = false;

  if (
    recommended &&
    isAllowedIntervention(recommended, permitted) &&
    !isForbiddenIntervention(recommended, forbidden) &&
    !shouldAvoidForContinuity(recommended, avoid, safetyMode)
  ) {
    baselineType = recommended;
    usedRecommended = true;
  } else {
    const fromFallback = pickWithContinuityAwareness(
      fallbackOrder,
      permitted,
      avoid,
      prefer,
      safetyMode
    );
    if (fromFallback) {
      baselineType = fromFallback;
      fallbackUsed = true;
    } else if (safetyMode) {
      const safetyPermitted = safetyTypesInPermitted(permitted);
      const safetyPick = pickFromFallbackOrder(SAFETY_FALLBACK_INTERVENTION_ORDER, safetyPermitted);
      baselineType = safetyPick ?? 'deescalate';
      fallbackUsed = true;
    } else {
      baselineType = pickLastResortNonForbidden(forbidden, allowed, fallbackOrder);
      fallbackUsed = baselineType !== recommended;
    }
  }

  const selectedInterventionType =
    permitted.length > 0
      ? chooseAdaptiveInterventionType({
          baselineType,
          permitted,
          recommendedInterventionType: recommended,
          continuityContext: continuity,
          safetyActive: safetyMode,
          primaryStrategy: safetyMode ? 'build_safety' : primaryStrategy,
        })
      : baselineType;

  return {
    selectedInterventionType,
    usedRecommended,
    fallbackUsed,
  };
}
