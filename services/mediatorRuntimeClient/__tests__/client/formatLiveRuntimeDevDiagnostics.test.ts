import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  buildLiveRuntimeDevDiagnostics,
} from '@/services/mediatorRuntimeClient/formatLiveRuntimeDevDiagnostics';

describe('buildLiveRuntimeDevDiagnostics', () => {
  it('returns null without mediationId', () => {
    assert.equal(
      buildLiveRuntimeDevDiagnostics({
        mediationId: undefined,
        runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
        runtimeFailed: false,
      }),
      null
    );
  });

  it('maps runtime session fields without message content', () => {
    const runtimeSession = createMinimalRuntimeSuccess().runtimeSession;
    const diagnostics = buildLiveRuntimeDevDiagnostics({
      mediationId: 'med-abc',
      runtimeSession,
      runtimeFailed: false,
      devDiagnostics: {
        responseSource: 'llm',
        fallbackUsed: false,
        validationAction: 'accept',
        validationReasonCodes: [],
        retryCount: 0,
        providerSucceeded: true,
        providerModel: 'test-model',
        finalTextSource: 'provider',
      },
    });

    assert.ok(diagnostics);
    assert.equal(diagnostics!.mediationId, 'med-abc');
    assert.equal(diagnostics!.runtimeStage, runtimeSession.session.stage);
    assert.equal(diagnostics!.currentGoal, runtimeSession.session.currentGoal);
    assert.equal(diagnostics!.nextBeat, runtimeSession.decision.nextBeat);
    assert.equal(diagnostics!.pendingAwaiting, runtimeSession.pending.awaiting);
    assert.equal(diagnostics!.proposalPhase, runtimeSession.proposal.phase);
    assert.equal(diagnostics!.closureDirective, runtimeSession.closure.directive);
    assert.equal(diagnostics!.runtimeFailed, false);
    assert.equal(diagnostics!.responseSource, 'llm');
    assert.equal(diagnostics!.fallback, 'false');
    assert.equal(diagnostics!.validation, 'accept');
    assert.equal(diagnostics!.reasonCodes, 'unavailable');
    assert.equal(diagnostics!.retries, '0');
    assert.equal(diagnostics!.providerSucceeded, 'true');
    assert.equal(diagnostics!.providerModel, 'test-model');
    assert.equal(diagnostics!.finalTextSource, 'provider');
  });

  it('marks unavailable fields when runtimeSession is missing', () => {
    const diagnostics = buildLiveRuntimeDevDiagnostics({
      mediationId: 'med-abc',
      runtimeSession: null,
      runtimeFailed: true,
    });

    assert.ok(diagnostics);
    assert.equal(diagnostics!.runtimeStage, 'unavailable');
    assert.equal(diagnostics!.runtimeFailed, true);
  });
});
