/**
 * Response Validator — 6-language support tests (Phase 2D-fix).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateMediatorReply } from '@/services/mediatorEngine/responseValidator/validateMediatorReply';
import { buildValidatedFallback } from '@/services/mediatorEngine/responseValidator/fallback/buildValidatedFallback';
import { createValidationInput, createDraftReply } from '@/services/mediatorEngine/__tests__/responseValidator/fixtures';
import { SUPPORTED_MEDIATOR_LANGS } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import type { MediatorLang, SafetyLevel } from '@/types/mediator';
import {
  detectLanguageLite,
  looksPolish,
} from '@/services/mediatorEngine/responseValidator/lib/detectLanguageLite';
import { explainValidationOutcome } from '@/services/mediatorEngine/responseValidator/debug/explainValidationOutcome';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import { createFakeLlmProvider } from '@/services/mediatorEngine/llm/adapters/fakeLlmProvider';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';

describe('Response Validator — 6-language support', () => {
  it('fallback dla każdego z 6 języków przechodzi walidację', () => {
    const safetyLevels: SafetyLevel[] = ['none', 'L1_gentle', 'L2_pause', 'L3_stop'];

    for (const language of SUPPORTED_MEDIATOR_LANGS) {
      for (const safetyLevel of safetyLevels) {
        const fallback = buildValidatedFallback(language, safetyLevel, 3);
        const result = validateMediatorReply(
          createValidationInput({
            language,
            safetyLevel,
            draftReply: fallback,
          })
        );
        assert.equal(
          result.action,
          'accept',
          `Expected accept for ${language}/${safetyLevel}, got ${result.action}`
        );
      }
    }
  });

  it('ES mismatch nie blokuje agresywnie dla stub text', () => {
    const fallback = buildValidatedFallback('es', 'none', 3);
    const result = validateMediatorReply(
      createValidationInput({
        language: 'es',
        draftReply: fallback,
      })
    );
    assert.equal(result.action, 'accept');
    const languageRule = result.ruleResults.find((r) => r.ruleId === 'language_lite');
    assert.ok(languageRule?.passed);
  });

  it('ES/IT/DE/FR — ewidentny PL przy innym ustawieniu blokuje', () => {
    const result = validateMediatorReply(
      createValidationInput({
        language: 'es',
        draftReply: {
          ...buildValidatedFallback('pl', 'none', 3),
          language: 'es',
        },
      })
    );
    const languageRule = result.ruleResults.find((r) => r.ruleId === 'language_lite');
    assert.equal(languageRule?.passed, false);
    assert.equal(languageRule?.severity, 'block');
    assert.equal(result.action, 'retry');
  });

  it('ES — hiszpański z ó (tensión) nie jest błędnie traktowany jako polski', () => {
    const text = 'Veo que hay tensión entre ustedes. Tomemos un momento para escucharse.';
    assert.equal(looksPolish(text), false);
    const detect = detectLanguageLite(text, 'es');
    assert.notEqual(detect.reason, 'Expected es reply but Polish markers detected');
    const result = validateMediatorReply(
      createValidationInput({
        language: 'es',
        draftReply: createDraftReply(text, { language: 'es' }),
      })
    );
    assert.equal(result.action, 'accept');
  });

  it('DE — niemieckie Was nie jest błędnie traktowane jako polskie was', () => {
    const text = 'Was fällt Ihnen gerade am schwersten? Lassen Sie uns ruhig sprechen.';
    assert.equal(looksPolish(text), false);
    const result = validateMediatorReply(
      createValidationInput({
        language: 'de',
        draftReply: createDraftReply(text, { language: 'de' }),
      })
    );
    assert.equal(result.action, 'accept');
  });

  it('ES — angielski podający się za hiszpański jest blokowany', () => {
    const result = validateMediatorReply(
      createValidationInput({
        language: 'es',
        draftReply: createDraftReply(
          'I hear that this feels heavy for both of you. Let us speak one at a time.',
          { language: 'es' }
        ),
      })
    );
    const languageRule = result.ruleResults.find((r) => r.ruleId === 'language_lite');
    assert.equal(languageRule?.passed, false);
    assert.equal(languageRule?.severity, 'block');
    assert.equal(result.action, 'retry');
  });

  it('explainValidationOutcome identyfikuje validateLanguage jako likelyStage', () => {
    const explanation = explainValidationOutcome(
      createValidationInput({
        language: 'es',
        draftReply: createDraftReply(
          'I hear that this feels heavy for both of you. Let us speak one at a time.',
          { language: 'es' }
        ),
      })
    );
    assert.equal(explanation.likelyStage, 'validateLanguage');
    assert.equal(explanation.responseValidator.action, 'retry');
  });
});

describe('Response Validator — secondary language warn-only', () => {
  const secondaryLangs: MediatorLang[] = ['it', 'de', 'fr'];

  for (const lang of secondaryLangs) {
    it(`${lang}: słaby heuristic to warn, nie block`, () => {
      const result = validateMediatorReply(
        createValidationInput({
          language: lang,
          draftReply: {
            ...buildValidatedFallback(lang, 'none', 3),
            text: 'OK.',
            validation: {
              valid: true,
              reasons: [],
              blockedTermsFound: [],
              questionCount: 0,
              sentenceCount: 1,
              lengthChars: 3,
              safetyCompliant: true,
            },
          },
        })
      );
      const languageRule = result.ruleResults.find((r) => r.ruleId === 'language_lite');
      assert.equal(languageRule?.severity, 'warn');
      assert.equal(result.action, 'accept');
    });
  }
});

describe('runMediatorEngineTurn — ES/DE normal conversation regression', () => {
  const cases: Array<{ language: MediatorLang; text: string }> = [
    {
      language: 'es',
      text: 'Veo que hay tensión entre ustedes. Tomemos un momento para escucharse con calma.',
    },
    {
      language: 'de',
      text: 'Was fällt Ihnen gerade am schwersten? Lassen Sie uns ruhig nacheinander sprechen.',
    },
  ];

  for (const { language, text } of cases) {
    it(`${language} normal conversation → source=llm, validationAction=accept, accepted=true`, async () => {
      const result = await runMediatorEngineTurn({
        turnInput: {
          mediationId: `regression-${language}`,
          sessionId: `regression-session-${language}`,
          trigger: 'partner_message',
          turnNumber: 1,
          mediationState: null,
          transcriptDelta: [
            {
              id: `regression-msg-${language}`,
              authorRole: 'partner',
              content: 'We need help talking calmly about this.',
              turnNumber: 1,
              createdAt: '2026-07-06T00:00:00.000Z',
            },
          ],
          engineVersion: 'v2.3',
        },
        sessionMemory: createEmptySessionMemory(),
        language,
        llmProvider: createFakeLlmProvider({ fixedText: text, language }),
      });

      assert.equal(result.finalMediatorMessage.source, 'llm');
      assert.equal(result.responseValidation.action, 'accept');
      assert.equal(result.finalMediatorMessage.accepted, true);
      assert.equal(result.finalMediatorMessage.language, language);
    });
  }
});
