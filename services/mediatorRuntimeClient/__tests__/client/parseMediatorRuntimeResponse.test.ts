import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseMediatorRuntimeResponse } from '@/services/mediatorRuntimeClient/parseMediatorRuntimeResponse';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';

describe('parseMediatorRuntimeResponse', () => {
  it('maps success body to LiveMediatorResponse via adapter', () => {
    const success = createMinimalRuntimeSuccess();
    const parsed = parseMediatorRuntimeResponse(success);

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.response.aiQuestion, success.finalMediatorMessage.text);
      assert.equal(parsed.value.response.questionTarget, 'oboje');
      assert.equal(parsed.value.response.source, 'stub');
      assert.equal(parsed.value.runtime.engineVersion, 'v2.3');
    }
  });

  it('returns edge_error for ok:false body', () => {
    const parsed = parseMediatorRuntimeResponse(
      {
        ok: false,
        error: { code: 'missing_mediation_id', message: 'mediationId is required' },
      },
      400
    );

    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.kind, 'edge_error');
      assert.equal(parsed.error.details.status, 400);
      assert.equal(parsed.error.details.retryable, false);
    }
  });

  it('returns malformed_response for non-object body', () => {
    const parsed = parseMediatorRuntimeResponse('not-json');
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.kind, 'malformed_response');
    }
  });

  it('returns missing_fields when finalMediatorMessage.text is empty', () => {
    const success = createMinimalRuntimeSuccess({
      finalMediatorMessage: {
        ...createMinimalRuntimeSuccess().finalMediatorMessage,
        text: '   ',
      },
    });
    const parsed = parseMediatorRuntimeResponse(success);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.kind, 'missing_fields');
    }
  });

  it('rejects responses with forbidden prompt fields', () => {
    const success = {
      ...createMinimalRuntimeSuccess(),
      promptComposerOutput: { systemPrompt: 'secret' },
    };
    const parsed = parseMediatorRuntimeResponse(success);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.kind, 'malformed_response');
    }
  });

  it('maps safety intervention to escalation fields', () => {
    const success = createMinimalRuntimeSuccess({
      finalMediatorMessage: {
        ...createMinimalRuntimeSuccess().finalMediatorMessage,
        text: 'Let us pause for safety.',
      },
      intervention: {
        ...createMinimalRuntimeSuccess().intervention,
        type: 'safety_response',
      },
    });

    const parsed = parseMediatorRuntimeResponse(success);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.response.escalationDetected, true);
      assert.equal(parsed.value.response.publicMessage, 'Let us pause for safety.');
    }
  });
});
