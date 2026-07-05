/**
 * Prompt Composer — 6-language support tests (Phase 2D-fix).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  languageInstruction,
  LANGUAGE_INSTRUCTION,
  SUPPORTED_MEDIATOR_LANGS,
} from '@/services/mediatorEngine/promptComposer/config/promptTemplates';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import { createRichPipelineInput } from '@/services/mediatorEngine/__tests__/promptComposer/fixtures';
import type { MediatorLang } from '@/types/mediator';

const EXPECTED_INSTRUCTIONS: Record<MediatorLang, RegExp> = {
  pl: /Polish/i,
  en: /English/i,
  es: /Spanish/i,
  it: /Italian/i,
  de: /German/i,
  fr: /French/i,
};

describe('Prompt Composer — 6-language support', () => {
  it('languageInstruction dla 6 języków', () => {
    for (const lang of SUPPORTED_MEDIATOR_LANGS) {
      const instruction = languageInstruction(lang);
      assert.match(instruction, EXPECTED_INSTRUCTIONS[lang]);
      assert.match(instruction, /Write the mediator response in/);
      assert.ok(!instruction.endsWith(' in it.'));
      assert.equal(instruction, LANGUAGE_INSTRUCTION[lang]);
    }
  });

  it('composePrompt dla 6 języków ustawia promptMetadata.language poprawnie', () => {
    for (const lang of SUPPORTED_MEDIATOR_LANGS) {
      const result = composePrompt(createRichPipelineInput(lang));
      assert.equal(result.promptMetadata.language, lang);
      assert.match(result.systemPrompt, EXPECTED_INSTRUCTIONS[lang]);
    }
  });
});
