import type { SupabaseClient } from '@supabase/supabase-js';

export type PostgresChangeConfig = {
  event: string;
  schema: string;
  table: string;
  filter?: string;
};

export type PostgresChangeBinding = {
  config: PostgresChangeConfig;
  callback: (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => void;
};

export type RealtimeSubscribeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

export type RealtimeChannelLike = {
  topic: string;
  on: (...args: unknown[]) => RealtimeChannelLike;
  subscribe: (...args: unknown[]) => RealtimeChannelLike;
};

export type RealtimeClientLike = {
  channel: (name: string) => RealtimeChannelLike;
  getChannels: () => RealtimeChannelLike[];
  removeChannel: (channel: RealtimeChannelLike) => Promise<unknown> | void;
};

/** Supabase RealtimeChannel `.on()` overloads are not structurally compatible with mocks/tests. */
export type PostgresRealtimeClient = RealtimeClientLike | SupabaseClient;

export type PostgresChannelBuildTrace = {
  channelName: string;
  onCallsBeforeSubscribe: number;
  subscribed: boolean;
};

export type SubscribePostgresChangesOptions = {
  onStatus?: (status: RealtimeSubscribeStatus) => void;
  onSubscribeCalled?: () => void;
};

function asRealtimeClient(client: PostgresRealtimeClient): RealtimeClientLike {
  return client as RealtimeClientLike;
}

function channelTopicMatches(channel: { topic: string }, channelName: string): boolean {
  return channel.topic === channelName || channel.topic === `realtime:${channelName}`;
}

export function findChannelByName(
  client: PostgresRealtimeClient,
  channelName: string
): RealtimeChannelLike | undefined {
  return asRealtimeClient(client)
    .getChannels()
    .find((channel) => channelTopicMatches(channel, channelName));
}

export function removeChannelByName(
  client: PostgresRealtimeClient,
  channelName: string
): void {
  const existing = findChannelByName(client, channelName);
  if (existing) {
    void asRealtimeClient(client).removeChannel(existing);
  }
}

export function buildPostgresChannel(
  client: PostgresRealtimeClient,
  channelName: string,
  bindings: PostgresChangeBinding[],
  trace?: PostgresChannelBuildTrace
): RealtimeChannelLike {
  const realtimeClient = asRealtimeClient(client);
  removeChannelByName(realtimeClient, channelName);

  let channel = realtimeClient.channel(channelName);
  for (const binding of bindings) {
    channel = channel.on('postgres_changes', binding.config, binding.callback);
    if (trace) {
      trace.onCallsBeforeSubscribe += 1;
    }
  }

  const subscribed = channel.subscribe();
  if (trace) {
    trace.channelName = channelName;
    trace.subscribed = true;
  }
  return subscribed;
}

export function subscribePostgresChanges(
  client: PostgresRealtimeClient,
  channelName: string,
  bindings: PostgresChangeBinding[],
  options?: SubscribePostgresChangesOptions
): () => void {
  const realtimeClient = asRealtimeClient(client);

  let cancelled = false;
  let ownedChannel: RealtimeChannelLike | null = null;

  async function setup(): Promise<void> {
    const staleChannel = findChannelByName(realtimeClient, channelName);
    if (staleChannel) {
      await realtimeClient.removeChannel(staleChannel);
    }
    if (cancelled) return;

    let channel = realtimeClient.channel(channelName);
    for (const binding of bindings) {
      channel = channel.on('postgres_changes', binding.config, binding.callback);
    }
    if (cancelled) return;

    options?.onSubscribeCalled?.();
    ownedChannel = channel.subscribe((status: RealtimeSubscribeStatus) => {
      options?.onStatus?.(status);
    });
  }

  void setup();

  return () => {
    cancelled = true;
    if (ownedChannel) {
      void realtimeClient.removeChannel(ownedChannel);
    }
  };
}
