import type { MediatorLang } from '@/types/mediator';

/** Role labels used as skeleton defaults — not real display names. */
const PLACEHOLDER_DISPLAY_NAMES = new Set([
  'host',
  'partner',
  'anfitrión',
  'anfitrion',
  'pareja',
  'hôte',
  'hote',
  'partenaire',
  'partner a',
  'partner b',
]);

const NEUTRAL_LABELS: Record<MediatorLang, { host: string; partner: string }> = {
  pl: { host: 'Ty', partner: 'druga strona' },
  en: { host: 'You', partner: 'the other person' },
  es: { host: 'Tú', partner: 'la otra persona' },
  it: { host: 'Tu', partner: "l'altra persona" },
  de: { host: 'Du', partner: 'die andere Person' },
  fr: { host: 'Toi', partner: "l'autre personne" },
};

/** True when the value is a fallback role label, not a real person name. */
export function isPlaceholderDisplayName(name: string | null | undefined): boolean {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (trimmed.length === 0) return true;
  return PLACEHOLDER_DISPLAY_NAMES.has(trimmed.toLowerCase());
}

/** Neutral addressee when no real name is available. */
export function neutralParticipantLabel(
  role: 'host' | 'partner',
  language: MediatorLang = 'en'
): string {
  const labels = NEUTRAL_LABELS[language] ?? NEUTRAL_LABELS.en;
  return labels[role];
}

/** Resolves LLM-facing display name — never returns Host/Partner placeholders. */
export function resolveParticipantDisplayName(
  role: 'host' | 'partner',
  displayName: string | null | undefined,
  language: MediatorLang = 'en'
): string {
  const trimmed = typeof displayName === 'string' ? displayName.trim() : '';
  if (trimmed.length > 0 && !isPlaceholderDisplayName(trimmed)) {
    return trimmed;
  }
  return neutralParticipantLabel(role, language);
}

export interface ParticipantDisplayNames {
  hostName: string;
  partnerName: string;
}

/** Resolves both participant names for prompts and transcript formatting. */
export function resolveParticipantDisplayNames(
  hostDisplayName: string | null | undefined,
  partnerDisplayName: string | null | undefined,
  language: MediatorLang = 'en'
): ParticipantDisplayNames {
  return {
    hostName: resolveParticipantDisplayName('host', hostDisplayName, language),
    partnerName: resolveParticipantDisplayName('partner', partnerDisplayName, language),
  };
}
