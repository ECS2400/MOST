/**
 * Core mediation state model for Mediator AI Engine v2.3.
 *
 * Role: replaces legacy ConversationState. Single source of truth persisted
 * in live_messages.metadata (action: conversation_state). All pipeline modules
 * read and write slices of this structure each turn.
 */

import type { SessionOutcome } from './common';
import type {
  ConversationDynamics,
  ConversationMemory,
  EmotionalLoadState,
  PaceState,
} from './dynamics';
import type { GoalState, GoalTransition, SessionObjectives } from './goals';
import type {
  ConflictModel,
  MediationStateMeta,
  ParticipantStates,
} from './participants';
import type { EvidenceStore } from './evidence';
import type {
  ActiveStrategyState,
  LastInterventionMeta,
  RecoveryState,
  SessionPersonality,
} from './strategies';
import type { TherapeuticGoal } from './therapeuticGoal';
import type { MediatorActionType } from './participants';
import type { InterventionTarget } from './common';

/** Pending user-facing action awaiting partner response. */
export interface PendingAction {
  type: MediatorActionType;
  targetParticipant: InterventionTarget | null;
  awaitingResponseFrom: Array<'host' | 'partner'>;
  questionId: string | null;
  options: string[] | null;
}

/** Agreements reached during AGREEMENT / FUTURE_PLAN goals. */
export interface SessionAgreements {
  sharedRule: string | null;
  hostCommitment: string | null;
  partnerCommitment: string | null;
  futurePlan: string | null;
  acceptedByBoth: boolean;
}

/**
 * Complete in-session state of the Mediator AI Engine.
 *
 * Role: root aggregate persisted between turns. Schema version must match
 * {@link MediationStateMeta.schemaVersion} (`2.3`).
 */
export interface MediationState {
  meta: MediationStateMeta;
  participants: ParticipantStates;
  conflict: ConflictModel;
  dynamics: ConversationDynamics;
  memory: ConversationMemory;
  currentGoal: TherapeuticGoal;
  goals: GoalState[];
  sessionObjectives: SessionObjectives | null;
  pendingAction: PendingAction | null;
  agreements: SessionAgreements;
  sessionOutcome: SessionOutcome;
  /** v2.2+ therapeutic metadata */
  pace: PaceState;
  load: EmotionalLoadState;
  personality: SessionPersonality;
  recovery: RecoveryState | null;
  activeStrategy: ActiveStrategyState | null;
  lastInterventionMeta: LastInterventionMeta | null;
  /** v2.3 Evidence Layer persistence */
  evidenceStore: EvidenceStore;
}

/** Immutable snapshot of MediationState for Reflection diffing. */
export type MediationStateSnapshot = Readonly<MediationState>;

/** Partial update payload for session memory persistence (future sync helper). */
export interface MediationStatePatch {
  lastUpdatedAt: string;
  currentGoal?: TherapeuticGoal;
  goals?: GoalState[];
  dynamics?: Partial<ConversationDynamics>;
  sessionOutcome?: SessionOutcome;
  goalTransition?: GoalTransition;
}
