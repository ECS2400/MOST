import type { SafetyEnvelope } from '@/types/mediator';
import { USER_PROMPT_PROHIBITIONS } from '@/services/mediatorEngine/promptComposer/config/allowedPromptFields';
import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';
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
    : 'Do NOT continue normal mediation — prioritize safety and pause.';

  const lines = [
    '=== Context ===',
    contextSummary,
    '',
    '=== Recent conversation ===',
    formatTranscriptWindow(transcriptEntries),
    '',
    '=== Task ===',
    'Generate one mediator message (1–4 sentences).',
    questionRule,
    safetyNote,
    '',
    '=== Prohibitions ===',
    ...USER_PROMPT_PROHIBITIONS,
  ].filter(Boolean);

  return lines.join('\n');
}
