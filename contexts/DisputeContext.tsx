import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase, callEdge, EDGE } from '@/services/supabase';
import { checkFeatureAccess, incrementFeatureUsage } from '@/services/checkLimits';
import { Dispute, DisputeMessage, DisputePhase, PhaseData, User } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DisputeContextType {
  disputes: Dispute[];
  activeDisputes: Dispute[];
  resolvedDisputes: Dispute[];
  isLoading: boolean;
  loadDisputes: (coupleId: string) => Promise<void>;
  createDispute: (title: string, description: string, user: User, coupleId: string, partnerId: string) => Promise<Dispute>;
  updatePhaseData: (disputeId: string, userId: string, phase: number, data: PhaseData) => Promise<void>;
  setReady: (disputeId: string, userId: string) => Promise<void>;
  advancePhase: (disputeId: string) => Promise<void>;
  resolveDispute: (disputeId: string, resolution: string, summary?: { lesson: string; keyMoment: string }) => Promise<void>;
  addMessage: (disputeId: string, message: DisputeMessage) => Promise<void>;
  getDispute: (id: string) => Dispute | undefined;
  getMonthlyCount: (userId: string) => number;
  addLessonNote: (disputeId: string, note: string) => Promise<void>;
  checkLimits: (userId: string) => Promise<{ allowed: boolean; reason?: string }>;
  analyzePerspectives: (disputeId: string, language: string) => Promise<any>;
  subscribeToMessages: (disputeId: string, onMessage: (msg: DisputeMessage) => void) => () => void;
}

export const DisputeContext = createContext<DisputeContextType | undefined>(undefined);

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ─── Map Supabase row → app Dispute ──────────────────────────────────────────
function mapDispute(row: any, messages: DisputeMessage[] = []): Dispute {
  const user1PhaseData: Record<number, PhaseData> = {};
  const user2PhaseData: Record<number, PhaseData> = {};

  if (row.partner_1_perspective || row.partner_1_feelings || row.partner_1_needs) {
    user1PhaseData[1] = {
      perspective: row.partner_1_perspective,
      feelings: row.partner_1_feelings,
      needs: row.partner_1_needs,
    };
  }
  if (row.partner_2_perspective || row.partner_2_feelings || row.partner_2_needs) {
    user2PhaseData[1] = {
      perspective: row.partner_2_perspective,
      feelings: row.partner_2_feelings,
      needs: row.partner_2_needs,
    };
  }

  return {
    id: row.id,
    coupleId: row.couple_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description || '',
    phase: row.phase as DisputePhase,
    status: row.status,
    user1Id: row.partner_1_id,
    user2Id: row.partner_2_id,
    user1PhaseData,
    user2PhaseData,
    user1Ready: row.partner_1_ready || false,
    user2Ready: row.partner_2_ready || false,
    messages,
    resolution: row.resolution || undefined,
    resolutionSummary: row.resolution_summary || undefined,
    lessonNote: row.lesson_note || undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  };
}

// ─── Map Supabase message row → app DisputeMessage ───────────────────────────
function mapMessage(row: any): DisputeMessage {
  return {
    id: row.id,
    disputeId: row.dispute_id,
    authorId: row.author_id,
    authorName: row.author_name,
    content: row.content,
    phase: row.phase as DisputePhase,
    createdAt: row.created_at,
    isAI: row.is_ai || false,
    sentiment: row.sentiment || undefined,
    sentimentIndicator: row.sentiment_indicator || undefined,
    aiResponseType: row.ai_response_type || undefined,
  };
}

export function DisputeProvider({ children }: { children: ReactNode }) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  const activeDisputes = disputes.filter((d) => d.status === 'active');
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');

  // ── Load disputes for a couple ────────────────────────────────────────────
  async function loadDisputes(coupleId: string) {
    setIsLoading(true);
    try {
      const { data: disputeRows, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });

      if (error || !disputeRows) {
        setIsLoading(false);
        return;
      }

      // Load messages for all disputes
      const disputeIds = disputeRows.map((d) => d.id);
      const { data: msgRows } = await supabase
        .from('messages')
        .select('*')
        .in('dispute_id', disputeIds)
        .order('created_at', { ascending: true });

      const msgMap: Record<string, DisputeMessage[]> = {};
      (msgRows || []).forEach((m) => {
        if (!msgMap[m.dispute_id]) msgMap[m.dispute_id] = [];
        msgMap[m.dispute_id].push(mapMessage(m));
      });

      setDisputes(disputeRows.map((row) => mapDispute(row, msgMap[row.id] || [])));
    } catch {}
    setIsLoading(false);
  }

  // ── Create a new dispute ──────────────────────────────────────────────────
  async function createDispute(
    title: string,
    description: string,
    user: User,
    coupleId: string,
    partnerId: string
  ): Promise<Dispute> {
    const { data, error } = await supabase
      .from('disputes')
      .insert({
        couple_id: coupleId,
        created_by: user.id,
        title,
        description: description || null,
        phase: 1,
        status: 'active',
        partner_1_id: user.id,
        partner_2_id: partnerId,
        partner_1_ready: false,
        partner_2_ready: false,
      })
      .select()
      .single();

    if (error || !data) throw new Error('Nie udało się utworzyć sporu');

    const dispute = mapDispute(data, []);
    setDisputes((prev) => [dispute, ...prev]);

    try {
      await incrementFeatureUsage('create_dispute', {
        userId: user.id,
        usageKey: dispute.id,
      });
    } catch (usageError) {
      console.warn('[DisputeContext] usage increment failed', usageError);
    }

    return dispute;
  }

  // ── Update phase data (perspective / feelings / needs) ────────────────────
  async function updatePhaseData(
    disputeId: string,
    userId: string,
    phase: number,
    data: PhaseData
  ) {
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const isUser1 = userId === dispute.user1Id;
    const updatePayload: any = {};

    if (phase === 1) {
      if (isUser1) {
        if (data.perspective !== undefined) updatePayload.partner_1_perspective = data.perspective;
        if (data.feelings !== undefined) updatePayload.partner_1_feelings = data.feelings;
        if (data.needs !== undefined) updatePayload.partner_1_needs = data.needs;
      } else {
        if (data.perspective !== undefined) updatePayload.partner_2_perspective = data.perspective;
        if (data.feelings !== undefined) updatePayload.partner_2_feelings = data.feelings;
        if (data.needs !== undefined) updatePayload.partner_2_needs = data.needs;
      }
    }

    if (Object.keys(updatePayload).length === 0) return;

    const { data: updated } = await supabase
      .from('disputes')
      .update(updatePayload)
      .eq('id', disputeId)
      .select()
      .single();

    if (updated) {
      refreshDispute(updated, disputes.find((d) => d.id === disputeId)?.messages || []);
    }
  }

  // ── Set a user as ready for the current phase ─────────────────────────────
  async function setReady(disputeId: string, userId: string) {
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const isUser1 = userId === dispute.user1Id;
    const field = isUser1 ? 'partner_1_ready' : 'partner_2_ready';

    const { data: updated } = await supabase
      .from('disputes')
      .update({ [field]: true })
      .eq('id', disputeId)
      .select()
      .single();

    if (updated) {
      refreshDispute(updated, dispute.messages);
    }
  }

  // ── Advance to next phase ─────────────────────────────────────────────────
  async function advancePhase(disputeId: string) {
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const nextPhase = Math.min(dispute.phase + 1, 4) as DisputePhase;

    const { data: updated } = await supabase
      .from('disputes')
      .update({ phase: nextPhase, partner_1_ready: false, partner_2_ready: false })
      .eq('id', disputeId)
      .select()
      .single();

    if (updated) {
      refreshDispute(updated, dispute.messages);
    }
  }

  // ── Resolve dispute ───────────────────────────────────────────────────────
  async function resolveDispute(
    disputeId: string,
    resolution: string,
    summary?: { lesson: string; keyMoment: string }
  ) {
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const { data: updated } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution,
        resolution_summary: summary || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (updated) {
      refreshDispute(updated, dispute.messages);
    }
  }

  // ── Add a chat message ────────────────────────────────────────────────────
  async function addMessage(disputeId: string, message: DisputeMessage) {
    const { data, error } = await supabase.from('messages').insert({
      id: message.id,
      dispute_id: message.disputeId,
      author_id: message.authorId,
      author_name: message.authorName,
      content: message.content,
      phase: message.phase,
      is_ai: message.isAI || false,
      sentiment: message.sentiment || null,
      sentiment_indicator: message.sentimentIndicator || null,
      ai_response_type: message.aiResponseType || null,
    }).select().single();

    if (data) {
      setDisputes((prev) =>
        prev.map((d) => {
          if (d.id !== disputeId) return d;
          return { ...d, messages: [...d.messages, mapMessage(data)] };
        })
      );
    } else {
      // Optimistic update if insert fails silently
      setDisputes((prev) =>
        prev.map((d) => {
          if (d.id !== disputeId) return d;
          return { ...d, messages: [...d.messages, message] };
        })
      );
    }
  }

  // ── Add lesson note to resolved dispute ───────────────────────────────────
  async function addLessonNote(disputeId: string, note: string) {
    await supabase.from('disputes').update({ lesson_note: note }).eq('id', disputeId);
    setDisputes((prev) =>
      prev.map((d) => (d.id === disputeId ? { ...d, lessonNote: note } : d))
    );
  }

  // ── Check limits via Edge Function ────────────────────────────────────────
  async function checkLimits(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const result = await checkFeatureAccess('create_dispute', { userId });
    return { allowed: result.allowed, reason: result.reason };
  }

  // ── Call analyze-perspectives Edge Function ────────────────────────────────
  async function analyzePerspectives(disputeId: string, language: string): Promise<any> {
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) throw new Error('Dispute not found');

    const perspectiveA =
      `${dispute.user1PhaseData[1]?.perspective || ''} ${dispute.user1PhaseData[1]?.feelings || ''} ${dispute.user1PhaseData[1]?.needs || ''}`.trim();
    const perspectiveB =
      `${dispute.user2PhaseData[1]?.perspective || ''} ${dispute.user2PhaseData[1]?.feelings || ''} ${dispute.user2PhaseData[1]?.needs || ''}`.trim();

    const result = await callEdge(EDGE.analyzePerspectives, {
      perspectiveA,
      perspectiveB,
      category: dispute.title,
      language,
    });

    // Persist mirror_analysis to DB
    await supabase
      .from('disputes')
      .update({ mirror_analysis: result })
      .eq('id', disputeId);

    // Update local state
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === disputeId ? { ...d, mirrorAnalysis: result } : d
      )
    );

    return result;
  }

  // ── Subscribe to real-time messages (Phase 3) ─────────────────────────────
  function subscribeToMessages(
    disputeId: string,
    onMessage: (msg: DisputeMessage) => void
  ): () => void {
    // Unsubscribe existing if any
    const existing = channelsRef.current.get(disputeId);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(`messages:${disputeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `dispute_id=eq.${disputeId}`,
        },
        (payload) => {
          const msg = mapMessage(payload.new);
          // Update local disputes state
          setDisputes((prev) =>
            prev.map((d) => {
              if (d.id !== disputeId) return d;
              // Avoid duplicates
              if (d.messages.some((m) => m.id === msg.id)) return d;
              return { ...d, messages: [...d.messages, msg] };
            })
          );
          onMessage(msg);
        }
      )
      .subscribe();

    channelsRef.current.set(disputeId, channel);

    return () => {
      supabase.removeChannel(channel);
      channelsRef.current.delete(disputeId);
    };
  }

  // ── Helper: refresh one dispute in state ──────────────────────────────────
  function refreshDispute(row: any, messages: DisputeMessage[]) {
    const updated = mapDispute(row, messages);
    setDisputes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function getDispute(id: string): Dispute | undefined {
    return disputes.find((d) => d.id === id);
  }

  function getMonthlyCount(userId: string): number {
    const now = new Date();
    return disputes.filter((d) => {
      const created = new Date(d.createdAt);
      return (
        d.createdBy === userId &&
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;
  }

  return (
    <DisputeContext.Provider
      value={{
        disputes,
        activeDisputes,
        resolvedDisputes,
        isLoading,
        loadDisputes,
        createDispute,
        updatePhaseData,
        setReady,
        advancePhase,
        resolveDispute,
        addMessage,
        getDispute,
        getMonthlyCount,
        addLessonNote,
        checkLimits,
        analyzePerspectives,
        subscribeToMessages,
      }}
    >
      {children}
    </DisputeContext.Provider>
  );
}
