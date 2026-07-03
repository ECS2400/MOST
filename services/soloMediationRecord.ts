import { supabase } from '@/services/supabase';
import type { ClosureResult } from '@/services/disputeClosure';
import type { MediationSummaryData } from '@/services/mediationSummary';
import { createAgreementId } from '@/services/mediationSummary';
import {
  clearSoloChatSession,
  SoloChatSession,
} from '@/services/soloCoach';

export async function createSoloMediationRecord(
  userId: string,
  session: Pick<SoloChatSession, 'combinedDescription' | 'raw' | 'createdAt'>
): Promise<string> {
  const { data, error } = await supabase
    .from('mediations')
    .insert({
      user_id: userId,
      combined_description: session.combinedDescription,
      analysis: session.raw,
      live_summary: { mode: 'solo' },
      status: 'completed',
      live_progress: 40,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || 'Nie udało się zapisać sporu solo.');
  }

  return data.id;
}

function buildSoloSummary(
  session: SoloChatSession,
  result: ClosureResult
): MediationSummaryData {
  const bridge =
    (session.raw.situation_summary as string) ||
    session.view.situationSummary ||
    'Przepracowaliście ważny temat w rozmowie ze swoim coachem solo.';

  return {
    mode: 'solo',
    text: 'Dziękujemy za rozmowę ze swoim coachem solo. To ważny krok w stronę lepszego zrozumienia siebie i partnera.',
    commonUnderstanding: bridge,
    doingWell:
      (session.raw.celebration as string) ||
      'Poświęciłeś/aś czas na refleksję zamiast unikania trudnego tematu — to już duży krok.',
    closureSurvey: result.surveyAnswers,
    dateIdea: result.dateIdea,
    closureCompletedAt: result.completedAt,
    messageCount: session.messages.filter((m) => m.role === 'user').length,
    endedAt: result.completedAt,
    nextSteps: [
      {
        id: createAgreementId(),
        text: `Randka od serca: ${result.dateIdea.title}`,
        date: '',
      },
    ],
  };
}

export async function finalizeSoloMediation(
  userId: string,
  session: SoloChatSession,
  result: ClosureResult
): Promise<void> {
  const summary = buildSoloSummary(session, result);

  if (session.mediationId) {
    const { error } = await supabase
      .from('mediations')
      .update({
        status: 'resolved',
        live_summary: summary,
        live_progress: 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.mediationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Nie udało się zaktualizować sporu solo.');
    }
  } else {
    const { error } = await supabase.from('mediations').insert({
      user_id: userId,
      combined_description: session.combinedDescription,
      analysis: session.raw,
      status: 'resolved',
      live_summary: summary,
      live_progress: 100,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message || 'Nie udało się zapisać sporu solo.');
    }
  }

  await clearSoloChatSession();
}
