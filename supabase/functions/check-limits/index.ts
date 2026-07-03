/**
 * check-limits — freemium usage enforcement (Free limits + Premium bypass).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  processCheckLimits,
  validateRequestBody,
  type CouplePremiumRow,
} from './limitsCore.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
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

    const body = await req.json().catch(() => null);
    const validated = validateRequestBody(body);
    if (!validated.ok) {
      return errorResponse(validated.error, validated.status);
    }

    const request = validated.value;

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

    if (user.id !== request.user_id) {
      return errorResponse('FORBIDDEN', 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('plan, plan_expires_at, couple_id')
      .eq('id', request.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('[check-limits] profile lookup failed', profileError);
      return errorResponse('PROFILE_LOOKUP_FAILED', 500);
    }

    const coupleId = request.couple_id ?? profile?.couple_id ?? undefined;
    let couple: CouplePremiumRow | null = null;

    if (coupleId) {
      const { data: coupleRow, error: coupleError } = await admin
        .from('couples')
        .select(
          'subscription_tier, subscription_expires, partner_1_id, partner_2_id'
        )
        .eq('id', coupleId)
        .maybeSingle();

      if (coupleError) {
        console.error('[check-limits] couple lookup failed', coupleError);
        return errorResponse('COUPLE_LOOKUP_FAILED', 500);
      }

      if (!coupleRow) {
        return errorResponse('COUPLE_NOT_FOUND', 404);
      }

      const isMember =
        coupleRow.partner_1_id === request.user_id ||
        coupleRow.partner_2_id === request.user_id;

      if (!isMember) {
        return errorResponse('FORBIDDEN_COUPLE', 403);
      }

      couple = coupleRow;
      request.couple_id = coupleId;
    }

    try {
      const result = await processCheckLimits(admin, request, profile, couple);
      return jsonResponse(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'CHECK_LIMITS_FAILED';
      if (message === 'COUPLE_ID_REQUIRED') {
        return errorResponse('COUPLE_ID_REQUIRED', 400);
      }
      console.error('[check-limits] processing failed', e);
      return errorResponse(message, 500);
    }
  } catch (e) {
    console.error('[check-limits] unhandled error', e);
    return errorResponse('INTERNAL_ERROR', 500);
  }
});
