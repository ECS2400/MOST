import type { MediationAnalysis } from '@/services/mediationAnalysisInterpret';
import { EdgeFunctionError } from '@/utils/edgeFunctionError';
import type { MediationAnalysisStage } from '@/services/mediationAnalysisRun.types';
import { MediationAnalysisError } from '@/services/mediationAnalysisRun.types';

export function isValidMediationAnalysis(value: unknown): value is MediationAnalysis {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.situation_summary === 'string' ||
    typeof record.emotions_explanation === 'string' ||
    typeof record.user_emotions !== 'undefined'
  );
}

export function toMediationAnalysisError(
  stage: MediationAnalysisStage,
  error: unknown
): MediationAnalysisError {
  if (error instanceof MediationAnalysisError) {
    return error;
  }

  if (error instanceof EdgeFunctionError) {
    return new MediationAnalysisError(stage, error.message, {
      status: error.status,
      code: error.code,
    });
  }

  return new MediationAnalysisError(
    stage,
    error instanceof Error ? error.message : 'Analysis failed',
    { code: 'UNKNOWN' }
  );
}
