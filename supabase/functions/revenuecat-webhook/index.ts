/**
 * revenuecat-webhook — sync RevenueCat subscription events to profiles + couples.
 *
 * Set secret: REVENUECAT_WEBHOOK_SECRET
 * RevenueCat sends: Authorization: Bearer <secret>
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  parseWebhookPayload,
  processRevenueCatWebhook,
  verifyWebhookAuthorization,
  type SupabaseAdminClient,
} from './webhookCore.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleRevenueCatWebhookRequest(
  req: Request,
  options?: { webhookSecret?: string }
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const secret = options?.webhookSecret ?? Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!verifyWebhookAuthorization(req.headers.get('Authorization'), secret)) {
    return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = parseWebhookPayload(body);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'SERVER_CONFIG' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey) as unknown as SupabaseAdminClient;

  try {
    const result = await processRevenueCatWebhook(admin, parsed.event);
    return jsonResponse(result);
  } catch (e) {
    console.error('[revenuecat-webhook] processing failed', e);
    const message = e instanceof Error ? e.message : 'WEBHOOK_PROCESSING_FAILED';
    return jsonResponse({ error: message }, 500);
  }
}

if (import.meta.main) {
  serve((req) => handleRevenueCatWebhookRequest(req));
}
