/**
 * Shared live-mediation types used by the Expo app and mediatorRuntimeClient.
 * Kept separate from liveMediation.ts so Node/mediator typecheck profiles
 * do not pull Expo/RN/supabase implementation code.
 */

export type QuestionTarget = 'ty' | 'partner' | 'oboje';

export interface PrivateHint {
  tone?: string;
  emotion?: string;
  suggestion?: string;
}

export interface LiveMediatorResponse {
  publicMessage?: string;
  aiQuestion?: string;
  questionTarget?: QuestionTarget;
  privateHint?: PrivateHint;
  partnerPrivateHint?: PrivateHint;
  funFact?: string;
  source?: string;
  triggerMessageId?: string;
  phaseTransition?: string;
  escalationDetected?: boolean;
  escalationMessage?: string;
  phase?: number;
  progress?: number;
  nextQuestionIndex?: number;
  metaComment?: boolean;
  summaryType?: 'opening' | 'mid' | 'final' | 'extension_check' | 'proposed_solution' | 'closure';
}

export type MediatorMode =
  | 'opening_summary'
  | 'generate_question'
  | 'answer_ack'
  | 'mid_summary'
  | 'final_summary'
  | 'extension_check'
  | 'proposed_solution'
  | 'extension_offer'
  | 'extension_question'
  | 'closure'
  | 'safety_intervention';

export type LiveQuestionPhase = 'opening' | 'deepening' | 'resolution' | 'extension';

export type LiveSessionStage =
  | 'questions'
  | 'awaiting_main_decision'
  | 'extension'
  | 'awaiting_extension_decision'
  | 'awaiting_proposal_decision'
  | 'unresolved_but_closed'
  | 'finished';

export interface LiveSessionFlow {
  stage: LiveSessionStage;
  questionNumber: number;
  maxQuestions: number;
  questionPhase: LiveQuestionPhase;
  extensionActive: boolean;
}
