import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = 'onspaceapp';
const AUTH_CALLBACK_PATH = 'auth/callback';

/** Deep-link / web URL Supabase should redirect to after OAuth or email confirmation. */
export function getAuthRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  return makeRedirectUri({
    scheme: APP_SCHEME,
    path: AUTH_CALLBACK_PATH,
  });
}

/** Exchange OAuth / email-confirmation redirect URL for a Supabase session. */
export async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(
      typeof params.error_description === 'string'
        ? params.error_description
        : errorCode
    );
  }

  const code = params.code;
  if (typeof code === 'string' && code.length > 0) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  throw new Error('Brak danych logowania w linku potwierdzającym.');
}
