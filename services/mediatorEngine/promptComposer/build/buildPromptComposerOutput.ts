import type { PromptComposerOutput } from '@/types/mediator';
import { buildPromptMetadata } from '@/services/mediatorEngine/promptComposer/metadata/buildPromptMetadata';
import { estimatePromptTokens } from '@/services/mediatorEngine/promptComposer/metadata/estimateTokens';
import {
  extractRepetitionComparisonMessageRefs,
  extractRepetitionComparisonMessages,
} from '@/services/mediatorEngine/promptComposer/transcript/extractRecentMediatorMessages';
import { buildContextSummary } from '@/services/mediatorEngine/promptComposer/sections/buildContextSummary';
import { buildDeveloperPrompt } from '@/services/mediatorEngine/promptComposer/sections/buildDeveloperPrompt';
import { buildModelHints } from '@/services/mediatorEngine/promptComposer/sections/buildModelHints';
import {
  buildSafetyEnvelope,
} from '@/services/mediatorEngine/promptComposer/sections/buildSafetyEnvelope';
import { buildSystemPrompt } from '@/services/mediatorEngine/promptComposer/sections/buildSystemPrompt';
import { buildUserPrompt } from '@/services/mediatorEngine/promptComposer/sections/buildUserPrompt';
import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';
import { sanitizeTranscriptWindow } from '@/services/mediatorEngine/promptComposer/transcript/sanitizeTranscriptWindow';

export interface BuiltPromptSections {
  systemPrompt: string;
  developerPrompt: string;
  userPrompt: string;
  contextSummary: string;
}

/** Assembles all prompt sections from normalized context. */
export function buildPromptSections(ctx: SafePromptContext): BuiltPromptSections {
  const safetyLevel = ctx.safetyOutput?.level ?? 'none';
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const transcriptEntries = sanitizeTranscriptWindow(ctx.transcriptWindow);
  const contextSummary = buildContextSummary(ctx);

  return {
    systemPrompt: buildSystemPrompt(ctx),
    developerPrompt: buildDeveloperPrompt(ctx, safetyEnvelope),
    userPrompt: buildUserPrompt(ctx, contextSummary, transcriptEntries, safetyEnvelope),
    contextSummary,
  };
}

/** Assembles full PromptComposerOutput. */
export function buildPromptComposerOutput(ctx: SafePromptContext): PromptComposerOutput {
  const safetyLevel = ctx.safetyOutput?.level ?? 'none';
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const transcriptEntries = sanitizeTranscriptWindow(ctx.transcriptWindow);
  const recentMediatorMessages = extractRepetitionComparisonMessages(ctx.transcriptWindow);
  const recentMediatorMessageRefs = extractRepetitionComparisonMessageRefs(ctx.transcriptWindow);
  const sections = buildPromptSections(ctx);

  const tokenEstimate = estimatePromptTokens([
    sections.systemPrompt,
    sections.developerPrompt,
    sections.userPrompt,
  ]);

  return {
    systemPrompt: sections.systemPrompt,
    developerPrompt: sections.developerPrompt,
    userPrompt: sections.userPrompt,
    contextSummary: sections.contextSummary,
    promptMetadata: buildPromptMetadata({
      turnNumber: ctx.turnNumber,
      language: ctx.language,
      interventionType: ctx.intervention.type ?? 'validate',
      goal: ctx.currentGoal,
      transcriptMessageCount: transcriptEntries.length,
      recentMediatorMessages,
      recentMediatorMessageRefs,
    }),
    safetyEnvelope,
    tokenEstimate,
    modelHints: buildModelHints(safetyLevel),
  };
}
