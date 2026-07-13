export interface CheckLimitsAuthDeps {
  prepare: () => Promise<void>;
  getSession: () => Promise<{
    data: { session: { access_token?: string } | null };
  }>;
  refreshSession: () => Promise<{
    data: { session: { access_token?: string } | null };
    error: { message: string } | null;
  }>;
}

/** Resolves a user access token — never returns the anon key. */
export async function resolveUserAccessToken(
  deps: CheckLimitsAuthDeps
): Promise<string | null> {
  await deps.prepare();

  const first = await deps.getSession();
  const existing = first.data.session?.access_token;
  if (existing) {
    return existing;
  }

  const refreshed = await deps.refreshSession();
  if (refreshed.error) {
    return null;
  }

  const afterRefresh = await deps.getSession();
  return (
    afterRefresh.data.session?.access_token ??
    refreshed.data.session?.access_token ??
    null
  );
}

export function buildCheckLimitsRequestHeaders(
  accessToken: string,
  anonKey: string
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  };
}
