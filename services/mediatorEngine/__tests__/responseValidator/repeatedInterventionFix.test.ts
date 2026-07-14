/**
 * repeated_intervention root-cause fixes — comparison set, trigram rule, retry feedback.
 *
 *   npm run test:mediator:response
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TranscriptMessage } from '@/types/mediator';
import { buildPromptComposerOutput } from '@/services/mediatorEngine/promptComposer/build/buildPromptComposerOutput';
import { safePromptInput } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';
import { createPromptComposerInput } from '@/services/mediatorEngine/__tests__/promptComposer/fixtures';
import {
  extractRepetitionComparisonMessages,
  extractRecentMediatorMessages,
} from '@/services/mediatorEngine/promptComposer/transcript/extractRecentMediatorMessages';
import { analyzeRepeatedIntervention } from '@/services/mediatorEngine/responseValidator/lib/repetitionAnalysis';
import { validateRepeatedIntervention } from '@/services/mediatorEngine/responseValidator/rules/validateRepeatedIntervention';
import { validateMediatorReply } from '@/services/mediatorEngine/responseValidator/validateMediatorReply';
import { runReplyRetryLoop } from '@/services/mediatorEngine/runtime/retry/runReplyRetryLoop';
import { createDraftReply, createValidationInput } from '@/services/mediatorEngine/__tests__/responseValidator/fixtures';
import type { LlmProviderPort, SafeRuntimeContext } from '@/types/mediator';

const TURN2_SUMMARY =
  'Daniel czuje się jak sędzia w sprawie o gary. Patrycja ma dość krzyku. Oboje mówią obok siebie.';
const TURN2_QUESTION =
  'Daniel, kiedy Patrycja podnosi głos, co wtedy robisz — milkniesz czy odpowiadasz od razu?';
const HOST_REPLY = 'Milknę, bo nie chcę eskalacji. Czuję, że i tak nie zostanę wysłuchany.';
const PARTNER_REPLY = 'Krzyczę, bo inaczej czuję, że mnie nie ma w tej rozmowie.';

function turn2Transcript(): TranscriptMessage[] {
  return [
    {
      id: 'summary-1',
      authorRole: 'mediator',
      content: TURN2_SUMMARY,
      messageType: 'summary',
      turnNumber: 1,
      createdAt: '2026-07-14T10:00:00.000Z',
    },
    {
      id: 'question-1',
      authorRole: 'mediator',
      content: TURN2_QUESTION,
      messageType: 'question',
      turnNumber: 1,
      createdAt: '2026-07-14T10:00:01.000Z',
    },
    {
      id: 'host-2',
      authorRole: 'host',
      content: HOST_REPLY,
      turnNumber: 2,
      createdAt: '2026-07-14T10:01:00.000Z',
    },
    {
      id: 'partner-2',
      authorRole: 'partner',
      content: PARTNER_REPLY,
      turnNumber: 2,
      createdAt: '2026-07-14T10:01:30.000Z',
    },
  ];
}

describe('repeated_intervention root-cause fixes', () => {
  it('Test A — one shared trigram with opening summary but different intervention goal → accept', () => {
    const draft =
      'Patrycja, kiedy Daniel milknie po podniesieniu głosu, co wtedy czujesz — że przegrywasz czy że on się wycofuje?';
    const comparisonOnly = extractRepetitionComparisonMessages(turn2Transcript());

    assert.deepEqual(comparisonOnly, [TURN2_QUESTION]);

    const analysis = analyzeRepeatedIntervention({
      draftText: draft,
      recentMediatorMessages: comparisonOnly,
    });

    assert.equal(analysis.repeated, false);

    const validation = validateRepeatedIntervention({
      text: draft,
      draftReply: createDraftReply(draft, { language: 'pl' }),
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 2,
      attemptNumber: 1,
      maxAttempts: 2,
      recentMediatorMessages: comparisonOnly,
    });
    assert.equal(validation.passed, true);

    const againstSummary = analyzeRepeatedIntervention({
      draftText: draft,
      recentMediatorMessages: [TURN2_SUMMARY],
    });
    assert.equal(againstSummary.repeated, false, 'single incidental overlap with summary alone does not block');
  });

  it('Test B — repeats opening summary framing but summary excluded from comparison → no block', () => {
    const draft =
      'Daniel czuje się jak sędzia w sprawie o gary. Patrycja ma dość krzyku. Daniel, czego teraz potrzebujesz w tej rozmowie?';
    const comparisonOnly = extractRepetitionComparisonMessages(turn2Transcript());

    const analysis = analyzeRepeatedIntervention({
      draftText: draft,
      recentMediatorMessages: comparisonOnly,
    });

    assert.equal(analysis.repeated, false);

    const validation = validateRepeatedIntervention({
      text: draft,
      draftReply: createDraftReply(draft, { language: 'pl' }),
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 2,
      attemptNumber: 1,
      maxAttempts: 2,
      recentMediatorMessages: comparisonOnly,
    });
    assert.equal(validation.passed, true);

    const againstSummary = analyzeRepeatedIntervention({
      draftText: draft,
      recentMediatorMessages: [TURN2_SUMMARY],
    });
    assert.equal(againstSummary.repeated, true, 'summary framing would block if summary were in comparison set');
  });

  it('Test C — new question repeats prior mediator question → block repeated_intervention', () => {
    const prior =
      'Patrycja, kiedy Daniel mówi że czuje się porzucony, co wtedy słyszysz — prośbę czy kontrolę?';
    const repeat =
      'Patrycja, kiedy Daniel mówi że czuje się zostawiony, co wtedy słyszysz — prośbę o rozmowę czy próbę kontroli?';

    const analysis = analyzeRepeatedIntervention({
      draftText: repeat,
      recentMediatorMessages: [prior],
      knownNames: ['Daniel', 'Patrycja'],
    });
    assert.equal(analysis.repeated, true);
    assert.ok(analysis.reasons.some((reason) => reason.includes('question')));

    const validation = validateRepeatedIntervention({
      text: repeat,
      draftReply: createDraftReply(repeat, { language: 'pl' }),
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 5,
      attemptNumber: 1,
      maxAttempts: 2,
      recentMediatorMessages: [prior],
    });
    assert.equal(validation.passed, false);
    assert.equal(validation.ruleId, 'repeated_intervention');
  });

  it('Test D — attempt 1 blocked, attempt 2 receives matchedPhrase guidance and accepts (HTTP 200 path)', async () => {
    const prior =
      'Daniel, czujesz się jak mebel w tym układzie. Patrycja, kiedy wychodzisz, co on wtedy słyszy — porzucenie czy kontrolę?';
    const repeat =
      'Daniel, widzę że czujesz się jak mebel. Patrycja, gdy wychodzisz zamiast zostać, co to dla niego znaczy — że go zostawiasz?';
    const fresh =
      'Patrycja, skoro Daniel mówi że milknie z lęku przed eskalacją, co chciałabyś usłyszeć zamiast krzyku w takiej chwili?';

    const attempt1 = validateMediatorReply(
      createValidationInput({
        language: 'pl',
        turnNumber: 2,
        attemptNumber: 1,
        maxAttempts: 2,
        draftReply: createDraftReply(repeat, { language: 'pl' }),
        promptComposerOutput: {
          ...createValidationInput({ language: 'pl' }).promptComposerOutput,
          promptMetadata: {
            ...createValidationInput({ language: 'pl' }).promptComposerOutput.promptMetadata,
            recentMediatorMessages: [prior],
          },
        },
      })
    );

    assert.equal(attempt1.action, 'retry');
    assert.match(attempt1.retryInstruction ?? '', /Matched phrase:/i);
    assert.match(attempt1.retryInstruction ?? '', /transcript delta/i);
    assert.match(attempt1.retryInstruction ?? '', /Do not paraphrase the opening summary/i);

    const attempt2 = validateMediatorReply(
      createValidationInput({
        language: 'pl',
        turnNumber: 2,
        attemptNumber: 2,
        maxAttempts: 2,
        draftReply: createDraftReply(fresh, { language: 'pl' }),
        promptComposerOutput: {
          ...createValidationInput({ language: 'pl' }).promptComposerOutput,
          promptMetadata: {
            ...createValidationInput({ language: 'pl' }).promptComposerOutput.promptMetadata,
            recentMediatorMessages: [prior],
          },
        },
      })
    );

    assert.equal(attempt2.action, 'accept');
    assert.equal(attempt2.valid, true);

    let callCount = 0;
    const provider: LlmProviderPort = {
      providerId: 'test',
      async generateText() {
        callCount += 1;
        return {
          text: callCount === 1 ? repeat : fresh,
          model: 'test-model',
        };
      },
    };

    const ctx: SafeRuntimeContext = {
      turnInput: {
        mediationId: 'med-1',
        turnNumber: 2,
        trigger: 'host_generate',
      } as never,
      sessionMemory: {} as never,
      llmProvider: provider,
      maxReplyAttempts: 2,
      language: 'pl',
    };

    const promptComposerOutput = {
      ...createValidationInput({ language: 'pl' }).promptComposerOutput,
      promptMetadata: {
        ...createValidationInput({ language: 'pl' }).promptComposerOutput.promptMetadata,
        recentMediatorMessages: [prior],
      },
    };

    const runtimeResult = await runReplyRetryLoop({
      promptComposerOutput,
      ctx,
      safetyLevel: 'none',
      turnNumber: 2,
    });

    assert.equal(runtimeResult.responseValidation.action, 'accept');
    assert.equal(runtimeResult.responseValidation.valid, true);
    assert.equal(callCount, 2);
  });

  it('Test E — summary stays in prompt context, excluded from repetition comparison, both replies kept', () => {
    const transcript = turn2Transcript();
    const input = createPromptComposerInput({
      turnNumber: 2,
      transcriptWindow: transcript,
    });
    const ctx = safePromptInput(input);
    const output = buildPromptComposerOutput(ctx);

    assert.equal(output.promptMetadata.transcriptMessageCount, 4);
    assert.ok(output.userPrompt.includes(TURN2_SUMMARY), 'summary remains in prompt context');
    assert.ok(output.userPrompt.includes(HOST_REPLY), 'host reply remains in prompt context');
    assert.ok(output.userPrompt.includes(PARTNER_REPLY), 'partner reply remains in prompt context');

    const repetitionHistory = output.promptMetadata.recentMediatorMessages ?? [];
    const allMediatorBodies = extractRecentMediatorMessages(transcript);

    assert.deepEqual(repetitionHistory, [TURN2_QUESTION]);
    assert.ok(allMediatorBodies.includes(TURN2_SUMMARY), 'summary still present in full mediator history');
    assert.ok(!repetitionHistory.includes(TURN2_SUMMARY), 'summary excluded from repetition comparison');
  });
});
