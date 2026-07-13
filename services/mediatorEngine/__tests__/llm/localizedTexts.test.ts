/**
 * LLM — 6-language localized texts tests (Phase 2D-fix).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';
import { createDeterministicStubProvider, EXPLORATION_STUB_TEXT } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import {
  LOCALIZED_NORMAL_TEXT,
  LOCALIZED_SAFETY_TEXT,
  SUPPORTED_MEDIATOR_LANGS,
} from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import type { MediatorLang } from '@/types/mediator';

const SAFETY_MARKERS: Record<MediatorLang, RegExp> = {
  pl: /pauz|przekórki|zatrzyma/i,
  en: /pause|step back|regret/i,
  es: /detener|pausa|seguridad|razón/i,
  it: /fermare|pausa|sicurezza|ragione/i,
  de: /anhalten|pause|sicherheit|recht/i,
  fr: /pause|mettre|raison/i,
};

const FORBIDDEN_THERAPEUTIC_MARKERS = /\b(I hear|Słyszę|Rozumiem|To naturalne|Ważne jest)\b/i;

describe('LLM — 6-language localized texts', () => {
  it('createFallbackMediatorReply normal dla 6 języków', () => {
    for (const lang of SUPPORTED_MEDIATOR_LANGS) {
      const draft = createFallbackMediatorReply(lang, 'none', 1);
      assert.equal(draft.language, lang);
      assert.equal(draft.text, LOCALIZED_NORMAL_TEXT[lang]);
      assert.ok(draft.text.length > 0);
      assert.equal(FORBIDDEN_THERAPEUTIC_MARKERS.test(draft.text), false);
    }
  });

  it('createFallbackMediatorReply safety dla 6 języków', () => {
    for (const lang of SUPPORTED_MEDIATOR_LANGS) {
      const draft = createFallbackMediatorReply(lang, 'L3_stop', 1);
      assert.equal(draft.text, LOCALIZED_SAFETY_TEXT[lang]);
      assert.match(draft.text, SAFETY_MARKERS[lang]);
      assert.equal(FORBIDDEN_THERAPEUTIC_MARKERS.test(draft.text), false);
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
      assert.equal(response.text, EXPLORATION_STUB_TEXT[lang]);
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
