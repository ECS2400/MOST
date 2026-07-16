/** Public client types for mediation-turn-v2 (mirror of Edge contract). */

export type MediationScreenV2 =
  | 'SUMMARY'
  | 'EASY_CHOICES'
  | 'FIRST_DEAL'
  | 'COMPROMISE'
  | 'LESSON'
  | 'DATE'
  | 'END';

export type ActionTypeV2 =
  | 'LOAD_SESSION'
  | 'CONTINUE'
  | 'VOTE'
  | 'FINISH'
  | 'CLOSE'
  | 'RETRY';

export type VoteValueV2 = 'yes' | 'no' | 'stubborn';

export type EnvelopeActionTypeV2 = 'CONTINUE' | 'VOTE' | 'FINISH' | 'CLOSE' | 'RETRY';

export type PartnerStatusV2 = 'waiting' | 'answered' | 'both_done';

export type EasyChoiceOptionV2 = {
  id: string;
  label: string;
};

export type MediationTurnV2BootstrapBody = {
  action: 'START_OR_RESUME';
  mediationId: string;
  requestId: string;
};

export type MediationTurnV2SessionBody = {
  sessionId: string;
  requestId: string;
  action: {
    type: ActionTypeV2;
    optionId: string | null;
    voteValue: VoteValueV2 | null;
  };
};

export type MediationTurnV2RequestBody =
  | MediationTurnV2BootstrapBody
  | MediationTurnV2SessionBody;

export type EnvelopeActionV2 = {
  id: string;
  type: EnvelopeActionTypeV2;
  label: string;
  voteValue: VoteValueV2 | null;
  disabled?: boolean;
  loading?: boolean;
  visible?: boolean;
};

export type MediationTurnV2Envelope = {
  ok: true;
  sessionId: string;
  screen: MediationScreenV2;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  actions: EnvelopeActionV2[];
  progress: { current: number; total: number };
  generationStatus: string;
  sessionVersion: number;
  correlationId: string;
  replayed?: boolean;
  processing?: boolean;
  message?: string;
};

export type MediationTurnV2PublicErrorCode =
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
