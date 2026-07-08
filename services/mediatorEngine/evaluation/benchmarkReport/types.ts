import type { ConversationRunStatus } from '@/services/mediatorEngine/evaluation/types';

export interface BenchmarkConversationReport {
  conversationId: string;
  conversationTitle: string;
  status: ConversationRunStatus;
  goalScore: number | null;
  strategyScore: number | null;
  interventionScore: number | null;
  safetyScore: number | null;
  overallScore: number | null;
  grade: string | null;
  skipReason?: string;
  failureReason?: string;
}

export interface BenchmarkReport {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  averageGoalScore: number;
  averageStrategyScore: number;
  averageInterventionScore: number;
  averageSafetyScore: number;
  averageOverallScore: number;
  conversations: BenchmarkConversationReport[];
  skippedConversations: BenchmarkConversationReport[];
  failedConversations: BenchmarkConversationReport[];
  rankedConversations: BenchmarkConversationReport[];
}
