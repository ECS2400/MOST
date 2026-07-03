/**
 * Connect two partner accounts using a profile invite code.
 * Uses service role for atomic updates (RLS blocks direct client lookup by code).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PartnerProfile = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_color: string | null;
  avatar_url: string | null;
  plan: string | null;
  created_at: string | null;
  invite_code: string | null;
  couple_id: string | null;
};

function normalizeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

function errorResponse(code: string, status = 400): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('NOT_AUTHENTICATED', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return errorResponse('SERVER_CONFIG', 500);
    }

    const body = await req.json().catch(() => ({}));
    const code = normalizeCode(body.invite_code ?? body.p_invite_code);
    if (!code) {
      return errorResponse('INVALID_CODE');
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return errorResponse('NOT_AUTHENTICATED', 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: owners, error: ownerError } = await admin
      .from('profiles')
      .select('id, email, name, avatar_color, avatar_url, plan, created_at, invite_code, couple_id')
      .ilike('invite_code', code);

    if (ownerError) {
      console.error('[connect-couple] owner lookup failed', ownerError);
      return errorResponse('INVALID_CODE');
    }

    let owner = (owners ?? []).find(
      (row) => normalizeCode((row as PartnerProfile).invite_code) === code
    ) as PartnerProfile | undefined;

    if (!owner) {
      const { data: pendingInvite } = await admin
        .from('couples')
        .select('partner_1_id')
        .ilike('invite_code', code)
        .is('partner_2_id', null)
        .maybeSingle();

      if (pendingInvite?.partner_1_id) {
        const { data: ownerProfile, error: pendingOwnerError } = await admin
          .from('profiles')
          .select('id, email, name, avatar_color, avatar_url, plan, created_at, invite_code, couple_id')
          .eq('id', pendingInvite.partner_1_id)
          .maybeSingle();

        if (pendingOwnerError) {
          console.error('[connect-couple] pending owner lookup failed', pendingOwnerError);
          return errorResponse('INVALID_CODE');
        }

        owner = ownerProfile as PartnerProfile | undefined;
      }
    }

    if (!owner) {
      return errorResponse('INVALID_CODE');
    }

    if (owner.id === user.id) {
      return errorResponse('OWN_CODE');
    }

    const { data: ownerCouple } = await admin
      .from('couples')
      .select('id, partner_2_id')
      .or(`partner_1_id.eq.${owner.id},partner_2_id.eq.${owner.id}`)
      .not('partner_2_id', 'is', null)
      .maybeSingle();

    if (ownerCouple) {
      return errorResponse('CODE_ALREADY_USED');
    }

    const { data: myProfile } = await admin
      .from('profiles')
      .select('couple_id')
      .eq('id', user.id)
      .maybeSingle();

    if (myProfile?.couple_id) {
      const { data: myCouple } = await admin
        .from('couples')
        .select('partner_2_id')
        .eq('id', myProfile.couple_id)
        .maybeSingle();

      if (myCouple?.partner_2_id) {
        return errorResponse('ALREADY_CONNECTED');
      }
    }

    const connectedAt = new Date().toISOString();

    const { data: pendingCouple } = await admin
      .from('couples')
      .select('id')
      .eq('partner_1_id', owner.id)
      .is('partner_2_id', null)
      .maybeSingle();

    let coupleId: string;

    if (pendingCouple?.id) {
      const { data: updatedCouple, error: updateError } = await admin
        .from('couples')
        .update({
          partner_2_id: user.id,
          invite_code: code,
        })
        .eq('id', pendingCouple.id)
        .select('id')
        .single();

      if (updateError || !updatedCouple) {
        console.error('[connect-couple] couple update failed', updateError);
        return errorResponse('CONNECT_FAILED', 500);
      }

      coupleId = updatedCouple.id;
    } else {
      const { data: createdCouple, error: createError } = await admin
        .from('couples')
        .insert({
          partner_1_id: owner.id,
          partner_2_id: user.id,
          invite_code: code,
        })
        .select('id')
        .single();

      if (createError || !createdCouple) {
        console.error('[connect-couple] couple insert failed', createError);
        return errorResponse('CONNECT_FAILED', 500);
      }

      coupleId = createdCouple.id;
    }

    await admin
      .from('couples')
      .delete()
      .eq('partner_1_id', user.id)
      .is('partner_2_id', null)
      .neq('id', coupleId);

    const { error: ownerProfileError } = await admin
      .from('profiles')
      .update({ couple_id: coupleId, partner_id: user.id })
      .eq('id', owner.id);

    const { error: joinerProfileError } = await admin
      .from('profiles')
      .update({ couple_id: coupleId, partner_id: owner.id })
      .eq('id', user.id);

    if (ownerProfileError || joinerProfileError) {
      console.error('[connect-couple] profile update failed', ownerProfileError, joinerProfileError);
      return errorResponse('CONNECT_FAILED', 500);
    }

    return new Response(
      JSON.stringify({
        couple_id: coupleId,
        invite_code: code,
        connected_at: connectedAt,
        partner: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          avatar_color: owner.avatar_color,
          avatar_url: owner.avatar_url,
          plan: owner.plan,
          created_at: owner.created_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[connect-couple] unexpected error', error);
    return errorResponse('CONNECT_FAILED', 500);
  }
});
