import type {
  ComplianceResultSummary,
  ExpectedEffect,
  InterventionType,
  MediationState,
  ReflectionInput,
  ReflectionOutput,
  SafetyLevel,
  TranscriptMessage,
  TurnNumber,
} from '@/types/mediator';
import { createEmptyMediationState } from '@/services/mediatorEngine/_internal/skeletonDefaults';

/** Structural transcript metadata — no message content stored. */
export interface ReflectionTranscriptMetadata {
  turnNumber: TurnNumber;
  messageCount: number;
  emptyMessageCount: number;
  nonEmptyMessageCount: number;
  hasHostMessage: boolean;
  hasPartnerMessage: boolean;
  messageIds: string[];
}

/** Normalized, privacy-safe reflection input. */
export interface SafeReflectionContext {
  turnNumber: TurnNumber;
  stateBefore: MediationState;
  stateAfter: MediationState;
  lastInterventionType: InterventionType;
  transcriptMeta: ReflectionTranscriptMetadata;
  turnAdvanced: boolean;
  previousReflection: ReflectionOutput | null;
  lastCompliance: ComplianceResultSummary | null;
  safetyLevel: SafetyLevel;
  recentIneffectiveTypes: InterventionType[];
  expectedEffect: ExpectedEffect | null;
}

function isEmptyMessageContent(content: unknown): boolean {
  return typeof content !== 'string' || content.trim().length === 0;
}

function safeTranscriptDelta(value: unknown): TranscriptMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is TranscriptMessage => !!entry && typeof entry === 'object');
}

function extractTranscriptMetadata(
  transcriptDelta: unknown,
  turnNumber: TurnNumber
): ReflectionTranscriptMetadata {
  const messages = safeTranscriptDelta(transcriptDelta);
  let emptyMessageCount = 0;
  let hasHostMessage = false;
  let hasPartnerMessage = false;
  const messageIds: string[] = [];

  for (const message of messages) {
    if (typeof message.id === 'string' && message.id.length > 0) {
      messageIds.push(message.id);
    }
    if (isEmptyMessageContent(message.content)) {
      emptyMessageCount += 1;
    }
    if (message.authorRole === 'host') hasHostMessage = true;
    if (message.authorRole === 'partner') hasPartnerMessage = true;
  }

  const messageCount = messages.length;
  return {
    turnNumber,
    messageCount,
    emptyMessageCount,
    nonEmptyMessageCount: messageCount - emptyMessageCount,
    hasHostMessage,
    hasPartnerMessage,
    messageIds,
  };
}

function normalizeState(value: unknown): MediationState {
  if (!value || typeof value !== 'object') {
    return createEmptyMediationState({
      mediationId: 'reflection-fallback',
      sessionId: 'reflection-fallback',
      trigger: 'partner_message',
      turnNumber: 1,
      mediationState: null,
      transcriptDelta: [],
      engineVersion: 'v2.3',
    });
  }
  return value as MediationState;
}

function normalizeTurnNumber(input: ReflectionInput): TurnNumber {
  if (typeof input.turnNumber === 'number' && input.turnNumber > 0) {
    return input.turnNumber;
  }
  const afterTurn = input.stateAfter?.meta?.currentTurnNumber;
  if (typeof afterTurn === 'number' && afterTurn > 0) return afterTurn;
  return 1;
}

function normalizeSafetyLevel(input: ReflectionInput, stateAfter: MediationState): SafetyLevel {
  if (input.safetyLevel === 'L1_gentle' || input.safetyLevel === 'L2_pause' || input.safetyLevel === 'L3_stop') {
    return input.safetyLevel;
  }
  if (stateAfter.dynamics?.mode === 'SAFETY') return 'L2_pause';
  return 'none';
}

function normalizeInterventionType(input: ReflectionInput): InterventionType {
  const type = input.lastIntervention?.type;
  if (typeof type === 'string' && type.length > 0) return type as InterventionType;
  return 'welcome_open';
}

function normalizeExpectedEffect(stateAfter: MediationState): ExpectedEffect | null {
  const effect = stateAfter.lastInterventionMeta?.expectedEffect;
  if (!effect || typeof effect !== 'object') return null;
  if (typeof effect.id !== 'string') return null;
  return effect;
}

/** Normalizes reflection input without reading message content beyond empty checks. */
export function safeReflectionInput(input: unknown): SafeReflectionContext {
  const raw = (input && typeof input === 'object' ? input : {}) as ReflectionInput;
  const stateBefore = normalizeState(raw.stateBefore);
  const stateAfter = normalizeState(raw.stateAfter);
  const turnNumber = normalizeTurnNumber(raw);
  const transcriptMeta = extractTranscriptMetadata(raw.transcriptDelta, turnNumber);
  const beforeTurn = typeof stateBefore.meta?.currentTurnNumber === 'number'
    ? stateBefore.meta.currentTurnNumber
    : 0;
  const afterTurn = typeof stateAfter.meta?.currentTurnNumber === 'number'
    ? stateAfter.meta.currentTurnNumber
    : turnNumber;

  return {
    turnNumber,
    stateBefore,
    stateAfter,
    lastInterventionType: normalizeInterventionType(raw),
    transcriptMeta,
    turnAdvanced: afterTurn > beforeTurn,
    previousReflection: raw.previousReflection ?? null,
    lastCompliance: raw.lastComplianceResult ?? null,
    safetyLevel: normalizeSafetyLevel(raw, stateAfter),
    recentIneffectiveTypes: Array.isArray(raw.recentIneffectiveTypes)
      ? raw.recentIneffectiveTypes.filter((t): t is InterventionType => typeof t === 'string')
      : [],
    expectedEffect: normalizeExpectedEffect(stateAfter),
  };
}
