/**
 * Mediator shadow mode — unit tests (Phase 2L).
 *
 *   npm run test:mediator:shadow
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isMediatorShadowEnabled,
  shouldRunMediatorShadow,
  MEDIATOR_SHADOW_TIMEOUT_MS,
} from '@/services/mediatorShadow/shadowConfig';
import { emitShadowMetric, setShadowMetricLogger } from '@/services/mediatorShadow/shadowLogger';
import {
  buildShadowFailureMetric,
  buildShadowSuccessMetric,
  buildShadowTimeoutMetric,
  isShadowMetricSafe,
} from '@/services/mediatorShadow/shadowMetrics';
import {
  compareShadowResponses,
  buildLegacyShadowComparable,
} from '@/services/mediatorShadow/shadowCompare';
import { scheduleMediatorShadowRun } from '@/services/mediatorShadow/shadowRunner';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import { MediatorRuntimeClientError } from '@/services/mediatorRuntimeClient/errors';
import type { MediatorRuntimeClientInput } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';

const RUNTIME_INPUT: MediatorRuntimeClientInput = {
  mediationId: 'shadow-med-1',
  sessionId: 'shadow-med-1',
  turnNumber: 2,
  trigger: 'partner_message',
  mediationState: null,
  sessionMemory: null,
  transcriptDelta: [
    {
      id: 'shadow-msg-1',
      authorRole: 'partner',
      content: 'secret transcript about feelings',
      turnNumber: 2,
      createdAt: '2026-07-06T12:00:00.000Z',
    },
  ],
  language: 'en',
};

function runtimeParsedSuccess() {
  return {
    response: { aiQuestion: 'How can we move forward?', source: 'stub' },
    runtime: createMinimalRuntimeSuccess(),
  };
}

describe('shadowConfig', () => {
  it('shadow disabled by default', () => {
    assert.equal(isMediatorShadowEnabled({}), false);
    assert.equal(shouldRunMediatorShadow({}), false);
  });

  it('shadow enabled independently of engine path', () => {
    assert.equal(
      isMediatorShadowEnabled({ EXPO_PUBLIC_MEDIATOR_SHADOW_MODE: 'true' }),
      true
    );
    assert.equal(
      shouldRunMediatorShadow({
        EXPO_PUBLIC_MEDIATOR_SHADOW_MODE: 'true',
        EXPO_PUBLIC_MEDIATOR_ENGINE_PATH: 'runtime',
      }),
      false
    );
    assert.equal(
      shouldRunMediatorShadow({
        EXPO_PUBLIC_MEDIATOR_SHADOW_MODE: 'true',
        EXPO_PUBLIC_MEDIATOR_ENGINE_PATH: 'legacy',
      }),
      true
    );
  });

  it('uses 2000ms shadow timeout constant', () => {
    assert.equal(MEDIATOR_SHADOW_TIMEOUT_MS, 2000);
  });
});

describe('shadowMetrics', () => {
  it('success metric contains only sanitized fields', () => {
    const metric = buildShadowSuccessMetric(runtimeParsedSuccess(), Date.now());
    assert.equal(metric.outcome, 'success');
    assert.equal(metric.engineVersion, 'v2.3');
    assert.equal(metric.language, 'en');
    assert.equal(isShadowMetricSafe(metric), true);
    assert.ok(!JSON.stringify(metric).includes('secret transcript'));
  });

  it('timeout metric records timeout outcome', () => {
    const metric = buildShadowTimeoutMetric(Date.now() - 2000);
    assert.equal(metric.outcome, 'timeout');
    assert.equal(metric.errorKind, 'timeout');
    assert.equal(isShadowMetricSafe(metric), true);
  });

  it('failure metric records error kind and status without message body', () => {
    const secret = 'secret transcript content';
    const metric = buildShadowFailureMetric(
      new MediatorRuntimeClientError('network', secret, { retryable: true }),
      Date.now() - 100
    );
    assert.equal(metric.outcome, 'failure');
    assert.equal(metric.errorKind, 'network');
    assert.ok(!JSON.stringify(metric).includes(secret));
  });
});

describe('shadowCompare', () => {
  it('compares non-text fields only', () => {
    const comparison = compareShadowResponses(
      { language: 'en', latencyMs: 100 },
      {
        language: 'en',
        latencyMs: 120,
        accepted: true,
        validationAction: 'accept',
        safetyLevel: 'none',
        providerId: 'deterministic-stub',
        retryCount: 0,
        fallbackUsed: false,
        source: 'stub',
      }
    );

    assert.ok(comparison.comparableCount >= 1);
    const languageField = comparison.fields.find((f) => f.field === 'language');
    assert.equal(languageField?.match, true);
    assert.ok(!JSON.stringify(comparison).includes('How can we move forward'));
  });
});

describe('shadowLogger', () => {
  it('no-op when logger absent', () => {
    setShadowMetricLogger(undefined);
    assert.doesNotThrow(() =>
      emitShadowMetric(buildShadowTimeoutMetric(Date.now()))
    );
  });

  it('logger receives sanitized payload', () => {
    const payloads: string[] = [];
    const secret = 'secret transcript about private feelings';

    emitShadowMetric(
      buildShadowFailureMetric(
        new MediatorRuntimeClientError('http', secret, { status: 500, retryable: false }),
        Date.now()
      ),
      (metric) => payloads.push(JSON.stringify(metric))
    );

    assert.equal(payloads.length, 1);
    assert.ok(!payloads[0]!.includes(secret));
    assert.ok(!payloads[0]!.includes('prompt'));
  });
});

describe('scheduleMediatorShadowRun', () => {
  it('does nothing when shadow disabled', async () => {
    let calls = 0;
    scheduleMediatorShadowRun(
      RUNTIME_INPUT,
      { source: 'legacy' },
      {},
      {
        isShadowEnabled: () => false,
        callRuntime: async () => {
          calls += 1;
          return runtimeParsedSuccess();
        },
        sleep: async () => {},
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(calls, 0);
  });

  it('executes runtime in background when shadow enabled', async () => {
    let calls = 0;
    const metrics: string[] = [];

    scheduleMediatorShadowRun(
      RUNTIME_INPUT,
      { source: 'legacy' },
      { language: 'en' },
      {
        isShadowEnabled: () => true,
        callRuntime: async () => {
          calls += 1;
          return runtimeParsedSuccess();
        },
        sleep: async () => {},
        logger: (metric) => metrics.push(JSON.stringify(metric)),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls, 1);
    assert.equal(metrics.length, 1);
    assert.ok(!metrics[0]!.includes('secret transcript'));
  });

  it('records timeout metric when runtime exceeds shadow timeout', async () => {
    const metrics: Array<{ outcome?: string; errorKind?: string }> = [];

    scheduleMediatorShadowRun(
      RUNTIME_INPUT,
      { source: 'legacy' },
      {},
      {
        isShadowEnabled: () => true,
        timeoutMs: 5,
        callRuntime: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return runtimeParsedSuccess();
        },
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        logger: (metric) => metrics.push(metric),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0]?.outcome, 'timeout');
    assert.equal(metrics[0]?.errorKind, 'timeout');
  });

  it('records failure metric when runtime throws', async () => {
    const metrics: Array<{ outcome?: string; errorKind?: string }> = [];

    scheduleMediatorShadowRun(
      RUNTIME_INPUT,
      { source: 'legacy' },
      {},
      {
        isShadowEnabled: () => true,
        callRuntime: async () => {
          throw new MediatorRuntimeClientError('network', 'offline', { retryable: true });
        },
        sleep: async () => {},
        logger: (metric) => metrics.push(metric),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0]?.outcome, 'failure');
    assert.equal(metrics[0]?.errorKind, 'network');
  });

  it('does not delay caller — schedule returns immediately', () => {
    const start = Date.now();
    scheduleMediatorShadowRun(
      RUNTIME_INPUT,
      { source: 'legacy' },
      {},
      {
        isShadowEnabled: () => true,
        callRuntime: async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return runtimeParsedSuccess();
        },
        sleep: async () => {},
      }
    );
    assert.ok(Date.now() - start < 50);
  });

  it('legacy comparable snapshot excludes message text', () => {
    const legacy = buildLegacyShadowComparable(
      { source: 'stub' },
      { language: 'en', latencyMs: 42 }
    );
    assert.deepEqual(legacy, { source: 'stub', language: 'en', latencyMs: 42 });
    assert.ok(!JSON.stringify(legacy).includes('secret'));
  });
});
