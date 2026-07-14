/**
 * PERSONA-6 quality fixture — repetition validation.
 *
 *   npm run test:mediator:response
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateRepeatedIntervention } from '@/services/mediatorEngine/responseValidator/rules/validateRepeatedIntervention';
import { analyzeRepeatedIntervention } from '@/services/mediatorEngine/responseValidator/lib/repetitionAnalysis';
import { createValidationInput, createDraftReply } from '@/services/mediatorEngine/__tests__/responseValidator/fixtures';
import { validateMediatorReply } from '@/services/mediatorEngine/responseValidator/validateMediatorReply';

describe('PERSONA-6 response quality', () => {
  it('repeated intervention is blocked across turns', () => {
    const prior =
      'Daniel, czujesz się jak mebel w tym układzie. Patrycja, kiedy wychodzisz, co on wtedy słyszy — porzucenie czy kontrolę?';
    const repeat =
      'Daniel, widzę że czujesz się jak mebel. Patrycja, gdy wychodzisz zamiast zostać, co to dla niego znaczy — że go zostawiasz?';

    const analysis = analyzeRepeatedIntervention({
      draftText: repeat,
      recentMediatorMessages: [prior],
      knownNames: ['Daniel', 'Patrycja'],
    });
    assert.equal(analysis.repeated, true);

    const validation = validateRepeatedIntervention({
      text: repeat,
      draftReply: createDraftReply(repeat, { language: 'pl' }),
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 5,
      attemptNumber: 1,
      maxAttempts: 3,
      recentMediatorMessages: [prior],
    });
    assert.equal(validation.passed, false);
    assert.equal(validation.ruleId, 'repeated_intervention');
  });

  it('validator retry path includes repeated_intervention instruction', () => {
    const prior =
      'Patrycja, kiedy Daniel mówi że czuje się zostawiony, co słyszysz — prośbę czy kontrolę?';
    const repeat =
      'Patrycja, kiedy Daniel mówi że czuje się porzucony, co wtedy słyszysz — prośbę o rozmowę czy próbę kontroli?';

    const result = validateRepeatedIntervention({
      text: repeat,
      draftReply: createDraftReply(repeat, { language: 'pl' }),
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 5,
      attemptNumber: 1,
      maxAttempts: 3,
      recentMediatorMessages: [prior],
    });

    assert.equal(result.passed, false);

    const full = createValidationInput({
      language: 'pl',
      draftReply: createDraftReply(repeat, { language: 'pl' }),
    });
    full.promptComposerOutput.promptMetadata = {
      ...full.promptComposerOutput.promptMetadata,
      recentMediatorMessages: [prior],
    };

    const validation = validateMediatorReply({
      ...full,
      draftReply: createDraftReply(repeat, { language: 'pl' }),
    });

    assert.equal(validation.action, 'retry');
    assert.match(validation.retryInstruction ?? '', /Matched phrase:|Change the intervention function/i);
  });
});
