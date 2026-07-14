/**
 * session_start / SAFE_OPENING bootstrap — invalid provider draft must not be
 * replaced by deterministic fallback before retry.
 *
 *   npm run test:mediator:response
 *   npm run test:mediator:llm
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateMediatorReply } from '@/services/mediatorEngine/llm/generateMediatorReply';
import { LOCALIZED_NORMAL_TEXT } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import { runReplyRetryLoop } from '@/services/mediatorEngine/runtime/retry/runReplyRetryLoop';
import { validateMediatorReply } from '@/services/mediatorEngine/responseValidator/validateMediatorReply';
import { createDraftReply, createValidationInput } from '@/services/mediatorEngine/__tests__/responseValidator/fixtures';
import { createPromptOutput } from '@/services/mediatorEngine/__tests__/llm/fixtures';
import type { LlmProviderPort, PromptComposerOutput, SafeRuntimeContext } from '@/types/mediator';

const ATTEMPT1_PROVIDER_TEXT =
  'Daniel, powiedz mi, co by się stało, gdyby Patrycja wróciła i powiedziała coś ważnego? Czy to by zmieniło sytuację, czy nadal czułbyś się porzucony?';
const ATTEMPT2_PROVIDER_TEXT =
  'Daniel, co by się zmieniło dla ciebie, gdyby Patrycja wróciła i powiedziała, że też chce rozmowy?';
const ATTEMPT2_TWO_QUESTIONS =
  'Daniel, powiedz mi, co by się stało, gdyby Patrycja wróciła i powiedziała: ...? Czy to by zmieniło sytuację, czy nadal czułbyś się porzucony?';

function createSafeOpeningPrompt(): PromptComposerOutput {
  const base = createPromptOutput('pl');
  return {
    ...base,
    promptMetadata: {
      ...base.promptMetadata,
      goal: 'SAFE_OPENING',
      turnNumber: 1,
      language: 'pl',
    },
  };
}

describe('session_start SAFE_OPENING bootstrap', () => {
  it('invalid provider draft is not replaced by LOCALIZED_NORMAL_TEXT before retry', async () => {
    const provider: LlmProviderPort = {
      providerId: 'openai',
      async generateText() {
        return { text: ATTEMPT1_PROVIDER_TEXT, model: 'gpt-test' };
      },
    };

    const result = await generateMediatorReply({
      promptComposerOutput: createSafeOpeningPrompt(),
      provider,
      language: 'pl',
      safetyLevel: 'none',
      turnNumber: 1,
      attemptNumber: 1,
    });

    assert.equal(result.fallbackUsed, false);
    assert.equal(result.fallbackSubstituted, false);
    assert.equal(result.draftReply.source, 'llm');
    assert.equal(result.originalProviderText, ATTEMPT1_PROVIDER_TEXT);
    assert.equal(result.draftReply.text, ATTEMPT1_PROVIDER_TEXT);
    assert.notEqual(result.draftReply.text, LOCALIZED_NORMAL_TEXT.pl);
    assert.equal(result.draftReply.validation.valid, false);
    assert.ok(result.draftValidationReasons?.some((reason) => reason.includes('Too many questions')));
  });

  it('attempt 1 retry receives real draft failure, not therapeutic_flow on fallback text', () => {
    const validation = validateMediatorReply(
      createValidationInput({
        language: 'pl',
        turnNumber: 1,
        attemptNumber: 1,
        maxAttempts: 2,
        draftReply: createDraftReply(ATTEMPT1_PROVIDER_TEXT, {
          language: 'pl',
          validation: {
            valid: false,
            reasons: ['Too many questions (2 > 1)'],
            blockedTermsFound: [],
            questionCount: 2,
            sentenceCount: 1,
            lengthChars: ATTEMPT1_PROVIDER_TEXT.length,
            safetyCompliant: true,
          },
        }),
        promptComposerOutput: createSafeOpeningPrompt(),
      })
    );

    assert.equal(validation.action, 'retry');
    assert.ok(!validation.blockingReasons.some((reason) => reason.includes('Generic deterministic fallback')));
    const failedRuleIds = validation.ruleResults.filter((rule) => !rule.passed).map((rule) => rule.ruleId);
    assert.ok(failedRuleIds.includes('draft_validation_flag') || failedRuleIds.includes('max_questions'));
    assert.match(validation.retryInstruction ?? '', /Too many questions|exactly one question/i);
  });

  it('attempt 2 accepts valid single-question reply within one runtime request', async () => {
    let callCount = 0;
    const provider: LlmProviderPort = {
      providerId: 'openai',
      async generateText(req) {
        callCount += 1;
        const text = callCount === 1 ? ATTEMPT1_PROVIDER_TEXT : ATTEMPT2_PROVIDER_TEXT;
        assert.ok(
          callCount !== 2 || (req.developerPrompt?.includes('Retry fix instruction') ?? false),
          'attempt 2 must receive retry instruction'
        );
        return { text, model: 'gpt-test' };
      },
    };

    const ctx: SafeRuntimeContext = {
      turnInput: {
        mediationId: 'med-session-start',
        turnNumber: 1,
        trigger: 'session_start',
        engineVersion: 'v2.3',
      } as never,
      sessionMemory: {} as never,
      llmProvider: provider,
      maxReplyAttempts: 2,
      language: 'pl',
    };

    const result = await runReplyRetryLoop({
      promptComposerOutput: createSafeOpeningPrompt(),
      ctx,
      safetyLevel: 'none',
      turnNumber: 1,
    });

    assert.equal(callCount, 2);
    assert.equal(result.responseValidation.action, 'accept');
    assert.equal(result.responseValidation.valid, true);
    assert.equal(result.llmOutput.draftReply.text, ATTEMPT2_PROVIDER_TEXT);
    assert.equal(result.llmOutput.fallbackSubstituted, false);
    assert.notEqual(result.llmOutput.draftReply.text, LOCALIZED_NORMAL_TEXT.pl);
  });

  it('attempt 2 with two questions still blocks on max_questions, not hidden fallback path', async () => {
    const validation = validateMediatorReply(
      createValidationInput({
        language: 'pl',
        turnNumber: 1,
        attemptNumber: 2,
        maxAttempts: 2,
        draftReply: createDraftReply(ATTEMPT2_TWO_QUESTIONS, {
          language: 'pl',
          validation: {
            valid: false,
            reasons: ['Too many questions (2 > 1)'],
            blockedTermsFound: [],
            questionCount: 2,
            sentenceCount: 1,
            lengthChars: ATTEMPT2_TWO_QUESTIONS.length,
            safetyCompliant: true,
          },
        }),
        promptComposerOutput: createSafeOpeningPrompt(),
      })
    );

    assert.equal(validation.action, 'fallback');
    const failedRuleIds = validation.ruleResults.filter((rule) => !rule.passed).map((rule) => rule.ruleId);
    assert.ok(failedRuleIds.includes('max_questions') || failedRuleIds.includes('draft_validation_flag'));
    assert.ok(!validation.blockingReasons.some((reason) => reason.includes('Generic deterministic fallback')));
  });
});
