import type { SafetyEnvelope } from '@/types/mediator';
import { USER_PROMPT_PROHIBITIONS } from '@/services/mediatorEngine/promptComposer/config/allowedPromptFields';
import {
  mediatorSafetyTaskNote,
  mediatorUserTaskLines,
} from '@/services/mediatorEngine/promptComposer/config/mediatorUserTask';
import { PERSONA_PRECEDENCE_CLAUSE } from '@/services/mediatorEngine/promptComposer/config/personaPrecedence';
import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';
import { resolveParticipantDisplayNames } from '@/services/mediatorEngine/participants/resolveParticipantDisplayName';
import { formatTranscriptWindow } from '@/services/mediatorEngine/promptComposer/transcript/formatTranscriptWindow';
import type { TranscriptWindowEntry } from '@/types/mediator';

function allowsMultipleQuestions(interventionType: string): boolean {
  return interventionType === 'choice_emotion' || interventionType === 'choice_need';
}

/** Builds user prompt with context, transcript, and generation task. */
export function buildUserPrompt(
  ctx: SafePromptContext,
  contextSummary: string,
  transcriptEntries: TranscriptWindowEntry[],
  safetyEnvelope: SafetyEnvelope
): string {
  const interventionType = ctx.intervention.type ?? ctx.decisionOutput.selectedInterventionType ?? 'validate';
  const questionRule = allowsMultipleQuestions(interventionType)
    ? 'You may offer a brief choice with up to two options.'
    : 'Ask at most one question.';

  const safetyNote = safetyEnvelope.allowNormalMediation
    ? ''
    : mediatorSafetyTaskNote(ctx.language);

  const lines = [
    '=== Context ===',
    contextSummary,
    '',
    '=== Recent conversation ===',
    formatTranscriptWindow(
      transcriptEntries,
      resolveParticipantDisplayNames(
        ctx.mediationState.participants?.host?.profile?.displayName,
        ctx.mediationState.participants?.partner?.profile?.displayName,
        ctx.language
      )
    ),
    '',
    '=== Task ===',
    ...mediatorUserTaskLines(ctx.language),
    questionRule,
    safetyNote,
    '',
    '=== Prohibitions ===',
    ...USER_PROMPT_PROHIBITIONS,
    '',
    ...PERSONA_PRECEDENCE_CLAUSE,
  ].filter(Boolean);

  return lines.join('\n');
}
