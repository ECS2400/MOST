/**
 * Response Validator — 6-language support tests (Phase 2D-fix).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateMediatorReply } from '@/services/mediatorEngine/responseValidator/validateMediatorReply';
import { buildValidatedFallback } from '@/services/mediatorEngine/responseValidator/fallback/buildValidatedFallback';
import { createValidationInput } from '@/services/mediatorEngine/__tests__/responseValidator/fixtures';
import { SUPPORTED_MEDIATOR_LANGS } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import type { MediatorLang, SafetyLevel } from '@/types/mediator';

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
