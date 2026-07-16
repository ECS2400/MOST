/** Local types for mediation-turn-v2 Runtime V2 full flow. */

export type Talker = 'HOST' | 'PARTNER';

export type MediationScreen =
  | 'SUMMARY'
  | 'EASY_CHOICES'
  | 'FIRST_DEAL'
  | 'COMPROMISE'
  | 'LESSON'
  | 'DATE'
  | 'END';

export type GenerationKind =
  | 'SUMMARY'
  | 'EASY_CHOICES'
  | 'FIRST_DEAL'
  | 'COMPROMISE'
  | 'LESSON'
  | 'DATE';

export type ActionType =
  | 'LOAD_SESSION'
  | 'CONTINUE'
  | 'VOTE'
  | 'FINISH'
  | 'CLOSE'
  | 'RETRY';

export type VoteValue = 'yes' | 'no' | 'stubborn';

export type MediationTurnV2BootstrapRequest = {
  kind: 'bootstrap';
  mediationId: string;
  requestId: string;
  action: 'START_OR_RESUME';
};

export type MediationTurnV2SessionRequest = {
  kind: 'session';
  sessionId: string;
  requestId: string;
  action: {
    type: ActionType;
    optionId: string | null;
    voteValue: VoteValue | null;
  };
};

export type MediationTurnV2Request =
  | MediationTurnV2BootstrapRequest
  | MediationTurnV2SessionRequest;

export type EasyChoiceRound = {
  title: string;
  choices: string[];
};

export type EnvelopeAction = {
  id: string;
  type: 'CONTINUE' | 'VOTE' | 'FINISH' | 'CLOSE' | 'RETRY';
  label: string;
  voteValue: VoteValue | null;
  disabled?: boolean;
  loading?: boolean;
  visible?: boolean;
};

export type MediationTurnV2Envelope = {
  ok: true;
  sessionId: string;
  screen: MediationScreen;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  actions: EnvelopeAction[];
  progress: { current: number; total: number };
  generationStatus: string;
  sessionVersion: number;
  correlationId: string;
  replayed?: boolean;
  processing?: boolean;
  message?: string;
};

/** @deprecated Prefer MediationTurnV2Envelope after cutover. Kept for ALREADY_COMPLETED shape checks. */
export type MediationTurnV2Response = MediationTurnV2Envelope;

export type PublicErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'MEDIATION_NOT_FOUND'
  | 'PARTNER_NOT_READY'
  | 'SESSION_VERSION_CONFLICT'
  | 'SESSION_IDENTITY_CONFLICT'
  | 'INVALID_TRANSITION'
  | 'DUPLICATE_ACTION'
  | 'CONFLICT_CATEGORY_MISSING'
  | 'LLM_INVALID_RESPONSE'
  | 'UNSUPPORTED_SESSION_STATE'
  | 'GENERATION_ALREADY_RUNNING'
  | 'LLM_CALL_BUDGET_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'METHOD_NOT_ALLOWED';

export type MediationRow = {
  id: string;
  couple_id: string | null;
  user_id: string;
  partner_id: string | null;
  conflict_category: string | null;
  what_happened: string | null;
  what_angered: string | null;
  how_felt: string | null;
  what_needed: string | null;
  what_to_say: string | null;
  combined_description: string | null;
  analysis: unknown;
  partner_what_happened: string | null;
  partner_what_angered: string | null;
  partner_how_felt: string | null;
  partner_what_needed: string | null;
  partner_what_to_say: string | null;
  partner_combined_description: string | null;
  partner_analysis: unknown;
};

export type MediationSessionRow = {
  session_id: string;
  mediation_id: string;
  couple_id: string;
  host_user_id: string;
  partner_user_id: string | null;
  conflict_category: string;
  session_payload: Record<string, unknown>;
  session_version: number;
  current_screen: string;
  generation_status: string;
  last_generation_kind: string | null;
  progress_total: number;
  prompt_version: string;
  model_version: string;
};

export type ClaimOutcome =
  | { outcome: 'CLAIMED'; claimToken: string }
  | { outcome: 'ALREADY_CLAIMED' }
  | { outcome: 'IN_PROGRESS' }
  | { outcome: 'ALREADY_COMPLETED'; response: unknown };

export type CommitClaimedResult = {
  replayed: boolean;
  session: MediationSessionRow | null;
  response: unknown;
};

export type CommitActionResult = {
  replayed: boolean;
  session: MediationSessionRow | null;
  response: unknown;
};
