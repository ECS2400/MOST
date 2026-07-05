import type { MediatorLang, PromptComposerOutput, SafetyLevel } from '@/types/mediator';
import { buildModelHints } from '@/services/mediatorEngine/promptComposer/sections/buildModelHints';
import { buildSafetyEnvelope } from '@/services/mediatorEngine/promptComposer/sections/buildSafetyEnvelope';
import {
  languageInstruction,
  systemRulesForLanguage,
} from '@/services/mediatorEngine/promptComposer/config/promptTemplates';

/** Minimal PromptComposerOutput when input is malformed. */
export function createFallbackPromptOutput(
  language: MediatorLang = 'en',
  safetyLevel: SafetyLevel = 'none'
): PromptComposerOutput {
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const rules = systemRulesForLanguage(language);

  return {
    systemPrompt: [...rules, languageInstruction(language)].join('\n'),
    developerPrompt: 'Fallback prompt context.',
    userPrompt: 'Generate one calm, brief mediator message.',
    contextSummary: 'Fallback context.',
    promptMetadata: {
      turnNumber: 1,
      language,
      interventionType: 'validate',
      goal: 'SAFE_OPENING',
      composedAt: new Date().toISOString(),
      transcriptMessageCount: 0,
    },
    safetyEnvelope,
    tokenEstimate: 100,
    modelHints: buildModelHints(safetyLevel),
  };
}
