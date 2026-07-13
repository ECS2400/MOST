import { prepareSupabaseRequest, supabase } from '@/services/supabase';
import {
  MediationPersistenceError,
  type CreateMediationInput,
  type CreateMediationResult,
} from '@/services/mediationCreate.types';

export type { CreateMediationInput, CreateMediationResult } from '@/services/mediationCreate.types';
export { MediationPersistenceError } from '@/services/mediationCreate.types';

/** Builds combined_description from the 5 guided form fields. */
export function buildCombinedDescription(
  whatHappened: string,
  whatAngered: string,
  howFelt: string,
  whatNeeded: string,
  whatToSay: string
): string {
  const parts: string[] = [];

  if (whatHappened.trim()) {
    parts.push(`Co się wydarzyło: ${whatHappened.trim()}`);
  }
  if (whatAngered.trim()) {
    parts.push(`Co mnie zdenerwowało: ${whatAngered.trim()}`);
  }
  if (howFelt.trim()) {
    parts.push(`Jak się czułem: ${howFelt.trim()}`);
  }
  if (whatNeeded.trim()) {
    parts.push(`Czego potrzebuję: ${whatNeeded.trim()}`);
  }
  if (whatToSay.trim()) {
    parts.push(`Co chcę powiedzieć: ${whatToSay.trim()}`);
  }

  return parts.join('\n');
}

/** Form text first, then pasted text, then screenshot-only fallback. */
export function resolveCombinedDescription(input: CreateMediationInput): string {
  const fromForm = buildCombinedDescription(
    input.whatHappened,
    input.whatAngered,
    input.howFelt,
    input.whatNeeded,
    input.whatToSay
  );

  if (fromForm.trim()) {
    return fromForm.trim();
  }

  if (input.pastedText?.trim()) {
    return input.pastedText.trim();
  }

  if (input.hasScreenshots) {
    return 'Analiza na podstawie zrzutów ekranu rozmowy.';
  }

  return '';
}

export async function createMediationRecord(
  input: CreateMediationInput
): Promise<CreateMediationResult> {
  await prepareSupabaseRequest();

  const combinedDescription = resolveCombinedDescription(input);

  const { data, error } = await supabase
    .from('mediations')
    .insert({
      user_id: input.userId,
      couple_id: input.coupleId ?? null,
      what_happened: input.whatHappened.trim() || null,
      what_angered: input.whatAngered.trim() || null,
      how_felt: input.howFelt.trim() || null,
      what_needed: input.whatNeeded.trim() || null,
      what_to_say: input.whatToSay.trim() || null,
      combined_description: combinedDescription,
      pasted_text: input.pastedText?.trim() || null,
      screenshot_urls: [],
      status: 'analyzing',
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new MediationPersistenceError(
      'create_record',
      error?.message || 'Nie udało się zapisać mediacji',
      error?.code
    );
  }

  return { id: data.id };
}

export async function updateMediationScreenshots(
  mediationId: string,
  screenshotUrls: string[]
): Promise<void> {
  if (screenshotUrls.length === 0) return;

  await prepareSupabaseRequest();

  const { error } = await supabase
    .from('mediations')
    .update({ screenshot_urls: screenshotUrls })
    .eq('id', mediationId);

  if (error) {
    throw new MediationPersistenceError(
      'update_screenshots',
      error.message || 'Nie udało się zapisać zrzutów ekranu',
      error.code
    );
  }
}
