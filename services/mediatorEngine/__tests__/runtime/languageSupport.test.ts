/**
 * Runtime — 6-language support tests (Phase 2D-fix).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import { createRuntimeInput, createRuntimeTurnInput } from '@/services/mediatorEngine/__tests__/runtime/fixtures';
import { SUPPORTED_MEDIATOR_LANGS } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';

describe('runMediatorEngineTurn — 6-language support', () => {
  for (const language of SUPPORTED_MEDIATOR_LANGS) {
    it(`language=${language} zwraca finalMediatorMessage.language zgodne z inputem`, async () => {
      const state = createBaselineMediationState({
        meta: { ...createBaselineMediationState().meta, language: 'en' },
      });

      const result = await runMediatorEngineTurn(
        createRuntimeInput({
          language,
          turnInput: createRuntimeTurnInput({ mediationState: state }),
        })
      );

      assert.equal(result.finalMediatorMessage.language, language);
    });

    it(`language=${language} — finalMediatorMessage.text niepusty`, async () => {
      const result = await runMediatorEngineTurn(createRuntimeInput({ language }));
      assert.ok(result.finalMediatorMessage.text.length > 0);
    });
  }

  it('input.language ma pierwszeństwo nad mediationState.meta.language', async () => {
    const state = createBaselineMediationState({
      meta: { ...createBaselineMediationState().meta, language: 'en' },
    });

    const result = await runMediatorEngineTurn(
      createRuntimeInput({
        language: 'fr',
        turnInput: createRuntimeTurnInput({ mediationState: state }),
      })
    );

    assert.equal(result.finalMediatorMessage.language, 'fr');
  });

  it('runtime używa mediationState.meta.language gdy input.language brak', async () => {
    const state = createBaselineMediationState({
      meta: { ...createBaselineMediationState().meta, language: 'de' },
    });

    const result = await runMediatorEngineTurn({
      turnInput: createRuntimeTurnInput({ mediationState: state }),
      sessionMemory: createEmptySessionMemory(),
    });

    assert.equal(result.finalMediatorMessage.language, 'de');
  });
});
