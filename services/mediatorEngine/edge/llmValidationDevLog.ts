import type { ResponseValidationResult } from '@/types/mediator';
import { MEDIATOR_RUNTIME_BUILD_ID } from '@/services/mediatorEngine/edge/mediatorRuntimeBuild';

export interface LlmValidationIssueTrace {
  ruleId: string;
  severity: 'block' | 'warn';
  reason: string;
  schemaPath: string;
  expected: string;
  received: string;
}

function shouldEmitLlmValidationDiagnostics(): boolean {
  if (typeof Deno !== 'undefined') return true;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function redactSensitiveText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[REDACTED_PHONE]');
}

function summarizeParsedJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return { parseError: 'invalid_json_wrapper' };
  }
}

function buildValidationIssues(validation: ResponseValidationResult): LlmValidationIssueTrace[] {
  return (validation.ruleResults ?? [])
    .filter((rule) => !rule.passed)
    .map((rule) => ({
      ruleId: rule.ruleId,
      severity: rule.severity,
      reason: rule.reason,
      schemaPath: `responseValidator.rules.${rule.ruleId}`,
      expected: ruleMetadataExpected(rule.ruleId),
      received: rule.reason,
    }));
}

function ruleMetadataExpected(ruleId: string): string {
  switch (ruleId) {
    case 'max_questions':
      return 'questionCount <= 1';
    case 'max_sentences':
      return 'sentenceCount <= 4';
    case 'max_length':
      return 'lengthChars <= 900';
    case 'draft_validation_flag':
      return 'draftReply.validation.valid === true';
    case 'therapeutic_flow':
      return 'no generic/solution-seeking phrases during SAFE_OPENING';
    case 'language_lite':
      return 'reply language matches session language';
    case 'forbidden_terms':
      return 'no forbidden technical terms';
    case 'no_technical_leakage':
      return 'no internal pipeline identifiers';
    case 'repeated_intervention':
      return 'no repeated intervention vs recent mediator messages';
    case 'non_empty_reply':
      return 'non-empty trimmed text';
    case 'safety_compliance':
      return 'safety-level compliant phrasing';
    default:
      return 'rule-specific constraint';
  }
}

export function logLlmRawResponse(params: {
  mediationId?: string;
  engineVersion?: string;
  model?: string | null;
  rawText: string;
  sanitizedText?: string;
  trigger?: string;
  turnNumber?: number;
  attemptNumber?: number;
  draftValidationReasons?: string[];
  draftValidationRejected?: boolean;
}): void {
  if (!shouldEmitLlmValidationDiagnostics()) return;

  const rawText = redactSensitiveText(params.rawText ?? '');
  console.info('[LLM_RAW_RESPONSE]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    mediationId: params.mediationId ?? null,
    engineVersion: params.engineVersion ?? 'v2.3',
    model: params.model ?? null,
    trigger: params.trigger ?? null,
    turnNumber: params.turnNumber ?? null,
    attemptNumber: params.attemptNumber ?? null,
    rawText: rawText.slice(0, 1200),
    sanitizedText: params.sanitizedText
      ? redactSensitiveText(params.sanitizedText).slice(0, 1200)
      : null,
    parsedJson: summarizeParsedJson(rawText),
    draftValidationRejected: params.draftValidationRejected ?? false,
    draftValidationReasons: params.draftValidationReasons ?? [],
  });
}

export function logLlmValidationFailed(params: {
  mediationId?: string;
  engineVersion?: string;
  model?: string | null;
  rawText?: string;
  sanitizedText?: string;
  originalProviderText?: string | null;
  effectiveValidatedText?: string | null;
  draftValidationReasons?: string[];
  fallbackSubstituted?: boolean;
  parsedJson?: unknown;
  validation: ResponseValidationResult;
  trigger?: string;
  turnNumber?: number;
  attemptNumber?: number;
  providerSucceeded?: boolean;
  finalSource?: string;
  retryInstruction?: string | null;
}): void {
  if (!shouldEmitLlmValidationDiagnostics()) return;

  const originalProviderText = redactSensitiveText(params.originalProviderText ?? params.rawText ?? '');
  const effectiveValidatedText = redactSensitiveText(
    params.effectiveValidatedText ?? params.sanitizedText ?? params.rawText ?? ''
  );
  const validationIssues = buildValidationIssues(params.validation);

  console.error('[LLM_VALIDATION_FAILED]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    mediationId: params.mediationId ?? null,
    engineVersion: params.engineVersion ?? 'v2.3',
    model: params.model ?? null,
    trigger: params.trigger ?? null,
    turnNumber: params.turnNumber ?? null,
    attemptNumber: params.attemptNumber ?? null,
    providerSucceeded: params.providerSucceeded ?? null,
    finalSource: params.finalSource ?? null,
    originalProviderText: originalProviderText.slice(0, 1200),
    effectiveValidatedText: effectiveValidatedText.slice(0, 1200),
    draftValidationReasons: params.draftValidationReasons ?? [],
    fallbackSubstituted: params.fallbackSubstituted ?? false,
    parsedJson: params.parsedJson ?? summarizeParsedJson(originalProviderText),
    validationIssues,
    blockingReasons: params.validation.blockingReasons,
    validationAction: params.validation.action,
    retryInstruction: params.retryInstruction ? params.retryInstruction.slice(0, 1200) : null,
  });
}
