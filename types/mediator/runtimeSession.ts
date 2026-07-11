/**
 * Runtime-driven live mediation flow contract (Phase UI-B.3b).
 *
 * Role: UI projection types for mediator-runtime v2.3. The `runtimeSession`
 * section is the sole source of flow truth for live UI after migration.
 * Types only — no runtime composition logic in this phase.
 */

import type {
  InterventionTarget,
  IsoTimestamp,
  ParticipantRole,
  ProgressPercent,
  TurnNumber,
} from './common';
import type { OrchestrateTurnTrigger } from './pipeline';
import type { SafetyLevel, TherapeuticStrategy } from './engineTypes';
import type { TherapeuticGoal } from './therapeuticGoal';

/** Next mediator action the runtime intends after the current turn. */
export type MediatorBeat =
  | 'deliver_opening'
  | 'deliver_question'
  | 'deliver_answer_ack'
  | 'deliver_mid_summary'
  | 'deliver_final_summary'
  | 'offer_extension'
  | 'deliver_extension_questions'
  | 'deliver_extension_summary'
  | 'present_proposal'
  | 'await_user_action'
  | 'deliver_closure'
  | 'safety_intervention';

/** Why automatic host-led advance is blocked when {@link RuntimeSessionDecision.mayAutoAdvance} is false. */
export type MediatorBlockReason =
  | 'awaiting_host_reply'
  | 'awaiting_partner_reply'
  | 'awaiting_both_replies'
  | 'awaiting_continue_decision'
  | 'awaiting_extension_decision'
  | 'awaiting_proposal_decision'
  | 'session_finished'
  | 'safety_hold'
  | 'generation_in_flight';

/** Therapeutic macro-stage of a live session (goal-driven, not question-count driven). */
export type RuntimeSessionStage =
  | 'intake'
  | 'story_collection'
  | 'understanding'
  | 'needs_and_impact'
  | 'repair'
  | 'agreement_building'
  | 'extension'
  | 'proposal'
  | 'closing'
  | 'safety_hold';

/**
 * Flow-level session outcome for live UI.
 *
 * Distinct from {@link SessionOutcome} on {@link MediationState} — this models
 * UI routing (panels, closure, extension) rather than engine persistence only.
 */
export type RuntimeSessionOutcome =
  | 'ongoing'
  | 'needs_extension_offer'
  | 'extension_active'
  | 'proposal_pending'
  | 'resolved'
  | 'closed_without_agreement'
  | 'safety_stopped'
  | 'paused';

/** Mediation row status suggested by runtime when closing or pausing. */
export type RuntimeMediationDbStatus = 'live' | 'pending_agreements' | 'resolved';

/** Proposal lifecycle phase for live UI. */
export type RuntimeProposalPhase =
  | 'none'
  | 'preparing'
  | 'presented'
  | 'accepted'
  | 'rejected'
  | 'superseded';

/** Closure directive for live UI navigation and DB updates. */
export type RuntimeClosureDirective =
  | 'none'
  | 'offer_manual_close'
  | 'close_on_accept'
  | 'close_without_agreement'
  | 'safety_close';

/** What the runtime is waiting for from participants. */
export type RuntimePendingUserAction =
  | 'nothing'
  | 'host_reply'
  | 'partner_reply'
  | 'both_replies'
  | 'continue_decision'
  | 'extension_decision'
  | 'proposal_decision'
  | 'safety_acknowledgment';

/** Deliverable kinds mapped to live chat message types. */
export type RuntimeUiDeliverableKind =
  | 'public_message'
  | 'question'
  | 'private_hint_host'
  | 'private_hint_partner'
  | 'summary'
  | 'fun_fact'
  | 'escalation_notice'
  | 'system_notice';

/** Decision panel kinds shown by live UI. */
export type RuntimeDecisionPanelKind =
  | 'continue_after_summary'
  | 'continue_after_extension'
  | 'proposal_accept_reject'
  | 'dispute_resolved_confirm';

/** Options exposed on a decision panel. */
export type RuntimeDecisionPanelOption =
  | 'continue'
  | 'resolve'
  | 'accept'
  | 'reject';

/** Question audience label for live chat rendering. */
export type RuntimeQuestionTarget = 'oboje' | 'ty' | 'partner';

/** Summary variant for live chat metadata. */
export type RuntimeSummaryVariant =
  | 'opening'
  | 'mid'
  | 'final'
  | 'extension'
  | 'proposal'
  | 'closure';

/** Proposal vote state per participant. */
export type RuntimeProposalVote = 'pending' | 'accepted' | 'rejected' | null;

/**
 * Client-originated events sent in the runtime request body.
 *
 * Role: replaces UI-side session/proposal decision messages as flow input.
 */
export type RuntimeClientEventKind =
  | 'host_message'
  | 'partner_message'
  | 'continue_session'
  | 'resolve_session'
  | 'start_extension'
  | 'proposal_accepted'
  | 'proposal_rejected';

/** Single client event appended to a runtime turn request. */
export interface RuntimeClientEvent {
  kind: RuntimeClientEventKind;
  actor: ParticipantRole;
  at: IsoTimestamp;
  metadata?: Record<string, unknown>;
}

/** Runtime decision — what happens next and whether host may auto-advance. */
export interface RuntimeSessionDecision {
  nextBeat: MediatorBeat;
  mayAutoAdvance: boolean;
  blockedReason: MediatorBlockReason | null;
  triggerHint: OrchestrateTurnTrigger | null;
}

/** Participant presence flags for live session. */
export interface RuntimeSessionParticipantPresence {
  hostActive: boolean;
  partnerActive: boolean;
  partnerRequired: boolean;
}

/** Session lifecycle — stage, outcome, goals (not the full runtimeSession root). */
export interface RuntimeSessionLifecycle {
  stage: RuntimeSessionStage;
  outcome: RuntimeSessionOutcome;
  currentGoal: TherapeuticGoal;
  activeStrategy: TherapeuticStrategy | null;
  turnOrdinal: TurnNumber;
  isExtensionActive: boolean;
  participantPresence: RuntimeSessionParticipantPresence;
}

/** Achieved therapeutic milestone within the session. */
export interface RuntimeSessionMilestone {
  id: string;
  achievedAtTurn: TurnNumber;
}

/** Goal-path progress snapshot for UI and diagnostics. */
export interface RuntimeSessionGoalProgress {
  completedGoals: TherapeuticGoal[];
  currentGoal: TherapeuticGoal;
  currentGoalCompletion: ProgressPercent;
  estimatedRemainingGoals: number;
}

/**
 * Estimated mediation completion (0–100).
 *
 * Goal-driven estimate — not a question-count percentage.
 */
export interface RuntimeSessionProgress {
  completionEstimate: ProgressPercent;
  milestone: RuntimeSessionMilestone | null;
  goalProgress: RuntimeSessionGoalProgress;
  labelKey: string;
}

/** One user-facing deliverable from the current runtime turn. */
export interface RuntimeUiDeliverable {
  kind: RuntimeUiDeliverableKind;
  text: string;
  target: InterventionTarget;
  summaryVariant?: RuntimeSummaryVariant;
  questionTarget?: RuntimeQuestionTarget;
  metadata?: Record<string, string | number | boolean>;
}

/** Decision panel specification when UI must collect participant input. */
export interface RuntimeDecisionPanelSpec {
  kind: RuntimeDecisionPanelKind;
  summaryAnchorTurn?: TurnNumber;
  options: RuntimeDecisionPanelOption[];
  copyKey: string;
}

/** Presentation instructions for the live chat layer. */
export interface RuntimeSessionPresentation {
  deliverables: RuntimeUiDeliverable[];
  primaryDeliverable: RuntimeUiDeliverableKind;
  hideInput: boolean;
  showDecisionPanel: RuntimeDecisionPanelSpec | null;
  hostOnlyGeneration: boolean;
}

/** Proposal content when {@link RuntimeProposalPhase} is `presented` or terminal. */
export interface RuntimeProposalContent {
  proposalId: string;
  body: string;
  hostCommitment: string | null;
  partnerCommitment: string | null;
  sharedRule: string | null;
}

/** Per-participant proposal votes. */
export interface RuntimeProposalVotes {
  host: RuntimeProposalVote;
  partner: RuntimeProposalVote;
}

/** Proposal state for live UI panels and closure. */
export interface RuntimeSessionProposal {
  phase: RuntimeProposalPhase;
  content: RuntimeProposalContent | null;
  votes: RuntimeProposalVotes;
  requiresBothAcceptance: boolean;
}

/** Closure routing and DB status hints for live UI. */
export interface RuntimeSessionClosure {
  directive: RuntimeClosureDirective;
  suggestedDbStatus: RuntimeMediationDbStatus | null;
  closureMessage: string | null;
  navigateToClosure: boolean;
}

/** Pending participant action the runtime is waiting for. */
export interface RuntimeSessionPending {
  awaiting: RuntimePendingUserAction;
  awaitingFrom: ParticipantRole[];
  satisfiedBy: RuntimeClientEventKind[];
}

/** Non-flow diagnostics exposed to UI logging and dev tools. */
export interface RuntimeSessionDiagnostics {
  explainabilityId: string | null;
  safetyLevel: SafetyLevel;
  fallbackUsed: boolean;
  validationWarnings: string[];
}

/**
 * Complete runtime-driven flow contract for one turn.
 *
 * Role: returned as `runtimeSession` on mediator-runtime success responses
 * after UI-B.3b implementation. Live UI reads this section only for flow.
 */
export interface RuntimeSession {
  decision: RuntimeSessionDecision;
  session: RuntimeSessionLifecycle;
  progress: RuntimeSessionProgress;
  presentation: RuntimeSessionPresentation;
  proposal: RuntimeSessionProposal;
  closure: RuntimeSessionClosure;
  pending: RuntimeSessionPending;
  diagnostics: RuntimeSessionDiagnostics;
}
