import type {
  MediatorLang,
  PromptComposerInput,
  PromptComposerOutput,
  SafetyLevel,
} from '@/types/mediator';
import { buildPromptComposerOutput } from '@/services/mediatorEngine/promptComposer/build/buildPromptComposerOutput';
import { assertNoForbiddenPromptFields } from '@/services/mediatorEngine/promptComposer/lib/assertNoForbiddenPromptFields';
import {
  safeFallbackLanguage,
  safeFallbackSafetyLevel,
  safePromptInput,
} from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';
import { USER_PROMPT_PROHIBITIONS } from '@/services/mediatorEngine/promptComposer/config/allowedPromptFields';
import { buildModelHints } from '@/services/mediatorEngine/promptComposer/sections/buildModelHints';
import {
  buildSafetyEnvelope,
  formatSafetyEnvelopeSection,
} from '@/services/mediatorEngine/promptComposer/sections/buildSafetyEnvelope';
import { systemRulesForLanguage, languageInstruction } from '@/services/mediatorEngine/promptComposer/config/promptTemplates';

function createFallbackOutput(
  language: MediatorLang = 'en',
  safetyLevel: SafetyLevel = 'none'
): PromptComposerOutput {
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const isSafetyBlock = safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop';

  const rules = systemRulesForLanguage(language);
  const systemPrompt = [...rules, languageInstruction(language)].join('\n');
  const userPrompt = [
    'Generate one calm, brief mediator message.',
    isSafetyBlock ? 'Do NOT continue normal mediation — prioritize safety and pause.' : '',
    ...USER_PROMPT_PROHIBITIONS,
  ]
    .filter(Boolean)
    .join('\n');

  const developerPrompt = isSafetyBlock
    ? [
        'Fallback mode: use safe defaults. Primary strategy: build_safety.',
        'Safety fallback: follow the safety envelope — stop or pause normal mediation.',
        '',
        '=== Safety envelope ===',
        formatSafetyEnvelopeSection(safetyEnvelope),
      ].join('\n')
    : 'Fallback mode: use safe defaults. Primary strategy: build_safety.';

  return {
    systemPrompt,
    developerPrompt,
    userPrompt,
    contextSummary: 'Fallback context — minimal safe prompt.',
    promptMetadata: {
      turnNumber: 1,
      language,
      interventionType: 'validate',
      goal: 'SAFE_OPENING',
      composedAt: new Date().toISOString(),
      transcriptMessageCount: 0,
    },
    safetyEnvelope,
    tokenEstimate: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
    modelHints: buildModelHints(safetyLevel),
  };
}

/**
 * Composes a safe LLM prompt from deterministic pipeline outputs.
 *
 * Does not call LLM. Does not make therapeutic decisions.
 */
export function composePrompt(input: PromptComposerInput): PromptComposerOutput {
  try {
    const ctx = safePromptInput(input);
    const output = buildPromptComposerOutput(ctx);

    const combined = [
      output.systemPrompt,
      output.developerPrompt,
      output.userPrompt,
      output.contextSummary,
    ].join('\n');

    assertNoForbiddenPromptFields(combined);

    return output;
  } catch {
    return createFallbackOutput(safeFallbackLanguage(input), safeFallbackSafetyLevel(input));
  }
}
