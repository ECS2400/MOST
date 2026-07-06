/**
 * Engine Runtime — unit tests (Phase 2D).
 *
 *   npm run test:mediator:runtime
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import { isRuntimeMetadataTranscriptSafe } from '@/services/mediatorEngine/runtime/resolve/buildRuntimeOutput';
import { orchestrateTurn } from '@/services/mediatorEngine/orchestrator/orchestrateTurn';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import {
  createRuntimeInput,
  createRuntimeTurnInput,
  createL3RuntimeInput,
  createLanguageRetryProvider,
  createFakeLlmProvider,
} from '@/services/mediatorEngine/__tests__/runtime/fixtures';

describe('runMediatorEngineTurn — engine runtime', () => {
  it('Runtime zwraca finalMediatorMessage', async () => {
    const result = await runMediatorEngineTurn(createRuntimeInput());

    assert.ok(result.finalMediatorMessage);
    assert.ok(result.orchestratedTurn);
    assert.ok(result.promptComposerOutput);
    assert.ok(result.responseValidation);
  });

  it('Default provider daje source=stub', async () => {
    const result = await runMediatorEngineTurn(createRuntimeInput());

    assert.equal(result.finalMediatorMessage.source, 'stub');
    assert.equal(result.runtimeMetadata.providerId, 'deterministic-stub');
  });

  it('finalMediatorMessage.text niepusty', async () => {
    const result = await runMediatorEngineTurn(createRuntimeInput());

    assert.ok(result.finalMediatorMessage.text.length > 0);
  });

  it('promptComposerOutput istnieje', async () => {
    const result = await runMediatorEngineTurn(createRuntimeInput());

    assert.ok(result.promptComposerOutput.systemPrompt);
    assert.ok(result.promptComposerOutput.userPrompt);
    assert.ok(result.promptComposerOutput.developerPrompt);
  });

  it("responseValidation.action='accept' dla stub normal", async () => {
    const result = await runMediatorEngineTurn(createRuntimeInput({ language: 'en' }));

    assert.equal(result.responseValidation.action, 'accept');
    assert.equal(result.fallbackUsed, false);
  });

  it('Safety L3 flow daje safety-safe final message', async () => {
    const result = await runMediatorEngineTurn(createL3RuntimeInput());

    assert.equal(result.responseValidation.action, 'accept');
    assert.match(result.finalMediatorMessage.text, /pause|safety/i);
    assert.equal(result.finalMediatorMessage.safetyLevel, 'L3_stop');
  });

  it('Provider error → fallbackUsed=true', async () => {
    const provider = createFakeLlmProvider({ simulateError: true });
    const result = await runMediatorEngineTurn(createRuntimeInput({ llmProvider: provider }));

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.finalMediatorMessage.source, 'fallback');
  });

  it('Invalid provider output → retry/fallback', async () => {
    const provider = createLanguageRetryProvider();
    const result = await runMediatorEngineTurn(
      createRuntimeInput({ llmProvider: provider, maxReplyAttempts: 2 })
    );

    assert.equal(result.responseValidation.action, 'accept');
    assert.ok(result.retryCount >= 1);
  });

  it('Retry count działa', async () => {
    const provider = createLanguageRetryProvider();
    const result = await runMediatorEngineTurn(
      createRuntimeInput({ llmProvider: provider, maxReplyAttempts: 2 })
    );

    assert.equal(result.retryCount, 1);
    assert.equal(result.runtimeMetadata.retryCount, 1);
  });

  it('Runtime metadata ma startedAt/completedAt/durationMs', async () => {
    const result = await runMediatorEngineTurn(createRuntimeInput());

    assert.ok(!Number.isNaN(Date.parse(result.runtimeMetadata.startedAt)));
    assert.ok(!Number.isNaN(Date.parse(result.runtimeMetadata.completedAt)));
    assert.ok(typeof result.runtimeMetadata.durationMs === 'number');
    assert.ok(result.runtimeMetadata.durationMs >= 0);
  });

  it('Runtime metadata nie zawiera transcript content', async () => {
    const result = await runMediatorEngineTurn(
      createRuntimeInput({
        turnInput: createRuntimeTurnInput({
          transcriptDelta: [
            {
              id: 'secret-msg',
              authorRole: 'host',
              content: 'Host: secret dialogue content Dialogue marker',
              turnNumber: 3,
              createdAt: '2026-07-05T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    assert.equal(isRuntimeMetadataTranscriptSafe(result.runtimeMetadata), true);
    const metaJson = JSON.stringify(result.runtimeMetadata);
    assert.ok(!metaJson.includes('Host:'));
    assert.ok(!metaJson.includes('secret dialogue'));
  });

  it('Malformed input no throw', async () => {
    assert.doesNotThrow(() => runMediatorEngineTurn(null));
    const result = await runMediatorEngineTurn(null);
    assert.ok(result.finalMediatorMessage.text.length > 0);
    assert.ok(result.runtimeMetadata);
  });

  it('finalMediatorMessage.accepted=true dla accept', async () => {
    const result = await runMediatorEngineTurn(createRuntimeInput());

    assert.equal(result.responseValidation.action, 'accept');
    assert.equal(result.finalMediatorMessage.accepted, true);
  });

  it('finalMediatorMessage.validationAction zgodny z responseValidation.action', async () => {
    const acceptResult = await runMediatorEngineTurn(createRuntimeInput());
    assert.equal(
      acceptResult.finalMediatorMessage.validationAction,
      acceptResult.responseValidation.action
    );

    const fallbackResult = await runMediatorEngineTurn(
      createRuntimeInput({ llmProvider: createFakeLlmProvider({ simulateError: true }) })
    );
    assert.equal(
      fallbackResult.finalMediatorMessage.validationAction,
      fallbackResult.responseValidation.action
    );
  });

  it('Nie zmienia istniejącego orchestrateTurn public behavior', () => {
    const direct = orchestrateTurn({
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

    assert.equal(direct.engineVersion, 'v2.3');
    assert.ok(direct.mediationState);
    assert.ok(direct.intervention);
    assert.equal(typeof direct.complianceResult.compliant, 'boolean');
  });

  it('propaguje language=en do mediationState gdy mediationState=null', async () => {
    const result = await runMediatorEngineTurn({
      turnInput: {
        mediationId: 'lang-mediation',
        sessionId: 'lang-session',
        trigger: 'session_start',
        turnNumber: 1,
        mediationState: null,
        transcriptDelta: [],
        engineVersion: 'v2.3',
      },
      sessionMemory: createEmptySessionMemory(),
      language: 'en',
    });

    assert.equal(result.finalMediatorMessage.language, 'en');
    assert.equal(result.orchestratedTurn.mediationState.meta.language, 'en');
  });

  it('propaguje language=it do mediationState gdy mediationState=null', async () => {
    const result = await runMediatorEngineTurn({
      turnInput: {
        mediationId: 'lang-mediation-it',
        sessionId: 'lang-session-it',
        trigger: 'session_start',
        turnNumber: 1,
        mediationState: null,
        transcriptDelta: [],
        engineVersion: 'v2.3',
      },
      sessionMemory: createEmptySessionMemory(),
      language: 'it',
    });

    assert.equal(result.finalMediatorMessage.language, 'it');
    assert.equal(result.orchestratedTurn.mediationState.meta.language, 'it');
  });

  it('normal smoke request ma complianceResult.compliant=true', async () => {
    const result = await runMediatorEngineTurn({
      turnInput: {
        mediationId: 'smoke-mediation',
        sessionId: 'smoke-session',
        trigger: 'session_start',
        turnNumber: 1,
        mediationState: null,
        transcriptDelta: [],
        engineVersion: 'v2.3',
      },
      sessionMemory: createEmptySessionMemory(),
      language: 'en',
    });

    assert.equal(result.orchestratedTurn.complianceResult.compliant, true);
    assert.equal(result.finalMediatorMessage.accepted, true);
  });
});

describe('runMediatorEngineTurn — fallback accepted', () => {
  it('finalMediatorMessage.accepted=true dla fallback', async () => {
    const result = await runMediatorEngineTurn(
      createRuntimeInput({
        language: 'en',
        maxReplyAttempts: 1,
        llmProvider: createFakeLlmProvider({
          fixedText:
            'Chcę tu zrobić pauzę ze względu na bezpieczeństwo. Weźcie proszę spokojny oddech.',
        }),
      })
    );

    assert.equal(result.responseValidation.action, 'fallback');
    assert.equal(result.finalMediatorMessage.accepted, true);
    assert.equal(result.finalMediatorMessage.validationAction, 'fallback');
  });
});
