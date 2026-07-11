import type {
  MediationState,
  ParticipantRole,
  RuntimeClientEvent,
  RuntimeClientEventKind,
  RuntimeFlowControlProposalVote,
  SessionMemory,
  RuntimeFlowControlState,
} from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import {
  isAwaitingResolutionDecision,
  isProposalPresentedForEvents,
} from '@/services/mediatorEngine/clientEvents/proposalFlowHelpers';

const INTERPRETED_EVENT_KINDS: ReadonlySet<RuntimeClientEventKind> = new Set([
  'continue_session',
  'start_extension',
  'proposal_accepted',
  'proposal_rejected',
  'resolve_session',
]);

export interface ApplyRuntimeClientEventsInput {
  mediationState: MediationState;
  sessionMemory: SessionMemory;
  clientEvents: RuntimeClientEvent[];
}

export interface ApplyRuntimeClientEventsResult {
  mediationState: MediationState;
  sessionMemory: SessionMemory;
  appliedEvents: RuntimeClientEvent[];
  ignoredEvents: RuntimeClientEvent[];
}

export function createDefaultRuntimeFlowControl(): RuntimeFlowControlState {
  return {
    extensionActive: false,
    continueAfterSummaryAcknowledged: false,
    continueAfterExtensionAcknowledged: false,
    appliedClientEventFingerprints: [],
    proposalVotes: {
      host: 'pending',
      partner: 'pending',
    },
    proposalPhase: 'none',
    sessionResolvedByEvent: false,
  };
}

export function clientEventFingerprint(event: RuntimeClientEvent): string {
  return `${event.kind}|${event.actor}|${event.at}`;
}

/** Opaque digest stored in session memory — no raw event payload in persistence. */
export function clientEventFingerprintDigest(event: RuntimeClientEvent): string {
  const raw = clientEventFingerprint(event);
  let hash = 2166136261;

  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function ensureFlowControl(memory: SessionMemory): RuntimeFlowControlState {
  return memory.runtimeFlowControl ?? createDefaultRuntimeFlowControl();
}

function countPersistedClosureSummaries(sessionMemory: SessionMemory): number {
  return sessionMemory.interventionHistory.filter(
    (entry) => entry.type === 'summarize_close' && entry.goal === 'CLOSURE'
  ).length;
}

type ContinueContext = 'after_summary' | 'after_extension';

function inferContinueContext(
  sessionMemory: SessionMemory,
  mediationState: MediationState
): ContinueContext | null {
  const flowControl = ensureFlowControl(sessionMemory);
  const closureSummaryCount = countPersistedClosureSummaries(sessionMemory);

  if (
    !flowControl.continueAfterSummaryAcknowledged &&
    closureSummaryCount >= 1 &&
    mediationState.currentGoal === 'CLOSURE'
  ) {
    return 'after_summary';
  }

  if (!flowControl.continueAfterExtensionAcknowledged && closureSummaryCount >= 2) {
    return 'after_extension';
  }

  return null;
}

function touchMediationState(
  mediationState: MediationState,
  at: string
): MediationState {
  return {
    ...mediationState,
    sessionOutcome: 'in_progress',
    meta: {
      ...mediationState.meta,
      lastUpdatedAt: at,
    },
  };
}

function resolveMediationState(
  mediationState: MediationState,
  at: string
): MediationState {
  return {
    ...mediationState,
    sessionOutcome: 'resolved',
    meta: {
      ...mediationState.meta,
      lastUpdatedAt: at,
    },
  };
}

function applyContinueSession(
  mediationState: MediationState,
  sessionMemory: SessionMemory,
  event: RuntimeClientEvent
): { mediationState: MediationState; sessionMemory: SessionMemory; changed: boolean } {
  const context = inferContinueContext(sessionMemory, mediationState);
  const flowControl = { ...ensureFlowControl(sessionMemory) };

  if (context === 'after_summary') {
    flowControl.continueAfterSummaryAcknowledged = true;
    return {
      mediationState: touchMediationState(mediationState, event.at),
      sessionMemory: { ...sessionMemory, runtimeFlowControl: flowControl },
      changed: true,
    };
  }

  if (context === 'after_extension') {
    flowControl.continueAfterExtensionAcknowledged = true;
    return {
      mediationState: touchMediationState(mediationState, event.at),
      sessionMemory: { ...sessionMemory, runtimeFlowControl: flowControl },
      changed: true,
    };
  }

  return { mediationState, sessionMemory, changed: false };
}

function applyStartExtension(
  mediationState: MediationState,
  sessionMemory: SessionMemory,
  event: RuntimeClientEvent
): { mediationState: MediationState; sessionMemory: SessionMemory; changed: boolean } {
  const flowControl = { ...ensureFlowControl(sessionMemory) };

  if (flowControl.extensionActive) {
    return { mediationState, sessionMemory, changed: false };
  }

  flowControl.extensionActive = true;
  flowControl.continueAfterSummaryAcknowledged = true;

  return {
    mediationState: touchMediationState(mediationState, event.at),
    sessionMemory: { ...sessionMemory, runtimeFlowControl: flowControl },
    changed: true,
  };
}

function bothVotesAccepted(
  votes: RuntimeFlowControlState['proposalVotes']
): boolean {
  return votes.host === 'accepted' && votes.partner === 'accepted';
}

function setActorProposalVote(
  votes: RuntimeFlowControlState['proposalVotes'],
  actor: ParticipantRole,
  vote: RuntimeFlowControlProposalVote
): RuntimeFlowControlState['proposalVotes'] {
  if (actor === 'host') {
    return { ...votes, host: vote };
  }
  return { ...votes, partner: vote };
}

function applyProposalAccepted(
  mediationState: MediationState,
  sessionMemory: SessionMemory,
  event: RuntimeClientEvent
): { mediationState: MediationState; sessionMemory: SessionMemory; changed: boolean } {
  if (!isProposalPresentedForEvents(mediationState, sessionMemory)) {
    return { mediationState, sessionMemory, changed: false };
  }

  const flowControl = { ...ensureFlowControl(sessionMemory) };

  if (flowControl.proposalPhase === 'rejected') {
    return { mediationState, sessionMemory, changed: false };
  }

  const actorVote =
    event.actor === 'host' ? flowControl.proposalVotes.host : flowControl.proposalVotes.partner;

  if (actorVote === 'accepted') {
    return { mediationState, sessionMemory, changed: false };
  }

  if (actorVote === 'rejected') {
    return { mediationState, sessionMemory, changed: false };
  }

  flowControl.proposalVotes = setActorProposalVote(flowControl.proposalVotes, event.actor, 'accepted');
  flowControl.proposalPhase = 'presented';

  if (bothVotesAccepted(flowControl.proposalVotes)) {
    flowControl.proposalPhase = 'accepted';
    flowControl.sessionResolvedByEvent = true;

    return {
      mediationState: resolveMediationState(
        {
          ...mediationState,
          agreements: {
            ...mediationState.agreements,
            acceptedByBoth: true,
          },
        },
        event.at
      ),
      sessionMemory: { ...sessionMemory, runtimeFlowControl: flowControl },
      changed: true,
    };
  }

  return {
    mediationState: touchMediationState(mediationState, event.at),
    sessionMemory: { ...sessionMemory, runtimeFlowControl: flowControl },
    changed: true,
  };
}

function applyProposalRejected(
  mediationState: MediationState,
  sessionMemory: SessionMemory,
  event: RuntimeClientEvent
): { mediationState: MediationState; sessionMemory: SessionMemory; changed: boolean } {
  if (!isProposalPresentedForEvents(mediationState, sessionMemory)) {
    return { mediationState, sessionMemory, changed: false };
  }

  const flowControl = { ...ensureFlowControl(sessionMemory) };

  if (flowControl.proposalPhase === 'rejected') {
    return { mediationState, sessionMemory, changed: false };
  }

  const actorVote =
    event.actor === 'host' ? flowControl.proposalVotes.host : flowControl.proposalVotes.partner;

  if (actorVote === 'rejected') {
    return { mediationState, sessionMemory, changed: false };
  }

  flowControl.proposalVotes = setActorProposalVote(flowControl.proposalVotes, event.actor, 'rejected');
  flowControl.proposalPhase = 'rejected';

  return {
    mediationState: touchMediationState(
      {
        ...mediationState,
        agreements: {
          ...mediationState.agreements,
          acceptedByBoth: false,
        },
      },
      event.at
    ),
    sessionMemory: { ...sessionMemory, runtimeFlowControl: flowControl },
    changed: true,
  };
}

function applyResolveSession(
  mediationState: MediationState,
  sessionMemory: SessionMemory,
  event: RuntimeClientEvent
): { mediationState: MediationState; sessionMemory: SessionMemory; changed: boolean } {
  if (!isAwaitingResolutionDecision(mediationState, sessionMemory)) {
    return { mediationState, sessionMemory, changed: false };
  }

  const flowControl = { ...ensureFlowControl(sessionMemory) };
  const closureSummaryCount = countPersistedClosureSummaries(sessionMemory);

  if (flowControl.sessionResolvedByEvent) {
    return { mediationState, sessionMemory, changed: false };
  }

  flowControl.sessionResolvedByEvent = true;

  if (closureSummaryCount >= 1) {
    flowControl.continueAfterSummaryAcknowledged = true;
  }
  if (closureSummaryCount >= 2) {
    flowControl.continueAfterExtensionAcknowledged = true;
  }

  return {
    mediationState: resolveMediationState(mediationState, event.at),
    sessionMemory: { ...sessionMemory, runtimeFlowControl: flowControl },
    changed: true,
  };
}

function normalizeProposalVote(value: unknown): RuntimeFlowControlProposalVote {
  if (value === 'accepted' || value === 'rejected') {
    return value;
  }
  return 'pending';
}

function normalizeProposalPhase(value: unknown): RuntimeFlowControlState['proposalPhase'] {
  if (
    value === 'none' ||
    value === 'preparing' ||
    value === 'presented' ||
    value === 'accepted' ||
    value === 'rejected' ||
    value === 'superseded'
  ) {
    return value;
  }
  return 'none';
}

/**
 * Applies supported runtime client events to engine state before orchestration.
 * Unsupported kinds are ignored. Duplicate fingerprints are idempotent.
 */
export function applyRuntimeClientEvents(
  input: ApplyRuntimeClientEventsInput
): ApplyRuntimeClientEventsResult {
  const appliedEvents: RuntimeClientEvent[] = [];
  const ignoredEvents: RuntimeClientEvent[] = [];

  let mediationState = input.mediationState;
  let sessionMemory = {
    ...input.sessionMemory,
    runtimeFlowControl: ensureFlowControl(input.sessionMemory),
  };

  if (!input.clientEvents.length) {
    return { mediationState, sessionMemory, appliedEvents, ignoredEvents };
  }

  for (const event of input.clientEvents) {
    const fingerprint = clientEventFingerprintDigest(event);
    const flowControl = ensureFlowControl(sessionMemory);

    if (flowControl.appliedClientEventFingerprints.includes(fingerprint)) {
      ignoredEvents.push(event);
      continue;
    }

    if (!INTERPRETED_EVENT_KINDS.has(event.kind)) {
      ignoredEvents.push(event);
      continue;
    }

    let changed = false;

    if (event.kind === 'continue_session') {
      const result = applyContinueSession(mediationState, sessionMemory, event);
      mediationState = result.mediationState;
      sessionMemory = result.sessionMemory;
      changed = result.changed;
    } else if (event.kind === 'start_extension') {
      const result = applyStartExtension(mediationState, sessionMemory, event);
      mediationState = result.mediationState;
      sessionMemory = result.sessionMemory;
      changed = result.changed;
    } else if (event.kind === 'proposal_accepted') {
      const result = applyProposalAccepted(mediationState, sessionMemory, event);
      mediationState = result.mediationState;
      sessionMemory = result.sessionMemory;
      changed = result.changed;
    } else if (event.kind === 'proposal_rejected') {
      const result = applyProposalRejected(mediationState, sessionMemory, event);
      mediationState = result.mediationState;
      sessionMemory = result.sessionMemory;
      changed = result.changed;
    } else if (event.kind === 'resolve_session') {
      const result = applyResolveSession(mediationState, sessionMemory, event);
      mediationState = result.mediationState;
      sessionMemory = result.sessionMemory;
      changed = result.changed;
    }

    if (!changed) {
      ignoredEvents.push(event);
      continue;
    }

    sessionMemory = {
      ...sessionMemory,
      runtimeFlowControl: {
        ...ensureFlowControl(sessionMemory),
        appliedClientEventFingerprints: [
          ...ensureFlowControl(sessionMemory).appliedClientEventFingerprints,
          fingerprint,
        ],
      },
    };
    appliedEvents.push(event);
  }

  return { mediationState, sessionMemory, appliedEvents, ignoredEvents };
}

/** Normalizes session memory and guarantees runtimeFlowControl defaults. */
export function normalizeRuntimeFlowControl(
  memory: Partial<SessionMemory> | null | undefined
): SessionMemory {
  const base = memory && typeof memory === 'object' ? memory : createEmptySessionMemory();
  const raw = base.runtimeFlowControl;
  const rawVotes = raw?.proposalVotes;
  const flowControl: RuntimeFlowControlState = {
    extensionActive: raw?.extensionActive === true,
    continueAfterSummaryAcknowledged: raw?.continueAfterSummaryAcknowledged === true,
    continueAfterExtensionAcknowledged: raw?.continueAfterExtensionAcknowledged === true,
    appliedClientEventFingerprints: Array.isArray(raw?.appliedClientEventFingerprints)
      ? raw.appliedClientEventFingerprints.filter((entry): entry is string => typeof entry === 'string')
      : [],
    proposalVotes: {
      host: normalizeProposalVote(rawVotes?.host),
      partner: normalizeProposalVote(rawVotes?.partner),
    },
    proposalPhase: normalizeProposalPhase(raw?.proposalPhase),
    sessionResolvedByEvent: raw?.sessionResolvedByEvent === true,
  };

  return {
    ...base,
    runtimeFlowControl: flowControl,
  } as SessionMemory;
}
