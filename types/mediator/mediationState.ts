/**
 * Core mediation state model for Mediator AI Engine v2.3.
 *
 * Role: root aggregate persisted between turns in live_messages.metadata.
 */

import type { InterventionTarget, SessionOutcome } from './common';
import type {
  ConversationDynamics,
  ConversationMemory,
  EmotionalLoadState,
  PaceState,
} from './dynamics';
import type { EvidenceStore } from './evidence';
import type { MediatorActionType } from './engineTypes';
import type { GoalState, GoalTransition, SessionObjectives } from './goals';
import type {
  ConflictModel,
  MediationStateMeta,
  ParticipantStates,
} from './participants';
import type { SessionPersonality } from './personality';
import type { ActiveStrategyState, RecoveryState } from './strategies';
import type { LastInterventionMeta } from './interventions';
import type { TherapeuticGoal } from './therapeuticGoal';

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
 * Role: single source of truth for v2.3 engine persistence.
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
  pace: PaceState;
  load: EmotionalLoadState;
  personality: SessionPersonality;
  recovery: RecoveryState | null;
  activeStrategy: ActiveStrategyState | null;
  lastInterventionMeta: LastInterventionMeta | null;
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
