/**
 * Metrics Layer — Mediator AI Engine v2.3 pipeline step 10.
 *
 * Role: records per-turn metrics for analytics and future Learning Layer.
 * Phase 0B: no-op recorder.
 */

import type { MetricsTurnInput, MetricsTurnOutput } from '@/types/mediator';

/**
 * Records turn-level metrics (Phase 0B: no-op).
 *
 * @param input - Turn context and compliance outcome for metric emission.
 * @returns Whether metrics were recorded.
 */
export function recordMetrics(input: MetricsTurnInput): MetricsTurnOutput {
  // TODO(Phase 1): emit turn counters to analytics port.
  void input;
  return { recorded: false };
}
