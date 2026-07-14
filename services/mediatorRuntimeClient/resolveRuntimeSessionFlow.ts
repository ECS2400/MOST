import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import {
  resolveRuntimeActionExecution,
  type RuntimeActionExecutionReason,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';
import type {
  LiveQuestionPhase,
  LiveSessionFlow,
  LiveSessionStage,
} from '@/services/liveMediation.types';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';


const LIVE_QUESTIONS_TARGET = 15;

const RUNTIME_UNAVAILABLE_SESSION_FLOW: LiveSessionFlow = {
  stage: 'questions',
  questionNumber: 0,
  maxQuestions: 0,
  questionPhase: 'opening',
  extensionActive: false,
};
const LIVE_EXTENSION_QUESTIONS = 5;

export interface ResolveRuntimeSessionFlowParams {
  runtimeSession: RuntimeSession | null | undefined;
  runtimeFailed?: boolean;
  invalidRuntimeState?: boolean;
  /** Question count for runtime-only mapping (e.g. from computeLiveTurnState). */
  questionNumberHint?: number;
}

export interface RuntimeSessionFlowResolution {
  flow: LiveSessionFlow;
  source: 'runtime_available' | 'runtime_unavailable';
  reason: RuntimeActionExecutionReason;
}

function deriveExtensionActive(runtimeSession: RuntimeSession): boolean {
  const { session, decision } = runtimeSession;

  return (
    session.isExtensionActive ||
    session.outcome === 'extension_active' ||
    session.stage === 'extension' ||
    decision.nextBeat === 'deliver_extension_questions' ||
    decision.nextBeat === 'deliver_extension_summary'
  );
}

function mapRuntimeQuestionPhase(
  runtimeSession: RuntimeSession,
  extensionActive: boolean
): LiveQuestionPhase {
  if (extensionActive) {
    return 'extension';
  }

  const { session, pending, proposal } = runtimeSession;

  if (
    session.stage === 'closing' ||
    session.stage === 'proposal' ||
    session.outcome === 'needs_extension_offer' ||
    session.outcome === 'proposal_pending' ||
    pending.awaiting === 'continue_decision' ||
    pending.awaiting === 'extension_decision' ||
    pending.awaiting === 'proposal_decision' ||
    proposal.phase === 'presented' ||
    proposal.phase === 'accepted' ||
    proposal.phase === 'rejected'
  ) {
    return 'resolution';
  }

  if (
    session.stage === 'intake' ||
    session.stage === 'story_collection' ||
    session.currentGoal === 'SAFE_OPENING' ||
    session.currentGoal === 'EMOTION_NAMING' ||
    session.currentGoal === 'PERSPECTIVE_SHARING'
  ) {
    if (
      session.currentGoal === 'PERSPECTIVE_SHARING' ||
      session.stage === 'story_collection'
    ) {
      return 'deepening';
    }
    return 'opening';
  }

  return 'deepening';
}

function mapRuntimeStage(runtimeSession: RuntimeSession): LiveSessionStage {
  const { session, pending, proposal, closure, decision } = runtimeSession;

  if (session.stage === 'safety_hold' || session.outcome === 'safety_stopped') {
    return 'finished';
  }

  if (session.outcome === 'resolved' || closure.directive === 'close_on_accept') {
    return 'finished';
  }

  if (
    session.outcome === 'closed_without_agreement' ||
    closure.directive === 'close_without_agreement' ||
    closure.directive === 'safety_close' ||
    proposal.phase === 'rejected'
  ) {
    return 'unresolved_but_closed';
  }

  if (
    session.outcome === 'proposal_pending' ||
    proposal.phase === 'presented' ||
    pending.awaiting === 'proposal_decision' ||
    decision.blockedReason === 'awaiting_proposal_decision'
  ) {
    return 'awaiting_proposal_decision';
  }

  if (proposal.phase === 'accepted') {
    return 'finished';
  }

  if (
    pending.awaiting === 'extension_decision' ||
    decision.blockedReason === 'awaiting_extension_decision'
  ) {
    return 'awaiting_extension_decision';
  }

  if (
    pending.awaiting === 'continue_decision' ||
    decision.blockedReason === 'awaiting_continue_decision' ||
    session.outcome === 'needs_extension_offer' ||
    decision.nextBeat === 'offer_extension'
  ) {
    return 'awaiting_main_decision';
  }

  if (deriveExtensionActive(runtimeSession)) {
    return 'extension';
  }

  if (session.stage === 'closing' && decision.nextBeat === 'deliver_closure') {
    return 'finished';
  }

  return 'questions';
}

function mapRuntimeSessionToLiveSessionFlow(
  runtimeSession: RuntimeSession,
  options: {
    questionNumberHint?: number;
  } = {}
): LiveSessionFlow {
  const extensionActive = deriveExtensionActive(runtimeSession);
  const stage = mapRuntimeStage(runtimeSession);
  const questionPhase = mapRuntimeQuestionPhase(runtimeSession, extensionActive);

  const maxQuestions = extensionActive
    ? LIVE_QUESTIONS_TARGET + LIVE_EXTENSION_QUESTIONS
    : LIVE_QUESTIONS_TARGET;

  const questionNumber = options.questionNumberHint ?? 0;

  return {
    stage,
    questionNumber,
    maxQuestions,
    questionPhase,
    extensionActive,
  };
}

/** Resolves live session flow from runtimeSession only. */
export function resolveRuntimeSessionFlow(
  params: ResolveRuntimeSessionFlowParams
): RuntimeSessionFlowResolution {
  const execution = resolveRuntimeActionExecution({
    runtimeSession: params.runtimeSession,
    runtimeFailed: params.runtimeFailed,
    invalidRuntimeState: params.invalidRuntimeState,
  });

  if (execution.runtimeUnavailable || !hasRuntimeSession(params.runtimeSession)) {
    return {
      flow: RUNTIME_UNAVAILABLE_SESSION_FLOW,
      source: 'runtime_unavailable',
      reason: execution.reason,
    };
  }

  return {
    flow: mapRuntimeSessionToLiveSessionFlow(params.runtimeSession, {
      questionNumberHint: params.questionNumberHint,
    }),
    source: 'runtime_available',
    reason: 'runtime_available',
  };
}

/** Exported for unit tests — maps runtime contract fields to legacy LiveSessionStage. */
export function mapRuntimeSessionStageForTests(
  runtimeSession: RuntimeSession
): LiveSessionStage {
  return mapRuntimeStage(runtimeSession);
}
