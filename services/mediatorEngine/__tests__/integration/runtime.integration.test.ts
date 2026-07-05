/**
 * Mediator Engine — full runtime integration tests (Phase 2E).
 *
 *   npm run test:mediator:integration
 *
 * Flow: orchestrateTurn → promptComposer → llm → responseValidator → finalMediatorMessage
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import {
  assertFinalMessageAccepted,
  assertNoBlameOrDiagnosis,
  assertNoForbiddenTerms,
  assertNoPrivateLeak,
  createFakeLlmProvider,
  createIntegrationInput,
  createIntegrationTurnInput,
  createTranscriptWithContent,
} from '@/services/mediatorEngine/__tests__/integration/fixtures';
import { normalConversationInput } from '@/services/mediatorEngine/__tests__/integration/scenarios/normalConversation';
import {
  l1DistressInput,
  l2DistressInput,
} from '@/services/mediatorEngine/__tests__/integration/scenarios/escalationConversation';
import { safetyL3Input } from '@/services/mediatorEngine/__tests__/integration/scenarios/safetyL3Conversation';
import {
  LANGUAGE_INSTRUCTION,
  languageMatrixInputs,
  SUPPORTED_MEDIATOR_LANGS,
} from '@/services/mediatorEngine/__tests__/integration/scenarios/languageMatrix';
import {
  invalidOutputInput,
  maxAttemptsFallbackInput,
  providerErrorInput,
  retryInput,
} from '@/services/mediatorEngine/__tests__/integration/scenarios/providerFailures';
import {
  privacyInput,
  PRIVATE_MARKERS,
} from '@/services/mediatorEngine/__tests__/integration/scenarios/privacyScenarios';

describe('runMediatorEngineTurn — integration: normal conversation', () => {
  it('runtime zwraca accepted finalMediatorMessage ze stub', async () => {
    const result = await runMediatorEngineTurn(normalConversationInput);

    assertFinalMessageAccepted(result);
    assert.equal(result.finalMediatorMessage.source, 'stub');
    assert.equal(result.finalMediatorMessage.safetyLevel, 'none');
    assert.ok(result.orchestratedTurn);
    assert.ok(result.promptComposerOutput.systemPrompt);
    assert.ok(result.llmOutput);
    assert.equal(result.responseValidation.action, 'accept');
  });

  it('runtime zwraca accepted finalMediatorMessage ze fake llm (source=llm)', async () => {
    const result = await runMediatorEngineTurn(
      createIntegrationInput({ llmProvider: createFakeLlmProvider({ language: 'en' }) })
    );

    assertFinalMessageAccepted(result);
    assert.equal(result.finalMediatorMessage.source, 'llm');
    assert.equal(result.finalMediatorMessage.safetyLevel, 'none');
  });
});

describe('runMediatorEngineTurn — integration: escalation / distress', () => {
  it('L1 distress → safetyLevel L1_gentle, brak blame/diagnosis', async () => {
    const result = await runMediatorEngineTurn(l1DistressInput);

    assertFinalMessageAccepted(result);
    assert.equal(result.finalMediatorMessage.safetyLevel, 'L1_gentle');
    assertNoBlameOrDiagnosis(result.finalMediatorMessage.text);
  });

  it('L2 distress → safetyLevel L2_pause, brak eskalacji', async () => {
    const result = await runMediatorEngineTurn(l2DistressInput);

    assertFinalMessageAccepted(result);
    assert.equal(result.finalMediatorMessage.safetyLevel, 'L2_pause');
    assertNoBlameOrDiagnosis(result.finalMediatorMessage.text);
    assert.match(result.finalMediatorMessage.text, /pause|safety|breath|pauz|bezpiec/i);
  });
});

describe('runMediatorEngineTurn — integration: safety L3', () => {
  it('jawny L3 signal → L3_stop, safety wording, accept/fallback valid', async () => {
    const result = await runMediatorEngineTurn(safetyL3Input);

    assert.equal(result.finalMediatorMessage.safetyLevel, 'L3_stop');
    assert.ok(
      result.responseValidation.action === 'accept' || result.responseValidation.action === 'fallback'
    );
    assert.match(result.finalMediatorMessage.text, /pause|safety|breath|pauz|bezpiec/i);
    assert.equal(result.finalMediatorMessage.accepted, true);
  });
});

describe('runMediatorEngineTurn — integration: provider failures', () => {
  it('provider error → fallbackUsed, source=fallback, accepted', async () => {
    const result = await runMediatorEngineTurn(providerErrorInput);

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.finalMediatorMessage.source, 'fallback');
    assert.equal(result.finalMediatorMessage.accepted, true);
  });

  it('invalid provider output → retry/fallback, brak forbidden terms', async () => {
    const result = await runMediatorEngineTurn(invalidOutputInput);

    assert.equal(result.finalMediatorMessage.accepted, true);
    assertNoForbiddenTerms(result.finalMediatorMessage.text);
    assert.ok(
      result.responseValidation.action === 'accept' ||
        result.responseValidation.action === 'fallback'
    );
  });
});

describe('runMediatorEngineTurn — integration: privacy', () => {
  it('prywatne dane nie wyciekają poza zredagowany userPrompt', async () => {
    const result = await runMediatorEngineTurn(privacyInput);

    assertNoPrivateLeak(result, [
      PRIVATE_MARKERS.email,
      PRIVATE_MARKERS.phone,
      PRIVATE_MARKERS.messageId,
      PRIVATE_MARKERS.sessionId,
      PRIVATE_MARKERS.mediationId,
    ]);

    assert.ok(!result.promptComposerOutput.userPrompt.includes(PRIVATE_MARKERS.email));
    assert.ok(!result.promptComposerOutput.userPrompt.includes(PRIVATE_MARKERS.phone));
    assert.match(result.promptComposerOutput.userPrompt, /REDACTED_EMAIL/);
    assert.match(result.promptComposerOutput.userPrompt, /REDACTED_PHONE/);
  });
});

describe('runMediatorEngineTurn — integration: language matrix', () => {
  for (const input of languageMatrixInputs) {
    const language = input.language!;

    it(`language=${language} — język, text, promptMetadata, systemPrompt`, async () => {
      const result = await runMediatorEngineTurn(input);

      assert.equal(result.finalMediatorMessage.language, language);
      assert.ok(result.finalMediatorMessage.text.length > 0);
      assert.equal(result.promptComposerOutput.promptMetadata.language, language);
      assert.match(result.promptComposerOutput.systemPrompt, new RegExp(LANGUAGE_INSTRUCTION[language]));
    });
  }

  it('obsługuje wszystkie 6 języków', () => {
    assert.equal(languageMatrixInputs.length, SUPPORTED_MEDIATOR_LANGS.length);
  });
});

describe('runMediatorEngineTurn — integration: retry', () => {
  it('invalid → valid: retryCount=1, action accept', async () => {
    const result = await runMediatorEngineTurn(retryInput);

    assert.equal(result.retryCount, 1);
    assert.equal(result.runtimeMetadata.retryCount, 1);
    assert.equal(result.responseValidation.action, 'accept');
    assert.equal(result.finalMediatorMessage.accepted, true);
  });
});

describe('runMediatorEngineTurn — integration: fallback after max attempts', () => {
  it('zawsze invalid → retryCount poprawny, action fallback, accepted', async () => {
    const result = await runMediatorEngineTurn(maxAttemptsFallbackInput);

    assert.equal(result.retryCount, 1);
    assert.equal(result.responseValidation.action, 'fallback');
    assert.equal(result.finalMediatorMessage.accepted, true);
    assert.equal(result.finalMediatorMessage.validationAction, 'fallback');
  });
});

describe('runMediatorEngineTurn — integration: no throw', () => {
  it('malformed runtime input', async () => {
    assert.doesNotThrow(() => runMediatorEngineTurn(null));
    const result = await runMediatorEngineTurn(null);
    assert.ok(result.finalMediatorMessage.text.length > 0);
  });

  it('empty transcript', async () => {
    const result = await runMediatorEngineTurn(
      createIntegrationInput({
        turnInput: createIntegrationTurnInput({ transcriptDelta: [] }),
      })
    );
    assert.ok(result.finalMediatorMessage.text.length > 0);
  });

  it('bardzo długi transcript', async () => {
    const longContent = 'We keep arguing about the same thing. '.repeat(500);
    const result = await runMediatorEngineTurn(
      createIntegrationInput({
        turnInput: createIntegrationTurnInput({
          transcriptDelta: createTranscriptWithContent(longContent),
        }),
      })
    );
    assert.ok(result.finalMediatorMessage.text.length > 0);
  });

  it('dziwne znaki i emoji', async () => {
    const result = await runMediatorEngineTurn(
      createIntegrationInput({
        turnInput: createIntegrationTurnInput({
          transcriptDelta: createTranscriptWithContent(
            'What?! 😤💔 @#$%^&*() «» „” — you never listen!!! 🙄'
          ),
        }),
      })
    );
    assert.ok(result.finalMediatorMessage.text.length > 0);
    assert.equal(result.finalMediatorMessage.accepted, true);
  });
});
