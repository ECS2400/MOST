import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTherapeuticStageConstraints } from '@/services/mediatorEngine/promptComposer/config/therapeuticStageConstraints';
import { validateTherapeuticFlow } from '@/services/mediatorEngine/responseValidator/rules/validateTherapeuticFlow';
import { LOCALIZED_NORMAL_TEXT } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import { createValidationInput } from '@/services/mediatorEngine/__tests__/responseValidator/fixtures';

const DANIEL_PATRYCJA_GOOD =
  'Daniel mówi, że po pracy potrzebuje chwili bez nacisku, a Patrycja słyszy w tym kolejny sygnał, że obowiązki zostaną na jej głowie. To nie jest jeszcze spór o 40 minut odpoczynku — tylko o to, czy jedno z was może odpocząć bez poczucia, że drugie zostaje samo. Patrycja, co dokładnie dzieje się w Tobie w chwili, gdy Daniel mówi: „zrobię to później”?';

describe('therapeutic flow constraints', () => {
  it('story_collection prompt constraints forbid solution-seeking language', () => {
    const constraints = buildTherapeuticStageConstraints('PERSPECTIVE_SHARING', 'pl').join('\n');
    assert.match(constraints, /konkretnych kroków/i);
    assert.match(constraints, /perspektyw/i);
    assert.doesNotMatch(constraints, /Jakie konkretne kroki/i);
  });

  it('rejects solution-seeking mediator output during story_collection', () => {
    const result = validateTherapeuticFlow({
      text: 'Jakie konkretne kroki moglibyście podjąć, żeby lepiej się zrozumieć?',
      draftReply: createValidationInput().draftReply,
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 2,
      attemptNumber: 1,
      maxAttempts: 2,
      currentGoal: 'PERSPECTIVE_SHARING',
    });

    assert.equal(result.passed, false);
    assert.equal(result.severity, 'block');
  });

  it('rejects generic deterministic fallback text during exploration', () => {
    const result = validateTherapeuticFlow({
      text: LOCALIZED_NORMAL_TEXT.pl,
      draftReply: createValidationInput().draftReply,
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 2,
      attemptNumber: 1,
      maxAttempts: 2,
      currentGoal: 'EMOTION_NAMING',
    });

    assert.equal(result.passed, false);
  });

  it('accepts perspective-reflective story_collection output referencing both sides', () => {
    const result = validateTherapeuticFlow({
      text: DANIEL_PATRYCJA_GOOD,
      draftReply: createValidationInput().draftReply,
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 2,
      attemptNumber: 1,
      maxAttempts: 2,
      currentGoal: 'PERSPECTIVE_SHARING',
    });

    assert.equal(result.passed, true);
    assert.match(DANIEL_PATRYCJA_GOOD, /Daniel/i);
    assert.match(DANIEL_PATRYCJA_GOOD, /Patrycja/i);
    assert.doesNotMatch(DANIEL_PATRYCJA_GOOD, /konkretne kroki/i);
  });

  it('does not block solution language after exploration goals', () => {
    const result = validateTherapeuticFlow({
      text: 'Jakie konkretne kroki moglibyście podjąć w ciągu tygodnia?',
      draftReply: createValidationInput().draftReply,
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: 8,
      attemptNumber: 1,
      maxAttempts: 2,
      currentGoal: 'FUTURE_PLAN',
    });

    assert.equal(result.passed, true);
  });
});
