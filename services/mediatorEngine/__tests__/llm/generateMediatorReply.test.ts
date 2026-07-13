/**
 * LLM Bridge L1 — unit tests (Phase 2B).
 *
 *   npm run test:mediator:llm
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LlmProviderRequest } from '@/types/mediator';
import { generateMediatorReply } from '@/services/mediatorEngine/llm/generateMediatorReply';
import { sanitizeLlmResponse } from '@/services/mediatorEngine/llm/parse/sanitizeLlmResponse';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';
import {
  createFakeLlmProvider,
  createDeterministicStubProvider,
  createGenerateInput,
  createGenerateInputWithProvider,
  createL3PromptOutput,
  createPromptOutput,
} from '@/services/mediatorEngine/__tests__/llm/fixtures';

describe('generateMediatorReply — LLM Bridge L1', () => {
  it('fake provider zwraca draft reply', async () => {
    const result = await generateMediatorReply(createGenerateInput({ language: 'en' }));

    assert.equal(result.fallbackUsed, false);
    assert.equal(result.draftReply.source, 'llm');
    assert.ok(result.draftReply.text.length > 0);
    assert.equal(result.draftReply.validation.valid, true);
  });

  it('provider error → fallbackUsed=true', async () => {
    const provider = createFakeLlmProvider({ simulateError: true });
    const result = await generateMediatorReply(createGenerateInputWithProvider(provider));

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.draftReply.source, 'fallback');
    assert.ok(!result.providerResponse);
  });

  it('pusty output → fallback', async () => {
    const provider = createFakeLlmProvider({ simulateEmpty: true });
    const result = await generateMediatorReply(createGenerateInputWithProvider(provider));

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.draftReply.source, 'fallback');
  });

  it('output z code fence jest sanityzowany', async () => {
    const fenced = '```json\nI hear you both. This is difficult.\n```';
    assert.equal(sanitizeLlmResponse(fenced), 'I hear you both. This is difficult.');

    const provider = createFakeLlmProvider({ fixedText: fenced });
    const result = await generateMediatorReply(createGenerateInputWithProvider(provider));

    assert.equal(result.fallbackUsed, false);
    assert.ok(!result.draftReply.text.includes('```'));
  });

  it('output z JSON wrapper jest sanityzowany', async () => {
    const wrapped = '{"text": "I hear you both. This is difficult."}';
    assert.equal(sanitizeLlmResponse(wrapped), 'I hear you both. This is difficult.');

    const provider = createFakeLlmProvider({ fixedText: wrapped });
    const result = await generateMediatorReply(createGenerateInputWithProvider(provider));

    assert.equal(result.fallbackUsed, false);
    assert.ok(!result.draftReply.text.startsWith('{'));
  });

  it('output z zakazanym terminem pipeline → fallback', async () => {
    const provider = createFakeLlmProvider({
      fixedText: 'The pipeline suggests we validate emotions now.',
    });
    const result = await generateMediatorReply(createGenerateInputWithProvider(provider));

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.draftReply.source, 'fallback');
    assert.ok(!result.draftReply.text.toLowerCase().includes('pipeline'));
  });

  it('więcej niż 1 pytanie → fallback', async () => {
    const provider = createFakeLlmProvider({
      fixedText: 'How do you feel? What do you need? Can we pause?',
    });
    const result = await generateMediatorReply(createGenerateInputWithProvider(provider));

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.draftReply.source, 'fallback');
  });

  it('więcej niż 4 zdania → fallback', async () => {
    const provider = createFakeLlmProvider({
      fixedText:
        'One sentence here. Two sentence here. Three sentence here. Four sentence here. Five sentence here.',
    });
    const result = await generateMediatorReply(createGenerateInputWithProvider(provider));

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.draftReply.source, 'fallback');
  });

  it('safety L3 wymusza safety-compliant reply (stub)', async () => {
    const provider = createDeterministicStubProvider();
    const result = await generateMediatorReply(
      createGenerateInputWithProvider(provider, {
        safetyLevel: 'L3_stop',
        language: 'en',
        promptComposerOutput: createL3PromptOutput('en'),
      })
    );

    assert.equal(result.fallbackUsed, false);
    assert.equal(result.draftReply.source, 'stub');
    assert.equal(result.draftReply.validation.safetyCompliant, true);
    assert.match(result.draftReply.text, /pause|step back/i);
  });

  it('safety L3 normal mediation text → fallback', async () => {
    const provider = createFakeLlmProvider({
      fixedText: "Let's explore what happened between you and move forward with the mediation.",
    });
    const result = await generateMediatorReply(
      createGenerateInputWithProvider(provider, {
        safetyLevel: 'L3_stop',
        language: 'en',
        promptComposerOutput: createL3PromptOutput('en'),
      })
    );

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.draftReply.source, 'fallback');
    assert.equal(result.draftReply.safetyLevel, 'L3_stop');
  });

  it('PL fallback jest po polsku', async () => {
    const draft = createFallbackMediatorReply('pl', 'none', 1);
    assert.match(draft.text, /karuzel|zatrzymajmy|rozumieć|jedną/i);
    assert.equal(draft.language, 'pl');
  });

  it('PL safety fallback L3 jest naturalny i safety-compliant', () => {
    const draft = createFallbackMediatorReply('pl', 'L3_stop', 3);

    assert.match(draft.text, /pauz|przekórki/i);
    assert.equal(draft.validation.safetyCompliant, true);
    assert.ok(draft.validation.sentenceCount <= 4);
    assert.equal(draft.source, 'fallback');
  });

  it('EN fallback jest po angielsku', async () => {
    const draft = createFallbackMediatorReply('en', 'none', 1);
    assert.match(draft.text, /both of you|let us|Hold/i);
    assert.equal(draft.language, 'en');
  });

  it('generateMediatorReply nie crashuje na malformed input', async () => {
    const result = await generateMediatorReply(null as never);
    assert.ok(result.draftReply);
    assert.equal(result.fallbackUsed, true);
  });

  it('request do provider zawiera system/developer/user prompt', async () => {
    let captured: LlmProviderRequest | undefined;
    const provider = createFakeLlmProvider({
      onRequest: (req) => {
        captured = req;
      },
    });
    const promptOutput = createPromptOutput('en');

    await generateMediatorReply(
      createGenerateInputWithProvider(provider, { promptComposerOutput: promptOutput })
    );

    assert.ok(captured);
    assert.equal(captured!.systemPrompt, promptOutput.systemPrompt);
    assert.equal(captured!.developerPrompt, promptOutput.developerPrompt);
    assert.equal(captured!.userPrompt, promptOutput.userPrompt);
  });

  it('metadata nie zawiera pełnego transcriptu', async () => {
    let captured: LlmProviderRequest | undefined;
    const provider = createFakeLlmProvider({
      onRequest: (req) => {
        captured = req;
      },
    });
    const promptOutput = createPromptOutput('en');

    const result = await generateMediatorReply(
      createGenerateInputWithProvider(provider, { promptComposerOutput: promptOutput })
    );

    const requestJson = JSON.stringify(captured!.metadata);
    assert.ok(!requestJson.includes('Dialogue'));
    assert.ok(!requestJson.includes('Host:'));
    assert.ok(!requestJson.includes('Partner:'));

    const draftJson = JSON.stringify(result.draftReply.metadata);
    assert.ok(!draftJson.includes('Dialogue'));
    assert.equal(typeof result.draftReply.metadata.turnNumber, 'number');
  });

  it('validation zawiera questionCount/sentenceCount/lengthChars', async () => {
    const result = await generateMediatorReply(createGenerateInput({ language: 'en' }));

    assert.ok(typeof result.draftReply.validation.questionCount === 'number');
    assert.ok(typeof result.draftReply.validation.sentenceCount === 'number');
    assert.ok(typeof result.draftReply.validation.lengthChars === 'number');
    assert.equal(
      result.draftReply.validation.lengthChars,
      result.draftReply.text.trim().length
    );
  });

  it('deterministic stub normal output', async () => {
    const provider = createDeterministicStubProvider();
    const result = await generateMediatorReply(
      createGenerateInputWithProvider(provider, { safetyLevel: 'none', language: 'en' })
    );

    assert.equal(result.fallbackUsed, false);
    assert.equal(result.draftReply.source, 'stub');
    assert.match(result.draftReply.text, /share|differently|perspective/i);
  });

  it('deterministic stub safety output', async () => {
    const provider = createDeterministicStubProvider();
    const result = await generateMediatorReply(
      createGenerateInputWithProvider(provider, {
        safetyLevel: 'L2_pause',
        language: 'pl',
        promptComposerOutput: createL3PromptOutput('pl'),
      })
    );

    assert.equal(result.fallbackUsed, false);
    assert.equal(result.draftReply.source, 'stub');
    assert.match(result.draftReply.text, /pauz|przekórki/i);
  });

  it('generatedAt ISO', async () => {
    const result = await generateMediatorReply(createGenerateInput());
    assert.ok(!Number.isNaN(Date.parse(result.generatedAt)));
    assert.ok(!Number.isNaN(Date.parse(result.draftReply.metadata.generatedAt)));
  });

  it('source poprawnie: llm/fallback/stub', async () => {
    const llmResult = await generateMediatorReply(createGenerateInput());
    assert.equal(llmResult.draftReply.source, 'llm');

    const stubResult = await generateMediatorReply(
      createGenerateInputWithProvider(createDeterministicStubProvider())
    );
    assert.equal(stubResult.draftReply.source, 'stub');

    const fallbackResult = await generateMediatorReply(
      createGenerateInputWithProvider(createFakeLlmProvider({ simulateError: true }))
    );
    assert.equal(fallbackResult.draftReply.source, 'fallback');
  });
});
