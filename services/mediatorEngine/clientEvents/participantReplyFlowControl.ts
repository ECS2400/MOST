import type {
  InterventionHistoryEntry,
  InterventionType,
  RuntimeClientEvent,
  RuntimeFlowControlState,
  SessionMemory,
} from '@/types/mediator';
import type {
  RuntimeSession,
  RuntimeSessionDecision,
  RuntimeSessionPending,
} from '@/types/mediator/runtimeSession';

export interface ParticipantRepliesState {
  hostReplied: boolean;
  partnerReplied: boolean;
  questionTurn: number | null;
}

export const QUESTION_REPLY_INTERVENTION_TYPES: ReadonlySet<InterventionType> = new Set([
  'welcome_open',
  'choice_emotion',
  'choice_need',
  'open_deepen',
  'invite_reflection',
  'gentle_redirect_evasion',
  'remind_goal',
  'recover_acknowledge',
  'validate',
  'reflect',
  'mirror',
  'reframe',
  'redirect_blame',
]);

export function createDefaultParticipantReplies(): ParticipantRepliesState {
  return {
    hostReplied: false,
    partnerReplied: false,
    questionTurn: null,
  };
}

export function normalizeParticipantReplies(value: unknown): ParticipantRepliesState {
  if (!value || typeof value !== 'object') {
    return createDefaultParticipantReplies();
  }

  const raw = value as Partial<ParticipantRepliesState>;
  return {
    hostReplied: raw.hostReplied === true,
    partnerReplied: raw.partnerReplied === true,
    questionTurn:
      typeof raw.questionTurn === 'number' && Number.isFinite(raw.questionTurn)
        ? raw.questionTurn
        : null,
  };
}

export function shouldResetParticipantRepliesForIntervention(
  interventionType: InterventionType
): boolean {
  return QUESTION_REPLY_INTERVENTION_TYPES.has(interventionType);
}

export function resetParticipantRepliesForQuestion(turnNumber: number): ParticipantRepliesState {
  return {
    hostReplied: false,
    partnerReplied: false,
    questionTurn: turnNumber,
  };
}

export function bothParticipantRepliesSatisfied(
  replies: ParticipantRepliesState | null | undefined
): boolean {
  if (!replies || replies.questionTurn == null) {
    return false;
  }
  return replies.hostReplied && replies.partnerReplied;
}

export function resolveEventQuestionTurn(event: RuntimeClientEvent): number | null {
  const raw = event.metadata?.questionTurn;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  return null;
}

export function inferQuestionTurnFromHistory(sessionMemory: SessionMemory): number | null {
  const history = sessionMemory.interventionHistory;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (QUESTION_REPLY_INTERVENTION_TYPES.has(entry.type)) {
      return entry.turnNumber;
    }
  }
  return null;
}

export function resolveActiveQuestionTurn(
  flowControl: RuntimeFlowControlState,
  sessionMemory: SessionMemory
): number | null {
  if (flowControl.participantReplies.questionTurn != null) {
    return flowControl.participantReplies.questionTurn;
  }
  return inferQuestionTurnFromHistory(sessionMemory);
}

export function participantReplyEventFingerprint(
  event: RuntimeClientEvent,
  questionTurn: number | null
): string {
  if (event.kind === 'host_message' || event.kind === 'partner_message') {
    return `${event.kind}|${event.actor}|${questionTurn ?? 'none'}`;
  }
  return `${event.kind}|${event.actor}|${event.at}`;
}

export function applyParticipantReplyEvent(
  flowControl: RuntimeFlowControlState,
  event: RuntimeClientEvent,
  sessionMemory: SessionMemory
): { flowControl: RuntimeFlowControlState; changed: boolean } {
  const activeQuestionTurn = resolveActiveQuestionTurn(flowControl, sessionMemory);
  const eventQuestionTurn = resolveEventQuestionTurn(event);

  if (activeQuestionTurn == null && eventQuestionTurn == null) {
    return { flowControl, changed: false };
  }

  const questionTurn = eventQuestionTurn ?? activeQuestionTurn;
  if (questionTurn == null) {
    return { flowControl, changed: false };
  }

  if (activeQuestionTurn != null && questionTurn !== activeQuestionTurn) {
    return { flowControl, changed: false };
  }

  const replies = normalizeParticipantReplies({
    ...flowControl.participantReplies,
    questionTurn,
  });

  if (event.kind === 'host_message') {
    if (event.actor !== 'host' || replies.hostReplied) {
      return { flowControl, changed: false };
    }
    return {
      flowControl: {
        ...flowControl,
        participantReplies: {
          ...replies,
          hostReplied: true,
        },
      },
      changed: true,
    };
  }

  if (event.kind === 'partner_message') {
    if (event.actor !== 'partner' || replies.partnerReplied) {
      return { flowControl, changed: false };
    }
    return {
      flowControl: {
        ...flowControl,
        participantReplies: {
          ...replies,
          partnerReplied: true,
        },
      },
      changed: true,
    };
  }

  return { flowControl, changed: false };
}

export function composePendingWhenBothRepliesSatisfied(): RuntimeSessionPending {
  return {
    awaiting: 'nothing',
    awaitingFrom: [],
    satisfiedBy: [],
  };
}

export function composeDecisionWhenBothRepliesSatisfied(): RuntimeSessionDecision {
  return {
    nextBeat: 'deliver_question',
    mayAutoAdvance: true,
    blockedReason: null,
    triggerHint: 'host_generate',
  };
}

export function patchRuntimeSessionAfterBothReplies(
  runtimeSession: RuntimeSession
): RuntimeSession {
  return {
    ...runtimeSession,
    decision: composeDecisionWhenBothRepliesSatisfied(),
    pending: composePendingWhenBothRepliesSatisfied(),
  };
}

export function syncParticipantRepliesAfterQuestionTurn(
  flowControl: RuntimeFlowControlState,
  interventionType: InterventionType,
  turnNumber: number
): RuntimeFlowControlState {
  if (!shouldResetParticipantRepliesForIntervention(interventionType)) {
    return flowControl;
  }

  return {
    ...flowControl,
    participantReplies: resetParticipantRepliesForQuestion(turnNumber),
  };
}

export interface DerivedParticipantReplyInput {
  hostReplied: boolean;
  partnerReplied: boolean;
  questionTurn: number | null;
}

/** Applies message-derived reply flags into flow control (idempotent). */
export function applyDerivedParticipantRepliesToFlowControl(
  flowControl: RuntimeFlowControlState,
  sessionMemory: SessionMemory,
  derived: DerivedParticipantReplyInput
): { flowControl: RuntimeFlowControlState; changed: boolean } {
  const activeTurn =
    derived.questionTurn ?? resolveActiveQuestionTurn(flowControl, sessionMemory);
  if (activeTurn == null) {
    return { flowControl, changed: false };
  }

  if (derived.questionTurn != null && derived.questionTurn !== activeTurn) {
    return { flowControl, changed: false };
  }

  const next = normalizeParticipantReplies({
    hostReplied: derived.hostReplied,
    partnerReplied: derived.partnerReplied,
    questionTurn: activeTurn,
  });

  const current = normalizeParticipantReplies({
    ...flowControl.participantReplies,
    questionTurn: activeTurn,
  });

  if (
    current.hostReplied === next.hostReplied &&
    current.partnerReplied === next.partnerReplied &&
    current.questionTurn === next.questionTurn
  ) {
    return { flowControl, changed: false };
  }

  return {
    flowControl: {
      ...flowControl,
      participantReplies: next,
    },
    changed: true,
  };
}
