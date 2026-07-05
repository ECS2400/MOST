import type { ExpectedEffect, Intervention } from '@/types/mediator';

/** Safely reads intervention content — never throws on malformed input. */
export function getInterventionContent(
  intervention: Intervention | null | undefined
): { primaryMessage?: string; secondaryMessage?: string } | null {
  if (!intervention || typeof intervention !== 'object') return null;
  const content = (intervention as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return null;
  return content as { primaryMessage?: string; secondaryMessage?: string };
}

/** Safely reads primary message text — empty string when absent. */
export function getPrimaryMessage(intervention: Intervention | null | undefined): string {
  const content = getInterventionContent(intervention);
  const message = content?.primaryMessage;
  return typeof message === 'string' ? message : '';
}

/** Safely reads optional secondary message text. */
export function getSecondaryMessage(
  intervention: Intervention | null | undefined
): string | undefined {
  const content = getInterventionContent(intervention);
  const message = content?.secondaryMessage;
  return typeof message === 'string' ? message : undefined;
}

/** Safely reads expected effect — null when absent or malformed. */
export function getExpectedEffect(
  intervention: Intervention | null | undefined
): ExpectedEffect | null {
  if (!intervention || typeof intervention !== 'object') return null;
  const effect = (intervention as { expectedEffect?: unknown }).expectedEffect;
  if (!effect || typeof effect !== 'object') return null;
  return effect as ExpectedEffect;
}

/** Safely reads intervention signature. */
export function getInterventionSignature(
  intervention: Intervention | null | undefined
): string {
  if (!intervention || typeof intervention !== 'object') return '';
  const signature = (intervention as { signature?: unknown }).signature;
  return typeof signature === 'string' ? signature : '';
}

/** Safely reads doNotRepeatBefore turn guard. */
export function getDoNotRepeatBefore(
  intervention: Intervention | null | undefined
): number | undefined {
  if (!intervention || typeof intervention !== 'object') return undefined;
  const value = (intervention as { doNotRepeatBefore?: unknown }).doNotRepeatBefore;
  return typeof value === 'number' ? value : undefined;
}

/** Safely reads strategy, type, goal, and intent string fields. */
export function getInterventionCoreFields(intervention: Intervention | null | undefined): {
  strategy: string | null;
  type: string | null;
  goal: string | null;
  intent: string | null;
} {
  if (!intervention || typeof intervention !== 'object') {
    return { strategy: null, type: null, goal: null, intent: null };
  }
  const record = intervention as Record<string, unknown>;
  return {
    strategy: typeof record.strategy === 'string' ? record.strategy : null,
    type: typeof record.type === 'string' ? record.type : null,
    goal: typeof record.goal === 'string' ? record.goal : null,
    intent: typeof record.intent === 'string' ? record.intent : null,
  };
}

/** Combines primary and secondary messages with null-safe access. */
export function combineInterventionTextSafe(intervention: Intervention | null | undefined): string {
  return [getPrimaryMessage(intervention), getSecondaryMessage(intervention)].filter(Boolean).join(' ');
}

/** Safely reads observable signals array from expected effect. */
export function getObservableSignals(effect: ExpectedEffect | null): string[] {
  if (!effect || !Array.isArray(effect.observableSignals)) return [];
  return effect.observableSignals.filter((signal): signal is string => typeof signal === 'string');
}
