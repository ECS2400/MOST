/**
 * Shared primitives for Mediator AI Engine v2.3.
 *
 * Role: foundational identifiers and enums reused across all mediator modules.
 * These types carry no business logic — they define the vocabulary of the engine.
 */

/** Supported session languages for the live mediator (aligned with edge i18n). */
export type MediatorLang = 'pl' | 'en' | 'it' | 'de' | 'fr' | 'es';

/** Schema version persisted inside {@link MediationStateMeta}. Bump on breaking state changes. */
export type MediationStateSchemaVersion = '2.3';

/** ISO-8601 timestamp string (e.g. `2026-07-04T09:00:00.000Z`). */
export type IsoTimestamp = string;

/** Participant role within a live mediation session. */
export type ParticipantRole = 'host' | 'partner';

/** Target audience for an intervention or effect. */
export type InterventionTarget = ParticipantRole | 'both';

/** Session lifecycle outcome — set when mediation ends or is interrupted. */
export type SessionOutcome =
  | 'in_progress'
  | 'resolved'
  | 'paused'
  | 'unresolved_closed'
  | 'safety_stopped';

/** Turn index within a live session (1-based, monotonically increasing). */
export type TurnNumber = number;

/** Confidence score on a 0–100 scale. */
export type ConfidenceScore = number;

/** Emotional intensity on a 0–10 scale (0 = calm, 10 = critical). */
export type IntensityScore = number;

/** Progress percentage on a 0–100 scale (informational, not flow-driving). */
export type ProgressPercent = number;

/** Unique identifier for evidence items, conclusions, interventions, etc. */
export type MediatorEntityId = string;

/** Hash signature used for anti-repeat tracking (intervention type + goal + target). */
export type InterventionSignature = string;

/** User identifier from the MOST auth system. */
export type UserId = string;

/** Mediation record identifier from the database. */
export type MediationId = string;

/** Live session identifier (may equal mediationId or a sub-session key). */
export type SessionId = string;
