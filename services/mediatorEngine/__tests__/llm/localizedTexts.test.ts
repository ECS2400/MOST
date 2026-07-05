/**
 * LLM — 6-language localized texts tests (Phase 2D-fix).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import {
  LOCALIZED_NORMAL_TEXT,
  LOCALIZED_SAFETY_TEXT,
  SUPPORTED_MEDIATOR_LANGS,
} from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import type { MediatorLang } from '@/types/mediator';

const SAFETY_MARKERS: Record<MediatorLang, RegExp> = {
  pl: /pauz|bezpiecze/i,
  en: /pause|safety/i,
  es: /pausa|seguridad/i,
  it: /pausa|sicurezza/i,
  de: /pause|sicherheit/i,
  fr: /pause|sécurité/i,
};

describe('LLM — 6-language localized texts', () => {
  it('createFallbackMediatorReply normal dla 6 języków', () => {
    for (const lang of SUPPORTED_MEDIATOR_LANGS) {
      const draft = createFallbackMediatorReply(lang, 'none', 1);
      assert.equal(draft.language, lang);
      assert.equal(draft.text, LOCALIZED_NORMAL_TEXT[lang]);
      assert.ok(draft.text.length > 0);
    }
  });

  it('createFallbackMediatorReply safety dla 6 języków', () => {
    for (const lang of SUPPORTED_MEDIATOR_LANGS) {
      const draft = createFallbackMediatorReply(lang, 'L3_stop', 1);
      assert.equal(draft.text, LOCALIZED_SAFETY_TEXT[lang]);
      assert.match(draft.text, SAFETY_MARKERS[lang]);
    }
  });

  it('deterministicStubProvider normal dla 6 języków', async () => {
    const provider = createDeterministicStubProvider();
    for (const lang of SUPPORTED_MEDIATOR_LANGS) {
      const response = await provider.generateText({
        systemPrompt: 's',
        developerPrompt: 'd',
        userPrompt: 'u',
        modelHints: { temperature: 0.2, maxOutputTokens: 180, style: 'calm', responseFormat: 'plain_text' },
        metadata: {
          turnNumber: 1,
          language: lang,
          safetyLevel: 'none',
          interventionType: 'validate',
          goal: 'SAFE_OPENING',
        },
      });
      assert.equal(response.text, LOCALIZED_NORMAL_TEXT[lang]);
    }
  });

  it('deterministicStubProvider safety dla 6 języków', async () => {
    const provider = createDeterministicStubProvider();
    for (const lang of SUPPORTED_MEDIATOR_LANGS) {
      const response = await provider.generateText({
        systemPrompt: 's',
        developerPrompt: 'd',
        userPrompt: 'u',
        modelHints: { temperature: 0.2, maxOutputTokens: 180, style: 'calm', responseFormat: 'plain_text' },
        metadata: {
          turnNumber: 1,
          language: lang,
          safetyLevel: 'L3_stop',
          interventionType: 'validate',
          goal: 'SAFE_OPENING',
        },
      });
      assert.equal(response.text, LOCALIZED_SAFETY_TEXT[lang]);
      assert.match(response.text, SAFETY_MARKERS[lang]);
    }
  });
});
