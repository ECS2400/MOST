import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MEDIATOR_RUNTIME_ENGINE_VERSION,
  getDefaultEnv,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';

describe('mediatorRuntime config', () => {
  it('getDefaultEnv returns object when process is unavailable', () => {
    const originalProcess = globalThis.process;
    try {
      // @ts-expect-error simulate React Native without process
      globalThis.process = undefined;
      assert.deepEqual(getDefaultEnv(), {});
    } finally {
      globalThis.process = originalProcess;
    }
  });

  it('exposes engineVersion v2.3 constant', () => {
    assert.equal(MEDIATOR_RUNTIME_ENGINE_VERSION, 'v2.3');
  });
});
