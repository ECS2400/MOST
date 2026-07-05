/**
 * Session Memory L1 — unit tests (Phase 1C).
 *
 *   npm run test:mediator:memory
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GoalState, SessionMemory } from '@/types/mediator';
import { SESSION_MEMORY_LIMITS } from '@/services/mediatorEngine/memory/config/memoryLimits';
import { appendLimited, prependLimited } from '@/services/mediatorEngine/memory/lib/appendLimited';
import { dedupeAppendLimited } from '@/services/mediatorEngine/memory/lib/dedupeAppendLimited';
import { normalizeMemory } from '@/services/mediatorEngine/memory/lib/normalizeMemory';
import { updateSessionMemory } from '@/services/mediatorEngine/memory/updateSessionMemory';
import {
  createBaselineIntervention,
  createBaselineMediationState,
  createBaselineReflectionOutput,
  createBaselineSessionMemory,
  createSessionMemoryUpdateInput,
  TIMESTAMP,
} from '@/services/mediatorEngine/__tests__/memory/fixtures';
import { skeletonConfidence } from '@/services/mediatorEngine/_internal/skeletonDefaults';

describe('Session Memory L1 helpers', () => {
  it('appendLimited trims oldest entries', () => {
    assert.deepEqual(appendLimited([1, 2], 3, 3), [1, 2, 3]);
    assert.deepEqual(appendLimited([1, 2, 3], 4, 3), [2, 3, 4]);
  });

  it('dedupeAppendLimited removes duplicates before append', () => {
    assert.deepEqual(dedupeAppendLimited(['a', 'b'], 'a', 3), ['b', 'a']);
    assert.deepEqual(dedupeAppendLimited(['a', 'b', 'c'], 'd', 3), ['b', 'c', 'd']);
  });

  it('normalizeMemory repairs partial memory', () => {
    const normalized = normalizeMemory({
      interventionHistory: [{ turnNumber: 1 }],
    } as Partial<SessionMemory>);
    assert.ok(Array.isArray(normalized.breakthroughs));
    assert.ok(Array.isArray(normalized.reflectionLog));
    assert.equal(normalized.interventionHistory.length, 1);
  });
});

describe('updateSessionMemory — deterministic L1 updates', () => {
  it('does not mutate previousMemory', () => {
    const previousMemory = createBaselineSessionMemory({
      recentInterventionTypes: ['reflect'],
      askedInterventionSignatures: ['existing-signature'],
    });
    const frozen = structuredClone(previousMemory);
    const input = createSessionMemoryUpdateInput({ previousMemory });

    updateSessionMemory(input);

    assert.deepEqual(previousMemory, frozen);
  });

  it('appends intervention history with required fields', () => {
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        turnNumber: 4,
        intervention: createBaselineIntervention(4, {
          id: 'int-004',
          type: 'deescalate',
          signature: 'deescalate:EMOTION_NAMING:both',
          goal: 'EMOTION_NAMING',
          intent: 'reduce_conflict_intensity',
          strategy: 'reduce_tension',
          expectedEffect: {
            id: 'effect-004',
            description: 'Lower tension',
            observableSignals: ['calmer tone'],
            targetParticipant: 'both',
            verificationMethod: 'next_message',
            successCriteria: { type: 'check_confirmed', threshold: 0, confidenceRequired: 60 },
            timeHorizon: 1,
          },
        }),
        complianceResult: {
          compliant: false,
          violations: [
            {
              articleRef: 'Art. 4',
              ruleId: 'message_length',
              severity: 'block',
              confidence: 90,
              matchedText: 'too long',
            },
          ],
          attemptNumber: 2,
          fallbackUsed: true,
          validatedAt: TIMESTAMP,
          validatorLayer: 'deterministic',
        },
      })
    );

    assert.equal(result.interventionHistory.length, 1);
    const entry = result.interventionHistory[0];
    assert.equal(entry?.interventionId, 'int-004');
    assert.equal(entry?.type, 'deescalate');
    assert.equal(entry?.goal, 'EMOTION_NAMING');
    assert.equal(entry?.intent, 'reduce_conflict_intensity');
    assert.equal(entry?.strategy, 'reduce_tension');
    assert.equal(entry?.turnNumber, 4);
    assert.equal(entry?.expectedEffectId, 'effect-004');
    assert.equal(entry?.compliance.compliant, false);
    assert.equal(entry?.compliance.violationCount, 1);
    assert.equal(entry?.compliance.blockingViolationCount, 1);
    assert.equal(entry?.compliance.fallbackUsed, true);
    assert.equal(entry?.compliance.attemptNumber, 2);
  });

  it('updates recentInterventionTypes with newest first', () => {
    const previousMemory = createBaselineSessionMemory({
      recentInterventionTypes: ['reflect', 'validate'],
    });
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        previousMemory,
        intervention: createBaselineIntervention(3, { type: 'mirror' }),
      })
    );

    assert.deepEqual(result.recentInterventionTypes.slice(0, 3), ['mirror', 'reflect', 'validate']);
  });

  it('updates askedInterventionSignatures deterministically', () => {
    const previousMemory = createBaselineSessionMemory({
      askedInterventionSignatures: ['sig-a', 'sig-b'],
    });
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        previousMemory,
        intervention: createBaselineIntervention(3, { signature: 'sig-c' }),
      })
    );

    assert.deepEqual(result.askedInterventionSignatures, ['sig-a', 'sig-b', 'sig-c']);
  });

  it('deduplicates askedInterventionSignatures', () => {
    const previousMemory = createBaselineSessionMemory({
      askedInterventionSignatures: ['sig-a', 'sig-b', 'sig-c'],
    });
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        previousMemory,
        intervention: createBaselineIntervention(3, { signature: 'sig-a' }),
      })
    );

    assert.deepEqual(result.askedInterventionSignatures, ['sig-b', 'sig-c', 'sig-a']);
  });

  it('trims lists to configured limits', () => {
    const signatures = Array.from(
      { length: SESSION_MEMORY_LIMITS.maxAskedSignatures + 5 },
      (_, index) => `sig-${index}`
    );
    const previousMemory = createBaselineSessionMemory({
      askedInterventionSignatures: signatures,
    });

    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        previousMemory,
        intervention: createBaselineIntervention(3, { signature: 'sig-new' }),
      })
    );

    assert.equal(
      result.askedInterventionSignatures.length,
      SESSION_MEMORY_LIMITS.maxAskedSignatures
    );
    assert.equal(result.askedInterventionSignatures.at(-1), 'sig-new');
  });

  it('appends reflection log summary', () => {
    const reflection = createBaselineReflectionOutput({
      shouldChangeStrategy: true,
      recommendedStrategyShift: 'pivot',
    });
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        turnNumber: 5,
        reflection,
      })
    );

    assert.equal(result.reflectionLog.length, 1);
    const entry = result.reflectionLog[0];
    assert.equal(entry?.turnNumber, 5);
    assert.equal(entry?.lastInterventionHelpful, true);
    assert.equal(entry?.conversationMovedForward, true);
    assert.equal(entry?.shouldChangeStrategy, true);
    assert.equal(entry?.recommendedStrategyShift, 'pivot');
    assert.equal(entry?.expectedEffectEvaluation?.effectId, 'effect-001');
  });

  it('stores completedGoals from state.goals', () => {
    const goals: GoalState[] = [
      {
        goal: 'SAFE_OPENING',
        status: 'completed',
        checks: [],
        progressPercent: 100,
        startedAt: TIMESTAMP,
        completedAt: TIMESTAMP,
        attemptCount: 1,
      },
      {
        goal: 'EMOTION_NAMING',
        status: 'in_progress',
        checks: [],
        progressPercent: 40,
        startedAt: TIMESTAMP,
        completedAt: null,
        attemptCount: 1,
      },
    ];

    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        state: createBaselineMediationState({ goals }),
      })
    );

    assert.deepEqual(result.completedGoals, ['SAFE_OPENING']);
  });

  it('does not crash on partial memory', () => {
    assert.doesNotThrow(() => {
      const result = updateSessionMemory(
        createSessionMemoryUpdateInput({
          previousMemory: {
            interventionHistory: 'invalid',
          } as unknown as SessionMemory,
        })
      );
      assert.ok(Array.isArray(result.interventionHistory));
      assert.equal(result.interventionHistory.length, 1);
    });
  });

  it('does not store intervention.content messages in session memory', () => {
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        intervention: createBaselineIntervention(3, {
          content: {
            primaryMessage: '__PRIVATE_PRIMARY_TEXT__',
            secondaryMessage: '__PRIVATE_SECONDARY_TEXT__',
          },
        }),
      })
    );

    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('__PRIVATE_PRIMARY_TEXT__'));
    assert.ok(!serialized.includes('__PRIVATE_SECONDARY_TEXT__'));
    assert.ok(!serialized.includes('primaryMessage'));
    assert.ok(!serialized.includes('secondaryMessage'));
  });

  it('does not store breakthrough utterance text from state.memory.breakthroughHistory', () => {
    const privateQuote = '__PRIVATE_BREAKTHROUGH_QUOTE__';
    const privateTrigger = '__PRIVATE_BREAKTHROUGH_TRIGGER__';

    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        state: createBaselineMediationState({
          memory: {
            askedQuestionSignatures: [],
            recentMediatorMoves: [],
            coveredTopics: [],
            factMemory: [],
            breakthroughHistory: [
              {
                quote: privateQuote,
                triggerQuote: privateTrigger,
                type: 'mutual_understanding',
                confidence: 85,
                turnNumber: 3,
                participant: 'partner',
                detectedAt: TIMESTAMP,
              } as import('@/types/mediator').BreakthroughEvent & { triggerQuote: string },
            ],
            regressHistory: [],
          },
        }),
      })
    );

    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(privateQuote));
    assert.ok(!serialized.includes(privateTrigger));
    assert.equal(result.breakthroughs.length, 1);
    assert.equal(result.breakthroughs[0]?.type, 'mutual_understanding');
    assert.ok(typeof result.breakthroughs[0]?.sourceEventId === 'string');
    assert.ok(!('quote' in (result.breakthroughs[0] ?? {})));
  });

  it('does not store transcript or other private state text in session memory', () => {
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        state: createBaselineMediationState({
          memory: {
            askedQuestionSignatures: [],
            recentMediatorMoves: [],
            coveredTopics: ['finances'],
            factMemory: [
              {
                id: 'fact-1',
                speaker: 'host',
                fact: 'Partner said they feel betrayed about the secret account.',
                relatedGoalId: null,
                confidence: 80,
                sourceTurnNumber: 2,
              },
            ],
            breakthroughHistory: [],
            regressHistory: [],
          },
        }),
      })
    );

    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('secret account'));
    assert.ok(!serialized.includes('feel betrayed'));
  });

  it('records effective patterns when reflection marks intervention helpful', () => {
    const helpful = skeletonConfidence(true);
    helpful.confidence = 90;
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        intervention: createBaselineIntervention(3, { type: 'mirror' }),
        reflection: createBaselineReflectionOutput({ lastInterventionHelpful: helpful }),
      })
    );

    assert.ok(result.effectivePatterns.includes('mirror'));
  });

  it('prependLimited keeps recent types bounded', () => {
    const initial = ['a', 'b', 'c'];
    const limited = prependLimited(initial, 'd', 3);
    assert.deepEqual(limited, ['d', 'a', 'b']);
  });
});
