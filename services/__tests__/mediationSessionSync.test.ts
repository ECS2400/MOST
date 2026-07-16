import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createLoadSessionCoordinator,
  isWaitingForPartner,
  shouldReloadMediationSession,
} from '../mediationSessionSync.ts';
import type { MediationTurnV2Envelope } from '../mediationTurnV2.types.ts';

function envelope(
  overrides: Partial<MediationTurnV2Envelope> & {
    content?: Record<string, unknown>;
    actions?: MediationTurnV2Envelope['actions'];
  } = {}
): MediationTurnV2Envelope {
  return {
    ok: true,
    sessionId: '00000000-0000-4000-8000-000000000001',
    screen: 'SUMMARY',
    title: 'Podsumowanie',
    subtitle: null,
    content: {},
    actions: [],
    progress: { current: 1, total: 6 },
    generationStatus: 'IDLE',
    sessionVersion: 1,
    correlationId: '00000000-0000-4000-8000-000000000099',
    ...overrides,
  };
}

describe('mediationSessionSync', () => {
  it('shouldReloadMediationSession ignores stale versions', () => {
    assert.equal(shouldReloadMediationSession({ session_version: 3 }, 4), false);
    assert.equal(shouldReloadMediationSession({ session_version: 5 }, 4), true);
    assert.equal(shouldReloadMediationSession({ session_version: 4 }, 4), false);
  });

  it('UPDATE during load schedules exactly one pending reload', async () => {
    const loadInFlight = { current: false };
    const reloadPending = { current: false };
    let loadCount = 0;
    let releaseFirstLoad: (() => void) | null = null;

    const coordinator = createLoadSessionCoordinator(async () => {
      loadCount += 1;
      if (loadCount === 1) {
        await new Promise<void>((resolve) => {
          releaseFirstLoad = resolve;
        });
      }
    }, { loadInFlight, reloadPending });

    coordinator.requestLoad();
    coordinator.requestLoad();
    coordinator.requestLoad();

    assert.equal(loadCount, 1);
    assert.equal(reloadPending.current, true);

    releaseFirstLoad?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(loadCount, 2);
    assert.equal(reloadPending.current, false);
    assert.equal(loadInFlight.current, false);
  });

  it('first participant stays on waiting screen after own answer', () => {
    const waitingEnvelope = envelope({
      content: { partnerStatus: 'waiting' },
      actions: [{ id: 'vote-yes', type: 'VOTE', label: 'Tak', voteValue: 'yes', disabled: true }],
    });

    assert.equal(isWaitingForPartner(waitingEnvelope), true);
  });

  it('waiting does not block reload when partner answers', () => {
    const waitingEnvelope = envelope({
      content: { partnerStatus: 'waiting' },
      actions: [{ id: 'vote-yes', type: 'VOTE', label: 'Tak', voteValue: 'yes', disabled: true }],
    });

    assert.equal(isWaitingForPartner(waitingEnvelope), true);
    assert.equal(shouldReloadMediationSession({ session_version: 4 }, 3), true);
  });

  it('processing envelope shows generation state instead of waiting', () => {
    const processingEnvelope = envelope({
      processing: true,
      content: { partnerStatus: 'waiting' },
      actions: [{ id: 'vote-yes', type: 'VOTE', label: 'Tak', voteValue: 'yes', disabled: true }],
    });

    assert.equal(isWaitingForPartner(processingEnvelope), false);
  });

  it('partner answer clears waiting once backend advances session', () => {
    const advancedEnvelope = envelope({
      screen: 'EASY_CHOICES',
      content: { partnerStatus: 'both_done', roundIndex: 1 },
      actions: [
        { id: 'vote-a', type: 'VOTE', label: 'A', voteValue: null, disabled: false },
      ],
    });

    assert.equal(isWaitingForPartner(advancedEnvelope), false);
  });

  it('generating then finalized uses two reloads without dropping the second event', async () => {
    const loadInFlight = { current: false };
    const reloadPending = { current: false };
    const versions: number[] = [];
    let releaseFirstLoad: (() => void) | null = null;

    const coordinator = createLoadSessionCoordinator(async () => {
      if (versions.length === 0) {
        await new Promise<void>((resolve) => {
          releaseFirstLoad = resolve;
        });
      }
      versions.push(versions.length === 0 ? 2 : 3);
    }, { loadInFlight, reloadPending });

    coordinator.requestLoad();
    coordinator.requestLoad();

    releaseFirstLoad?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(versions, [2, 3]);
  });
});
