import { isRecord } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

const RUNTIME_SESSION_TOP_LEVEL_KEYS = [
  'decision',
  'session',
  'progress',
  'presentation',
  'proposal',
  'closure',
  'pending',
  'diagnostics',
] as const;

/** Returns the first missing/invalid top-level RuntimeSession section, if any. */
export function identifyRejectedRuntimeSessionShapeField(value: unknown): string | null {
  if (!isRecord(value)) {
    return 'root';
  }

  for (const key of RUNTIME_SESSION_TOP_LEVEL_KEYS) {
    if (!isRecord(value[key])) {
      return key;
    }
  }

  return null;
}

function defaultDiagnostics(): RuntimeSession['diagnostics'] {
  return {
    explainabilityId: null,
    safetyLevel: 'none',
    fallbackUsed: false,
    validationWarnings: [],
  };
}

function defaultProposal(): RuntimeSession['proposal'] {
  return {
    phase: 'none',
    content: null,
    votes: { host: null, partner: null },
    requiresBothAcceptance: true,
  };
}

function defaultClosure(): RuntimeSession['closure'] {
  return {
    directive: 'none',
    suggestedDbStatus: null,
    closureMessage: null,
    navigateToClosure: false,
  };
}

function defaultPending(): RuntimeSession['pending'] {
  return {
    awaiting: 'nothing',
    awaitingFrom: [],
    satisfiedBy: [],
  };
}

function defaultPresentation(): RuntimeSession['presentation'] {
  return {
    deliverables: [],
    primaryDeliverable: 'public_message',
    hideInput: false,
    showDecisionPanel: null,
    hostOnlyGeneration: true,
  };
}

/**
 * Normalizes persisted runtimeSession JSON for backward-compatible reads.
 * Fills missing optional sections introduced after older persisted turns.
 */
export function normalizeStoredRuntimeSession(value: unknown): RuntimeSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const normalized: Record<string, unknown> = { ...value };

  if (!isRecord(normalized.diagnostics)) {
    normalized.diagnostics = defaultDiagnostics();
  }
  if (!isRecord(normalized.proposal)) {
    normalized.proposal = defaultProposal();
  }
  if (!isRecord(normalized.closure)) {
    normalized.closure = defaultClosure();
  }
  if (!isRecord(normalized.pending)) {
    normalized.pending = defaultPending();
  }
  if (!isRecord(normalized.presentation)) {
    normalized.presentation = defaultPresentation();
  }

  const rejected = identifyRejectedRuntimeSessionShapeField(normalized);
  if (rejected) {
    return null;
  }

  return normalized as unknown as RuntimeSession;
}
