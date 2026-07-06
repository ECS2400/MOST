export {
  isMediatorShadowEnabled,
  shouldRunMediatorShadow,
  MEDIATOR_SHADOW_TIMEOUT_MS,
} from '@/services/mediatorShadow/shadowConfig';

export { emitShadowMetric, getShadowMetricLogger, setShadowMetricLogger } from '@/services/mediatorShadow/shadowLogger';

export {
  buildShadowSuccessMetric,
  buildShadowTimeoutMetric,
  buildShadowFailureMetric,
  extractRuntimeShadowComparable,
  isShadowMetricSafe,
  createShadowTimestamp,
} from '@/services/mediatorShadow/shadowMetrics';

export {
  compareShadowResponses,
  buildLegacyShadowComparable,
} from '@/services/mediatorShadow/shadowCompare';

export { scheduleMediatorShadowRun } from '@/services/mediatorShadow/shadowRunner';
export type { ShadowRunnerDeps } from '@/services/mediatorShadow/shadowRunner';

export type {
  ShadowMetric,
  ShadowOutcome,
  ShadowMetricLogger,
  LegacyShadowComparable,
  RuntimeShadowComparable,
  ShadowComparisonResult,
  ShadowFieldComparison,
} from '@/services/mediatorShadow/types';
