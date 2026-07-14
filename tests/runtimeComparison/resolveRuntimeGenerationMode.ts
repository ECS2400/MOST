/**
 * Safe runtime generation mode selection (Phase UI-B.3c.7).
 *
 * Runtime confirms legacy {@link MediatorMode} only when intents match on the
 * shared {@link LiveGenerationIntent} axis. The resolved mode is always a real
 * legacy MediatorMode value — never a synthetic runtime-only beat mapping.
 */

import {
  mapRuntimeBeatToMediatorMode,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
import {
  compareRuntimeNextBeat,
  type LiveGenerationIntent,
} from '@/tests/runtimeComparison/compareRuntimeNextBeat';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { MediatorMode } from '@/services/liveMediation';
import type { MediatorBeat } from '@/types/mediator/runtimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type RuntimeGenerationModeSource =
  | 'runtime_confirmed'
  | 'legacy_fallback';

export type RuntimeGenerationModeReason =
  | 'intent_match'
  | 'runtime_unavailable'
  | 'runtime_waiting'
  | 'kind_mismatch'
  | 'runtime_has_no_legacy_mode'
  | 'legacy_unknown'
  | 'runtime_unknown';

export interface ResolveRuntimeGenerationModeParams {
  runtimeSession: RuntimeSession | null | undefined;
  legacyMode: MediatorMode | null;
}

export interface RuntimeGenerationModeResolution {
  mode: MediatorMode | null;
  source: RuntimeGenerationModeSource;
  runtimeBeat: MediatorBeat | null;
  runtimeIntent: LiveGenerationIntent;
  legacyMode: MediatorMode | null;
  legacyIntent: LiveGenerationIntent;
  reason: RuntimeGenerationModeReason;
}

const RUNTIME_ONLY_INTENTS: ReadonlySet<LiveGenerationIntent> = new Set([
  'extension_offer',
  'extension_question',
  'closure',
  'safety',
]);

/** @deprecated Diagnostic only — use resolveRuntimeGenerationFlow for live decisions. */
export function mapRuntimeBeatToLegacyMode(beat: MediatorBeat): MediatorMode | null {
  return mapRuntimeBeatToMediatorMode(beat);
}

function resolveReason(
  comparison: ReturnType<typeof compareRuntimeNextBeat>,
  legacyIntent: LiveGenerationIntent,
  runtimeIntent: LiveGenerationIntent,
  runtimeAvailable: boolean
): RuntimeGenerationModeReason {
  if (!runtimeAvailable) {
    return 'runtime_unavailable';
  }

  if (legacyIntent === 'unknown') {
    return 'legacy_unknown';
  }

  if (runtimeIntent === 'unknown') {
    return 'runtime_unknown';
  }

  if (
    RUNTIME_ONLY_INTENTS.has(runtimeIntent) &&
    comparison.legacyMode === null
  ) {
    return 'runtime_has_no_legacy_mode';
  }

  if (
    RUNTIME_ONLY_INTENTS.has(runtimeIntent) ||
    (comparison.runtimeNextBeat !== null &&
      mapRuntimeBeatToLegacyMode(comparison.runtimeNextBeat) === null &&
      runtimeIntent !== 'await_user_action')
  ) {
    if (!comparison.intentsMatch) {
      return 'runtime_has_no_legacy_mode';
    }
  }

  if (
    comparison.intentsMatch &&
    (runtimeIntent === 'await_user_action' || runtimeIntent === 'safety') &&
    comparison.legacyMode === null
  ) {
    return 'runtime_waiting';
  }

  if (comparison.intentsMatch) {
    return 'intent_match';
  }

  return 'kind_mismatch';
}

/**
 * @deprecated Diagnostic only — use resolveRuntimeGenerationFlow for live decisions.
 *
 * Resolves the MediatorMode to use for host-led generation.
 */
export function resolveRuntimeGenerationMode(
  params: ResolveRuntimeGenerationModeParams
): RuntimeGenerationModeResolution {
  const { runtimeSession, legacyMode } = params;
  const runtimeAvailable = hasRuntimeSession(runtimeSession);
  const comparison = compareRuntimeNextBeat({ runtimeSession, legacyMode });
  const legacyIntent = comparison.legacyIntent;
  const runtimeIntent = comparison.runtimeIntent;
  const runtimeBeat = comparison.runtimeNextBeat;
  const reason = resolveReason(comparison, legacyIntent, runtimeIntent, runtimeAvailable);

  const runtimeConfirmed =
    runtimeAvailable &&
    comparison.intentsMatch &&
    reason !== 'legacy_unknown' &&
    reason !== 'runtime_unknown' &&
    reason !== 'runtime_has_no_legacy_mode' &&
    reason !== 'kind_mismatch';

  return {
    mode: legacyMode,
    source: runtimeConfirmed ? 'runtime_confirmed' : 'legacy_fallback',
    runtimeBeat,
    runtimeIntent,
    legacyMode,
    legacyIntent,
    reason,
  };
}

/** DEV-only log for generation mode resolution source and reason. */
export function logRuntimeGenerationModeResolution(
  resolution: RuntimeGenerationModeResolution
): void {
  if (!__DEV__) return;

  const payload = {
    mode: resolution.mode,
    source: resolution.source,
    reason: resolution.reason,
    legacyMode: resolution.legacyMode,
    legacyIntent: resolution.legacyIntent,
    runtimeBeat: resolution.runtimeBeat,
    runtimeIntent: resolution.runtimeIntent,
  };

  if (resolution.source === 'runtime_confirmed') {
    console.log('[RuntimeSession] generationMode runtime_confirmed', payload);
    return;
  }

  console.warn('[RuntimeSession] generationMode legacy_fallback', payload);
}
