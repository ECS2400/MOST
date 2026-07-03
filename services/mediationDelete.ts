import { invalidateLiveMessagesCache } from '@/services/liveMediation';
import { supabase } from '@/services/supabase';

export async function deleteMediationPermanently(
  mediationId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('mediations')
    .delete()
    .eq('id', mediationId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('policy') || msg.includes('permission') || msg.includes('rls')) {
      throw new Error('Brak uprawnień do usunięcia mediacji.');
    }
    throw new Error(error.message || 'Nie udało się usunąć mediacji.');
  }

  if (!data) {
    throw new Error('Nie znaleziono mediacji do usunięcia.');
  }

  invalidateLiveMessagesCache(mediationId);
}
