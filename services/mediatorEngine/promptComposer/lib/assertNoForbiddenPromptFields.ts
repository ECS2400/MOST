import {
  FORBIDDEN_PROMPT_FIELD_NAMES,
  FORBIDDEN_PROMPT_SUBSTRINGS,
} from '@/services/mediatorEngine/promptComposer/config/allowedPromptFields';

/** Matches JSON object keys only — plain words like "email" in prose are allowed. */
export function forbiddenJsonFieldPattern(fieldName: string): RegExp {
  return new RegExp(`"${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`, 'i');
}

/** Returns true when text contains a forbidden JSON field key (e.g. `"email":`). */
export function containsForbiddenJsonField(text: string, fieldName: string): boolean {
  return forbiddenJsonFieldPattern(fieldName).test(text);
}

/** Asserts composed prompt text does not contain forbidden technical fields. */
export function assertNoForbiddenPromptFields(text: string): void {
  for (const forbidden of FORBIDDEN_PROMPT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`Forbidden prompt content detected: ${forbidden}`);
    }
  }
  for (const field of FORBIDDEN_PROMPT_FIELD_NAMES) {
    if (containsForbiddenJsonField(text, field)) {
      throw new Error(`Forbidden prompt field detected: ${field}`);
    }
  }
}

/** Returns true when text passes forbidden-field checks. */
export function isPromptTextSafe(text: string): boolean {
  try {
    assertNoForbiddenPromptFields(text);
    return true;
  } catch {
    return false;
  }
}
