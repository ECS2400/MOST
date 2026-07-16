import { subscribePostgresChanges } from '@/services/realtimeChannel';
import { supabase } from '@/services/supabase';
import { buildCombinedDescription } from '@/services/mediationCreate';
import {
  PartnerMediationLinkError,
  resolveMediationPartnerLinkUpdate,
} from '@/services/mediationPartnerValidation';

export type PartnerMediationInvite = {
  id: string;
  status: string;
  partnerJoined: boolean;
  hostId: string;
  hostName: string;
  inviteCode: string | null;
  createdAt: string;
  hasPartnerAnalysis: boolean;
};

export { PartnerMediationLinkError } from '@/services/mediationPartnerValidation';

export async function linkPartnerToMediation(
  mediationId: string,
  hostUserId: string,
  partnerId: string,
  coupleId?: string | null
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('mediations')
    .select('user_id, partner_id')
    .eq('id', mediationId)
    .maybeSingle();

  if (readError || !existing) {
    throw new Error(readError?.message || 'Nie udało się powiązać partnera z mediacją.');
  }

  const action = resolveMediationPartnerLinkUpdate({
    hostUserId,
    partnerId,
    existingHostUserId: existing.user_id ?? null,
    existingPartnerId: existing.partner_id ?? null,
  });

  if (action === 'noop') {
    return;
  }

  const { error } = await supabase
    .from('mediations')
    .update({
      partner_id: partnerId,
      couple_id: coupleId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId)
    .eq('user_id', hostUserId)
    .is('partner_id', null);

  if (error) {
    throw new Error(error.message || 'Nie udało się powiązać partnera z mediacją.');
  }
}

export async function fetchActivePartnerInvite(
  userId: string
): Promise<PartnerMediationInvite | null> {
  try {
    const { data, error } = await supabase
      .from('mediations')
      .select(
        'id, status, partner_joined, user_id, invite_code, created_at, partner_analysis, partner_combined_description'
      )
      .eq('partner_id', userId)
      .in('status', ['inviting', 'live'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.user_id)
      .maybeSingle();

    return {
      id: data.id,
      status: data.status,
      partnerJoined: !!data.partner_joined,
      hostId: data.user_id,
      hostName: hostProfile?.name?.trim() || 'Partner',
      inviteCode: data.invite_code,
      createdAt: data.created_at,
      hasPartnerAnalysis: !!(data.partner_analysis || data.partner_combined_description),
    };
  } catch {
    return null;
  }
}

export async function joinMediationByCode(
  code: string
): Promise<{ mediationId: string; status: string; hostName: string; partnerJoined: boolean }> {
  const { data, error } = await supabase.rpc('get_mediation_by_invite_code', {
    p_code: code.trim(),
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('INVALID_CODE')) {
      throw new Error('Nieprawidłowy kod mediacji. Sprawdź kod i spróbuj ponownie.');
    }
    if (msg.includes('OWN_MEDIATION')) {
      throw new Error('To jest Twoja własna mediacja — użyj ekranu zaproszenia.');
    }
    if (msg.includes('CODE_ALREADY_USED')) {
      throw new Error('Ten kod jest już używany przez inną osobę.');
    }
    throw new Error('Nie udało się dołączyć do mediacji.');
  }

  const payload = data as {
    mediation_id?: string;
    status?: string;
    host_name?: string;
    partner_joined?: boolean;
  };

  if (!payload?.mediation_id) {
    throw new Error('Nie udało się dołączyć do mediacji.');
  }

  return {
    mediationId: payload.mediation_id,
    status: payload.status || 'inviting',
    hostName: payload.host_name || 'Partner',
    partnerJoined: !!payload.partner_joined,
  };
}

export async function savePartnerPerspective(
  mediationId: string,
  userId: string,
  fields: {
    whatHappened: string;
    whatAngered: string;
    howFelt: string;
    whatNeeded: string;
    whatToSay: string;
  }
): Promise<void> {
  const combined = buildCombinedDescription(
    fields.whatHappened,
    fields.whatAngered,
    fields.howFelt,
    fields.whatNeeded,
    fields.whatToSay
  );

  const { error } = await supabase
    .from('mediations')
    .update({
      partner_what_happened: fields.whatHappened.trim() || null,
      partner_what_angered: fields.whatAngered.trim() || null,
      partner_how_felt: fields.howFelt.trim() || null,
      partner_what_needed: fields.whatNeeded.trim() || null,
      partner_what_to_say: fields.whatToSay.trim() || null,
      partner_combined_description: combined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId)
    .eq('partner_id', userId);

  if (error) {
    throw new Error(error.message || 'Nie udało się zapisać Twojej perspektywy.');
  }
}

export async function markPartnerJoined(mediationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('mediations')
    .update({
      partner_joined: true,
      partner_joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId)
    .eq('partner_id', userId);

  if (error) {
    throw new Error(error.message || 'Nie udało się potwierdzić dołączenia.');
  }
}

export function subscribePartnerMediationInvites(
  userId: string,
  onChange: () => void
): () => void {
  return subscribePostgresChanges(supabase, `partner-mediations:banner:${userId}`, [
    {
      config: {
        event: '*',
        schema: 'public',
        table: 'mediations',
        filter: `partner_id=eq.${userId}`,
      },
      callback: () => onChange(),
    },
  ]);
}

export function partnerInviteRoute(invite: PartnerMediationInvite): {
  pathname: string;
  params: Record<string, string>;
} {
  if (invite.status === 'live') {
    if (!invite.hasPartnerAnalysis) {
      return {
        pathname: '/mediation/partner-perspective',
        params: { mediationId: invite.id },
      };
    }
    return { pathname: '/mediation/session', params: { mediationId: invite.id } };
  }

  if (invite.hasPartnerAnalysis) {
    return {
      pathname: '/mediation/analysis',
      params: { mediationId: invite.id, role: 'partner' },
    };
  }

  return {
    pathname: '/mediation/partner-perspective',
    params: { mediationId: invite.id },
  };
}
