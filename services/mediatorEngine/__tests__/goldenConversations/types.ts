/**
 * Golden Conversation — referencyjny scenariusz mediacji (Phase 3G).
 * Tylko dane; bez logiki uruchomieniowej.
 */

import type { TherapeuticStrategy } from '@/types/mediator/engineTypes';
import type { TherapeuticGoal } from '@/types/mediator/therapeuticGoal';

export type GoldenConversationDifficulty = 'low' | 'medium' | 'high';

/** Oczekiwany poziom safety podczas mediacji (uproszczony). */
export type GoldenConversationSafetyExpectation = 'none' | 'L1' | 'L2' | 'L3';

/** Strategie terapeutyczne, które powinny pojawić się w trakcie mediacji. */
export type GoldenConversationStrategy = TherapeuticStrategy;

export interface GoldenConversationParticipant {
  /** Etykieta roli w parze (np. „osoba składająca skargę”). */
  role: string;
  /** Typowe emocje w tym konflikcie. */
  typicalEmotions: string[];
}

export interface GoldenConversationOutlineTurn {
  turn: number;
  speaker: 'host' | 'partner' | 'mediator';
  /** Krótki opis treści / dynamiki wypowiedzi — nie pełny transcript. */
  summary: string;
}

/** Wiadomość czatu w golden conversation (Phase 3G.2). */
export interface ConversationMessage {
  speaker: 'host' | 'partner' | 'mediator';
  text: string;
}

export interface GoldenConversation {
  id: string;
  title: string;
  /** Krótki opis konfliktu i prawdziwego problemu pod powierzchnią. */
  description: string;
  difficulty: GoldenConversationDifficulty;
  tags: string[];
  /** Oczekiwana ścieżka celów od SAFE_OPENING do końca mediacji. */
  expectedGoalPath: TherapeuticGoal[];
  /** Oczekiwana ścieżka celów dla krótkiego replay messages[] (opcjonalnie). */
  expectedReplayGoalPath?: TherapeuticGoal[];
  /** Strategie, które powinny pojawić się podczas mediacji (kolejność nieważna). */
  expectedStrategies: GoldenConversationStrategy[];
  safetyExpectation: GoldenConversationSafetyExpectation;
  participants: {
    host: GoldenConversationParticipant;
    partner: GoldenConversationParticipant;
  };
  /** Co dzieje się tuż przed rozpoczęciem mediacji. */
  openingSituation: string;
  /** Czego mediator powinien szukać i wspierać. */
  expectedMediatorBehaviour: string[];
  /** Błędy mediatora, których należy unikać. */
  forbiddenMediatorBehaviour: string[];
  /** Przybliżony przebieg rozmowy (realistyczny, niedoskonały). */
  conversationOutline: GoldenConversationOutlineTurn[];
  /** Fragment rozmowy w formacie wiadomości czatu (Phase 3G.2 pilot). */
  messages?: ConversationMessage[];
  /** Jak rozpoznać, że mediacja poszła we właściwym kierunku. */
  successCriteria: string[];
}
