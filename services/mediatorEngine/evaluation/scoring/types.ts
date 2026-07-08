export type EvaluationGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface EvaluationScore {
  goalScore: number;
  strategyScore: number;
  interventionScore: number;
  safetyScore: number;
  overallScore: number;
  grade: EvaluationGrade;
}
