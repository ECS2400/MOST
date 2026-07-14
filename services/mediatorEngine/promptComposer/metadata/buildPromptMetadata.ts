import type { MediatorLang, PromptMetadata, TurnNumber } from '@/types/mediator';

/** Builds prompt metadata without private identifiers. */
export function buildPromptMetadata(input: {
  turnNumber: TurnNumber;
  language: MediatorLang;
  interventionType: string;
  goal: string;
  transcriptMessageCount: number;
  recentMediatorMessages?: string[];
  recentMediatorMessageRefs?: Array<{ id: string; content: string }>;
}): PromptMetadata {
  return {
    turnNumber: input.turnNumber,
    language: input.language,
    interventionType: input.interventionType,
    goal: input.goal,
    composedAt: new Date().toISOString(),
    transcriptMessageCount: input.transcriptMessageCount,
    recentMediatorMessages: input.recentMediatorMessages,
    recentMediatorMessageRefs: input.recentMediatorMessageRefs,
  };
}
