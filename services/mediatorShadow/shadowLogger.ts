import type { ShadowMetric, ShadowMetricLogger } from '@/services/mediatorShadow/types';

let globalShadowLogger: ShadowMetricLogger | undefined;

/** Registers optional global shadow metric logger — default no-op. */
export function setShadowMetricLogger(logger?: ShadowMetricLogger): void {
  globalShadowLogger = logger;
}

/** Returns the active shadow logger, if any. */
export function getShadowMetricLogger(): ShadowMetricLogger | undefined {
  return globalShadowLogger;
}

/** Emits sanitized shadow metric via optional logger — no-op when absent. */
export function emitShadowMetric(
  metric: ShadowMetric,
  logger: ShadowMetricLogger | undefined = globalShadowLogger
): void {
  if (!logger) return;
  logger(metric);
}
