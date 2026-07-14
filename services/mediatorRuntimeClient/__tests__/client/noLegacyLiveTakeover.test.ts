import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  planLiveRuntimeClientAction,
  resolveRuntimeActionExecution,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';
import {
  resolveLivePhaseHeaderLabel,
  resolveLiveProgressPercent,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionProgressDisplay';
import { resolveRuntimeDecisionPanelVisibility } from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';
import { resolveRuntimeGenerationFlow } from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
import { resolveRuntimeSessionFlow } from '@/services/mediatorRuntimeClient/resolveRuntimeSessionFlow';
import { shouldBlockRuntimeMediatorGeneration } from '@/services/mediatorRuntimeClient/shouldBlockRuntimeMediatorGeneration';

describe('production live — no silent legacy takeover', () => {
  it('runtime unavailable marks runtimeUnavailable without legacy fallback', () => {
    const execution = resolveRuntimeActionExecution({ runtimeSession: null });
    assert.equal(execution.useRuntime, false);
    assert.equal(execution.runtimeUnavailable, true);
    assert.equal(execution.reason, 'runtime_unavailable');
  });

  it('runtime unavailable returns recovery flow without legacy getters', () => {
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: null,
    });

    assert.equal(resolution.source, 'runtime_unavailable');
    assert.equal(resolution.flow.maxQuestions, 0);
    assert.equal(resolution.flow.questionNumber, 0);
  });

  it('runtime unavailable returns null generation mode', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: null,
    });

    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'runtime_unavailable');
  });

  it('runtime unavailable does not render question X of 15 in header', () => {
    const label = resolveLivePhaseHeaderLabel(null, 'pl', {
      runtimeUnavailable: true,
      recoveryLabel: 'Mościk chwilowo utracił stan mediacji.',
    });
    assert.equal(label, 'Mościk chwilowo utracił stan mediacji.');
    assert.doesNotMatch(label, /z 15/);
  });

  it('runtime unavailable progress is zero', () => {
    assert.equal(resolveLiveProgressPercent(null, true), 0);
  });

  it('runtime unavailable hides decision panels', () => {
    const visibility = resolveRuntimeDecisionPanelVisibility({
      runtimeSession: null,
      runtimeUnavailable: true,
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
    assert.equal(plan.emitClientEvent, false);
  });

  it('allows opening_summary bootstrap when runtime session not yet persisted', () => {
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession: null,
        mode: 'opening_summary',
        force: true,
      }),
      false
    );
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession: null,
        mode: 'opening_summary',
      }),
      true
    );
  });

  it('invalid runtimeSession marks runtime unavailable', () => {
    const execution = resolveRuntimeActionExecution({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      invalidRuntimeState: true,
    });
    assert.equal(execution.useRuntime, false);
    assert.equal(execution.runtimeUnavailable, true);
  });

  it('persisted valid runtimeSession restores runtime mode', () => {
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      questionNumberHint: 3,
    });
    assert.equal(resolution.source, 'runtime_available');
    assert.equal(resolution.flow.questionNumber, 3);
    assert.notEqual(resolution.flow.maxQuestions, 0);
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
});
