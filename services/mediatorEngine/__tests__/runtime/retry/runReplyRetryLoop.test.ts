import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runReplyRetryLoop } from '@/services/mediatorEngine/runtime/retry/runReplyRetryLoop';
import type { LlmProviderPort, PromptComposerOutput, SafeRuntimeContext } from '@/types/mediator';

function createPromptOutput(): PromptComposerOutput {
  return {
    systemPrompt: 'system',
    developerPrompt: 'dev',
    userPrompt: 'user',
    contextSummary: 'ctx',
    promptMetadata: {
      turnNumber: 1,
      language: 'en',
      interventionType: 'validate',
      goal: 'STORY_COLLECTION',
      composedAt: new Date().toISOString(),
      transcriptMessageCount: 0,
    },
    safetyEnvelope: { level: 'none', rules: [] },
    tokenEstimate: 1,
    modelHints: [],
  };
}

describe('runReplyRetryLoop', () => {
  it('retry #1 receives retry instruction and developer prompt changes across attempts', async () => {
    const developerPrompts: string[] = [];
    const provider: LlmProviderPort = {
      providerId: 'test',
      async generateText(req) {
        developerPrompts.push(req.developerPrompt);
        // Always fail forbidden_terms to force a real retry (not targeted rewrite).
        return { text: 'The pipeline suggests we pause and listen.', model: 'test-model' };
      },
    };

    const ctx: SafeRuntimeContext = {
      turnInput: {} as never,
      sessionMemory: {} as never,
      llmProvider: provider,
      maxReplyAttempts: 3,
      language: 'en',
    };

    const result = await runReplyRetryLoop({
      promptComposerOutput: createPromptOutput(),
      ctx,
      safetyLevel: 'none',
      turnNumber: 1,
    });

    assert.ok(result.responseValidation.retryInstruction || result.responseValidation.action !== 'retry');
    assert.ok(developerPrompts.length >= 2, 'should have attempted at least 2 provider calls');
    assert.notEqual(
      developerPrompts[0],
      developerPrompts[1],
      'retry attempt must not reuse identical developer prompt'
    );
    assert.ok(
      developerPrompts[1].includes('Retry fix instruction'),
      'retry developer prompt should include retry instruction'
    );
  });
});

