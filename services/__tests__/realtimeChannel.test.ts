import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPostgresChannel,
  findChannelByName,
  removeChannelByName,
  subscribePostgresChanges,
  type RealtimeChannelLike,
  type RealtimeClientLike,
  type RealtimeSubscribeStatus,
} from '../realtimeChannel.ts';

type MockChannel = RealtimeChannelLike & {
  name: string;
  subscribed: boolean;
  onCount: number;
  subscribeStatusHistory: RealtimeSubscribeStatus[];
};

function createMockClient(): {
  client: RealtimeClientLike;
  removed: MockChannel[];
  created: MockChannel[];
  waitForIdle: () => Promise<void>;
} {
  const channels = new Map<string, MockChannel>();
  const removed: MockChannel[] = [];
  const created: MockChannel[] = [];
  const pendingRemovals: Promise<void>[] = [];

  const client: RealtimeClientLike = {
    channel(name: string): MockChannel {
      const existing = channels.get(name);
      if (existing?.subscribed) {
        return existing;
      }

      const channel: MockChannel = {
        name,
        topic: `realtime:${name}`,
        subscribed: false,
        onCount: 0,
        subscribeStatusHistory: [],
        on(_type, _config, _callback) {
          if (this.subscribed) {
            throw new Error('cannot add postgres_changes callbacks after subscribe()');
          }
          this.onCount += 1;
          return this;
        },
        subscribe(callback?: (status: RealtimeSubscribeStatus) => void) {
          this.subscribed = true;
          this.subscribeStatusHistory.push('SUBSCRIBED');
          callback?.('SUBSCRIBED');
          return this;
        },
      };

      channels.set(name, channel);
      created.push(channel);
      return channel;
    },
    getChannels() {
      return [...channels.values()];
    },
    removeChannel(channel: RealtimeChannelLike) {
      const mock = channel as MockChannel;
      const removeTask = Promise.resolve().then(() => {
        removed.push(mock);
        if (channels.get(mock.name) === mock) {
          channels.delete(mock.name);
        }
      });
      pendingRemovals.push(removeTask);
      return removeTask;
    },
  };

  return {
    client,
    removed,
    created,
    waitForIdle: async () => {
      await Promise.allSettled(pendingRemovals);
    },
  };
}

describe('realtimeChannel', () => {
  it('registers all .on() handlers before .subscribe()', () => {
    const { client } = createMockClient();
    const trace = { channelName: '', onCallsBeforeSubscribe: 0, subscribed: false };

    buildPostgresChannel(
      client,
      'partner-mediations:banner:user-1',
      [
        {
          config: {
            event: '*',
            schema: 'public',
            table: 'mediations',
            filter: 'partner_id=eq.user-1',
          },
          callback: () => {},
        },
        {
          config: {
            event: 'UPDATE',
            schema: 'public',
            table: 'mediations',
            filter: 'partner_id=eq.user-1',
          },
          callback: () => {},
        },
      ],
      trace
    );

    assert.equal(trace.onCallsBeforeSubscribe, 2);
    assert.equal(trace.subscribed, true);
  });

  it('cleanup removes the exact channel instance', async () => {
    const { client, removed, waitForIdle } = createMockClient();
    const cleanup = subscribePostgresChanges(client, 'relationship-dates:hook:couple-1', [
      {
        config: {
          event: 'UPDATE',
          schema: 'public',
          table: 'couples',
          filter: 'id=eq.couple-1',
        },
        callback: () => {},
      },
    ]);
    await waitForIdle();

    const before = findChannelByName(client, 'relationship-dates:hook:couple-1');
    assert.ok(before);

    cleanup();
    await waitForIdle();

    assert.equal(removed.length, 1);
    assert.equal(removed[0], before);
    assert.equal(findChannelByName(client, 'relationship-dates:hook:couple-1'), undefined);
  });

  it('remount replaces stale subscribed channel instead of reusing it', async () => {
    const { client, waitForIdle } = createMockClient();
    const channelName = 'partner-needs:dashboard:couple-2';

    const cleanupA = subscribePostgresChanges(client, channelName, [
      {
        config: {
          event: '*',
          schema: 'public',
          table: 'partner_need_signals',
          filter: 'couple_id=eq.couple-2',
        },
        callback: () => {},
      },
    ]);
    await waitForIdle();

    const first = findChannelByName(client, channelName);
    assert.ok(first);
    assert.equal((first as MockChannel).subscribed, true);

    cleanupA();
    await waitForIdle();

    const cleanupB = subscribePostgresChanges(client, channelName, [
      {
        config: {
          event: '*',
          schema: 'public',
          table: 'partner_need_signals',
          filter: 'couple_id=eq.couple-2',
        },
        callback: () => {},
      },
    ]);
    await waitForIdle();

    const second = findChannelByName(client, channelName);
    assert.ok(second);
    assert.notEqual(second, first);
    assert.equal((second as MockChannel).subscribed, true);

    cleanupB();
    await waitForIdle();
  });

  it('removeChannelByName clears an existing subscribed channel before rebuild', async () => {
    const { client, waitForIdle } = createMockClient();
    const channelName = 'mediation-session-v2:sync:session-1';

    subscribePostgresChanges(client, channelName, [
      {
        config: {
          event: 'UPDATE',
          schema: 'public',
          table: 'mediation_sessions',
          filter: 'session_id=eq.session-1',
        },
        callback: () => {},
      },
    ]);
    await waitForIdle();

    removeChannelByName(client, channelName);
    await waitForIdle();
    assert.doesNotThrow(() => {
      buildPostgresChannel(client, channelName, [
        {
          config: {
            event: 'UPDATE',
            schema: 'public',
            table: 'mediation_sessions',
            filter: 'session_id=eq.session-1',
          },
          callback: () => {},
        },
      ]);
    });
    await waitForIdle();
  });

  it('strict-mode setup/cleanup/setup leaves exactly one active channel', async () => {
    const { client, waitForIdle } = createMockClient();
    const channelName = 'mediation-session-v2:sync:strict-mode';
    const statuses: RealtimeSubscribeStatus[] = [];

    const cleanupA = subscribePostgresChanges(
      client,
      channelName,
      [
        {
          config: {
            event: 'UPDATE',
            schema: 'public',
            table: 'mediation_sessions',
            filter: 'session_id=eq.strict-mode',
          },
          callback: () => {},
        },
      ],
      { onStatus: (status) => statuses.push(status) }
    );
    cleanupA();
    const cleanupB = subscribePostgresChanges(
      client,
      channelName,
      [
        {
          config: {
            event: 'UPDATE',
            schema: 'public',
            table: 'mediation_sessions',
            filter: 'session_id=eq.strict-mode',
          },
          callback: () => {},
        },
      ],
      { onStatus: (status) => statuses.push(status) }
    );
    await waitForIdle();

    const active = findChannelByName(client, channelName);
    assert.ok(active);
    assert.equal(client.getChannels().length, 1);
    assert.equal(statuses.includes('SUBSCRIBED'), true);

    cleanupB();
    await waitForIdle();
  });

  it('subscribe callback is invoked when session id becomes available', async () => {
    const { client, waitForIdle } = createMockClient();
    let subscribeCalled = 0;

    const cleanup = subscribePostgresChanges(
      client,
      'mediation-session-v2:sync:session-after-bootstrap',
      [
        {
          config: {
            event: 'UPDATE',
            schema: 'public',
            table: 'mediation_sessions',
            filter: 'session_id=eq.session-after-bootstrap',
          },
          callback: () => {},
        },
      ],
      {
        onSubscribeCalled: () => {
          subscribeCalled += 1;
        },
      }
    );
    await waitForIdle();

    assert.equal(subscribeCalled, 1);
    cleanup();
    await waitForIdle();
  });

  it('old async cleanup does not remove new channel', async () => {
    const { client, removed, waitForIdle } = createMockClient();
    const channelName = 'mediation-session-v2:sync:race';

    const cleanupA = subscribePostgresChanges(client, channelName, [
      {
        config: {
          event: 'UPDATE',
          schema: 'public',
          table: 'mediation_sessions',
          filter: 'session_id=eq.race',
        },
        callback: () => {},
      },
    ]);
    await waitForIdle();
    const first = findChannelByName(client, channelName);
    assert.ok(first);

    const cleanupB = subscribePostgresChanges(client, channelName, [
      {
        config: {
          event: 'UPDATE',
          schema: 'public',
          table: 'mediation_sessions',
          filter: 'session_id=eq.race',
        },
        callback: () => {},
      },
    ]);
    await waitForIdle();
    const second = findChannelByName(client, channelName);
    assert.ok(second);
    assert.notEqual(second, first);

    cleanupA();
    await waitForIdle();

    const afterOldCleanup = findChannelByName(client, channelName);
    assert.equal(afterOldCleanup, second);

    cleanupB();
    await waitForIdle();
    assert.equal(findChannelByName(client, channelName), undefined);
    assert.equal(removed.length >= 2, true);
  });
});
