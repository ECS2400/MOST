/**
 * Reflection Engine L1 — unit tests (Phase 1G).
 *
 *   npm run test:mediator:reflection
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runReflection } from '@/services/mediatorEngine/reflection/runReflection';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import {
  compliantResult,
  createPreviousIneffectiveReflection,
  createReflectionInput,
  createTranscriptDelta,
  nonCompliantResult,
  PRIVATE_TEXT,
  toMediatorIntervention,
  withLastInterventionMeta,
} from '@/services/mediatorEngine/__tests__/reflection/fixtures';
import { createBaselineIntervention } from '@/services/mediatorEngine/__tests__/memory/fixtures';
import type { ReflectionOutput } from '@/types/mediator';

const REQUIRED_OUTPUT_KEYS: Array<keyof ReflectionOutput> = [
  'understoodPartners',
  'lastInterventionHelpful',
  'conversationMovedForward',
  'shouldChangeStrategy',
  'repeatRisk',
  'drillDownRisk',
  'stuckRisk',
  'recommendedStrategyShift',
  'reflectionNotes',
  'expectedEffectEvaluation',
  'partnerReadiness',
  'strategyRecommendation',
  'paceRecommendation',
  'loadRecommendation',
];

function assertRequiredFields(output: ReflectionOutput) {
  for (const key of REQUIRED_OUTPUT_KEYS) {
    assert.ok(key in output, `missing required field: ${key}`);
  }
  assert.ok(output.partnerReadiness.host);
  assert.ok(output.partnerReadiness.partner);
}

function serializedOutput(output: ReflectionOutput): string {
  return JSON.stringify(output);
}

describe('runReflection — L1 deterministic structural evaluation', () => {
  it('compliant intervention + new non-empty messages → helpful=true', () => {
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastComplianceResult: compliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'partner', content: PRIVATE_TEXT },
        ]),
      })
    );

    assert.equal(result.lastInterventionHelpful.value, true);
    assert.equal(result.conversationMovedForward.value, true);
    assertRequiredFields(result);
  });

  it('brak nowych wiadomości → conversationMovedForward=false', () => {
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastComplianceResult: compliantResult(),
        transcriptDelta: [],
      })
    );

    assert.equal(result.conversationMovedForward.value, false);
  });

  it('empty messages only → conversationMovedForward=false', () => {
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastComplianceResult: compliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'e1', authorRole: 'host', content: '   ' },
          { id: 'e2', authorRole: 'partner', content: '' },
        ]),
      })
    );

    assert.equal(result.conversationMovedForward.value, false);
  });

  it('escalation → readiness false / needsMoreTime true', () => {
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastComplianceResult: compliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'host', content: PRIVATE_TEXT },
        ]),
        stateAfter: createBaselineMediationState({
          meta: { ...createBaselineMediationState().meta, currentTurnNumber: 4 },
          dynamics: {
            ...createBaselineMediationState().dynamics,
            escalationDetected: true,
            escalationLevel: 3,
          },
        }),
      })
    );

    assert.equal(result.partnerReadiness.host.readyToAdvance.value, false);
    assert.equal(result.partnerReadiness.partner.readyToAdvance.value, false);
    assert.equal(result.partnerReadiness.host.needsMoreTime.value, true);
    assert.equal(result.partnerReadiness.partner.needsMoreTime.value, true);
  });

  it('blame loop → shouldChangeStrategy true + recommended shift deescalate', () => {
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastComplianceResult: compliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'partner', content: PRIVATE_TEXT },
        ]),
        stateAfter: createBaselineMediationState({
          meta: { ...createBaselineMediationState().meta, currentTurnNumber: 4 },
          dynamics: {
            ...createBaselineMediationState().dynamics,
            blameLoopDetected: true,
            blameLoopCount: 2,
          },
        }),
      })
    );

    assert.equal(result.shouldChangeStrategy, true);
    assert.equal(result.recommendedStrategyShift, 'deescalate');
  });

  it('safety active → recommended shift pause', () => {
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        safetyLevel: 'L2_pause',
        lastComplianceResult: compliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'host', content: PRIVATE_TEXT },
        ]),
        stateAfter: createBaselineMediationState({
          meta: { ...createBaselineMediationState().meta, currentTurnNumber: 4 },
          dynamics: {
            ...createBaselineMediationState().dynamics,
            mode: 'SAFETY',
          },
        }),
      })
    );

    assert.equal(result.recommendedStrategyShift, 'pause');
  });

  it('breakthrough → recommended shift consolidate', () => {
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastComplianceResult: compliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'host', content: PRIVATE_TEXT },
        ]),
        stateAfter: createBaselineMediationState({
          meta: { ...createBaselineMediationState().meta, currentTurnNumber: 4 },
          dynamics: {
            ...createBaselineMediationState().dynamics,
            breakthroughDetected: true,
          },
        }),
      })
    );

    assert.equal(result.recommendedStrategyShift, 'consolidate');
  });

  it('non-compliant intervention → helpful=false', () => {
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastComplianceResult: nonCompliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'partner', content: PRIVATE_TEXT },
        ]),
      })
    );

    assert.equal(result.lastInterventionHelpful.value, false);
    assert.equal(result.shouldChangeStrategy, true);
  });

  it('expectedEffectEvaluation achieved przy structural signal', () => {
    const stateAfter = withLastInterventionMeta(
      createBaselineMediationState({
        meta: { ...createBaselineMediationState().meta, currentTurnNumber: 4 },
      }),
      {
        id: 'effect-test',
        observableSignals: ['acknowledgment'],
      }
    );

    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        stateAfter,
        lastComplianceResult: compliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'partner', content: PRIVATE_TEXT },
        ]),
      })
    );

    assert.ok(result.expectedEffectEvaluation);
    assert.equal(result.expectedEffectEvaluation?.effectId, 'effect-test');
    assert.equal(result.expectedEffectEvaluation?.achieved, true);
    assert.equal(result.expectedEffectEvaluation?.partial, false);
  });

  it('no transcript content leakage', () => {
    const secret = 'SECRET_USER_MESSAGE_BODY_12345';
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastComplianceResult: compliantResult(),
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'host', content: secret },
        ]),
      })
    );

    const serialized = serializedOutput(result);
    assert.ok(!serialized.includes(secret));
    assert.ok(!serialized.includes(PRIVATE_TEXT));
    for (const field of [
      result.reflectionNotes,
      ...result.lastInterventionHelpful.evidence,
      ...result.conversationMovedForward.evidence,
      ...(result.expectedEffectEvaluation?.evidence ?? []),
    ]) {
      assert.ok(!field.includes(secret));
    }
  });

  it('malformed input no throw', () => {
    assert.doesNotThrow(() => runReflection(null as unknown as ReturnType<typeof createReflectionInput>));
    assert.doesNotThrow(() => runReflection({} as ReturnType<typeof createReflectionInput>));
    assert.doesNotThrow(() =>
      runReflection({
        lastIntervention: null,
        stateBefore: undefined,
        stateAfter: 'invalid',
        transcriptDelta: 'not-an-array',
        goalChecksDelta: null,
      } as unknown as ReturnType<typeof createReflectionInput>)
    );
  });

  it('repeated ineffective pattern → shouldChangeStrategy true', () => {
    const intervention = createBaselineIntervention(3, { type: 'validate' });
    const result = runReflection(
      createReflectionInput({
        turnNumber: 4,
        lastIntervention: toMediatorIntervention(intervention),
        lastComplianceResult: compliantResult(),
        previousReflection: createPreviousIneffectiveReflection(),
        recentIneffectiveTypes: ['validate'],
        transcriptDelta: createTranscriptDelta([
          { id: 'm1', authorRole: 'partner', content: PRIVATE_TEXT },
        ]),
      })
    );

    assert.equal(result.shouldChangeStrategy, true);
    assert.equal(result.repeatRisk.value, true);
  });

  it('output zawiera wszystkie wymagane pola', () => {
    const result = runReflection(createReflectionInput());
    assertRequiredFields(result);
    assert.equal(typeof result.shouldChangeStrategy, 'boolean');
    assert.equal(typeof result.recommendedStrategyShift, 'string');
    assert.equal(typeof result.reflectionNotes, 'string');
  });
});
