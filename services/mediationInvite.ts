import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import { Linking, Platform } from 'react-native';
import type { Language } from '@/constants/i18n';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { supabase } from '@/services/supabase';
import { fmt } from '@/utils/i18nFormat';

const INVITE_CODE_CACHE_KEY = '@most/mediation_invite_codes';

export function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readInviteCodeCache(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(INVITE_CODE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function getCachedInviteCode(mediationId: string): Promise<string | null> {
  const cache = await readInviteCodeCache();
  return normalizeInviteCode(cache[mediationId]);
}

async function cacheInviteCode(mediationId: string, code: string): Promise<void> {
  const cache = await readInviteCodeCache();
  cache[mediationId] = code;
  await AsyncStorage.setItem(INVITE_CODE_CACHE_KEY, JSON.stringify(cache));
}

async function fetchExistingInviteCode(
  mediationId: string,
  userId: string
): Promise<{ code: string | null; status: string | null }> {
  const { data } = await supabase
    .from('mediations')
    .select('invite_code, status')
    .eq('id', mediationId)
    .eq('user_id', userId)
    .maybeSingle();

  return {
    code: normalizeInviteCode(data?.invite_code),
    status: data?.status ?? null,
  };
}

export function buildMediationShareLink(inviteCode: string): string {
  return ExpoLinking.createURL('/mediation/join', {
    queryParams: { code: inviteCode },
  });
}

export function buildMediationSmsBody(
  inviteCode: string,
  inviterName: string,
  language: Language = 'pl'
): string {
  const link = buildMediationShareLink(inviteCode);
  const template = getLiveMediationExtras(language).invite.smsBody;
  return fmt(template, { name: inviterName, code: inviteCode, link });
}

export function buildMediationSmsBodyShort(
  inviteCode: string,
  inviterName: string,
  language: Language = 'pl'
): string {
  const template = getLiveMediationExtras(language).invite.smsBodyShort;
  return fmt(template, { name: inviterName, code: inviteCode });
}

export async function shareViaSMS(
  inviteCode: string,
  inviterName: string,
  phoneNumber?: string | null,
  language: Language = 'pl'
): Promise<void> {
  const message = buildMediationSmsBodyShort(inviteCode, inviterName, language);
  const body = encodeURIComponent(message);
  const normalizedPhone = phoneNumber?.replace(/[^\d+]/g, '').trim();

  let url = normalizedPhone ? `sms:${normalizedPhone}?body=${body}` : `sms:?body=${body}`;

  if (Platform.OS === 'web') {
    throw new Error('Wysyłanie SMS nie jest dostępne w przeglądarce. Skopiuj treść wiadomości ręcznie.');
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen && Platform.OS === 'ios' && normalizedPhone) {
    url = `sms:&body=${body}`;
  }

  await Linking.openURL(url);
}

export type InviteCodeResult = {
  code: string;
  savedRemotely: boolean;
};

export async function ensureMediationInviteCode(
  mediationId: string,
  userId: string
): Promise<InviteCodeResult> {
  try {
    const existing = await fetchExistingInviteCode(mediationId, userId);
    if (existing.code) {
      await cacheInviteCode(mediationId, existing.code);
      return { code: existing.code, savedRemotely: true };
    }

    const cachedCode = await getCachedInviteCode(mediationId);
    if (cachedCode) {
      return { code: cachedCode, savedRemotely: false };
    }

    const code = generateSixDigitCode();
    const nextStatus =
      existing.status === 'completed' || existing.status === 'analyzing'
        ? 'inviting'
        : existing.status || 'inviting';

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('mediations')
        .update({
          invite_code: code,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mediationId)
        .eq('user_id', userId)
        .select('invite_code')
        .maybeSingle();

      if (!error) {
        const savedCode = normalizeInviteCode(data?.invite_code) || code;
        await cacheInviteCode(mediationId, savedCode);
        return { code: savedCode, savedRemotely: true };
      }

      const retry = await fetchExistingInviteCode(mediationId, userId);
      if (retry.code) {
        await cacheInviteCode(mediationId, retry.code);
        return { code: retry.code, savedRemotely: true };
      }
    }

    await cacheInviteCode(mediationId, code);
    return { code, savedRemotely: false };
  } catch {
    const cachedCode = await getCachedInviteCode(mediationId);
    if (cachedCode) {
      return { code: cachedCode, savedRemotely: false };
    }

    const code = generateSixDigitCode();
    await cacheInviteCode(mediationId, code);
    return { code, savedRemotely: false };
  }
}

export async function sendInAppMediationInvite(
  mediationId: string,
  hostUserId: string,
  partnerId: string,
  coupleId?: string | null
): Promise<void> {
  const { linkPartnerToMediation } = await import('@/services/mediationPartner');
  await linkPartnerToMediation(mediationId, hostUserId, partnerId, coupleId);
}

export async function cancelMediation(mediationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('mediations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Nie udało się anulować mediacji.');
  }
}

export async function startLiveMediation(mediationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('mediations')
    .update({
      status: 'live',
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId)
    .eq('user_id', userId);

  if (error) {
    // Allow navigation to live screen in demo/test mode even if update fails.
    return;
  }
}
