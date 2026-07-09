/**
 * Ending Conversation — scenariusz testowy jakości domknięcia mediacji (Phase 5J).
 * Osobny od GoldenConversation (Phase 5I); nie uczestniczy w replay benchmarku 20/20.
 */

import type { ConversationMessage } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

/** Pojęcie, które mediator powinien odzwierciedlić w odpowiedzi końcowej. */
export interface EndingConceptExpectation {
  id: string;
  /** Krótki opis semantyczny (dokumentacja / raport). */
  label: string;
  /** Wzorce PL do heurystycznej detekcji w tekście mediatora (Phase 5J.1 — diagnostic). */
  patterns: RegExp[];
}

export interface EndingConversation {
  id: string;
  title: string;
  description: string;
  /** Id scenariusza golden, z którego wyrasta ending (tylko referencja dokumentacyjna). */
  sourceGoldenConversationId?: string;
  tags: string[];
  participants: {
    host: { role: string; typicalEmotions: string[] };
    partner: { role: string; typicalEmotions: string[] };
  };
  openingSituation: string;
  /** Wiadomości host/partner — faza zbliżona do końca mediacji. */
  messages: ConversationMessage[];
  /** Pojęcia, które odpowiedź końcowa powinna odzwierciedlać. */
  expectedEndingConcepts: EndingConceptExpectation[];
  expectedMediatorBehaviour: string[];
  forbiddenMediatorBehaviour: string[];
  successCriteria: string[];
}
