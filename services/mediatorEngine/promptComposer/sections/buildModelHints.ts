import type { ModelHints, SafetyLevel } from '@/types/mediator';
import { PROMPT_LIMITS } from '@/services/mediatorEngine/promptComposer/config/promptLimits';

/** Builds LLM model hints based on safety level. */
export function buildModelHints(safetyLevel: SafetyLevel): ModelHints {
  const isSafetyActive = safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop';

  return {
    temperature: isSafetyActive ? PROMPT_LIMITS.safetyTemperature : PROMPT_LIMITS.defaultTemperature,
    maxOutputTokens: isSafetyActive
      ? PROMPT_LIMITS.safetyMaxOutputTokens
      : PROMPT_LIMITS.defaultMaxOutputTokens,
    style: 'calm',
    responseFormat: 'plain_text',
  };
}
