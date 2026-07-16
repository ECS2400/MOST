import { prepareSupabaseRequest, supabase } from '@/services/supabase';

/** Minimal live_messages row shape for historical summary helpers. */
export interface LiveMessage {
  message_type: string;
  sender_id: string;
}

const liveMessagesCache = new Map<string, LiveMessage[]>();

export function invalidateLiveMessagesCache(mediationId?: string): void {
  if (mediationId) {
    liveMessagesCache.delete(mediationId);
    return;
  }
  liveMessagesCache.clear();
}

export async function endLiveMediation(
  mediationId: string,
  summary: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    await prepareSupabaseRequest();
    const { error: insertError } = await supabase.from('live_messages').insert({
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content:
        (summary.text as string) ||
        'Dziękuję za otwartą rozmowę. Macie solidne podstawy, by iść dalej razem.',
      message_type: 'summary',
      is_private: false,
      phase: 4,
      metadata: summary,
    });

    if (insertError) {
      console.error('[endLiveMediation] insert:', insertError.message);
    }

    const { error: updateError } = await supabase
      .from('mediations')
      .update({
        status: 'pending_agreements',
        live_summary: summary,
        live_progress: 100,
        live_phase: 4,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mediationId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Nie udało się zakończyć mediacji.';
    console.error('[endLiveMediation]', msg);
    return { ok: false, error: msg };
  }
}
