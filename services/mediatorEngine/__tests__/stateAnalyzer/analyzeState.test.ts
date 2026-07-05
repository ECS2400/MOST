/**
 * State Analyzer L1 — unit tests (Phase 1F).
 *
 *   npm run test:mediator:state
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { StateAnalyzerInput } from '@/types/mediator';
import {
  FORBIDDEN_TRANSCRIPT_METADATA_KEYS,
  TRANSCRIPT_METADATA_ANALYSIS_PREFIX,
  TRANSCRIPT_METADATA_CONCLUSION_VALUE,
  TRANSCRIPT_METADATA_REDACTED_CONTENT,
} from '@/services/mediatorEngine/stateAnalyzer/config/stateAnalyzerLimits';
import { extractTranscriptMetadata } from '@/services/mediatorEngine/stateAnalyzer/transcript/extractTranscriptMetadata';
import { analyzeState } from '@/services/mediatorEngine/stateAnalyzer/analyzeState';
import {
  createExistingMediationState,
  createInitialMediationState,
  createStateAnalyzerInput,
  createStateWithDecayableLoad,
  createTranscriptDelta,
} from '@/services/mediatorEngine/__tests__/stateAnalyzer/fixtures';

const PRIVATE_TEXT = '__PRIVATE_TRANSCRIPT_CONTENT__';

describe('analyzeState — L1 deterministic updates', () => {
  it('creates initial state when mediationState is null', () => {
    const result = analyzeState(createStateAnalyzerInput({ mediationState: null, turnNumber: 1 }));

    assert.ok(result.updatedState);
    assert.equal(result.updatedState.meta.currentTurnNumber, 1);
    assert.equal(result.updatedState.currentGoal, 'SAFE_OPENING');
    assert.ok(result.evidenceStore);
  });

  it('preserves existing state fields', () => {
    const existing = createExistingMediationState({
      currentGoal: 'EMOTION_NAMING',
      dynamics: {
        ...createExistingMediationState().dynamics,
        escalationLevel: 3,
      },
    });

    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: existing,
        turnNumber: 4,
      })
    );

    assert.equal(result.updatedState.currentGoal, 'EMOTION_NAMING');
    assert.equal(result.updatedState.dynamics.escalationLevel, 3);
  });

  it('updates meta.currentTurnNumber', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 8,
      })
    );

    assert.equal(result.updatedState.meta.currentTurnNumber, 8);
  });

  it('updates meta.lastUpdatedAt to a valid ISO timestamp', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 5,
      })
    );

    assert.ok(!Number.isNaN(Date.parse(result.updatedState.meta.lastUpdatedAt)));
    assert.notEqual(result.updatedState.meta.lastUpdatedAt, '2026-07-01T00:00:00.000Z');
  });

  it('does not mutate the previous mediation state', () => {
    const existing = createExistingMediationState({ currentGoal: 'REFRAME' });
    const frozen = structuredClone(existing);

    analyzeState(
      createStateAnalyzerInput({
        mediationState: existing,
        turnNumber: 6,
      })
    );

    assert.deepEqual(existing, frozen);
  });

  it('does not store transcript content in mediation state', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 2,
        transcriptDelta: createTranscriptDelta([
          { id: 'm-1', authorRole: 'host', content: PRIVATE_TEXT },
          { id: 'm-2', authorRole: 'partner', content: 'Another secret message' },
        ]),
      })
    );

    const serialized = JSON.stringify(result.updatedState);
    assert.ok(!serialized.includes(PRIVATE_TEXT));
    assert.ok(!serialized.includes('Another secret message'));
    assert.deepEqual(result.updatedState.memory.factMemory, []);
  });

  it('does not store transcript content in evidence', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 2,
        transcriptDelta: createTranscriptDelta([
          { id: 'm-private', authorRole: 'partner', content: PRIVATE_TEXT },
        ]),
      })
    );

    const serialized = JSON.stringify(result.evidenceStore);
    assert.ok(!serialized.includes(PRIVATE_TEXT));
    const conclusion = result.evidenceStore.conclusions[`${TRANSCRIPT_METADATA_ANALYSIS_PREFIX}2`];
    assert.ok(conclusion);
    assert.equal(conclusion?.evidence[0]?.source, 'transcript_metadata');
  });

  it('creates and returns an EvidenceStore', () => {
    const result = analyzeState(createStateAnalyzerInput({ turnNumber: 1 }));
    assert.ok(result.evidenceStore);
    assert.ok(typeof result.evidenceStore.conclusions === 'object');
    assert.equal(typeof result.evidenceStore.maxConclusions, 'number');
  });

  it('applies confidence decay after several turns', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createStateWithDecayableLoad(80),
        turnNumber: 6,
      })
    );

    assert.ok(result.decayEventsApplied > 0);
    assert.ok(result.updatedState.load.host.confidence < 80);
  });

  it('marks confidence values stale when below threshold', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createStateWithDecayableLoad(45),
        turnNumber: 8,
      })
    );

    assert.equal(result.updatedState.load.host.stale, true);
    assert.ok(result.updatedState.load.host.confidence < 30);
  });

  it('does not crash on malformed transcriptDelta', () => {
    assert.doesNotThrow(() => {
      const result = analyzeState(
        createStateAnalyzerInput({
          mediationState: createExistingMediationState(),
          turnNumber: 3,
          transcriptDelta: [{ invalid: true }, null, 'text'] as unknown as StateAnalyzerInput['transcriptDelta'],
        })
      );
      assert.ok(result.updatedState);
    });
  });

  it('counts transcript message metadata', () => {
    const metadata = extractTranscriptMetadata(
      createTranscriptDelta([
        { id: 'a', authorRole: 'host', content: 'hello' },
        { id: 'b', authorRole: 'partner', content: 'hi' },
      ]),
      2
    );

    assert.equal(metadata.messageCount, 2);
    assert.equal(metadata.hasHostMessage, true);
    assert.equal(metadata.hasPartnerMessage, true);
    assert.equal(metadata.lastSpeakerRole, 'partner');
  });

  it('counts empty messages', () => {
    const metadata = extractTranscriptMetadata(
      createTranscriptDelta([
        { id: 'a', content: '   ' },
        { id: 'b', content: '' },
        { id: 'c', content: 'ok' },
      ]),
      1
    );

    assert.equal(metadata.emptyMessageCount, 2);
    assert.equal(metadata.messageCount, 3);
  });

  it('preserves message ids in metadata and evidence', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 4,
        transcriptDelta: createTranscriptDelta([
          { id: 'msg-host-99', authorRole: 'host', content: 'x' },
          { id: 'msg-partner-100', authorRole: 'partner', content: 'y' },
        ]),
      })
    );

    const conclusion = result.evidenceStore.conclusions[`${TRANSCRIPT_METADATA_ANALYSIS_PREFIX}4`];
    assert.deepEqual(conclusion?.evidence[0]?.messageIds, ['msg-host-99', 'msg-partner-100']);
    assert.deepEqual(conclusion?.evidence[0]?.metadata?.messageIds, [
      'msg-host-99',
      'msg-partner-100',
    ]);
  });
});

describe('analyzeState — evidence privacy hardening', () => {
  it('does not store private message content in evidenceStore JSON', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 3,
        transcriptDelta: createTranscriptDelta([
          { id: 'secret-1', authorRole: 'host', content: PRIVATE_TEXT },
        ]),
      })
    );

    assert.ok(!JSON.stringify(result.evidenceStore).includes(PRIVATE_TEXT));
  });

  it('redacts transcript_metadata EvidenceItem.content', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 3,
        transcriptDelta: createTranscriptDelta([{ id: 'm-1', authorRole: 'host', content: 'hi' }]),
      })
    );

    const item = result.evidenceStore.conclusions[`${TRANSCRIPT_METADATA_ANALYSIS_PREFIX}3`]
      ?.evidence[0];
    assert.equal(item?.content, TRANSCRIPT_METADATA_REDACTED_CONTENT);
    assert.ok(!item?.content.startsWith('{'));
  });

  it('uses stable conclusion value instead of serialized JSON', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 3,
        transcriptDelta: createTranscriptDelta([{ id: 'm-1', content: 'hello' }]),
      })
    );

    const conclusion = result.evidenceStore.conclusions[`${TRANSCRIPT_METADATA_ANALYSIS_PREFIX}3`];
    assert.equal(conclusion?.value, TRANSCRIPT_METADATA_CONCLUSION_VALUE);
    assert.ok(!String(conclusion?.value).includes('messageCount'));
  });

  it('stores structural fields in EvidenceItem.metadata', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 5,
        transcriptDelta: createTranscriptDelta([
          { id: 'id-a', authorRole: 'host', content: 'x' },
          { id: 'id-b', authorRole: 'partner', content: 'y' },
        ]),
      })
    );

    const metadata = result.evidenceStore.conclusions[`${TRANSCRIPT_METADATA_ANALYSIS_PREFIX}5`]
      ?.evidence[0]?.metadata;
    assert.equal(metadata?.messageCount, 2);
    assert.deepEqual(metadata?.messageIds, ['id-a', 'id-b']);
  });

  it('does not include forbidden text-like keys in EvidenceItem.metadata', () => {
    const result = analyzeState(
      createStateAnalyzerInput({
        mediationState: createExistingMediationState(),
        turnNumber: 6,
        transcriptDelta: createTranscriptDelta([{ id: 'm-1', content: PRIVATE_TEXT }]),
      })
    );

    const metadata = result.evidenceStore.conclusions[`${TRANSCRIPT_METADATA_ANALYSIS_PREFIX}6`]
      ?.evidence[0]?.metadata;
    assert.ok(metadata);
    for (const key of FORBIDDEN_TRANSCRIPT_METADATA_KEYS) {
      assert.ok(!(key in metadata!), `metadata must not include forbidden key: ${key}`);
    }
  });
});

describe('createInitialMediationState — factory', () => {
  it('creates a valid state distinct from pass-through skeleton usage', () => {
    const state = createInitialMediationState({
      turnNumber: 2,
      mediationId: 'med-123',
      sessionId: 'sess-456',
    });

    assert.equal(state.meta.mediationId, 'med-123');
    assert.equal(state.meta.sessionId, 'sess-456');
    assert.equal(state.meta.currentTurnNumber, 2);
    assert.ok(state.evidenceStore);
  });
});
