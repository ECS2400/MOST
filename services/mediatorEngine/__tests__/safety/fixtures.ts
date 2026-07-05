import assert from 'node:assert/strict';
import type { SafetyInput, TranscriptMessage } from '@/types/mediator';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';

export const PRIVATE_TEXT = '__PRIVATE_SAFETY_MESSAGE__';

export function createSafetyInput(
  overrides: Partial<SafetyInput> = {}
): SafetyInput {
  return {
    state: createBaselineMediationState(),
    transcriptDelta: [],
    turnNumber: 3,
    ...overrides,
  };
}

export function messageWithContent(
  content: string,
  overrides: Partial<TranscriptMessage> = {}
): TranscriptMessage[] {
  return [
    {
      id: overrides.id ?? 'msg-1',
      authorRole: overrides.authorRole ?? 'partner',
      content,
      turnNumber: overrides.turnNumber ?? 3,
      createdAt: overrides.createdAt ?? '2026-07-05T00:00:00.000Z',
    },
  ];
}

export function assertNoQuoteField(signal: Record<string, unknown>) {
  assert.ok(!('quote' in signal), 'SafetySignal must not contain quote field');
}
