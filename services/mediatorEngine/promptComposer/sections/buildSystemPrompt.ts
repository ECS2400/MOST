import type { MediatorLang } from '@/types/mediator';
import {
  languageInstruction,
  systemRulesForLanguage,
} from '@/services/mediatorEngine/promptComposer/config/promptTemplates';

/** Builds the system prompt with core mediator rules. */
export function buildSystemPrompt(language: MediatorLang): string {
  const rules = systemRulesForLanguage(language);
  const lines = [...rules, languageInstruction(language)];
  return lines.join('\n');
}
