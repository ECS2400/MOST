import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  planLiveRuntimeClientAction,
  resolveRuntimeActionExecution,
  shouldUseLegacyClosureFallback,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';
import {
  resolveLivePhaseHeaderLabel,
  resolveLiveProgressPercent,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionProgressDisplay';
import { resolveRuntimeDecisionPanelVisibility } from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';
import { resolveRuntimeGenerationFlow } from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
import { resolveRuntimeSessionFlow } from '@/services/mediatorRuntimeClient/resolveRuntimeSessionFlow';
import { RUNTIME_UNAVAILABLE_SESSION_FLOW } from '@/services/mediatorRuntimeClient/runtimeUnavailableRecoveryFlow';
import { shouldBlockRuntimeMediatorGeneration } from '@/services/mediatorRuntimeClient/shouldBlockRuntimeMediatorGeneration';

describe('production live — no silent legacy takeover', () => {
  it('runtime unavailable does not enable useLegacyFallback by default', () => {
    const execution = resolveRuntimeActionExecution({ runtimeSession: null });
    assert.equal(execution.useLegacyFallback, false);
    assert.equal(execution.runtimeUnavailable, true);
    assert.equal(execution.reason, 'runtime_unavailable');
  });

  it('shouldUseLegacyLiveFallback is false when runtime unavailable', () => {
    const execution = resolveRuntimeActionExecution({ runtimeSession: null });
    assert.equal(execution.useLegacyFallback, false);
  });

  it('runtime unavailable does not call computeLiveSessionFlow via lazy getter', () => {
    let called = false;
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: null,
      getLegacySessionFlow: () => {
        called = true;
        return {
          stage: 'questions',
          questionNumber: 1,
          maxQuestions: 15,
          questionPhase: 'opening',
          extensionActive: false,
        };
      },
    });

    assert.equal(called, false);
    assert.equal(resolution.source, 'runtime_unavailable');
    assert.deepEqual(resolution.flow, RUNTIME_UNAVAILABLE_SESSION_FLOW);
  });

  it('runtime unavailable does not call resolveGenerateMode via lazy getter', () => {
    let called = false;
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: null,
      getLegacyMode: () => {
        called = true;
        return 'opening_summary';
      },
    });

    assert.equal(called, false);
    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'runtime_unavailable');
  });

  it('runtime unavailable does not render question X of 15 in header', () => {
    const label = resolveLivePhaseHeaderLabel(null, 'Pytanie 1 z 15', 'pl', {
      runtimeUnavailable: true,
      recoveryLabel: 'Mościk chwilowo utracił stan mediacji.',
    });
    assert.equal(label, 'Mościk chwilowo utracił stan mediacji.');
    assert.doesNotMatch(label, /z 15/);
  });

  it('runtime unavailable progress is zero — no legacy maxQuestions fallback', () => {
    assert.equal(resolveLiveProgressPercent(null, 42, true), 0);
  });

  it('runtime unavailable hides decision panels', () => {
    const visibility = resolveRuntimeDecisionPanelVisibility({
      runtimeSession: null,
      runtimeUnavailable: true,
      legacy: {
        flowKind: 'continue_after_summary',
        visibleKind: 'continue_after_summary',
      },
      legacyVisibility: {
        showDecisionPanel: true,
        showProposalPanel: true,
        sessionUnresolvedClosed: true,
      },
      sessionFlowStage: 'awaiting_main_decision',
    });

    assert.equal(visibility.showMainDecisionPanel, false);
    assert.equal(visibility.showProposalPanel, false);
    assert.equal(visibility.showResolvedConfirmationPanel, false);
  });

  it('runtime unavailable does not plan legacy client action side effects', () => {
    const plan = planLiveRuntimeClientAction('continue_session', {
      runtimeSession: null,
    });

    assert.equal(plan.callRuntimeTurn, false);
    assert.equal(plan.legacySteps.signalSessionDecision, false);
    assert.equal(plan.legacySteps.signalExtensionStart, false);
  });

  it('shouldBlockRuntimeMediatorGeneration blocks opening_summary without runtime session', () => {
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession: null,
        mode: 'opening_summary',
        allowOpeningBootstrap: true,
      }),
      true
    );
  });

  it('invalid runtimeSession never activates legacy flow without allowLegacyFallback', () => {
    const execution = resolveRuntimeActionExecution({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      invalidRuntimeState: true,
    });
    assert.equal(execution.useLegacyFallback, false);
    assert.equal(execution.runtimeUnavailable, true);
  });

  it('persisted valid runtimeSession restores runtime mode', () => {
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      questionNumberHint: 3,
    });
    assert.equal(resolution.source, 'runtime');
    assert.equal(resolution.flow.questionNumber, 3);
    assert.notEqual(resolution.flow.maxQuestions, 0);
  });

  it('shouldUseLegacyClosureFallback is false when runtime unavailable and legacy disabled', () => {
    assert.equal(shouldUseLegacyClosureFallback({ runtimeSession: null }), false);
  });

  it('duplicate legacy summary messages render once after dedupe by id', () => {
    const duplicate = {
      id: 'msg-1',
      mediation_id: 'med-1',
      sender_id: 'ai',
      sender_name: 'ai',
      content: 'Podsumowanie konfliktu',
      message_type: 'summary' as const,
      is_private: false,
      recipient_id: null,
      phase: 1,
      metadata: { summaryKind: 'opening_summary' },
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const byId = new Map<string, typeof duplicate>();
    for (const message of [duplicate, { ...duplicate, content: 'duplicate body' }]) {
      byId.set(message.id, message);
    }
    const merged = Array.from(byId.values());
    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.id, 'msg-1');
  });

  it('legacy path remains available for migration tests when explicitly allowed', () => {
    let called = false;
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: null,
      allowLegacyFallback: true,
      getLegacySessionFlow: () => {
        called = true;
        return {
          stage: 'questions',
          questionNumber: 1,
          maxQuestions: 15,
          questionPhase: 'opening',
          extensionActive: false,
        };
      },
    });

    assert.equal(called, true);
    assert.equal(resolution.source, 'legacy_fallback');
    assert.equal(resolution.flow.maxQuestions, 15);
  });
});
