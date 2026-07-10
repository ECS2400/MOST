// Most App — Supabase Client
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { MediationState } from '@/types/mediator/mediationState';
import type { SessionMemory } from '@/types/mediator/sessionMemory';

export const SUPABASE_URL = 'https://ilqdxdjnabmbmmstvczh.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscWR4ZGpuYWJtYm1tc3R2Y3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODk3MjEsImV4cCI6MjA5NjA2NTcyMX0.yEGoG172ibyvehJCbIs8Cd61mZmvlj8jKR3sIO2efAw';

// SSR-safe storage: AsyncStorage on native, localStorage-wrapper on web
const webStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

/** Ensures PostgREST always receives the anon apikey (fixes UNAUTHORIZED_MISSING_API_KEY). */
function createSupabaseFetch(): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (!headers.has('apikey')) {
      headers.set('apikey', SUPABASE_ANON_KEY);
    }
    return fetch(input, { ...init, headers });
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
    fetch: createSupabaseFetch(),
  },
});

/** Headers for explicit REST calls (live_messages, edge functions, etc.). */
export async function getSupabaseRequestHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
}

/** Warm up auth session before DB writes. */
export async function prepareSupabaseRequest(): Promise<void> {
  await supabase.auth.getSession();
}

supabase.auth.onAuthStateChange((event, session) => {
  console.log('[Supabase auth]', event, session?.user?.id ?? 'no user');
});

// ─── Edge Function URLs ───────────────────────────────────────────────────────
export const EDGE = {
  analyzePerspectives: `${SUPABASE_URL}/functions/v1/analyze-perspectives`,
  realtimeCoach: `${SUPABASE_URL}/functions/v1/realtimecoach`,
  checkLimits: `${SUPABASE_URL}/functions/v1/check-limits`,
  mediatorRuntime: `${SUPABASE_URL}/functions/v1/mediator-runtime`,
  soloCoach: `${SUPABASE_URL}/functions/v1/solo-coach`,
  disputeClosure: `${SUPABASE_URL}/functions/v1/dispute-closure`,
  ocrAnalyze: `${SUPABASE_URL}/functions/v1/ocr-analyze`,
  screenshotInterpret: `${SUPABASE_URL}/functions/v1/screenshot-interpret`,
  relationshipReminder: `${SUPABASE_URL}/functions/v1/relationship-reminder`,
  connectCouple: `${SUPABASE_URL}/functions/v1/connect-couple`,
};

// ─── Typed table helpers ──────────────────────────────────────────────────────
export type Tables = {
  profiles: {
    id: string;
    email: string | null;
    name: string;
    avatar_color: string;
    avatar_url: string | null;
    plan: 'free' | 'premium';
    plan_expires_at: string | null;
    couple_id: string | null;
    partner_id: string | null;
    preferred_language: string | null;
    invite_code: string | null;
    created_at: string;
  };
  couples: {
    id: string;
    partner_1_id: string;
    partner_2_id: string | null;
    invite_code: string;
    connected_at: string | null;
    relationship_start_date: string | null;
    anniversaries: { id: string; label: string; date: string }[] | null;
    created_at: string;
  };
  disputes: {
    id: string;
    couple_id: string;
    created_by: string;
    title: string;
    description: string | null;
    phase: number;
    status: 'active' | 'resolved' | 'abandoned';
    partner_1_id: string;
    partner_2_id: string;
    partner_1_perspective: string | null;
    partner_2_perspective: string | null;
    partner_1_feelings: string | null;
    partner_2_feelings: string | null;
    partner_1_needs: string | null;
    partner_2_needs: string | null;
    partner_1_ready: boolean;
    partner_2_ready: boolean;
    mirror_analysis: any | null;
    resolution: string | null;
    resolution_summary: any | null;
    lesson_note: string | null;
    resolved_at: string | null;
    created_at: string;
  };
  messages: {
    id: string;
    dispute_id: string;
    author_id: string;
    author_name: string;
    content: string;
    phase: number;
    is_ai: boolean;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    sentiment_indicator: string | null;
    ai_response_type: string | null;
    created_at: string;
  };
  screenshots: {
    id: string;
    user_id: string;
    dispute_id: string | null;
    storage_url: string;
    extracted_text: string | null;
    created_at: string;
  };
  mediations: {
    id: string;
    user_id: string;
    what_happened: string | null;
    what_angered: string | null;
    how_felt: string | null;
    what_needed: string | null;
    what_to_say: string | null;
    combined_description: string;
    pasted_text: string | null;
    screenshot_urls: string[];
    analysis: any | null;
    invite_code: string | null;
    partner_joined: boolean;
    partner_id: string | null;
    partner_joined_at: string | null;
    live_phase: number;
    live_paused: boolean;
    live_progress: number;
    current_question: string | null;
    current_question_index: number;
    partner_typing: boolean;
    live_summary: any | null;
    mediation_state: MediationState | null;
    session_memory: SessionMemory | null;
    mediator_engine_version: string | null;
    mediator_runtime_metadata: Record<string, unknown> | null;
    mediator_last_goal: string | null;
    mediator_last_strategy: string | null;
    mediator_last_safety_level: string | null;
    status:
      | 'pending'
      | 'analyzing'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'inviting'
      | 'live'
      | 'pending_agreements'
      | 'resolved';
    created_at: string;
    updated_at: string;
  };
  live_messages: {
    id: string;
    mediation_id: string;
    sender_id: string;
    sender_name: string | null;
    content: string;
    message_type: 'message' | 'question' | 'hint' | 'system' | 'summary';
    is_private: boolean;
    recipient_id: string | null;
    phase: number;
    metadata: any | null;
    created_at: string;
  };
};

// ─── Edge Function caller ─────────────────────────────────────────────────────
export async function callEdge<T = any>(
  url: string,
  body: object
): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `Edge function error: ${response.status}`);
  }
  return response.json();
}
