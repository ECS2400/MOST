// Most App — Core Types

export type UserPlan = 'free' | 'premium';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  avatarUrl?: string | null;
  planExpiresAt?: string | null;
  plan: UserPlan;
  coupleId?: string;
  partnerId?: string;
  partnerName?: string;
  partnerColor?: string;
  createdAt: string;
}

export type CoupleSubscriptionTier = 'free' | 'premium';

export interface Couple {
  id: string;
  user1Id: string;
  user2Id: string;
  inviteCode: string;
  connectedAt: string;
  subscriptionTier?: CoupleSubscriptionTier | null;
  subscriptionExpires?: string | null;
  subscriptionPaidBy?: string | null;
}

export type DisputePhase = 1 | 2 | 3 | 4;
export type DisputeStatus = 'active' | 'resolved' | 'abandoned';

export interface PhaseData {
  perspective?: string;
  feelings?: string;
  needs?: string;
  mirrorConfirmed?: boolean;
  mirrorResponse?: string;
  resolutionProposal?: string;
  resolutionAgreed?: boolean;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  authorId: string;
  authorName: string;
  content: string;
  phase: DisputePhase;
  createdAt: string;
  isAI?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentIndicator?: '🟢' | '🟡' | '🔴';
  aiResponseType?: 'warning' | 'celebration' | 'suggestion' | 'break' | 'tip' | 'prompt';
}

export interface Dispute {
  id: string;
  coupleId: string;
  createdBy: string;
  title: string;
  description: string;
  phase: DisputePhase;
  status: DisputeStatus;
  user1Id: string;
  user2Id: string;
  user1PhaseData: Record<number, PhaseData>;
  user2PhaseData: Record<number, PhaseData>;
  user1Ready: boolean;
  user2Ready: boolean;
  messages: DisputeMessage[];
  resolution?: string;
  resolutionSummary?: { lesson: string; keyMoment: string };
  lessonNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
