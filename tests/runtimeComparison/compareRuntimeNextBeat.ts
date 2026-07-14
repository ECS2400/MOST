/**
 * Runtime nextBeat vs legacy generate mode comparison (Phase UI-B.3c.6).
 *
 * Diagnostic only — does not drive generation or auto-advance.
 */

import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { MediatorMode } from '@/services/liveMediation';
import type { MediatorBeat } from '@/types/mediator/runtimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type LiveGenerationIntent =
  | 'opening'
  | 'question'
  | 'answer_ack'
  | 'mid_summary'
  | 'final_summary'
  | 'extension_offer'
  | 'extension_question'
  | 'extension_summary'
  | 'proposal'
  | 'closure'
  | 'await_user_action'
  | 'safety'
  | 'unknown';

export type GenerationIntentMismatchReason =
  | 'runtime_unavailable'
  | 'intent_mismatch'
  | 'legacy_blocked_runtime_generates'
  | 'runtime_blocked_legacy_generates';

export interface CompareRuntimeNextBeatParams {
  runtimeSession: RuntimeSession | null | undefined;
  legacyMode: MediatorMode | null;
}

export interface LiveGenerationIntentComparison {
  legacyMode: MediatorMode | null;
  legacyIntent: LiveGenerationIntent;
  runtimeNextBeat: MediatorBeat | null;
  runtimeMayAutoAdvance: boolean | null;
  runtimeTriggerHint: string | null;
  runtimeIntent: LiveGenerationIntent;
  intentsMatch: boolean;
  mismatchReasons: GenerationIntentMismatchReason[];
}

const GENERATING_INTENTS: ReadonlySet<LiveGenerationIntent> = new Set([
  'opening',
  'question',
  'answer_ack',
  'mid_summary',
  'final_summary',
  'extension_offer',
  'extension_question',
  'extension_summary',
  'proposal',
  'closure',
]);

/** Maps legacy {@link MediatorMode} from resolveGenerateMode() to shared intent. */
export function mapLegacyGenerateModeToIntent(
  mode: MediatorMode | null
): LiveGenerationIntent {
  if (mode === null) {
    return 'await_user_action';
  }

  switch (mode) {
    case 'opening_summary':
      return 'opening';
    case 'generate_question':
      return 'question';
    case 'answer_ack':
      return 'answer_ack';
    case 'mid_summary':
      return 'mid_summary';
    case 'final_summary':
      return 'final_summary';
    case 'extension_check':
      return 'extension_summary';
    case 'proposed_solution':
      return 'proposal';
    case 'extension_offer':
      return 'extension_offer';
    case 'extension_question':
      return 'extension_question';
    case 'closure':
      return 'closure';
    case 'safety_intervention':
      return 'safety';
    default:
      return 'unknown';
  }
}

/** Maps runtime {@link MediatorBeat} to shared intent. */
export function mapRuntimeNextBeatToIntent(
  nextBeat: MediatorBeat | null | undefined
): LiveGenerationIntent {
  if (!nextBeat) {
    return 'unknown';
  }

  switch (nextBeat) {
    case 'deliver_opening':
      return 'opening';
    case 'deliver_question':
      return 'question';
    case 'deliver_answer_ack':
      return 'answer_ack';
    case 'deliver_mid_summary':
      return 'mid_summary';
    case 'deliver_final_summary':
      return 'final_summary';
    case 'offer_extension':
      return 'extension_offer';
    case 'deliver_extension_questions':
      return 'extension_question';
    case 'deliver_extension_summary':
      return 'extension_summary';
    case 'present_proposal':
      return 'proposal';
    case 'await_user_action':
      return 'await_user_action';
    case 'deliver_closure':
      return 'closure';
    case 'safety_intervention':
      return 'safety';
    default:
      return 'unknown';
  }
}

function collectMismatchReasons(
  legacyIntent: LiveGenerationIntent,
  runtimeIntent: LiveGenerationIntent,
  runtimeAvailable: boolean
): GenerationIntentMismatchReason[] {
  const reasons: GenerationIntentMismatchReason[] = [];

  if (!runtimeAvailable) {
    reasons.push('runtime_unavailable');
    return reasons;
  }

  if (legacyIntent !== runtimeIntent) {
    reasons.push('intent_mismatch');
  }

  if (
    legacyIntent === 'await_user_action' &&
    GENERATING_INTENTS.has(runtimeIntent)
  ) {
    reasons.push('legacy_blocked_runtime_generates');
  }

  if (
    GENERATING_INTENTS.has(legacyIntent) &&
    (runtimeIntent === 'await_user_action' || runtimeIntent === 'safety')
  ) {
    reasons.push('runtime_blocked_legacy_generates');
  }

  return reasons;
}

/** Compares persisted runtime nextBeat with legacy resolveGenerateMode() output. */
export function compareRuntimeNextBeat(
  params: CompareRuntimeNextBeatParams
): LiveGenerationIntentComparison {
  const { runtimeSession, legacyMode } = params;
  const runtimeAvailable = hasRuntimeSession(runtimeSession);
  const legacyIntent = mapLegacyGenerateModeToIntent(legacyMode);
  const runtimeNextBeat = runtimeAvailable ? runtimeSession!.decision.nextBeat : null;
  const runtimeMayAutoAdvance = runtimeAvailable
    ? runtimeSession!.decision.mayAutoAdvance
    : null;
  const runtimeTriggerHint = runtimeAvailable
    ? runtimeSession!.decision.triggerHint
    : null;
  const runtimeIntent = runtimeAvailable
    ? mapRuntimeNextBeatToIntent(runtimeNextBeat)
    : 'unknown';
  const mismatchReasons = collectMismatchReasons(
    legacyIntent,
    runtimeIntent,
    runtimeAvailable
  );

  return {
    legacyMode,
    legacyIntent,
    runtimeNextBeat,
    runtimeMayAutoAdvance,
    runtimeTriggerHint,
    runtimeIntent,
    intentsMatch: runtimeAvailable && legacyIntent === runtimeIntent,
    mismatchReasons,
  };
}

/** DEV-only structured log when generation intent comparison changes. */
export function logLiveGenerationIntentComparison(
  comparison: LiveGenerationIntentComparison
): void {
  if (!__DEV__) return;

  const payload = {
    legacyMode: comparison.legacyMode,
    legacyIntent: comparison.legacyIntent,
    runtimeNextBeat: comparison.runtimeNextBeat,
    runtimeIntent: comparison.runtimeIntent,
    runtimeMayAutoAdvance: comparison.runtimeMayAutoAdvance,
    runtimeTriggerHint: comparison.runtimeTriggerHint,
    intentsMatch: comparison.intentsMatch,
    mismatchReasons: comparison.mismatchReasons,
  };

  if (comparison.mismatchReasons.length === 0) {
    console.log('[RuntimeSession] generationIntent comparison ok', payload);
    return;
  }

  console.warn('[RuntimeSession] generationIntent comparison mismatch', payload);
}
