import type { MediationAnalysis } from '@/services/mediationAnalysisInterpret';

export type MediationAnalysisStage =
  | 'fetch_mediation'
  | 'edge_call'
  | 'parse_response'
  | 'save_analysis';

export interface MediationAnalysisRow {
  id: string;
  user_id: string;
  partner_id: string | null;
  combined_description: string;
  partner_combined_description: string | null;
  pasted_text: string | null;
  screenshot_urls: string[];
  analysis: MediationAnalysis | null;
  partner_analysis: MediationAnalysis | null;
  status: string;
}

export class MediationAnalysisError extends Error {
  readonly stage: MediationAnalysisStage;
  readonly status?: number;
  readonly code?: string;

  constructor(
    stage: MediationAnalysisStage,
    message: string,
    options?: { status?: number; code?: string }
  ) {
    super(message);
    this.name = 'MediationAnalysisError';
    this.stage = stage;
    this.status = options?.status;
    this.code = options?.code;
  }
}
