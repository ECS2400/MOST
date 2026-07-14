/**
 * Typecheck stub for `@/services/supabase` — avoids pulling Expo/RN into tsconfig.mediator-client.
 * Runtime uses the real module from the app bundle.
 */

export const SUPABASE_URL = 'https://example.supabase.co';
export const SUPABASE_ANON_KEY = 'stub-anon-key';

export async function prepareSupabaseRequest(): Promise<void> {}

export function getSupabaseRequestHeaders(): Record<string, string> {
  return {};
}

type SupabaseError = { code?: string; message?: string } | null;

type SupabaseResult<T = Record<string, unknown>> = {
  data: T | null;
  error: SupabaseError;
};

type SupabaseQueryBuilder = {
  select: (columns: string) => SupabaseQueryBuilder;
  eq: (column: string, value: string) => SupabaseQueryBuilder;
  gte: (column: string, value: string | number) => SupabaseQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => SupabaseQueryBuilder;
  update: (values: Record<string, unknown>) => SupabaseQueryBuilder;
  maybeSingle: () => Promise<SupabaseResult>;
  single: () => Promise<SupabaseResult>;
} & PromiseLike<SupabaseResult>;

type SupabaseChannel = {
  on: (
    event: string,
    filter: Record<string, unknown>,
    callback: (payload: unknown) => void
  ) => SupabaseChannel;
  subscribe: () => SupabaseChannel;
};

function createQueryBuilder(result: SupabaseResult = { data: null, error: null }): SupabaseQueryBuilder {
  const builder: SupabaseQueryBuilder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    order: () => builder,
    insert: () => builder,
    update: () => builder,
    maybeSingle: async () => result,
    single: async () => ({ data: {}, error: null }),
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

export const supabase = {
  from(_table: string): SupabaseQueryBuilder {
    return createQueryBuilder();
  },
  channel(_name: string): SupabaseChannel {
    const channel: SupabaseChannel = {
      on: () => channel,
      subscribe: () => channel,
    };
    return channel;
  },
  removeChannel(_channel: SupabaseChannel): void {},
};
