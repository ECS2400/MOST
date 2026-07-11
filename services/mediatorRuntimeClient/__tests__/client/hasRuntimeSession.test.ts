import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';

describe('hasRuntimeSession', () => {
  it('returns false for null and undefined', () => {
    assert.equal(hasRuntimeSession(null), false);
    assert.equal(hasRuntimeSession(undefined), false);
  });

  it('returns true when RuntimeSession object is present', () => {
    const success = createMinimalRuntimeSuccess();
    assert.equal(hasRuntimeSession(success.runtimeSession), true);
  });
});
