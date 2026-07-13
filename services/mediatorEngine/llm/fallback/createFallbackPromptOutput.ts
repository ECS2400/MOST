import type { MediatorLang, PromptComposerOutput, SafetyLevel } from '@/types/mediator';
import { buildModelHints } from '@/services/mediatorEngine/promptComposer/sections/buildModelHints';
import { buildSafetyEnvelope } from '@/services/mediatorEngine/promptComposer/sections/buildSafetyEnvelope';
import {
  languageInstruction,
  systemRulesForLanguage,
} from '@/services/mediatorEngine/promptComposer/config/promptTemplates';
import { mediatorFallbackUserTask } from '@/services/mediatorEngine/promptComposer/config/mediatorUserTask';
import { PERSONA_PRECEDENCE_CLAUSE } from '@/services/mediatorEngine/promptComposer/config/personaPrecedence';
import { buildFallbackMostMediatorPersona } from '@/services/mediatorEngine/promptComposer/persona/mostMediatorPersona';

/** Minimal PromptComposerOutput when input is malformed. */
export function createFallbackPromptOutput(
  language: MediatorLang = 'en',
  safetyLevel: SafetyLevel = 'none'
): PromptComposerOutput {
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const rules = systemRulesForLanguage(language);

  return {
    systemPrompt: [
      buildFallbackMostMediatorPersona(language),
      '',
      '=== Core mediator rules ===',
      ...rules,
      languageInstruction(language),
      '',
      ...PERSONA_PRECEDENCE_CLAUSE,
    ].join('\n'),
    developerPrompt: [
      buildFallbackMostMediatorPersona(language),
      '',
      'Fallback prompt context. Primary strategy (voice): slow_conflict.',
      '',
      ...PERSONA_PRECEDENCE_CLAUSE,
    ].join('\n'),
    userPrompt: [mediatorFallbackUserTask(language), '', ...PERSONA_PRECEDENCE_CLAUSE].join('\n'),
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
