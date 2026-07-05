/**
 * Runtime architecture test — orchestrator response shape.
 *
 * Requires Node 22+ with --experimental-strip-types and path-alias-loader.mjs:
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs \
 *     --experimental-strip-types \
 *     --test services/mediatorEngine/__tests__/architecture.runtime.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { orchestrateTurn } from '@/services/mediatorEngine/orchestrator/orchestrateTurn';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import type { OrchestrateTurnResponse } from '@/types/mediator';

describe('orchestrateTurn runtime response', () => {
  it('returns an OrchestrateTurnResponse-shaped object', () => {
    const response: OrchestrateTurnResponse = orchestrateTurn({
      request: {
        mediationId: 'test-mediation',
        sessionId: 'test-session',
        trigger: 'session_start',
        turnNumber: 1,
        mediationState: null,
        transcriptDelta: [],
        engineVersion: 'v2.3',
      },
      sessionMemory: createEmptySessionMemory(),
    });

    assert.equal(response.engineVersion, 'v2.3');
    assert.ok(response.mediationState, 'mediationState must be present');
    assert.ok(response.intervention, 'intervention must be present');
    assert.ok(response.sessionMemory, 'sessionMemory must be present');
    assert.ok(response.evidenceStore, 'evidenceStore must be present');
    assert.ok(response.explainability, 'explainability must be present');
    assert.ok(response.complianceResult, 'complianceResult must be present');
    assert.equal(typeof response.intervention.id, 'string');
    assert.equal(typeof response.complianceResult.compliant, 'boolean');
    assert.equal(typeof response.explainability.currentGoal, 'string');
  });
});
