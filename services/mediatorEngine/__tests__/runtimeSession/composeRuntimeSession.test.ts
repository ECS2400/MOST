/**
 * Runtime session composer — unit tests (Phase UI-B.3b.2).
 *
 *   npm run test:mediator:runtimeSession
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  composeRuntimeSession,
  type ComposeRuntimeSessionInput,
} from '@/services/mediatorEngine/runtimeSession/composeRuntimeSession';
import {
  createEmptyMediationState,
  createEmptySessionMemory,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createMinimalIntervention } from '@/services/mediatorEngine/intervention/builder/buildIntervention';
import type { OrchestrateTurnRequest } from '@/types/mediator';

const BASE_REQUEST: OrchestrateTurnRequest = {
  mediationId: 'med-1',
  sessionId: 'med-1',
  turnNumber: 1,
  trigger: 'session_start',
  transcriptDelta: [],
  language: 'en',
  engineVersion: 'v2.3',
};

function buildInput(
  overrides: Partial<ComposeRuntimeSessionInput> & {
    statePatch?: (state: ReturnType<typeof createEmptyMediationState>) => void;
  } = {}
): ComposeRuntimeSessionInput {
  const mediationState = createEmptyMediationState({
    ...BASE_REQUEST,
    turnNumber: overrides.runtimeMetadata?.turnNumber ?? 1,
  });
  overrides.statePatch?.(mediationState);

  const intervention = createMinimalIntervention(
    overrides.runtimeMetadata?.turnNumber ?? 1
  );
  if (overrides.intervention) {
    Object.assign(intervention, overrides.intervention);
  }

  return {
    mediationState,
    sessionMemory: createEmptySessionMemory(),
    intervention,
    finalMediatorMessage: {
      text: 'How are you feeling about what happened?',
      source: 'stub',
      safetyLevel: 'none',
      language: 'en',
      turnNumber: 1,
      accepted: true,
      validationAction: 'accept',
    },
    runtimeMetadata: {
      engineVersion: 'v2.3',
      turnNumber: 1,
      startedAt: '2026-07-10T10:00:00.000Z',
      completedAt: '2026-07-10T10:00:01.000Z',
      durationMs: 1000,
      providerId: 'deterministic-stub',
      retryCount: 0,
    },
    fallbackUsed: false,
    ...overrides,
  };
}

describe('composeRuntimeSession', () => {
  it('returns a complete RuntimeSession skeleton', () => {
    const result = composeRuntimeSession(buildInput());

    assert.ok(result.decision);
    assert.ok(result.session);
    assert.ok(result.progress);
    assert.ok(result.presentation);
    assert.ok(result.proposal);
    assert.ok(result.closure);
    assert.ok(result.pending);
    assert.ok(result.diagnostics);
  });

  it('maps SAFE_OPENING to intake stage and host_generate next beat after welcome', () => {
    const result = composeRuntimeSession(
      buildInput({
        intervention: {
          ...createMinimalIntervention(1),
          type: 'welcome_open',
          goal: 'SAFE_OPENING',
        },
        statePatch: (state) => {
          state.currentGoal = 'SAFE_OPENING';
        },
      })
    );

    assert.equal(result.session.stage, 'intake');
    assert.equal(result.session.currentGoal, 'SAFE_OPENING');
    assert.equal(result.decision.nextBeat, 'deliver_question');
    assert.equal(result.decision.mayAutoAdvance, true);
    assert.equal(result.decision.triggerHint, 'host_generate');
    assert.equal(result.progress.labelKey, 'runtime.stage.intake');
  });

  it('maps question interventions to await_user_action pending both replies', () => {
    const result = composeRuntimeSession(
      buildInput({
        intervention: {
          ...createMinimalIntervention(2),
          type: 'open_deepen',
          target: 'both',
          visibility: 'public',
        },
        statePatch: (state) => {
          state.currentGoal = 'EMOTION_NAMING';
        },
        runtimeMetadata: {
          engineVersion: 'v2.3',
          turnNumber: 2,
          startedAt: '2026-07-10T10:00:00.000Z',
          completedAt: '2026-07-10T10:00:01.000Z',
          durationMs: 1000,
          providerId: 'deterministic-stub',
          retryCount: 0,
        },
      })
    );

    assert.equal(result.decision.nextBeat, 'await_user_action');
    assert.equal(result.decision.blockedReason, 'awaiting_both_replies');
    assert.equal(result.pending.awaiting, 'both_replies');
    assert.deepEqual(result.pending.satisfiedBy, ['host_message', 'partner_message']);
    assert.equal(result.presentation.deliverables[0]?.kind, 'question');
  });

  it('derives completionEstimate from completed goals, not question count', () => {
    const result = composeRuntimeSession(
      buildInput({
        sessionMemory: {
          ...createEmptySessionMemory(),
          completedGoals: ['SAFE_OPENING', 'EMOTION_NAMING', 'EMOTION_UNDERSTANDING'],
        },
        statePatch: (state) => {
          state.currentGoal = 'NEED_NAMING';
          state.goals = [
            {
              goal: 'NEED_NAMING',
              status: 'in_progress',
              checks: [],
              progressPercent: 50,
              startedAt: null,
              completedAt: null,
              attemptCount: 1,
            },
          ];
        },
        runtimeMetadata: {
          engineVersion: 'v2.3',
          turnNumber: 8,
          startedAt: '2026-07-10T10:00:00.000Z',
          completedAt: '2026-07-10T10:00:01.000Z',
          durationMs: 1000,
          providerId: 'deterministic-stub',
          retryCount: 0,
        },
      })
    );

    assert.equal(result.session.turnOrdinal, 8);
    assert.ok(result.progress.completionEstimate > 0);
    assert.ok(result.progress.completionEstimate < 100);
    assert.equal(result.progress.goalProgress.completedGoals.length, 3);
    assert.equal(result.progress.goalProgress.currentGoal, 'NEED_NAMING');
    assert.equal(result.progress.goalProgress.currentGoalCompletion, 50);
  });

  it('maps resolved sessionOutcome to closure close_on_accept', () => {
    const result = composeRuntimeSession(
      buildInput({
        statePatch: (state) => {
          state.sessionOutcome = 'resolved';
          state.agreements.acceptedByBoth = true;
          state.currentGoal = 'CLOSURE';
        },
        finalMediatorMessage: {
          text: 'Thank you for completing this mediation.',
          source: 'stub',
          safetyLevel: 'none',
          language: 'en',
          turnNumber: 12,
          accepted: true,
          validationAction: 'accept',
        },
      })
    );

    assert.equal(result.session.outcome, 'resolved');
    assert.equal(result.closure.directive, 'close_on_accept');
    assert.equal(result.closure.suggestedDbStatus, 'resolved');
    assert.equal(result.closure.navigateToClosure, true);
    assert.equal(result.decision.nextBeat, 'deliver_closure');
    assert.equal(result.decision.blockedReason, 'session_finished');
  });

  it('maps safety intervention to safety_hold stage and escalation deliverable', () => {
    const result = composeRuntimeSession(
      buildInput({
        intervention: {
          ...createMinimalIntervention(3),
          type: 'safety_response',
          target: 'both',
        },
        statePatch: (state) => {
          state.sessionOutcome = 'safety_stopped';
          state.dynamics.mode = 'SAFETY';
        },
        finalMediatorMessage: {
          text: 'Let us pause here for safety.',
          source: 'fallback',
          safetyLevel: 'L3_stop',
          language: 'en',
          turnNumber: 3,
          accepted: true,
          validationAction: 'accept',
        },
        fallbackUsed: true,
      })
    );

    assert.equal(result.session.stage, 'safety_hold');
    assert.equal(result.session.outcome, 'safety_stopped');
    assert.equal(result.decision.nextBeat, 'safety_intervention');
    assert.equal(result.presentation.deliverables[0]?.kind, 'escalation_notice');
    assert.equal(result.diagnostics.fallbackUsed, true);
    assert.equal(result.diagnostics.safetyLevel, 'L3_stop');
    assert.equal(result.closure.directive, 'safety_close');
  });

  it('L3_stop overrides SAFE_OPENING intake stage mapping', () => {
    const result = composeRuntimeSession(
      buildInput({
        intervention: {
          ...createMinimalIntervention(2),
          type: 'welcome_open',
          goal: 'SAFE_OPENING',
        },
        statePatch: (state) => {
          state.currentGoal = 'SAFE_OPENING';
          state.sessionOutcome = 'in_progress';
          state.dynamics.mode = 'NORMAL';
        },
        finalMediatorMessage: {
          text: 'Let us pause here for safety.',
          source: 'fallback',
          safetyLevel: 'L3_stop',
          language: 'en',
          turnNumber: 2,
          accepted: true,
          validationAction: 'accept',
        },
      })
    );

    assert.equal(result.session.stage, 'safety_hold');
    assert.equal(result.session.outcome, 'safety_stopped');
    assert.equal(result.decision.nextBeat, 'safety_intervention');
    assert.equal(result.decision.mayAutoAdvance, false);
    assert.equal(result.decision.blockedReason, 'safety_hold');
    assert.equal(result.presentation.hideInput, true);
    assert.equal(result.pending.awaiting, 'safety_acknowledgment');
    assert.equal(result.closure.directive, 'safety_close');
    assert.equal(result.diagnostics.safetyLevel, 'L3_stop');
  });

  it('L1/L2 distress does not map to terminal safety_stopped', () => {
    for (const level of ['L1_gentle', 'L2_pause'] as const) {
      const result = composeRuntimeSession(
        buildInput({
          statePatch: (state) => {
            state.currentGoal = 'SAFE_OPENING';
            state.sessionOutcome = 'in_progress';
          },
          finalMediatorMessage: {
            text: 'I hear this is difficult.',
            source: 'stub',
            safetyLevel: level,
            language: 'en',
            turnNumber: 2,
            accepted: true,
            validationAction: 'accept',
          },
        })
      );

      assert.equal(result.session.stage, 'intake', `stage for ${level}`);
      assert.notEqual(result.session.outcome, 'safety_stopped', `outcome for ${level}`);
      assert.equal(result.presentation.hideInput, false, `hideInput for ${level}`);
    }
  });

  it('respects pendingAction awaitingResponseFrom for host-only block', () => {
    const result = composeRuntimeSession(
      buildInput({
        statePatch: (state) => {
          state.pendingAction = {
            type: 'question',
            targetParticipant: 'host',
            awaitingResponseFrom: ['host'],
            questionId: 'q-1',
            options: null,
          };
        },
      })
    );

    assert.equal(result.decision.nextBeat, 'await_user_action');
    assert.equal(result.decision.blockedReason, 'awaiting_host_reply');
    assert.equal(result.pending.awaiting, 'host_reply');
    assert.deepEqual(result.pending.awaitingFrom, ['host']);
  });

  it('uses activeStrategy from mediationState when present', () => {
    const result = composeRuntimeSession(
      buildInput({
        statePatch: (state) => {
          state.activeStrategy = {
            primary: 'validate_emotions',
            secondary: null,
            sinceTurn: 2,
            confidence: 80,
          };
        },
        intervention: {
          ...createMinimalIntervention(2),
          strategy: 'build_safety',
        },
      })
    );

    assert.equal(result.session.activeStrategy, 'validate_emotions');
  });
});
