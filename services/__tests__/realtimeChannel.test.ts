import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPostgresChannel,
  findChannelByName,
  removeChannelByName,
  subscribePostgresChanges,
  type RealtimeChannelLike,
  type RealtimeClientLike,
} from '@/services/realtimeChannel';

type MockChannel = RealtimeChannelLike & {
  name: string;
  subscribed: boolean;
  onCount: number;
};

function createMockClient(): {
  client: RealtimeClientLike;
  removed: MockChannel[];
  created: MockChannel[];
} {
  const channels = new Map<string, MockChannel>();
  const removed: MockChannel[] = [];
  const created: MockChannel[] = [];

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
        on(_type, _config, _callback) {
          if (this.subscribed) {
            throw new Error('cannot add postgres_changes callbacks after subscribe()');
          }
          this.onCount += 1;
          return this;
        },
        subscribe() {
          this.subscribed = true;
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
      removed.push(mock);
      channels.delete(mock.name);
    },
  };

  return { client, removed, created };
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

  it('cleanup removes the exact channel instance', () => {
    const { client, removed } = createMockClient();
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

    const before = findChannelByName(client, 'relationship-dates:hook:couple-1');
    assert.ok(before);

    cleanup();

    assert.equal(removed.length, 1);
    assert.equal(removed[0], before);
    assert.equal(findChannelByName(client, 'relationship-dates:hook:couple-1'), undefined);
  });

  it('remount replaces stale subscribed channel instead of reusing it', () => {
    const { client } = createMockClient();
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

    const first = findChannelByName(client, channelName);
    assert.ok(first);
    assert.equal((first as MockChannel).subscribed, true);

    cleanupA();

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

    const second = findChannelByName(client, channelName);
    assert.ok(second);
    assert.notEqual(second, first);
    assert.equal((second as MockChannel).subscribed, true);

    cleanupB();
  });

  it('removeChannelByName clears an existing subscribed channel before rebuild', () => {
    const { client } = createMockClient();
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

    assert.doesNotThrow(() => {
      removeChannelByName(client, channelName);
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
  });
});
