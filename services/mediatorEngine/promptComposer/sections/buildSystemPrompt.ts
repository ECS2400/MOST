import type { MediatorLang } from '@/types/mediator';
import {
  languageInstruction,
  systemRulesForLanguage,
} from '@/services/mediatorEngine/promptComposer/config/promptTemplates';
import { PERSONA_PRECEDENCE_CLAUSE } from '@/services/mediatorEngine/promptComposer/config/personaPrecedence';
import { buildMostMediatorPersonaSection } from '@/services/mediatorEngine/promptComposer/persona/mostMediatorPersona';
import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';

/** Builds the system prompt: persona (verbatim md) → core rules → language instruction → precedence. */
export function buildSystemPrompt(ctx: SafePromptContext): string {
  const rules = systemRulesForLanguage(ctx.language);
  return [
    buildMostMediatorPersonaSection(ctx),
    '',
    '=== Core mediator rules ===',
    ...rules,
    languageInstruction(ctx.language),
    '',
    ...PERSONA_PRECEDENCE_CLAUSE,
  ].join('\n');
}

/** @deprecated Use buildSystemPrompt(ctx) — language-only fallback for tests. */
export function buildSystemPromptForLanguage(language: MediatorLang): string {
  return [...systemRulesForLanguage(language), languageInstruction(language)].join('\n');
}
