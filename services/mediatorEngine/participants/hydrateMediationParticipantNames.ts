import type { MediationState, MediatorLang } from '@/types/mediator';
import {
  isPlaceholderDisplayName,
  resolveParticipantDisplayName,
} from '@/services/mediatorEngine/participants/resolveParticipantDisplayName';

export interface HydrateParticipantNamesInput {
  hostName?: string | null;
  partnerName?: string | null;
}

function pickHydratedName(
  role: 'host' | 'partner',
  fromInput: string | null | undefined,
  fromState: string | null | undefined,
  language: MediatorLang
): string {
  const inputTrimmed = typeof fromInput === 'string' ? fromInput.trim() : '';
  if (inputTrimmed.length > 0 && !isPlaceholderDisplayName(inputTrimmed)) {
    return inputTrimmed;
  }
  return resolveParticipantDisplayName(role, fromState, language);
}

/**
 * Hydrates mediationState.participants.*.profile.displayName before prompt composition.
 * Preserves internal role; only LLM-facing display names are updated in-memory.
 */
export function hydrateMediationParticipantNames(
  state: MediationState,
  names?: HydrateParticipantNamesInput | null,
  language?: MediatorLang
): MediationState {
  const lang = language ?? state.meta?.language ?? 'en';
  const hostDisplay = pickHydratedName(
    'host',
    names?.hostName,
    state.participants?.host?.profile?.displayName,
    lang
  );
  const partnerDisplay = pickHydratedName(
    'partner',
    names?.partnerName,
    state.participants?.partner?.profile?.displayName,
    lang
  );

  return {
    ...state,
    participants: {
      ...state.participants,
      host: {
        ...state.participants.host,
        profile: {
          ...state.participants.host.profile,
          displayName: hostDisplay,
        },
      },
      partner: {
        ...state.participants.partner,
        profile: {
          ...state.participants.partner.profile,
          displayName: partnerDisplay,
        },
      },
    },
  };
}
