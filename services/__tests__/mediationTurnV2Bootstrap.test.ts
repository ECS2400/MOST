import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isMutatingTurnActionType,
  planPostBootstrapClientAction,
} from '../mediationTurnV2Bootstrap.ts';
import type { MediationTurnV2Envelope } from '../mediationTurnV2.types.ts';

const sampleEnvelope: MediationTurnV2Envelope = {
  ok: true,
  sessionId: '00000000-0000-4000-8000-000000000001',
  screen: 'SUMMARY',
  title: 'Podsumowanie',
  subtitle: null,
  content: {
    summary: 'x',
    hostConfirmed: true,
    partnerConfirmed: false,
  },
  actions: [
    {
      id: 'continue',
      type: 'CONTINUE',
      label: 'Dalej',
      voteValue: null,
      disabled: false,
    },
  ],
  progress: { current: 1, total: 6 },
  generationStatus: 'IDLE',
  sessionVersion: 4,
  correlationId: '00000000-0000-4000-8000-000000000099',
};

describe('mediationTurnV2Bootstrap', () => {
  it('never auto-dispatches mutating actions after bootstrap', () => {
    assert.equal(planPostBootstrapClientAction(sampleEnvelope), 'none');
    assert.equal(isMutatingTurnActionType('CONTINUE'), true);
    assert.equal(isMutatingTurnActionType('LOAD_SESSION'), false);
  });
});
