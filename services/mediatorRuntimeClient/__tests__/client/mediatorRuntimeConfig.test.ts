import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_MEDIATOR_ENGINE_PATH,
  MEDIATOR_RUNTIME_ENGINE_VERSION,
  getDefaultEnv,
  getMediatorEnginePath,
  isMediatorRuntimeEnabled,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';

describe('mediatorRuntime feature flag', () => {
  it('defaults to legacy path', () => {
    assert.equal(getMediatorEnginePath({}), DEFAULT_MEDIATOR_ENGINE_PATH);
    assert.equal(isMediatorRuntimeEnabled({}), false);
  });

  it('works without explicit env and does not crash', () => {
    assert.equal(getMediatorEnginePath(), DEFAULT_MEDIATOR_ENGINE_PATH);
    assert.doesNotThrow(() => getMediatorEnginePath(undefined as never));
    assert.doesNotThrow(() => isMediatorRuntimeEnabled());
  });

  it('getDefaultEnv returns object when process is unavailable', () => {
    const originalProcess = globalThis.process;
    try {
      // @ts-expect-error simulate React Native without process
      globalThis.process = undefined;
      assert.deepEqual(getDefaultEnv(), {});
      assert.equal(getMediatorEnginePath(), DEFAULT_MEDIATOR_ENGINE_PATH);
    } finally {
      globalThis.process = originalProcess;
    }
  });

  it('selects runtime path from EXPO_PUBLIC_MEDIATOR_ENGINE_PATH', () => {
    assert.equal(getMediatorEnginePath({ EXPO_PUBLIC_MEDIATOR_ENGINE_PATH: 'runtime' }), 'runtime');
    assert.equal(getMediatorEnginePath({ EXPO_PUBLIC_MEDIATOR_ENGINE_PATH: 'v2.3' }), 'runtime');
    assert.equal(getMediatorEnginePath({ EXPO_PUBLIC_MEDIATOR_ENGINE_PATH: 'legacy' }), 'legacy');
    assert.equal(getMediatorEnginePath({ EXPO_PUBLIC_MEDIATOR_ENGINE_PATH: 'v1' }), 'legacy');
  });

  it('exposes engineVersion v2.3 constant', () => {
    assert.equal(MEDIATOR_RUNTIME_ENGINE_VERSION, 'v2.3');
  });
});
