import { supabase } from '@/services/supabase';

export interface CreateMediationInput {
  userId: string;
  whatHappened: string;
  whatAngered: string;
  howFelt: string;
  whatNeeded: string;
  whatToSay: string;
  pastedText?: string | null;
  hasScreenshots: boolean;
}

export interface CreateMediationResult {
  id: string;
}

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
  const combinedDescription = resolveCombinedDescription(input);

  const { data, error } = await supabase
    .from('mediations')
    .insert({
      user_id: input.userId,
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
    throw new Error(error?.message || 'Nie udało się zapisać mediacji');
  }

  return { id: data.id };
}

export async function updateMediationScreenshots(
  mediationId: string,
  screenshotUrls: string[]
): Promise<void> {
  if (screenshotUrls.length === 0) return;

  const { error } = await supabase
    .from('mediations')
    .update({ screenshot_urls: screenshotUrls })
    .eq('id', mediationId);

  if (error) {
    throw new Error(error.message || 'Nie udało się zapisać zrzutów ekranu');
  }
}
