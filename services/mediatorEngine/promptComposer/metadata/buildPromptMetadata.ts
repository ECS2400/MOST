import type { MediatorLang, PromptMetadata, TurnNumber } from '@/types/mediator';

/** Builds prompt metadata without private identifiers. */
export function buildPromptMetadata(input: {
  turnNumber: TurnNumber;
  language: MediatorLang;
  interventionType: string;
  goal: string;
  transcriptMessageCount: number;
}): PromptMetadata {
  return {
    turnNumber: input.turnNumber,
    language: input.language,
    interventionType: input.interventionType,
    goal: input.goal,
    composedAt: new Date().toISOString(),
    transcriptMessageCount: input.transcriptMessageCount,
  };
}
