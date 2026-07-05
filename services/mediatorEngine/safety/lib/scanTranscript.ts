import type { SafetySignal, TurnNumber } from '@/types/mediator';
import { matchSafetyPattern } from '@/services/mediatorEngine/safety/lib/matchPattern';
import type { ScannableMessage } from '@/services/mediatorEngine/safety/lib/safeSafetyInput';
import { ALL_SAFETY_PATTERNS } from '@/services/mediatorEngine/safety/rules/index';

function buildEvidenceRef(patternId: string, messageId: string | null): string {
  return `${patternId}:${messageId ?? 'state'}`;
}

function createSignal(
  match: ReturnType<typeof matchSafetyPattern>,
  messageId: string | null,
  turnNumber: TurnNumber,
  detectedAt: string
): SafetySignal | null {
  if (!match) return null;
  const { pattern, detectionLayer } = match;
  return {
    category: pattern.category,
    confidence: pattern.confidence,
    matchedPatternId: pattern.id,
    messageId,
    evidenceRef: buildEvidenceRef(pattern.id, messageId),
    detectedAt,
    turnNumber,
    detectionLayer,
  };
}

/** Scans transcript messages for safety patterns — content is not stored in signals. */
export function scanTranscriptMessages(
  messages: ScannableMessage[],
  defaultTurnNumber: TurnNumber
): SafetySignal[] {
  const detectedAt = new Date().toISOString();
  const signals: SafetySignal[] = [];
  const seen = new Set<string>();

  for (const message of messages) {
    for (const pattern of ALL_SAFETY_PATTERNS) {
      const match = matchSafetyPattern(message.content, pattern);
      if (!match) continue;

      const dedupeKey = `${match.pattern.id}:${message.id}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const signal = createSignal(
        match,
        message.id,
        message.turnNumber ?? defaultTurnNumber,
        detectedAt
      );
      if (signal) signals.push(signal);
    }
  }

  return signals;
}

/** Adds a structural state-based safety signal when conversation mode is SAFETY. */
export function scanStateSafetyMode(
  stateSafetyMode: boolean,
  turnNumber: TurnNumber
): SafetySignal[] {
  if (!stateSafetyMode) return [];

  const detectedAt = new Date().toISOString();
  return [
    {
      category: 'severe_distress',
      confidence: 80,
      matchedPatternId: 'state-safety-mode',
      messageId: null,
      evidenceRef: 'state-safety-mode:state',
      detectedAt,
      turnNumber,
      detectionLayer: 'heuristic',
    },
  ];
}
