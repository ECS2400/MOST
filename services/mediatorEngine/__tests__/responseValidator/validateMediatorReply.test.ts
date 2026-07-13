/**
 * Post-LLM Response Validator — unit tests (Phase 2C).
 *
 *   npm run test:mediator:response
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateMediatorReply } from '@/services/mediatorEngine/responseValidator/validateMediatorReply';
import { buildValidatedFallback } from '@/services/mediatorEngine/responseValidator/fallback/buildValidatedFallback';
import { isRetryInstructionSafe } from '@/services/mediatorEngine/responseValidator/retry/buildRetryInstruction';
import {
  createDraftReply,
  createFallbackAcceptanceValidationInput,
  createValidationInput,
  RESPONSE_VALIDATION_LIMITS,
} from '@/services/mediatorEngine/__tests__/responseValidator/fixtures';
import { findForbiddenTerms } from '@/services/mediatorEngine/responseValidator/lib/termMatching';
import { FORBIDDEN_RESPONSE_TERMS } from '@/services/mediatorEngine/responseValidator/config/forbiddenResponseTerms';
import type { MediatorLang, SafetyLevel } from '@/types/mediator';

describe('validateMediatorReply — post-LLM validation', () => {
  it('Valid reply → action accept', () => {
    const input = createValidationInput();
    const result = validateMediatorReply(input);

    assert.equal(result.action, 'accept');
    assert.equal(result.valid, true);
    assert.deepEqual(result.validatedReply, input.draftReply);
    assert.ok(result.validatedReply);
  });

  it('Empty reply → retry when attempt < max', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(''),
        attemptNumber: 1,
        maxAttempts: 2,
      })
    );

    assert.equal(result.action, 'retry');
    assert.equal(result.valid, false);
    assert.ok(result.retryInstruction);
    assert.equal(result.validatedReply, null);
  });

  it('Empty reply → fallback when attempt >= max', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(''),
        attemptNumber: 2,
        maxAttempts: 2,
      })
    );

    assert.equal(result.action, 'fallback');
    assert.ok(result.fallbackReply);
    assert.equal(result.validatedReply?.source, 'fallback');
  });

  it('Too long reply → retry', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply('x'.repeat(RESPONSE_VALIDATION_LIMITS.maxReplyChars + 1)),
      })
    );

    assert.equal(result.action, 'retry');
    assert.ok(result.blockingReasons.some((r) => /max length/i.test(r)));
  });

  it('Too many questions → retry', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply('How do you feel? What do you need right now?'),
      })
    );

    assert.equal(result.action, 'retry');
    assert.ok(result.blockingReasons.some((r) => /questions/i.test(r)));
    assert.ok(result.retryInstruction);
    assert.ok(
      result.retryInstruction!.includes('max_questions') || result.retryInstruction!.includes('Failed rules:'),
      'retryInstruction should be derived from failedRuleIds'
    );
  });

  it('Too many sentences → retry', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(
          'One. Two. Three. Four. Five.'
        ),
      })
    );

    assert.equal(result.action, 'retry');
    assert.ok(result.blockingReasons.some((r) => /sentences/i.test(r)));
  });

  it('Forbidden term pipeline → retry', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply('The pipeline suggests we pause and listen.'),
      })
    );

    assert.equal(result.action, 'retry');
    assert.ok(result.blockingReasons.some((r) => /forbidden terms/i.test(r)));
  });

  it('Technical leakage sessionId/evidenceStore → retry', () => {
    const sessionResult = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply('Please ignore sessionId abc123 and continue calmly.'),
      })
    );
    assert.equal(sessionResult.action, 'retry');
    assert.ok(sessionResult.blockingReasons.some((r) => /technical leakage/i.test(r)));

    const evidenceResult = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply('The evidenceStore shows we should pause together.'),
      })
    );
    assert.equal(evidenceResult.action, 'retry');
    assert.ok(evidenceResult.blockingReasons.some((r) => /technical leakage/i.test(r)));
  });

  it('Safety L3 without pause/safety wording → retry/fallback', () => {
    const retryResult = validateMediatorReply(
      createValidationInput({
        safetyLevel: 'L3_stop',
        draftReply: createDraftReply(
          "Let's explore what happened between you and move forward with the mediation."
        ),
        attemptNumber: 1,
        maxAttempts: 2,
      })
    );
    assert.equal(retryResult.action, 'retry');

    const fallbackResult = validateMediatorReply(
      createValidationInput({
        safetyLevel: 'L3_stop',
        draftReply: createDraftReply(
          "Let's explore what happened between you and move forward with the mediation."
        ),
        attemptNumber: 2,
        maxAttempts: 2,
      })
    );
    assert.equal(fallbackResult.action, 'fallback');
  });

  it('Safety L3 with safe wording → accept', () => {
    const result = validateMediatorReply(
      createValidationInput({
        safetyLevel: 'L3_stop',
        language: 'en',
        draftReply: createDraftReply(
          'I need to pause here for safety. Please take a slow breath together before we continue.',
          { safetyLevel: 'L3_stop', language: 'en' }
        ),
      })
    );

    assert.equal(result.action, 'accept');
    assert.equal(result.valid, true);
  });

  it('Retry instruction does not contain transcript/prompt', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(''),
      })
    );

    assert.ok(result.retryInstruction);
    assert.equal(isRetryInstructionSafe(result.retryInstruction!), true);
    assert.ok(!result.retryInstruction!.toLowerCase().includes('host:'));
    assert.ok(!result.retryInstruction!.toLowerCase().includes('systemprompt'));
  });

  it('Retry instruction privacy — no sensitive fields or prompt content', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply('The pipeline leaked into mediator speech.'),
        attemptNumber: 1,
      })
    );

    assert.ok(result.retryInstruction);
    const lower = result.retryInstruction!.toLowerCase();
    const forbiddenSnippets = [
      'transcript',
      'host:',
      'partner:',
      'systemprompt',
      'userprompt',
      'sessionid',
      'mediationid',
      'evidencestore',
      'sessionmemory',
    ];
    for (const snippet of forbiddenSnippets) {
      assert.ok(!lower.includes(snippet), `retryInstruction must not contain ${snippet}`);
    }
    assert.equal(isRetryInstructionSafe(result.retryInstruction!), true);
  });

  it('Fallback reply is valid', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(''),
        attemptNumber: 2,
        maxAttempts: 2,
      })
    );

    assert.equal(result.action, 'fallback');
    assert.ok(result.fallbackReply);
    assert.ok(result.fallbackReply!.text.length > 0);
    assert.equal(result.fallbackReply!.source, 'fallback');

    const recheck = validateMediatorReply(
      createFallbackAcceptanceValidationInput({
        draftReply: result.fallbackReply!,
        safetyLevel: result.fallbackReply!.safetyLevel,
        language: result.fallbackReply!.language,
      })
    );
    assert.equal(recheck.action, 'accept');
  });

  it('malformed input no throw', () => {
    assert.doesNotThrow(() => validateMediatorReply(null));
    const result = validateMediatorReply(null);
    assert.ok(result.action);
    assert.ok(result.validatedAt);
  });

  it('language PL heuristic accepts Polish fallback', () => {
    const fallback = buildValidatedFallback('pl', 'L3_stop', 3);
    const result = validateMediatorReply(
      createValidationInput({
        language: 'pl',
        safetyLevel: 'L3_stop',
        draftReply: fallback,
      })
    );

    assert.equal(result.action, 'accept');
    const languageRule = result.ruleResults.find((r) => r.ruleId === 'language_lite');
    assert.ok(languageRule?.passed);
  });

  it('language EN heuristic accepts English fallback', () => {
    const fallback = buildValidatedFallback('en', 'none', 3);
    const result = validateMediatorReply(
      createFallbackAcceptanceValidationInput({
        language: 'en',
        draftReply: fallback,
      })
    );

    assert.equal(result.action, 'accept');
    const languageRule = result.ruleResults.find((r) => r.ruleId === 'language_lite');
    assert.ok(languageRule?.passed);
  });

  it('language mismatch warns or blocks according to severity', () => {
    const blockResult = validateMediatorReply(
      createValidationInput({
        language: 'en',
        draftReply: createDraftReply(
          'Chcę tu zrobić pauzę ze względu na bezpieczeństwo. Weźcie proszę spokojny oddech.',
          { language: 'en' }
        ),
      })
    );
    const languageRule = blockResult.ruleResults.find((r) => r.ruleId === 'language_lite');
    assert.equal(languageRule?.passed, false);
    assert.equal(languageRule?.severity, 'block');
    assert.equal(blockResult.action, 'retry');
  });

  it('draftReply.validation.valid=false causes retry even if text seems okay', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(
          'I hear that this feels heavy for both of you. Let us speak one at a time.',
          {
            validation: {
              valid: false,
              reasons: ['Marked invalid upstream'],
              blockedTermsFound: [],
              questionCount: 0,
              sentenceCount: 2,
              lengthChars: 70,
              safetyCompliant: true,
            },
          }
        ),
        attemptNumber: 1,
        maxAttempts: 2,
      })
    );

    assert.equal(result.action, 'retry');
    assert.ok(result.blockingReasons.some((r) => /draft reply marked invalid/i.test(r)));
  });

  it('max attempts causes fallback', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply('pipeline broken reply with pipeline term inside.'),
        attemptNumber: 2,
        maxAttempts: 2,
      })
    );

    assert.equal(result.action, 'fallback');
    assert.ok(result.fallbackReply);
  });

  it('validatedReply set on accept', () => {
    const input = createValidationInput();
    const result = validateMediatorReply(input);

    assert.equal(result.action, 'accept');
    assert.deepEqual(result.validatedReply, input.draftReply);
  });

  it('validatedReply null on retry', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(''),
        attemptNumber: 1,
      })
    );

    assert.equal(result.action, 'retry');
    assert.equal(result.validatedReply, null);
  });

  it('fallbackReply set on fallback', () => {
    const result = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(''),
        attemptNumber: 2,
        maxAttempts: 2,
      })
    );

    assert.equal(result.action, 'fallback');
    assert.ok(result.fallbackReply);
    assert.equal(result.validatedReply, result.fallbackReply);
  });

  it('ruleResults include ruleId/passed/severity/reason', () => {
    const result = validateMediatorReply(createValidationInput());

    assert.ok(result.ruleResults.length >= 8);
    for (const rule of result.ruleResults) {
      assert.ok(typeof rule.ruleId === 'string');
      assert.ok(typeof rule.passed === 'boolean');
      assert.ok(rule.severity === 'block' || rule.severity === 'warn');
      assert.ok(typeof rule.reason === 'string');
    }
  });
});

describe('validateMediatorReply — hardening (2C-fix)', () => {
  it('mypipeline nie triggeruje forbidden pipeline, ale osobne słowo pipeline tak', () => {
    const safeText = 'mypipeline is not a technical term here.';
    const unsafeText = 'The pipeline suggests we pause and listen.';

    assert.deepEqual(findForbiddenTerms(safeText, FORBIDDEN_RESPONSE_TERMS), []);
    assert.ok(findForbiddenTerms(unsafeText, FORBIDDEN_RESPONSE_TERMS).includes('pipeline'));

    const safeResult = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(safeText),
      })
    );
    assert.notEqual(
      safeResult.blockingReasons.some((r) => /forbidden terms.*pipeline/i.test(r)),
      true
    );

    const unsafeResult = validateMediatorReply(
      createValidationInput({
        draftReply: createDraftReply(unsafeText),
      })
    );
    assert.equal(unsafeResult.action, 'retry');
    assert.ok(unsafeResult.blockingReasons.some((r) => /forbidden terms/i.test(r)));
  });

  it('fuzz inputs — validator nie rzuca wyjątku', () => {
    const fuzzInputs = [
      '',
      '%%%%%',
      '😂😂😂',
      '{}',
      '[]',
      'null',
      '日本語',
      'x'.repeat(5000),
    ];

    for (const text of fuzzInputs) {
      assert.doesNotThrow(() =>
        validateMediatorReply(
          createValidationInput({
            draftReply: createDraftReply(text),
          })
        )
      );
      const result = validateMediatorReply(
        createValidationInput({
          draftReply: createDraftReply(text),
        })
      );
      assert.ok(['accept', 'retry', 'fallback'].includes(result.action));
      assert.ok(result.validatedAt);
    }
  });

  it('buildValidatedFallback przechodzi walidację dla en/pl × safety levels', () => {
    const languages: MediatorLang[] = ['en', 'pl'];
    const safetyLevels: SafetyLevel[] = ['none', 'L1_gentle', 'L2_pause', 'L3_stop'];

    for (const language of languages) {
      for (const safetyLevel of safetyLevels) {
        const fallback = buildValidatedFallback(language, safetyLevel, 3);
        const result = validateMediatorReply(
          createFallbackAcceptanceValidationInput({
            language,
            safetyLevel,
            draftReply: fallback,
          })
        );
        assert.equal(
          result.action,
          'accept',
          `Expected accept for ${language}/${safetyLevel}, got ${result.action}: ${result.blockingReasons.join('; ')}`
        );
      }
    }
  });
});
