import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseEdgeErrorBody } from '@/utils/edgeFunctionError';
import {
  assertFeatureAllowed,
  isValidCheckLimitsResponse,
  mapCheckLimitsEdgeError,
} from '@/services/checkLimits.logic';
import {
  buildCheckLimitsRequestHeaders,
  resolveUserAccessToken,
} from '@/services/checkLimits.auth';
import { requestCheckLimits, runCheckLimitsRequest } from '@/services/checkLimits.request';
import { EdgeFunctionError } from '@/utils/edgeFunctionError';
import { FeatureLimitBlockedError, LIMIT_CHECK_ERROR } from '@/utils/paywallReason';
import { LimitCheckTechnicalError } from '@/services/checkLimits.types';

const RESET_AT = '2026-08-01T00:00:00.000Z';
const USER_TOKEN = 'user-access-token-abc';
const ANON_KEY = 'anon-key-should-not-be-authorization';
const EDGE_URL = 'https://example.test/functions/v1/check-limits';
const OPTIONS = { userId: 'user-1', coupleId: 'couple-1' };

function mockFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>
): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) =>
    handler(String(url), init)) as typeof fetch;
}

function validCheckLimitsBody() {
  return JSON.stringify({
    allowed: true,
    isPremium: false,
    used: 0,
    limit: 1,
    resetAt: RESET_AT,
    reason: 'free_available',
  });
}

function baseResponse(
  overrides: Partial<{
    allowed: boolean;
    isPremium: boolean;
    used: number;
    limit: number | null;
    reason: 'premium' | 'free_available' | 'limit_reached';
  }> = {}
) {
  return {
    allowed: true,
    isPremium: false,
    used: 0,
    limit: 1,
    resetAt: RESET_AT,
    reason: 'free_available' as const,
    ...overrides,
  };
}

describe('parseEdgeErrorBody', () => {
  it('parses JSON error code and status', () => {
    const error = parseEdgeErrorBody(500, JSON.stringify({ error: 'USAGE_READ_FAILED' }));
    assert.equal(error.status, 500);
    assert.equal(error.code, 'USAGE_READ_FAILED');
  });

  it('parses Supabase gateway code/message', () => {
    const error = parseEdgeErrorBody(
      401,
      JSON.stringify({ code: 'UNAUTHORIZED_LEGACY_JWT', message: 'Invalid JWT' })
    );
    assert.equal(error.status, 401);
    assert.equal(error.code, 'UNAUTHORIZED_LEGACY_JWT');
    assert.equal(error.message, 'Invalid JWT');
  });
});

describe('isValidCheckLimitsResponse', () => {
  it('accepts a valid payload', () => {
    assert.equal(isValidCheckLimitsResponse(baseResponse()), true);
  });

  it('rejects malformed payloads', () => {
    assert.equal(isValidCheckLimitsResponse({ allowed: true }), false);
    assert.equal(isValidCheckLimitsResponse(null), false);
  });
});

describe('assertFeatureAllowed', () => {
  it('allows premium users', () => {
    const result = assertFeatureAllowed(
      'create_live_mediation',
      baseResponse({ allowed: true, isPremium: true, limit: null, reason: 'premium' })
    );
    assert.equal(result.reason, 'premium');
  });

  it('allows free users with remaining quota', () => {
    const result = assertFeatureAllowed(
      'create_live_mediation',
      baseResponse({ allowed: true, used: 0, limit: 1, reason: 'free_available' })
    );
    assert.equal(result.allowed, true);
  });

  it('blocks exhausted limits with paywall error', () => {
    assert.throws(
      () =>
        assertFeatureAllowed(
          'create_live_mediation',
          baseResponse({
            allowed: false,
            used: 1,
            limit: 1,
            reason: 'limit_reached',
          })
        ),
      FeatureLimitBlockedError
    );
  });

  it('treats missing counter as free_available when allowed', () => {
    const result = assertFeatureAllowed(
      'create_live_mediation',
      baseResponse({ allowed: true, used: 0, limit: 1, reason: 'free_available' })
    );
    assert.equal(result.used, 0);
  });
});

describe('mapCheckLimitsEdgeError', () => {
  it('maps Supabase edge failures to technical limit-check errors', () => {
    const mapped = mapCheckLimitsEdgeError(
      'create_live_mediation',
      new EdgeFunctionError(500, 'USAGE_READ_FAILED')
    );

    assert.ok(mapped instanceof LimitCheckTechnicalError);
    assert.equal(mapped.message, LIMIT_CHECK_ERROR);
    assert.equal(mapped.details.status, 500);
    assert.equal(mapped.details.code, 'USAGE_READ_FAILED');
  });

  it('maps Edge 401 NOT_AUTHENTICATED to technical error', () => {
    const mapped = mapCheckLimitsEdgeError(
      'create_live_mediation',
      new EdgeFunctionError(401, 'NOT_AUTHENTICATED')
    );

    assert.ok(mapped instanceof LimitCheckTechnicalError);
    assert.equal(mapped.details.status, 401);
    assert.equal(mapped.details.code, 'NOT_AUTHENTICATED');
    assert.equal(mapped.message, LIMIT_CHECK_ERROR);
  });

  it('maps unknown failures without status', () => {
    const mapped = mapCheckLimitsEdgeError(
      'create_live_mediation',
      new Error('network down')
    );

    assert.equal(mapped.details.code, 'network down');
    assert.equal(mapped.message, LIMIT_CHECK_ERROR);
  });
});

describe('resolveUserAccessToken', () => {
  it('returns existing access token without refresh', async () => {
    let refreshCalls = 0;
    const token = await resolveUserAccessToken({
      prepare: async () => {},
      getSession: async () => ({
        data: { session: { access_token: USER_TOKEN } },
      }),
      refreshSession: async () => {
        refreshCalls += 1;
        return { data: { session: null }, error: null };
      },
    });

    assert.equal(token, USER_TOKEN);
    assert.equal(refreshCalls, 0);
  });

  it('refreshes when session is missing and returns new token', async () => {
    let getSessionCalls = 0;
    const token = await resolveUserAccessToken({
      prepare: async () => {},
      getSession: async () => {
        getSessionCalls += 1;
        if (getSessionCalls === 1) {
          return { data: { session: null } };
        }
        return { data: { session: { access_token: 'refreshed-token' } } };
      },
      refreshSession: async () => ({
        data: { session: { access_token: 'refreshed-token' } },
        error: null,
      }),
    });

    assert.equal(token, 'refreshed-token');
    assert.equal(getSessionCalls, 2);
  });

  it('returns null when refresh fails', async () => {
    const token = await resolveUserAccessToken({
      prepare: async () => {},
      getSession: async () => ({ data: { session: null } }),
      refreshSession: async () => ({
        data: { session: null },
        error: { message: 'refresh failed' },
      }),
    });

    assert.equal(token, null);
  });
});

describe('buildCheckLimitsRequestHeaders', () => {
  it('never uses anon key as Authorization', () => {
    const headers = buildCheckLimitsRequestHeaders(USER_TOKEN, ANON_KEY);
    assert.equal(headers.Authorization, `Bearer ${USER_TOKEN}`);
    assert.equal(headers.apikey, ANON_KEY);
    assert.notEqual(headers.Authorization, `Bearer ${ANON_KEY}`);
  });
});

describe('requestCheckLimits', () => {
  it('sends user access_token when session is active', async () => {
    let authHeader = '';
    const fetchImpl = mockFetch(async (_url, init) => {
      authHeader = String(new Headers(init?.headers).get('Authorization'));
      return new Response(validCheckLimitsBody(), { status: 200 });
    });

    const result = await requestCheckLimits(
      'create_live_mediation',
      OPTIONS,
      false,
      {
        fetchImpl,
        edgeUrl: EDGE_URL,
        anonKey: ANON_KEY,
        auth: {
          prepare: async () => {},
          getSession: async () => ({
            data: { session: { access_token: USER_TOKEN } },
          }),
          refreshSession: async () => ({
            data: { session: null },
            error: null,
          }),
        },
      }
    );

    assert.equal(authHeader, `Bearer ${USER_TOKEN}`);
    assert.notEqual(authHeader, `Bearer ${ANON_KEY}`);
    assert.equal(result.reason, 'free_available');
  });

  it('uses token after successful refresh when session was empty', async () => {
    let authHeader = '';
    let getSessionCalls = 0;
    const fetchImpl = mockFetch(async (_url, init) => {
      authHeader = String(new Headers(init?.headers).get('Authorization'));
      return new Response(validCheckLimitsBody(), { status: 200 });
    });

    await requestCheckLimits('create_live_mediation', OPTIONS, false, {
      fetchImpl,
      edgeUrl: EDGE_URL,
      anonKey: ANON_KEY,
      auth: {
        prepare: async () => {},
        getSession: async () => {
          getSessionCalls += 1;
          if (getSessionCalls === 1) {
            return { data: { session: null } };
          }
          return { data: { session: { access_token: 'after-refresh' } } };
        },
        refreshSession: async () => ({
          data: { session: { access_token: 'after-refresh' } },
          error: null,
        }),
      },
    });

    assert.equal(authHeader, 'Bearer after-refresh');
    assert.equal(getSessionCalls, 2);
  });

  it('throws SESSION_ACCESS_TOKEN_MISSING when refresh fails', async () => {
    await assert.rejects(
      () =>
        requestCheckLimits('create_live_mediation', OPTIONS, false, {
          fetchImpl: mockFetch(async () => new Response('{}', { status: 200 })),
          edgeUrl: EDGE_URL,
          anonKey: ANON_KEY,
          auth: {
            prepare: async () => {},
            getSession: async () => ({ data: { session: null } }),
            refreshSession: async () => ({
              data: { session: null },
              error: { message: 'refresh failed' },
            }),
          },
        }),
      (error: LimitCheckTechnicalError) => {
        assert.equal(error.details.code, 'SESSION_ACCESS_TOKEN_MISSING');
        assert.equal(error.details.status, 401);
        return true;
      }
    );
  });

  it('maps Edge 401 NOT_AUTHENTICATED to LimitCheckTechnicalError', async () => {
    await assert.rejects(
      () =>
        runCheckLimitsRequest('create_live_mediation', OPTIONS, false, {
          fetchImpl: mockFetch(async () =>
            new Response(JSON.stringify({ error: 'NOT_AUTHENTICATED' }), {
              status: 401,
            })
          ),
          edgeUrl: EDGE_URL,
          anonKey: ANON_KEY,
          auth: {
            prepare: async () => {},
            getSession: async () => ({
              data: { session: { access_token: USER_TOKEN } },
            }),
            refreshSession: async () => ({
              data: { session: null },
              error: null,
            }),
          },
        }),
      (error: LimitCheckTechnicalError) => {
        assert.equal(error.details.status, 401);
        assert.equal(error.details.code, 'NOT_AUTHENTICATED');
        assert.equal(error.message, LIMIT_CHECK_ERROR);
        return true;
      }
    );
  });
});
