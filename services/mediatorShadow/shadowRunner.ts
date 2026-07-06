import type { MediatorRuntimeClientInput } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import type { MediatorRuntimeParsedSuccess } from '@/services/mediatorRuntimeClient/parseMediatorRuntimeResponse';
import type { MediatorRuntimeClientOptions } from '@/services/mediatorRuntimeClient/mediatorRuntimeClient';
import {
  MEDIATOR_SHADOW_TIMEOUT_MS,
  shouldRunMediatorShadow,
} from '@/services/mediatorShadow/shadowConfig';
import { emitShadowMetric } from '@/services/mediatorShadow/shadowLogger';
import {
  buildShadowFailureMetric,
  buildShadowSuccessMetric,
  buildShadowTimeoutMetric,
} from '@/services/mediatorShadow/shadowMetrics';
import type { LegacyShadowComparable, ShadowMetric, ShadowMetricLogger } from '@/services/mediatorShadow/types';

export interface ShadowRunnerDeps {
  isShadowEnabled?: () => boolean;
  callRuntime?: (
    input: MediatorRuntimeClientInput,
    options?: MediatorRuntimeClientOptions
  ) => Promise<MediatorRuntimeParsedSuccess>;
  logger?: ShadowMetricLogger;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type ShadowRaceResult =
  | { kind: 'success'; value: MediatorRuntimeParsedSuccess }
  | { kind: 'timeout' };

async function raceShadowRuntime(
  runtimeInput: MediatorRuntimeClientInput,
  timeoutMs: number,
  callRuntime: NonNullable<ShadowRunnerDeps['callRuntime']>,
  sleep: (ms: number) => Promise<void>
): Promise<ShadowRaceResult> {
  return Promise.race([
    callRuntime(runtimeInput, {
      timeoutMs,
      retry: { maxRetries: 0, delaysMs: [0], sleep: async () => {} },
    }).then((value) => ({ kind: 'success' as const, value })),
    sleep(timeoutMs).then(() => ({ kind: 'timeout' as const })),
  ]);
}

async function executeShadowRun(
  runtimeInput: MediatorRuntimeClientInput,
  deps: Required<Pick<ShadowRunnerDeps, 'callRuntime' | 'timeoutMs' | 'sleep' | 'now'>> &
    Pick<ShadowRunnerDeps, 'logger'>
): Promise<ShadowMetric> {
  const startedAtMs = deps.now();

  try {
    const raced = await raceShadowRuntime(
      runtimeInput,
      deps.timeoutMs,
      deps.callRuntime,
      deps.sleep
    );

    if (raced.kind === 'timeout') {
      return buildShadowTimeoutMetric(startedAtMs);
    }

    return buildShadowSuccessMetric(raced.value, startedAtMs);
  } catch (error) {
    return buildShadowFailureMetric(error, startedAtMs);
  }
}

/**
 * Fire-and-forget shadow runtime invocation after legacy response.
 * Never blocks UI or alters the user-visible legacy result.
 */
export function scheduleMediatorShadowRun(
  runtimeInput: MediatorRuntimeClientInput,
  legacyResponse: { source?: string },
  options: {
    language?: LegacyShadowComparable['language'];
    legacyLatencyMs?: number;
  } = {},
  deps: ShadowRunnerDeps = {}
): void {
  const isEnabled = deps.isShadowEnabled ?? shouldRunMediatorShadow;
  if (!isEnabled()) return;

  const resolvedDeps = {
    callRuntime:
      deps.callRuntime ??
      (async (input: MediatorRuntimeClientInput, clientOptions?: MediatorRuntimeClientOptions) => {
        const { callMediatorRuntime } = await import(
          '@/services/mediatorRuntimeClient/mediatorRuntimeClient'
        );
        return callMediatorRuntime(input, clientOptions);
      }),
    timeoutMs: deps.timeoutMs ?? MEDIATOR_SHADOW_TIMEOUT_MS,
    sleep: deps.sleep ?? defaultSleep,
    now: deps.now ?? Date.now,
    logger: deps.logger,
  };

  void executeShadowRun(runtimeInput, resolvedDeps)
    .then((metric) => emitShadowMetric(metric, resolvedDeps.logger))
    .catch(() => {
      emitShadowMetric(
        buildShadowFailureMetric(new Error('shadow runner failed'), resolvedDeps.now()),
        resolvedDeps.logger
      );
    });
}
