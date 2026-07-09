/**
 * Ending quality evaluation — unit tests (Phase 5J.1).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { futurePlanningEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/future-planning-ending';
import { evaluateEndingQuality } from '@/services/mediatorEngine/evaluation/ending/evaluateEndingQuality';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';

function createStubRun(): ConversationRunResult {
  const stubText =
    'Słyszę, że to jest trudne dla was obojga. Zatrzymajmy się na chwilę i mówcie po kolei.';
  const turn: TurnTrace = {
    turnNumber: 1,
    speaker: 'host',
    inputMessage: 'test',
    currentGoal: 'EMOTION_NAMING',
    strategy: 'validate_emotions',
    interventionType: 'validate',
    goalTransition: 'stay',
    sessionMemory: {} as TurnTrace['sessionMemory'],
    mediationState: {} as TurnTrace['mediationState'],
    finalMediatorMessage: {
      text: stubText,
      source: 'stub',
      safetyLevel: 'none',
    } as TurnTrace['finalMediatorMessage'],
    safetyLevel: 'none',
    compliance: {} as TurnTrace['compliance'],
  };

  return {
    conversationId: 'future-planning-ending',
    status: 'PASS',
    executedTurns: 1,
    turns: [turn],
  };
}

describe('evaluateEndingQuality', () => {
  it('detects deterministic stub and returns DIAGNOSTIC_LIMITED', () => {
    const evaluation = evaluateEndingQuality(createStubRun(), futurePlanningEndingConversation);

    assert.equal(evaluation.status, 'DIAGNOSTIC_LIMITED');
    assert.equal(evaluation.stubDetected, true);
    assert.equal(evaluation.canMeasureEndingQuality, false);
  });

  it('can PASS when contextual ending text matches expectations', () => {
    const contextualText =
      'Słyszę, że oboje chcecie przyszłości, ale inaczej reagujecie na presję planowania. ' +
      'Host potrzebuje poczucia, że nie jest sama z tym tematem, a partner boi się obietnic, których nie dowiezie. ' +
      'Para ustaliła mały krok: jeden temat naraz, jeden wieczór w tygodniu, prawo powiedzieć stop i wrócić do tematu następnego dnia. ' +
      'To pierwszy krok, nie pełne rozwiązanie. Czy taki mały krok jest dla was obojga wystarczająco bezpieczny na teraz?';

    const run: ConversationRunResult = {
      ...createStubRun(),
      turns: [
        {
          ...createStubRun().turns[0],
          finalMediatorMessage: {
            text: contextualText,
            source: 'llm',
            safetyLevel: 'none',
          } as TurnTrace['finalMediatorMessage'],
        },
      ],
    };

    const evaluation = evaluateEndingQuality(run, futurePlanningEndingConversation);

    assert.equal(evaluation.stubDetected, false);
    assert.equal(evaluation.canMeasureEndingQuality, true);
    assert.equal(evaluation.status, 'PASS');
    assert.ok(evaluation.conceptsMatched >= 6);
    assert.equal(evaluation.closingQuestionDetected, true);
    assert.equal(evaluation.forbiddenViolations, 0);
  });
});
