import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { useRuntimeSession } from '@/hooks/useRuntimeSession';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeSessionParticipantRole } from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';
import { normalizeRouteParam } from '@/utils/normalizeRouteParam';
import { fmt } from '@/utils/i18nFormat';
import {
  resolveLivePhaseHeaderLabel,
  resolveLiveProgressPercent,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionProgressDisplay';
import {
  resolveLiveContinueWaitingDisplay,
  resolveLiveProposalWaitingDisplay,
  resolveLiveWaitingAnswerDisplay,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionWaitingDisplay';
import {
  canSubmitLiveMessage,
  resolveRuntimeInputState,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionInputState';
import {
  isRuntimeDirectMediatorMode,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
import { isRuntimeSessionShape } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
import {
  buildRuntimeUnavailableDevDiagnostics,
  logRuntimeUnavailableDevDiagnostics,
} from '@/services/mediatorRuntimeClient/runtimeUnavailableDevLog';
import { loadMediationRuntimeState } from '@/services/mediatorRuntimeClient/loadMediationRuntimeSession';
import { recoverMediationRuntimeSession } from '@/services/mediatorRuntimeClient/recoverMediationRuntimeSession';
import {
  logRuntimeRecoveryBlocked,
  logRuntimeRecoveryResult,
} from '@/services/mediatorRuntimeClient/runtimeRecoveryDevLog';
import { resolveRuntimeDecisionPanelVisibility } from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';
import {
  mapRuntimeClosureNavigationOutcome,
  resolveEffectiveClosureDbStatus,
  resolveRuntimeClosureAction,
  shouldPerformRuntimeClosureNavigation,
} from '@/services/mediatorRuntimeClient/resolveRuntimeClosureAction';
import {
  canExecuteRuntimeClientAction,
  planLiveRuntimeClientAction,
  resolveRuntimeActionExecution,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';
import { resolveRuntimeProposalPanelState } from '@/services/mediatorRuntimeClient/resolveRuntimeProposalPanelState';
import { resolveRuntimeSessionFlow } from '@/services/mediatorRuntimeClient/resolveRuntimeSessionFlow';
import { buildRuntimeClientEvents, buildParticipantReplyClientEvents } from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';
import { processBothParticipantReplies } from '@/services/mediatorRuntimeClient/processBothParticipantReplies';
import { deriveParticipantReplyStateFromMessages } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import { logParticipantReplyGateDev } from '@/services/mediatorRuntimeClient/participantReplyGateDevLog';
import { resolveRuntimeClientEventsForTurn } from '@/services/mediatorRuntimeClient/resolveRuntimeClientEventsForTurn';
import { shouldBlockRuntimeMediatorGeneration } from '@/services/mediatorRuntimeClient/shouldBlockRuntimeMediatorGeneration';
import {
  canHostRunRuntimeBootstrap,
  diagnoseMediationRuntimeBootstrap,
} from '@/services/mediatorRuntimeClient/resolveRuntimeBootstrapEligibility';
import {
  buildApplyAiTurnDevLogPayload,
  logApplyAiTurnDev,
  resolveApplyAiTurnTriggerSource,
  silentSyncDetectedNewMessages,
} from '@/services/mediatorRuntimeClient/applyAiTurnDevLog';
import {
  buildMediatorTurnFingerprint,
  isDuplicateMediatorTurnFingerprint,
} from '@/services/mediatorRuntimeClient/mediatorTurnFingerprint';
import {
  shouldRefreshRuntimeSessionOnSessionPoll,
  shouldRefreshRuntimeSessionOnSilentSync,
} from '@/services/mediatorRuntimeClient/runtimeSessionRefreshGuard';
import type { RuntimeClientEvent } from '@/types/mediator';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import { LiveRuntimeDevDiagnostics } from '@/components/feature/LiveRuntimeDevDiagnostics';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { getClosureBundle } from '@/constants/i18n/closure';
import type { Language } from '@/constants/i18n';
import { linkPartnerToMediation } from '@/services/mediationPartner';
import { fetchPriorAgreementsContext } from '@/services/agreementArchive';
import { supabase } from '@/services/supabase';
import {
  appendLiveMessage,
  buildBriefingFromContext,
  buildLocalAiMessages,
  buildOpeningLiveMessages,
  clearSentAiMessagesRef,
  computeLiveTurnState,
  getSessionDecisionState,
  signalSessionDecision,
  SESSION_DECISION_ACTION,
  PROPOSAL_DECISION_ACTION,
  PROPOSAL_ACCEPTED_FINAL_KIND,
  ALTERNATIVE_SOLUTION_KIND,
  signalProposalDecision,
  buildAlternativeProposalMessage,
  generationLockAfter,
  shouldHostLeadGeneration,
  resolveStableParticipantNames,
  shouldSkipOpeningBootstrap,
  signalGenerationLock,
  GENERATION_LOCK_ACTION,
  tryBeginGeneration,
  endGeneration,
  countAskedQuestions,
  createMockLiveSession,
  dedupeLiveMessages,
  extractQuestionBare,
  fetchLiveMessages,
  fetchLiveSession,
  fetchMediationContext,
  filterVisibleLiveMessages,
  getLastQuestionMessage,
  questionAdvancedAfter,
  canGenerateNextQuestion,
  LiveBriefing,
  MediationContext,
  initLiveSession,
  insertAiMessages,
  LiveMessage,
  LiveSession,
  mergeLiveMessages,
  pauseLiveMediation,
  processMediationTurn,
  sendUserMessage,
  subscribeLiveMessages,
  hasSummaryKind,
  isExtensionActive,
  LIVE_QUESTIONS_TARGET,
  countMessagesByRole,
  type MediatorMode,
} from '@/services/liveMediation';
import { dismissFunFact, loadDismissedFunFacts } from '@/services/aiFunFactStorage';
import { AiFunFactCard } from '@/components/feature/AiFunFactCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { navigateToDisputeClosure } from '@/utils/disputeClosureNavigation';
import { incrementFeatureUsage } from '@/services/checkLimits';
import { inferClosureOutcomeFromStatus } from '@/services/dateIdeaPicker';
import { isHistoricalConversationStateMessage } from '@/legacyMigration/historyFilters';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';

type ChatItem = {
  kind: 'message';
  message: LiveMessage;
  inlineHint?: LiveMessage;
  inlineFunFact?: LiveMessage;
};

const TIME_LOCALE: Record<Language, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

function formatMessageTime(iso: string, lang: Language = 'pl'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(TIME_LOCALE[lang] || 'pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function safeMessageContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content == null) return '';
  return JSON.stringify(content);
}

function BriefingCard({
  briefing,
  expanded,
  onToggle,
  labels,
}: {
  briefing: LiveBriefing;
  expanded: boolean;
  onToggle: () => void;
  labels: { title: string; trigger: string; fallback: string };
}) {
  return (
    <Pressable onPress={onToggle} style={styles.briefingCard}>
      <View style={styles.briefingHeader}>
        <MaterialIcons name="insights" size={18} color={Colors.primaryLight} />
        <Text style={styles.briefingTitle}>{labels.title}</Text>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={20}
          color={Colors.textMuted}
        />
      </View>
      {expanded ? (
        <View style={styles.briefingBody}>
          {briefing.situationSummary ? (
            <Text style={styles.briefingSummary}>{briefing.situationSummary}</Text>
          ) : null}
          {briefing.keyTrigger ? (
            <Text style={styles.briefingTrigger}>
              {fmt(labels.trigger, { trigger: briefing.keyTrigger })}
            </Text>
          ) : null}
          {briefing.emotionTags.length > 0 ? (
            <View style={styles.briefingTagRow}>
              {briefing.emotionTags.map((tag) => (
                <View key={`e-${tag}`} style={styles.briefingTagEmotion}>
                  <Text style={styles.briefingTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {briefing.needTags.length > 0 ? (
            <View style={styles.briefingTagRow}>
              {briefing.needTags.map((tag) => (
                <View key={`n-${tag}`} style={styles.briefingTagNeed}>
                  <Text style={styles.briefingTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.briefingCollapsed} numberOfLines={1}>
          {briefing.situationSummary || briefing.keyTrigger || labels.fallback}
        </Text>
      )}
    </Pressable>
  );
}

function InlineHint({ hint }: { hint: LiveMessage }) {
  const [expanded, setExpanded] = useState(false);
  const preview = hint.content.split('\n')[0]?.replace(/^💬\s*/, '') || hint.content;

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={styles.inlineHint}
    >
      <View style={styles.inlineHintHeader}>
        <MaterialIcons name="lock" size={12} color={Colors.warning} />
        <Text style={styles.inlineHintLabel}>AI podpowiada</Text>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={16}
          color={Colors.warning}
        />
      </View>
      <Text style={styles.inlineHintText} numberOfLines={expanded ? undefined : 2}>
        {expanded ? hint.content : preview}
      </Text>
      <Text style={styles.inlineHintTooltip}>Tylko Ty widzisz tę podpowiedź</Text>
    </Pressable>
  );
}

function ChatBubble({
  message,
  currentUserId,
  inlineHint,
  inlineFunFact,
  onDismissFunFact,
  lang,
  labels,
}: {
  message: LiveMessage;
  currentUserId: string;
  inlineHint?: LiveMessage;
  inlineFunFact?: LiveMessage;
  onDismissFunFact?: (id: string) => void;
  lang: Language;
  labels: { you: string; partner: string; aiName: string };
}) {
  const isAi =
    !message.is_private &&
    (message.sender_id === 'ai' ||
      message.message_type === 'question' ||
      message.message_type === 'system' ||
      message.message_type === 'summary');
  const isMine = message.sender_id === currentUserId;
  const isPhaseTransition = message.metadata?.phaseTransition === true;
  const isQuestion = message.message_type === 'question';
  const displayContent = isQuestion
    ? extractQuestionBare(safeMessageContent(message.content))
    : safeMessageContent(message.content);
  const time = formatMessageTime(message.created_at, lang);

  if (isAi || isPhaseTransition) {
    return (
      <View style={styles.aiBubbleWrap}>
        <View style={styles.aiBubbleHeader}>
          <View style={styles.aiAvatar}>
            <MaterialIcons name="psychology" size={14} color={Colors.primaryLight} />
          </View>
          <Text style={styles.aiMeta}>
            {message.sender_name || labels.aiName} · {time}
          </Text>
        </View>
        <LinearGradient
          colors={[Colors.gradientStart + '55', Colors.gradientMid + '44', Colors.primary + '28']}
          style={[styles.aiBubble, isPhaseTransition && styles.phaseTransitionBubble]}
        >
          <Text style={[styles.aiBubbleText, isQuestion && styles.aiQuestionText]}>
            {displayContent}
          </Text>
        </LinearGradient>
        {inlineFunFact ? (
          <AiFunFactCard
            text={inlineFunFact.content}
            onDismiss={() => onDismissFunFact?.(inlineFunFact.id)}
          />
        ) : null}
      </View>
    );
  }

  const senderName = isMine ? labels.you : labels.partner;

  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <Text style={[styles.senderLabel, isMine && styles.senderLabelMine]}>
        {senderName} · {time}
      </Text>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePartner]}>
        <Text style={styles.bubbleText}>{safeMessageContent(message.content)}</Text>
      </View>
      {inlineHint ? <InlineHint hint={inlineHint} /> : null}
    </View>
  );
}

function attachInlineHints(
  messages: LiveMessage[],
  userId: string
): { message: LiveMessage; inlineHint?: LiveMessage; inlineFunFact?: LiveMessage }[] {
  const usedHints = new Set<string>();
  const usedFacts = new Set<string>();
  const result: { message: LiveMessage; inlineHint?: LiveMessage; inlineFunFact?: LiveMessage }[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.is_private && (m.message_type === 'hint' || m.message_type === 'fun_fact')) continue;

    let inlineHint: LiveMessage | undefined;
    let inlineFunFact: LiveMessage | undefined;

    if (m.message_type === 'message' && m.sender_id !== 'ai') {
      const linked = messages.find(
        (h) =>
          h.is_private &&
          h.message_type === 'hint' &&
          h.recipient_id === userId &&
          !usedHints.has(h.id) &&
          h.metadata?.triggerMessageId === m.id
      );
      if (linked) {
        inlineHint = linked;
        usedHints.add(linked.id);
      } else {
        for (let j = i + 1; j < messages.length; j++) {
          const next = messages[j];
          if (next.message_type === 'message' && next.sender_id !== 'ai') break;
          if (
            next.is_private &&
            next.message_type === 'hint' &&
            next.recipient_id === userId &&
            !usedHints.has(next.id)
          ) {
            inlineHint = next;
            usedHints.add(next.id);
            break;
          }
        }
      }
    }

    const isAiPublic =
      !m.is_private &&
      (m.sender_id === 'ai' ||
        m.message_type === 'question' ||
        m.message_type === 'system' ||
        m.message_type === 'summary');
    if (isAiPublic) {
      let prevUserId: string | undefined;
      for (let j = i - 1; j >= 0; j--) {
        const prev = messages[j];
        if (prev.message_type === 'message' && prev.sender_id !== 'ai') {
          prevUserId = prev.id;
          break;
        }
      }
      if (prevUserId) {
        const fact = messages.find(
          (f) =>
            f.is_private &&
            f.message_type === 'fun_fact' &&
            f.recipient_id === userId &&
            !usedFacts.has(f.id) &&
            f.metadata?.triggerMessageId === prevUserId
        );
        if (fact) {
          inlineFunFact = fact;
          usedFacts.add(fact.id);
        }
      }
    }

    result.push({ message: m, inlineHint, inlineFunFact });
  }

  return result;
}

function getHistoryCompletenessError(
  merged: LiveMessage[],
  userId: string,
  emptyHistoryMsg: string
): string | null {
  const counts = countMessagesByRole(merged, userId);
  if (counts.user > 0 && counts.ai === 0) {
    return emptyHistoryMsg;
  }
  return null;
}

export default function LiveMediationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { partner, couple } = useCouple();
  const { language } = useLanguage();
  const lm = getLiveMediationExtras(language);
  const liveUi = lm.live;
  const chatLabels = {
    you: liveUi.you,
    partner: liveUi.partner,
    aiName: lm.service.aiName,
  };
  const { mediationId: routeMediationId } = useLocalSearchParams<{
    mediationId?: string | string[];
  }>();
  const mediationId = normalizeRouteParam(routeMediationId);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [mediationHostId, setMediationHostId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');
  const [mediationContext, setMediationContext] = useState<MediationContext | null>(null);
  const [briefingExpanded, setBriefingExpanded] = useState(true);
  const [dismissedFunFacts, setDismissedFunFacts] = useState<Set<string>>(new Set());
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showDisputeResolvedConfirm, setShowDisputeResolvedConfirm] = useState(false);

  const funFactScope = mediationId ? `live-${mediationId}` : 'live-local';

  const runtimeParticipantRole = useMemo((): RuntimeSessionParticipantRole => {
    if (!user?.id) return 'unknown';
    const hostId = mediationHostId || session?.user_id;
    if (hostId && user.id === hostId) return 'host';
    if (session?.partner_id && user.id === session.partner_id) return 'partner';
    if (partner?.id && user.id === partner.id) return 'partner';
    return 'unknown';
  }, [user?.id, mediationHostId, session?.user_id, session?.partner_id, partner?.id]);

  const runtimeSessionReadonly = useRuntimeSession(mediationId, {
    role: runtimeParticipantRole,
    userId: user?.id ?? null,
  });
  const {
    runtimeSession,
    refreshRuntimeSession,
    devDiagnostics: syncedDevDiagnostics,
    loadDiagnostics,
    runtimeSessionLoadSettled,
    bumpRecoveryClickCount,
  } = runtimeSessionReadonly;
  const [runtimeRecovering, setRuntimeRecovering] = useState(false);
  const runtimeRecoveryAttemptedRef = useRef(false);
  const runtimeRecoveryInFlightRef = useRef(false);
  const invalidRuntimeState =
    runtimeSession != null && !isRuntimeSessionShape(runtimeSession);
  const runtimeSessionReadonlyRef = useRef(runtimeSessionReadonly);
  runtimeSessionReadonlyRef.current = runtimeSessionReadonly;

  const listRef = useRef<FlatList<ChatItem>>(null);
  const dbHadMessagesRef = useRef(false);
  const isActiveSendRef = useRef(false);
  const messagesRef = useRef<LiveMessage[]>([]);
  const sessionRef = useRef<LiveSession | null>(null);
  const focusFetchInFlightRef = useRef(false);
  const skipNextFocusRefreshRef = useRef(true);
  const navigatingAwayRef = useRef(false);
  const runtimeClosureNavigatedRef = useRef(false);
  const initialLoadKeyRef = useRef<string | null>(null);
  const lastSyncedProgressRef = useRef<number | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;
  const sentAiMessagesRef = useRef(new Set<string>());
  const mediationContextRef = useRef<MediationContext | null>(null);
  const generateLockRef = useRef<string | null>(null);
  const sessionBootstrapLockRef = useRef(false);
  const openingBootstrapDoneRef = useRef(false);
  const lastAiTurnFingerprintRef = useRef<string | null>(null);
  const messageCountAtLastAiTurnRef = useRef(0);
  const liveUsageIncrementedRef = useRef(false);
  const extensionStartLockRef = useRef(false);
  const proposedSolutionLockRef = useRef(false);
  const proposalAcceptedFinalLockRef = useRef(false);
  const proposalRejectLockRef = useRef(false);
  const proposalAcceptLockRef = useRef(false);
  const continueDisputeLockRef = useRef(false);
  const resolveSessionLockRef = useRef(false);
  const generationInProgressRef = useRef(false);
  const pendingClientEventsRef = useRef<RuntimeClientEvent[]>([]);
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [lastEdgeDevDiagnostics, setLastEdgeDevDiagnostics] = useState<
    import('@/services/mediatorEngine/edge/types').MediatorRuntimeEdgeDevDiagnostics | null
  >(null);
  const [mediatorTypingState, setMediatorTypingState] = useState<
    'idle' | 'requesting' | 'retrying' | 'failed'
  >('idle');
  const [typingDots, setTypingDots] = useState('');
  const lastAtomicRetryRef = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    if (mediatorTypingState !== 'requesting' && mediatorTypingState !== 'retrying') {
      setTypingDots('');
      return;
    }
    const id = setInterval(() => {
      setTypingDots((prev) => (prev.length >= 3 ? '' : `${prev}.`));
    }, 450);
    return () => clearInterval(id);
  }, [mediatorTypingState]);

  const enqueueRuntimeClientEvents = useCallback((events: RuntimeClientEvent[]) => {
    if (events.length === 0) return;
    pendingClientEventsRef.current.push(...events);
  }, []);

  const consumeRuntimeClientEvents = useCallback(
    (inlineClientEvents?: RuntimeClientEvent[]): RuntimeClientEvent[] | undefined => {
      const merged = [...pendingClientEventsRef.current, ...(inlineClientEvents ?? [])];
      pendingClientEventsRef.current = [];
      return merged.length > 0 ? merged : undefined;
    },
    []
  );

  const logMediatorCall = useCallback(
    (
      mode: MediatorMode,
      client: 'host' | 'partner' = 'host'
    ) => {
      console.log('[mediator call]', {
        mode,
        mediationId,
        roomId: mediationId,
        client,
      });
    },
    [mediationId]
  );

  const logSetState = useCallback((label: string) => {
    console.log('[LiveMediation setState]', label);
  }, []);

  const setMessagesDebug = useCallback(
    (updater: LiveMessage[] | ((prev: LiveMessage[]) => LiveMessage[])) => {
      if (navigatingAwayRef.current) return;
      logSetState('messages');
      setMessages(updater);
    },
    [logSetState]
  );

  const setSessionDebug = useCallback(
    (updater: LiveSession | null | ((prev: LiveSession | null) => LiveSession | null)) => {
      if (navigatingAwayRef.current) return;
      logSetState('session');
      setSession(updater);
    },
    [logSetState]
  );

  const goToClosure = useCallback(() => {
    if (!mediationId || navigatingAwayRef.current) return;
    navigatingAwayRef.current = true;
    skipNextFocusRefreshRef.current = true;
    isActiveSendRef.current = false;
    generateLockRef.current = null;

    const msgCount = messagesRef.current.filter((m) => m.message_type === 'message').length;
    const closurePhase =
      sessionRef.current?.live_phase ||
      countAskedQuestions(messagesRef.current) ||
      1;

    navigateToDisputeClosure(router, {
      mode: 'live',
      mediationId,
      messageCount: msgCount,
      phase: closurePhase,
      outcome: inferClosureOutcomeFromStatus(sessionRef.current?.status),
    });
  }, [mediationId, router]);

  const goToClosureFromRuntime = useCallback(
    async (session: RuntimeSession) => {
      if (!mediationId || navigatingAwayRef.current || runtimeClosureNavigatedRef.current) {
        return;
      }

      const action = resolveRuntimeClosureAction({ runtimeSession: session });
      if (!shouldPerformRuntimeClosureNavigation(action, runtimeClosureNavigatedRef.current)) {
        return;
      }

      runtimeClosureNavigatedRef.current = true;
      navigatingAwayRef.current = true;
      skipNextFocusRefreshRef.current = true;
      isActiveSendRef.current = false;
      generateLockRef.current = null;
      setRuntimeFailed(false);

      const dbStatus = resolveEffectiveClosureDbStatus(action, session.session.outcome);
      if (dbStatus && sessionRef.current?.status === 'live') {
        try {
          await supabase
            .from('mediations')
            .update({
              status: dbStatus,
              live_progress: 100,
              updated_at: new Date().toISOString(),
            })
            .eq('id', mediationId);
          setSessionDebug((prev) =>
            prev ? { ...prev, status: dbStatus, live_progress: 100 } : prev
          );
        } catch (error) {
          console.warn('[runtime closure] status update failed', error);
        }
      }

      const msgCount = messagesRef.current.filter((m) => m.message_type === 'message').length;
      const closurePhase =
        sessionRef.current?.live_phase ||
        countAskedQuestions(messagesRef.current) ||
        1;
      const outcome = mapRuntimeClosureNavigationOutcome(action, session.session.outcome);

      navigateToDisputeClosure(router, {
        mode: 'live',
        mediationId,
        messageCount: msgCount,
        phase: closurePhase,
        outcome,
      });
    },
    [mediationId, router, setSessionDebug]
  );

  useEffect(() => {
    runtimeClosureNavigatedRef.current = false;
  }, [mediationId]);

  useEffect(() => {
    if (!runtimeSession || loading) return;
    void goToClosureFromRuntime(runtimeSession);
  }, [runtimeSession, loading, goToClosureFromRuntime]);

  const hostUserId = mediationHostId || session?.user_id || user?.id || '';

  const partnerUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (session?.partner_id && session.partner_id !== hostUserId) {
      ids.add(session.partner_id);
    }
    if (partner?.id && partner.id !== hostUserId) ids.add(partner.id);
    messages.forEach((m) => {
      if (
        m.message_type === 'message' &&
        m.sender_id !== hostUserId &&
        m.sender_id !== 'ai'
      ) {
        ids.add(m.sender_id);
      }
    });
    return Array.from(ids);
  }, [session?.partner_id, partner?.id, messages, hostUserId]);

  const isCurrentUserHost = Boolean(user?.id && user.id === hostUserId);
  const currentUserActor = isCurrentUserHost ? ('host' as const) : ('partner' as const);

  const stableParticipantNames = useMemo(
    () =>
      resolveStableParticipantNames(
        isCurrentUserHost,
        user?.name || undefined,
        partner?.name || undefined
      ),
    [isCurrentUserHost, user?.name, partner?.name]
  );

  const partnerUserId = partnerUserIds[0] || partner?.id || null;

  messagesRef.current = messages;
  sessionRef.current = session;

  const paused = session?.live_paused || false;

  const visibleMessages = useMemo(() => {
    if (!user) return messages;
    return filterVisibleLiveMessages(messages, user.id).filter((m) => {
      const content = safeMessageContent(m.content);
      if (m.message_type === 'system' && !content.trim()) return false;
      if (m.metadata?.action === 'ready_next_question') return false;
      if (m.metadata?.action === SESSION_DECISION_ACTION) return false;
      if (m.metadata?.action === PROPOSAL_DECISION_ACTION) return false;
      if (m.metadata?.action === GENERATION_LOCK_ACTION) return false;
      if (isHistoricalConversationStateMessage(m)) return false;
      if (m.metadata?.action === 'extension_start') return false;
      return true;
    });
  }, [messages, user]);

  const turnState = useMemo(() => {
    if (!hostUserId) return null;
    return computeLiveTurnState(messages, hostUserId, partnerUserIds);
  }, [messages, hostUserId, partnerUserIds]);

  const runtimeActionExecution = useMemo(
    () =>
      resolveRuntimeActionExecution({
        runtimeSession,
        runtimeFailed,
        invalidRuntimeState,
      }),
    [runtimeSession, runtimeFailed, invalidRuntimeState]
  );

  const runtimeUnavailable =
    runtimeSessionLoadSettled && runtimeActionExecution.runtimeUnavailable;

  const runtimeBootstrapDiagnosis = useMemo(
    () =>
      diagnoseMediationRuntimeBootstrap({
        hostUserId,
        partnerId: session?.partner_id ?? null,
        rowFound: loadDiagnostics?.rowFound ?? false,
        mediationStatePresent: loadDiagnostics?.mediationStatePresent ?? false,
        sessionMemoryPresent: loadDiagnostics?.sessionMemoryPresent ?? false,
        runtimeSessionPresent: loadDiagnostics?.runtimeSessionPresent ?? false,
      }),
    [
      hostUserId,
      session?.partner_id,
      loadDiagnostics?.rowFound,
      loadDiagnostics?.mediationStatePresent,
      loadDiagnostics?.sessionMemoryPresent,
      loadDiagnostics?.runtimeSessionPresent,
    ]
  );

  const runtimeBootstrapBlocked =
    runtimeBootstrapDiagnosis === 'invalid_participants' ||
    runtimeBootstrapDiagnosis === 'bootstrap_required';

  const runtimeRecoveryEligible =
    runtimeUnavailable && !runtimeBootstrapBlocked;

  const sessionFlow = useMemo(() => {
    if (!hostUserId) return null;
    return resolveRuntimeSessionFlow({
      runtimeSession,
      runtimeFailed,
      invalidRuntimeState,
      questionNumberHint: turnState?.questionNumber,
    }).flow;
  }, [
    runtimeSession,
    runtimeFailed,
    invalidRuntimeState,
    hostUserId,
    turnState?.questionNumber,
  ]);

  const questionCount = turnState?.questionNumber ?? countAskedQuestions(messages);
  const phase = questionCount || session?.live_phase || 1;
  const progress = resolveLiveProgressPercent(runtimeSession, runtimeUnavailable);
  const phaseHeaderLabel = resolveLivePhaseHeaderLabel(runtimeSession, language, {
    runtimeUnavailable,
    recoveryLabel: liveUi.runtimeRecoveryMessage,
  });

  useEffect(() => {
    if (!__DEV__ || !runtimeSessionLoadSettled) return;
    logRuntimeUnavailableDevDiagnostics(
      buildRuntimeUnavailableDevDiagnostics({
        runtimeUnavailableReason: runtimeActionExecution.reason,
        runtimeSessionLoaded: runtimeSessionLoadSettled,
        runtimeSessionShapeValid:
          runtimeSession != null && isRuntimeSessionShape(runtimeSession),
        runtimeFailed,
        invalidRuntimeState,
        loadDiagnostics,
        runtimeSessionPresentInResponse: loadDiagnostics?.runtimeSessionPresent ?? null,
      })
    );
  }, [
    runtimeSessionLoadSettled,
    runtimeActionExecution,
    runtimeSession,
    runtimeFailed,
    invalidRuntimeState,
    loadDiagnostics,
  ]);

  const handleRefreshRuntimeState = useCallback(async () => {
    const logBlocked = (reason: string) => {
      logRuntimeRecoveryBlocked({
        reason,
        runtimeParticipantRole,
        isCurrentUserHost,
        mediationId: mediationId ?? null,
        loadSettled: runtimeSessionLoadSettled,
        runtimeUnavailable,
        attempted: runtimeRecoveryAttemptedRef.current,
        inFlight: runtimeRecoveryInFlightRef.current,
      });
    };

    if (runtimeParticipantRole !== 'host') {
      logBlocked('not_host_role');
      return;
    }
    if (!mediationId) {
      logBlocked('mediation_id_missing');
      return;
    }
    if (runtimeRecoveryInFlightRef.current) {
      logBlocked('recovery_in_flight');
      return;
    }
    if (runtimeBootstrapBlocked) {
      logBlocked(runtimeBootstrapDiagnosis);
      return;
    }

    runtimeRecoveryInFlightRef.current = true;
    bumpRecoveryClickCount();
    setRuntimeFailed(false);
    setError('');
    setRuntimeRecovering(true);

    let loadedState: Awaited<ReturnType<typeof loadMediationRuntimeState>> | null = null;
    let recoveryResult: Awaited<ReturnType<typeof recoverMediationRuntimeSession>> | null = null;

    try {
      const skipPreflightRefresh = runtimeSessionLoadSettled && !runtimeSession;
      let loadedSession: RuntimeSession | null = skipPreflightRefresh ? null : await refreshRuntimeSession();

      if (!loadedSession) {
        loadedState = await loadMediationRuntimeState(mediationId, {
          role: runtimeParticipantRole,
        });

        recoveryResult = await recoverMediationRuntimeSession({
          mediationId,
          loaded: loadedState,
          messages: messagesRef.current,
          hostUserId,
          partnerUserIds,
          role: runtimeParticipantRole,
        });

        if (recoveryResult.recovered) {
          loadedSession = await refreshRuntimeSession();
          logRuntimeRecoveryResult({
            role: runtimeParticipantRole,
            loadedRuntimeSessionPresent: hasRuntimeSession(loadedState.runtimeSession),
            mediationStatePresent: loadedState.mediationState != null,
            sessionMemoryPresent: loadedState.sessionMemory != null,
            recomposeSucceeded: true,
            persistStarted: true,
            persistSucceeded: true,
            persistErrorCode: null,
            refreshedAfterPersist: true,
            loadedAfterPersist: loadedSession != null,
            shapeValidAfterPersist:
              loadedSession != null && isRuntimeSessionShape(loadedSession),
          });
        } else {
          const retryable =
            recoveryResult.reason === 'missing_mediation_state' ||
            recoveryResult.reason === 'missing_session_memory' ||
            recoveryResult.reason === 'missing_state' ||
            recoveryResult.reason === 'recompose_failed' ||
            recoveryResult.reason === 'persist_failed' ||
            recoveryResult.reason === 'persist_shape_invalid';
          if (retryable) {
            runtimeRecoveryAttemptedRef.current = false;
          }
        }
      }
    } finally {
      setRuntimeRecovering(false);
      runtimeRecoveryInFlightRef.current = false;
    }
  }, [
    refreshRuntimeSession,
    bumpRecoveryClickCount,
    runtimeParticipantRole,
    isCurrentUserHost,
    mediationId,
    runtimeSession,
    runtimeSessionLoadSettled,
    runtimeRecoveryEligible,
    runtimeBootstrapBlocked,
    runtimeBootstrapDiagnosis,
    hostUserId,
    partnerUserIds,
  ]);

  useEffect(() => {
    const logBlocked = (reason: string) => {
      logRuntimeRecoveryBlocked({
        reason,
        runtimeParticipantRole,
        isCurrentUserHost,
        mediationId: mediationId ?? null,
        loadSettled: runtimeSessionLoadSettled,
        runtimeUnavailable,
        attempted: runtimeRecoveryAttemptedRef.current,
        inFlight: runtimeRecoveryInFlightRef.current,
      });
    };

    if (!runtimeSessionLoadSettled || !runtimeRecoveryEligible) {
      logBlocked(
        !runtimeSessionLoadSettled
          ? 'load_not_settled'
          : runtimeBootstrapBlocked
            ? runtimeBootstrapDiagnosis
            : 'runtime_not_unavailable'
      );
      return;
    }
    if (runtimeParticipantRole !== 'host' || !mediationId) {
      logBlocked(
        runtimeParticipantRole !== 'host' ? 'not_host_role' : 'mediation_id_missing'
      );
      return;
    }
    if (runtimeRecoveryAttemptedRef.current || runtimeRecoveryInFlightRef.current) {
      logBlocked(
        runtimeRecoveryAttemptedRef.current ? 'recovery_already_attempted' : 'recovery_in_flight'
      );
      return;
    }

    runtimeRecoveryAttemptedRef.current = true;
    void handleRefreshRuntimeState();
  }, [
    runtimeSessionLoadSettled,
    runtimeRecoveryEligible,
    runtimeBootstrapBlocked,
    runtimeBootstrapDiagnosis,
    runtimeParticipantRole,
    isCurrentUserHost,
    mediationId,
    handleRefreshRuntimeState,
  ]);

  const awaitingDecision =
    sessionFlow?.stage === 'awaiting_main_decision' ||
    sessionFlow?.stage === 'awaiting_extension_decision';
  const awaitingProposalDecision = sessionFlow?.stage === 'awaiting_proposal_decision';
  const sessionUnresolvedClosed = sessionFlow?.stage === 'unresolved_but_closed';
  const sessionFinished = sessionFlow?.stage === 'finished';

  const decisionSummaryKind =
    sessionFlow?.stage === 'awaiting_extension_decision'
      ? ('extension_check' as const)
      : ('final_summary' as const);

  const decisionState = useMemo(() => {
    if (!user || !awaitingDecision || !hostUserId) return null;
    return getSessionDecisionState(messages, decisionSummaryKind, hostUserId, partnerUserIds);
  }, [user, awaitingDecision, messages, decisionSummaryKind, hostUserId, partnerUserIds]);

  const runtimeProposalPanelState = useMemo(
    () => resolveRuntimeProposalPanelState(runtimeSession, isCurrentUserHost),
    [runtimeSession, isCurrentUserHost]
  );

  const decisionPanelVisibility = useMemo(
    () =>
      resolveRuntimeDecisionPanelVisibility({
        runtimeSession,
        runtimeUnavailable,
      }),
    [runtimeSession, runtimeUnavailable]
  );

  const showContinueDecisionPanel =
    !processing &&
    (decisionPanelVisibility.showMainDecisionPanel ||
      decisionPanelVisibility.showExtensionDecisionPanel);
  const showProposalPanel =
    !processing &&
    decisionPanelVisibility.showProposalPanel &&
    runtimeProposalPanelState != null &&
    !runtimeProposalPanelState.userDecided;
  const showResolvedConfirmationPanel =
    decisionPanelVisibility.showResolvedConfirmationPanel;

  const userProposalDecided = runtimeProposalPanelState?.userDecided ?? false;

  const userDecisionMade = isCurrentUserHost
    ? decisionState?.hostDecided
    : decisionState?.partnerDecided;

  const proposalWaitingHint = useMemo(() => {
    if (!runtimeProposalPanelState?.awaitingProposal) return '';
    const hostVote = runtimeProposalPanelState.hostVote;
    const partnerVote = runtimeProposalPanelState.partnerVote;
    const userDecided = runtimeProposalPanelState.userDecided;
    const otherDecided = isCurrentUserHost
      ? partnerVote === 'accepted' || partnerVote === 'rejected'
      : hostVote === 'accepted' || hostVote === 'rejected';
    if (userDecided && !otherDecided) return liveUi.proposalAcceptWaiting;
    if (!userDecided && otherDecided) return liveUi.proposalAcceptPartner;
    return '';
  }, [runtimeProposalPanelState, isCurrentUserHost, liveUi]);

  const waitingAnswerDisplay = useMemo(
    () =>
      resolveLiveWaitingAnswerDisplay(
        runtimeSession,
        language,
        isCurrentUserHost,
        runtimeUnavailable
      ),
    [runtimeSession, language, isCurrentUserHost, runtimeUnavailable]
  );

  const proposalWaitingDisplay = useMemo(
    () =>
      resolveLiveProposalWaitingDisplay(
        runtimeSession,
        language,
        isCurrentUserHost,
        runtimeUnavailable
      ),
    [runtimeSession, language, isCurrentUserHost, runtimeUnavailable]
  );

  const continueWaitingDisplay = useMemo(
    () => resolveLiveContinueWaitingDisplay(runtimeSession, language, runtimeUnavailable),
    [runtimeSession, language, runtimeUnavailable]
  );

  const runtimeInputState = useMemo(
    () =>
      resolveRuntimeInputState({
        runtimeSession,
        runtimeUnavailable,
        technical: { sending, processing, paused },
        defaultPlaceholder: liveUi.inputPlaceholder,
        placeholders: {
          safety_hold: liveUi.paused,
          session_finished: liveUi.finishMediation,
          awaiting_decision: liveUi.disputeContinueConfirm,
          proposal_pending: liveUi.proposalPanelTitle,
        },
      }),
    [
      runtimeSession,
      runtimeUnavailable,
      paused,
      sending,
      processing,
      liveUi.inputPlaceholder,
      liveUi.paused,
      liveUi.finishMediation,
      liveUi.disputeContinueConfirm,
      liveUi.proposalPanelTitle,
    ]
  );

  const briefing = useMemo(
    () => buildBriefingFromContext(mediationContext),
    [mediationContext]
  );

  const mediationHostIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !mediationId) return;
    const isFirstLoad = initialLoadKeyRef.current !== mediationId;
    if (isFirstLoad) {
      initialLoadKeyRef.current = mediationId;
      sentAiMessagesRef.current = new Set();
      clearSentAiMessagesRef(mediationId);
      dbHadMessagesRef.current = false;
      extensionStartLockRef.current = false;
      proposedSolutionLockRef.current = false;
      proposalAcceptedFinalLockRef.current = false;
      proposalRejectLockRef.current = false;
      proposalAcceptLockRef.current = false;
      continueDisputeLockRef.current = false;
      resolveSessionLockRef.current = false;
      generateLockRef.current = null;
      logSetState('loading:true');
      setLoading(true);
    }
    setHistoryError('');
    setError('');
    try {
      let context: MediationContext = { combinedDescription: '', analysis: null };
      let isHost = false;
      try {
        const { data: medRow } = await supabase
          .from('mediations')
          .select('user_id, partner_id, status')
          .eq('id', mediationId)
          .maybeSingle();
        isHost = medRow?.user_id === user.id;
        mediationHostIdRef.current = medRow?.user_id ?? null;
        setMediationHostId(medRow?.user_id ?? null);

        if (
          medRow &&
          !isHost &&
          user.id !== medRow.user_id &&
          medRow.partner_id !== user.id
        ) {
          try {
            await linkPartnerToMediation(
              mediationId,
              medRow.user_id,
              user.id,
              couple?.id
            );
          } catch (linkError) {
            console.warn('[live] partner mediation link failed', linkError);
          }
        }

        if (!isHost && medRow?.status !== 'live') {
          if (
            medRow?.status === 'pending_agreements' ||
            medRow?.status === 'resolved'
          ) {
            navigatingAwayRef.current = true;
            routerRef.current.replace({
              pathname: '/mediation/closure',
              params: {
                mode: 'live',
                mediationId,
                messageCount: '0',
                phase: '1',
              },
            });
            return;
          }
          routerRef.current.replace({
            pathname: '/mediation/invite',
            params: { mediationId, role: 'partner' },
          });
          return;
        }

        context = await fetchMediationContext(mediationId);
        const priorAgreements = await fetchPriorAgreementsContext(
          user.id,
          couple?.id,
          language
        );
        if (priorAgreements) {
          context = { ...context, priorAgreements };
        }
        mediationContextRef.current = context;
        setMediationContext(context);
      } catch {
        mediationContextRef.current = null;
        setMediationContext(null);
      }

      if (isHost) {
        await initLiveSession(mediationId, user.id, language);
      }
      const sess = await fetchLiveSession(mediationId, user.id);
      setMediationHostId(sess.user_id);
      logSetState('session:load');
      setSession(sess);

      let msgResult = await fetchLiveMessages(mediationId, { force: true }, user.id);
      console.log(
        `[load] fetched ${msgResult.messages.length} messages for mediationId=${mediationId}`
      );

      if (!msgResult.error && msgResult.messages.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        msgResult = await fetchLiveMessages(mediationId, { force: true }, user.id);
        console.log(
          `[load] retry fetched ${msgResult.messages.length} messages for mediationId=${mediationId}`
        );
      }

      if (!msgResult.error && msgResult.messages.length === 0 && !isHost && isFirstLoad) {
        for (let attempt = 0; attempt < 4; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          msgResult = await fetchLiveMessages(mediationId, { force: true }, user.id);
          if (msgResult.messages.length > 0) break;
        }
      }

      if (msgResult.error) {
        setHistoryError(liveUi.historyError);
        return;
      }

      dbHadMessagesRef.current = msgResult.messages.length > 0;

      if (msgResult.messages.length === 0) {
        if (isHost) {
          setMessagesDebug(buildOpeningLiveMessages(mediationId, context, language));
        } else {
          setHistoryError(liveUi.waitingHostStart);
        }
      } else {
        const merged = dedupeLiveMessages(msgResult.messages);
        setMessagesDebug(merged);
        const historyErr = getHistoryCompletenessError(
          merged,
          user.id,
          liveUi.noAiHistory
        );
        if (historyErr) setHistoryError(historyErr);
      }

      await refreshRuntimeSession();
    } catch {
      setHistoryError(liveUi.historyError);
      setSessionDebug(createMockLiveSession(mediationId, user.id));
    } finally {
      logSetState('loading:false');
      setLoading(false);
    }
  }, [mediationId, user, logSetState, setMessagesDebug, setSessionDebug, language, liveUi.historyError, liveUi.noAiHistory, liveUi.waitingHostStart, couple?.id, refreshRuntimeSession]);

  /** Cicha synchronizacja w tle — NIE chowa czatu. */
  const silentSyncFromSupabase = useCallback(async () => {
    if (!user || !mediationId || focusFetchInFlightRef.current) return;
    if (navigatingAwayRef.current) return;
    if (isActiveSendRef.current || sending || processing) return;

    focusFetchInFlightRef.current = true;

    const pendingEphemeral = messagesRef.current.filter(
      (m) =>
        m.id.startsWith('local-') ||
        m.id.startsWith('local-ai-') ||
        m.id.startsWith('sim-')
    );

    try {
      const msgResult = await fetchLiveMessages(mediationId, { force: true }, user.id);
      if (msgResult.error || msgResult.messages.length === 0) return;

      const merged = mergeLiveMessages(pendingEphemeral, msgResult.messages, user.id);
      const current = messagesRef.current;
      const hasNewMessages = silentSyncDetectedNewMessages(
        merged.length,
        current.length,
        merged[merged.length - 1]?.id,
        current[current.length - 1]?.id
      );
      if (hasNewMessages) {
        setMessagesDebug(merged);
        if (shouldRefreshRuntimeSessionOnSilentSync(hasNewMessages)) {
          void refreshRuntimeSession();
        }
      }
    } finally {
      focusFetchInFlightRef.current = false;
    }
  }, [mediationId, user, sending, processing, setMessagesDebug, refreshRuntimeSession]);

  const silentSyncRef = useRef(silentSyncFromSupabase);
  silentSyncRef.current = silentSyncFromSupabase;

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      console.log('[LiveMediation] blur — reset isActiveSendRef');
      isActiveSendRef.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!mediationId || !user) return;
      if (skipNextFocusRefreshRef.current) {
        skipNextFocusRefreshRef.current = false;
        return;
      }
      // Tylko przy powrocie na ekran — cicha sync, bez blokowania UI.
      void silentSyncRef.current();
    }, [mediationId, user?.id])
  );

  useEffect(() => {
    initialLoadKeyRef.current = null;
    lastSyncedProgressRef.current = null;
    mediationContextRef.current = null;
    setMediationContext(null);
  }, [mediationId]);

  useEffect(() => {
    void loadRef.current();
  }, [mediationId, user?.id]);

  useEffect(() => {
    if (!user || !mediationId || loading) return;

    const syncSessionFromSupabase = async () => {
      if (navigatingAwayRef.current) return;
      try {
        const sess = await fetchLiveSession(mediationId, user.id);
        const renderingPhase = sess.live_phase || 1;
        console.log(
          `[phase sync] DB live_phase: ${sess.live_phase}, rendering: ${renderingPhase}`
        );
        const prevProgress = lastSyncedProgressRef.current;
        if (shouldRefreshRuntimeSessionOnSessionPoll(prevProgress, sess.live_progress ?? 0)) {
          void silentSyncRef.current();
          void refreshRuntimeSession();
        }
        lastSyncedProgressRef.current = sess.live_progress ?? 0;
        setSessionDebug(sess);
      } catch (e) {
        console.warn('[phase sync] failed:', e);
      }
    };

    syncSessionFromSupabase();
    const intervalId = setInterval(syncSessionFromSupabase, 2000);
    return () => clearInterval(intervalId);
  }, [mediationId, user, loading, setSessionDebug, refreshRuntimeSession]);

  useEffect(() => {
    console.log(
      `[LiveMediation render] message count: ${messages.length}, phase: ${session?.live_phase ?? 1}`
    );
  }, [messages.length, session?.live_phase]);

  useEffect(() => {
    if (!mediationId) return;
    return subscribeLiveMessages(
      mediationId,
      (msg) => {
        if (navigatingAwayRef.current) return;
        setMessagesDebug((prev) => appendLiveMessage(prev, msg));
      },
      (update) => {
        if (navigatingAwayRef.current) return;
        setSessionDebug((prev) => (prev ? { ...prev, ...update } : prev));
        void refreshRuntimeSession();

        const status = (update as { status?: string }).status;
        if (status === 'pending_agreements' || status === 'resolved') {
          goToClosure();
        }
      }
    );
  }, [mediationId, setMessagesDebug, setSessionDebug, goToClosure, refreshRuntimeSession]);

  // Fallback gdy realtime nie dostarczy wiadomości — cicha sync co 3s, bez blokady UI.
  useEffect(() => {
    if (!mediationId || !user || loading) return;
    const intervalId = setInterval(() => {
      void silentSyncRef.current();
    }, 3000);
    return () => clearInterval(intervalId);
  }, [mediationId, user?.id, loading]);

  const enrichedMessages = useMemo(
    () => (user ? attachInlineHints(visibleMessages, user.id) : []),
    [visibleMessages, user]
  );

  useEffect(() => {
    if (!mediationId) return;
    loadDismissedFunFacts(funFactScope).then(setDismissedFunFacts);
  }, [mediationId, funFactScope]);

  const handleDismissFunFact = useCallback(
    async (id: string) => {
      setDismissedFunFacts((prev) => new Set([...prev, id]));
      await dismissFunFact(funFactScope, id);
    },
    [funFactScope]
  );

  const chatItems: ChatItem[] = useMemo(() => {
    return enrichedMessages.map(({ message, inlineHint, inlineFunFact }) => ({
      kind: 'message' as const,
      message,
      inlineHint,
      inlineFunFact:
        inlineFunFact && !dismissedFunFacts.has(inlineFunFact.id) ? inlineFunFact : undefined,
    }));
  }, [enrichedMessages, dismissedFunFacts]);

  const applyAiTurn = useCallback(
    async (
      triggerMessage: LiveMessage,
      currentMessages: LiveMessage[],
      mode: MediatorMode = 'generate_question',
      force = false,
      clientEvents?: RuntimeClientEvent[]
    ): Promise<LiveMessage[]> => {
      if (!user || !mediationId || !hostUserId) return currentMessages;

      const triggerSource = resolveApplyAiTurnTriggerSource(mode, triggerMessage);
      logApplyAiTurnDev(
        buildApplyAiTurnDevLogPayload({
          triggerSource,
          runtimeSession,
          messages: currentMessages,
          previousMessageCount: messageCountAtLastAiTurnRef.current,
          hostUserId,
          partnerUserIds,
          runtimeFailed,
        })
      );

      if (
        shouldBlockRuntimeMediatorGeneration({
          runtimeSession,
          mode,
          force,
          clientEvents,
        })
      ) {
        return currentMessages;
      }

      if (mode === 'opening_summary' || mode === 'generate_question' || mode === 'extension_question') {
        if (!shouldHostLeadGeneration(user.id, hostUserId)) return currentMessages;
      }

      if (mode === 'opening_summary' && shouldSkipOpeningBootstrap(currentMessages)) {
        return currentMessages;
      }

      if (!force && !isRuntimeDirectMediatorMode(mode)) {
        const turn = computeLiveTurnState(currentMessages, hostUserId, partnerUserIds);
        const lastQ = turn.lastQuestion;
        const isBootstrap =
          mode === 'opening_summary' ||
          (mode === 'generate_question' && turn.questionNumber === 0);
        if (
          mode === 'generate_question' &&
          hasSummaryKind(currentMessages, 'final_summary') &&
          !isExtensionActive(currentMessages)
        ) {
          return currentMessages;
        }
        if (!isBootstrap && !canGenerateNextQuestion(turn, partnerUserIds)) {
          return currentMessages;
        }
        if (!isBootstrap && lastQ && questionAdvancedAfter(currentMessages, lastQ.id)) {
          return currentMessages;
        }
      }

      const turnFingerprint = buildMediatorTurnFingerprint({
        mediationId,
        mode,
        messages: currentMessages,
        runtimeSession,
        questionIndex: sessionRef.current?.current_question_index ?? questionCount,
      });
      if (
        !force &&
        isDuplicateMediatorTurnFingerprint(turnFingerprint, lastAiTurnFingerprintRef.current)
      ) {
        return currentMessages;
      }

      const currentPhase = sessionRef.current?.live_phase || questionCount || 1;

      try {
        if (!mediationContextRef.current) {
          const base = await fetchMediationContext(mediationId);
          const priorAgreements = await fetchPriorAgreementsContext(user.id, couple?.id, language);
          mediationContextRef.current = priorAgreements
            ? { ...base, priorAgreements }
            : base;
        }

        logMediatorCall(mode, isCurrentUserHost ? 'host' : 'partner');

        const refEvents = consumeRuntimeClientEvents(clientEvents);
        const runtimeClientEvents = resolveRuntimeClientEventsForTurn({
          messages: currentMessages,
          hostUserId,
          partnerUserIds,
          runtimeSession,
          pendingRefEvents: refEvents,
        });

        const aiResponse = await processMediationTurn(
          triggerMessage,
          hostUserId,
          partnerUserIds,
          currentPhase,
          currentMessages,
          sessionRef.current?.current_question_index ?? questionCount,
          language,
          mediationContextRef.current,
          mode,
          stableParticipantNames,
          runtimeClientEvents
        );

        if (mode === 'opening_summary') {
          console.log('[live opening response]', aiResponse);
        }

        await insertAiMessages(
          mediationId,
          currentPhase,
          aiResponse,
          hostUserId,
          partnerUserId,
          sentAiMessagesRef.current
        );

        const localAiMessages = buildLocalAiMessages(
          mediationId,
          aiResponse.phase ?? currentPhase,
          aiResponse,
          hostUserId,
          partnerUserId
        );
        const nextMessages = dedupeLiveMessages([...currentMessages, ...localAiMessages]);
        setMessagesDebug(nextMessages);
        setError('');
        setRuntimeFailed(false);
        lastAiTurnFingerprintRef.current = turnFingerprint;
        messageCountAtLastAiTurnRef.current = currentMessages.length;

        const freshSession = await fetchLiveSession(mediationId, user.id);
        setSessionDebug(freshSession);
        await refreshRuntimeSession();

        if (
          mode === 'opening_summary' &&
          couple?.id &&
          !liveUsageIncrementedRef.current
        ) {
          liveUsageIncrementedRef.current = true;
          try {
            await incrementFeatureUsage('create_live_mediation', {
              userId: user.id,
              coupleId: couple.id,
              usageKey: mediationId,
            });
          } catch (usageError) {
            console.warn('[live mediation] usage increment failed', usageError);
          }
        }

        return nextMessages;
      } catch (error) {
        console.error('[live mediation crash]', error);
        setRuntimeFailed(true);
        setError(liveUi.runtimeRecoveryMessage);
        throw error instanceof Error ? error : new Error(String(error ?? 'Unknown mediation error'));
      }
    },
    [user, mediationId, hostUserId, partnerUserIds, partnerUserId, setMessagesDebug, setSessionDebug, language, couple?.id, questionCount, stableParticipantNames, isCurrentUserHost, logMediatorCall, refreshRuntimeSession, consumeRuntimeClientEvents, runtimeSession, runtimeFailed, liveUi.runtimeRecoveryMessage]
  );

  const applyRuntimeClientActionTurn = useCallback(
    async (
      events: RuntimeClientEvent[],
      mode: MediatorMode = 'answer_ack'
    ): Promise<boolean> => {
      if (!user || !mediationId || !hostUserId || events.length === 0) {
        return false;
      }

      const senderId =
        currentUserActor === 'host' ? hostUserId : partnerUserId || user.id;
      const triggerMessage: LiveMessage = {
        id: `runtime-client-${events[0].kind}-${Date.now()}`,
        mediation_id: mediationId,
        sender_id: senderId,
        sender_name: user.name || liveUi.you,
        content: '',
        message_type: 'system',
        is_private: false,
        recipient_id: null,
        phase,
        metadata: { runtimeClientAction: events[0].kind },
        created_at: new Date().toISOString(),
      };

      try {
        setRuntimeFailed(false);
        await applyAiTurn(triggerMessage, messagesRef.current, mode, true, events);
        return true;
      } catch {
        setRuntimeFailed(true);
        return false;
      }
    },
    [
      user,
      mediationId,
      hostUserId,
      partnerUserId,
      currentUserActor,
      phase,
      liveUi.you,
      applyAiTurn,
    ]
  );

  const runGenerateNextQuestion = useCallback(
    async (currentMessages: LiveMessage[]) => {
      if (navigatingAwayRef.current) return;
      if (!user || !mediationId || !hostUserId || processing || paused) return;
      if (runtimeUnavailable) return;
      if (!shouldHostLeadGeneration(user.id, hostUserId)) return;
      if (generationInProgressRef.current) return;

      const turn = computeLiveTurnState(currentMessages, hostUserId, partnerUserIds);
      const lastQ = turn.lastQuestion;
      if (!lastQ || !canGenerateNextQuestion(turn, partnerUserIds)) return;
      if (questionAdvancedAfter(currentMessages, lastQ.id)) return;
      if (generationLockAfter(currentMessages, lastQ.id)) return;
      if (generateLockRef.current === lastQ.id) return;
      if (!tryBeginGeneration(mediationId, lastQ.id)) return;

      generateLockRef.current = lastQ.id;
      generationInProgressRef.current = true;

      try {
        const fresh = await fetchLiveMessages(mediationId, { force: true }, user.id);
        if (!fresh.error) {
          if (questionAdvancedAfter(fresh.messages, lastQ.id)) {
            setMessagesDebug(dedupeLiveMessages(fresh.messages));
            return;
          }
          if (generationLockAfter(fresh.messages, lastQ.id)) {
            setMessagesDebug(dedupeLiveMessages(fresh.messages));
            return;
          }
        }

        const lockMsg = await signalGenerationLock(
          mediationId,
          user.id,
          user.name || liveUi.you,
          lastQ.id,
          phase
        );
        const withLock = dedupeLiveMessages([...messagesRef.current, lockMsg]);
        setMessagesDebug(withLock);

        const recheck = await fetchLiveMessages(mediationId, { force: true }, user.id);
        if (!recheck.error) {
          if (questionAdvancedAfter(recheck.messages, lastQ.id)) {
            setMessagesDebug(dedupeLiveMessages(recheck.messages));
            return;
          }
          const locks = recheck.messages.filter(
            (m) =>
              m.message_type === 'system' &&
              m.metadata?.action === GENERATION_LOCK_ACTION &&
              m.metadata?.questionId === lastQ.id
          );
          const myLock = locks.find((m) => m.metadata?.userId === user.id);
          const earlierLock = locks.find(
            (m) =>
              m.metadata?.userId !== user.id &&
              myLock &&
              new Date(m.created_at).getTime() < new Date(myLock.created_at).getTime()
          );
          if (earlierLock) {
            setMessagesDebug(dedupeLiveMessages(recheck.messages));
            return;
          }
        }

        isActiveSendRef.current = true;
        setProcessing(true);
        setMediatorTypingState('requesting');
        setError('');

        const messagesForTurn = recheck.error ? withLock : dedupeLiveMessages(recheck.messages);
        const derivedGate = deriveParticipantReplyStateFromMessages({
          messages: messagesForTurn,
          hostUserId,
          partnerUserIds,
        });

        logParticipantReplyGateDev({
          lastMediatorQuestionId: derivedGate.lastMediatorQuestionId,
          hostReplyMessageId: derivedGate.hostReplyMessageId,
          partnerReplyMessageId: derivedGate.partnerReplyMessageId,
          hostReplied: derivedGate.hostReplied,
          partnerReplied: derivedGate.partnerReplied,
          bothReplied: derivedGate.bothReplied,
          triggerReason: derivedGate.triggerReason,
          questionTurn: derivedGate.questionTurn,
        });

        if (!derivedGate.bothReplied || derivedGate.questionTurn == null) {
          return;
        }

        const atomicResult = await processBothParticipantReplies(
          {
            mediationId,
            messages: messagesForTurn,
            hostUserId,
            partnerUserIds,
            language,
            participantNames: stableParticipantNames,
          },
          {
            callRuntime: async (runtimeInput) => {
              const { callMediatorRuntime } = await import(
                '@/services/mediatorRuntimeClient/mediatorRuntimeClient'
              );
              return callMediatorRuntime(runtimeInput, {
                retry: {
                  sleep: async (ms) => {
                    setMediatorTypingState('retrying');
                    await new Promise<void>((resolve) => setTimeout(resolve, ms));
                  },
                },
              });
            },
          }
        );

        if (atomicResult.success && atomicResult.response) {
          if (__DEV__) {
            setLastEdgeDevDiagnostics(atomicResult.runtime?.devDiagnostics ?? null);
          }
          setError('');
          setRuntimeFailed(false);
          setMediatorTypingState('idle');
          lastAtomicRetryRef.current = null;
          const aiResponse = atomicResult.response;
          const localAiMessages = buildLocalAiMessages(
            mediationId,
            aiResponse.phase ?? phase,
            aiResponse,
            hostUserId,
            partnerUserId
          );
          const nextMessages = dedupeLiveMessages([...messagesForTurn, ...localAiMessages]);
          setMessagesDebug(nextMessages);
          await insertAiMessages(
            mediationId,
            phase,
            aiResponse,
            hostUserId,
            partnerUserId,
            sentAiMessagesRef.current
          );
          const freshSession = await fetchLiveSession(mediationId, user.id);
          setSessionDebug(freshSession);
          await refreshRuntimeSession();
          return;
        }

        // Runtime reliability: if runtime responded with a recoverable LLM error, do not fall back to legacy
        // generation and do not insert any AI messages. Let the user retry the same round.
        if (
          atomicResult.requestCount > 0 &&
          (atomicResult.errorCode === 'llm_temporarily_unavailable' ||
            atomicResult.errorCode === 'llm_validation_failed')
        ) {
          setError('Mościk chwilowo nie może odpowiedzieć.');
          setMediatorTypingState('failed');

          const retryMessagesForTurn = messagesForTurn;

          lastAtomicRetryRef.current = async () => {
            if (!mediationId || generationInProgressRef.current) return;
            generationInProgressRef.current = true;
            setProcessing(true);
            setMediatorTypingState('requesting');
            setError('');
            try {
              const retryAtomic = await processBothParticipantReplies(
                {
                  mediationId,
                  messages: retryMessagesForTurn,
                  hostUserId,
                  partnerUserIds,
                  language,
                  participantNames: stableParticipantNames,
                },
                {
                  callRuntime: async (runtimeInput) => {
                    const { callMediatorRuntime } = await import(
                      '@/services/mediatorRuntimeClient/mediatorRuntimeClient'
                    );
                    return callMediatorRuntime(runtimeInput, {
                      retry: {
                        sleep: async (ms) => {
                          setMediatorTypingState('retrying');
                          await new Promise<void>((resolve) => setTimeout(resolve, ms));
                        },
                      },
                    });
                  },
                }
              );

              if (retryAtomic.success && retryAtomic.response) {
                if (__DEV__) {
                  setLastEdgeDevDiagnostics(retryAtomic.runtime?.devDiagnostics ?? null);
                }
                setError('');
                setRuntimeFailed(false);
                setMediatorTypingState('idle');
                const aiResponse = retryAtomic.response;
                const localAiMessages = buildLocalAiMessages(
                  mediationId,
                  aiResponse.phase ?? phase,
                  aiResponse,
                  hostUserId,
                  partnerUserId
                );
                const nextMessages = dedupeLiveMessages([...retryMessagesForTurn, ...localAiMessages]);
                setMessagesDebug(nextMessages);
                await insertAiMessages(
                  mediationId,
                  phase,
                  aiResponse,
                  hostUserId,
                  partnerUserId,
                  sentAiMessagesRef.current
                );
                const freshSession = await fetchLiveSession(mediationId, user.id);
                setSessionDebug(freshSession);
                await refreshRuntimeSession();
                lastAtomicRetryRef.current = null;
                return;
              }

              setError('Mościk chwilowo nie może odpowiedzieć.');
              setMediatorTypingState('failed');
            } finally {
              generationInProgressRef.current = false;
              setProcessing(false);
            }
          };
          return;
        }

        if (atomicResult.requestCount === 0) {
          return;
        }

        setError('Mościk chwilowo nie może odpowiedzieć.');
        setMediatorTypingState('failed');
        generateLockRef.current = null;
        return;
      } catch (e: unknown) {
        generateLockRef.current = null;
        setError(e instanceof Error ? e.message : liveUi.sendError);
        setMediatorTypingState('failed');
      } finally {
        endGeneration(mediationId, lastQ.id);
        generationInProgressRef.current = false;
        isActiveSendRef.current = false;
        setProcessing(false);
        setMediatorTypingState((s) => (s === 'failed' ? 'failed' : 'idle'));
      }
    },
    [
      user,
      mediationId,
      hostUserId,
      processing,
      paused,
      partnerUserIds,
      applyAiTurn,
      liveUi.sendError,
      setMessagesDebug,
      runtimeSession,
      runtimeFailed,
      invalidRuntimeState,
      runtimeUnavailable,
      language,
      phase,
      partnerUserId,
      insertAiMessages,
      setSessionDebug,
      refreshRuntimeSession,
    ]
  );

  // Gdy oboje gotowi — tylko lider wykonuje atomowy runtime turn (1 request).
  useEffect(() => {
    if (navigatingAwayRef.current) return;
    if (!user || !mediationId || !turnState?.bothAnswered || !isCurrentUserHost) return;
    if (!shouldHostLeadGeneration(user.id, hostUserId)) return;
    if (processing || paused || sending || isActiveSendRef.current) return;
    if (generationInProgressRef.current) return;

    const lastQ = turnState.lastQuestion;
    if (!lastQ || questionAdvancedAfter(messages, lastQ.id)) return;
    if (generationLockAfter(messages, lastQ.id)) return;
    if (generateLockRef.current === lastQ.id) return;

    void runGenerateNextQuestion(messagesRef.current).catch((e: unknown) => {
      generateLockRef.current = null;
      setError(e instanceof Error ? e.message : liveUi.sendError);
    });
  }, [
    user,
    mediationId,
    partnerUserIds,
    hostUserId,
    turnState?.bothAnswered,
    turnState?.lastQuestion?.id,
    isCurrentUserHost,
    processing,
    paused,
    sending,
    messages.length,
    runGenerateNextQuestion,
    liveUi.sendError,
  ]);

  // Start sesji: podsumowanie → pierwsze pytanie (tylko lider).
  useEffect(() => {
    if (navigatingAwayRef.current) return;
    if (!user || !mediationId || !hostUserId || loading || processing || paused) return;
    if (!runtimeSessionLoadSettled) return;
    if (runtimeBootstrapDiagnosis === 'invalid_participants') return;
    if (runtimeFailed || invalidRuntimeState) return;
    const needsRuntimeBootstrap = runtimeBootstrapDiagnosis === 'bootstrap_required';
    if (needsRuntimeBootstrap) {
      if (!canHostRunRuntimeBootstrap(hostUserId, session?.partner_id)) return;
    } else if (runtimeUnavailable) {
      return;
    }
    if (!shouldHostLeadGeneration(user.id, hostUserId)) return;
    if (openingBootstrapDoneRef.current || sessionBootstrapLockRef.current) return;

    const msgs = messagesRef.current;
    if (shouldSkipOpeningBootstrap(msgs)) {
      openingBootstrapDoneRef.current = true;
      return;
    }

    if (
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession,
        mode: 'opening_summary',
        force: true,
      })
    ) {
      openingBootstrapDoneRef.current = true;
      return;
    }

    openingBootstrapDoneRef.current = true;
    sessionBootstrapLockRef.current = true;
    const mode: MediatorMode = 'opening_summary';

    void applyAiTurn(
      {
        id: `bootstrap-${mode}-${Date.now()}`,
        mediation_id: mediationId,
        sender_id: 'ai',
        sender_name: 'ai',
        content: '',
        message_type: 'message',
        is_private: false,
        recipient_id: null,
        phase: 0,
        metadata: { bootstrap: true, mode },
        created_at: new Date().toISOString(),
      },
      msgs,
      mode,
      true
    )
      .catch((e: unknown) => {
        console.error('[live mediation bootstrap]', e);
        setRuntimeFailed(true);
        setError(e instanceof Error ? e.message : liveUi.runtimeRecoveryMessage);
      })
      .finally(() => {
        sessionBootstrapLockRef.current = false;
      });
  }, [
    user,
    mediationId,
    hostUserId,
    session?.partner_id,
    partnerUserIds,
    loading,
    processing,
    paused,
    applyAiTurn,
    liveUi.sendError,
    runtimeSession,
    runtimeSessionLoadSettled,
    runtimeUnavailable,
    runtimeBootstrapDiagnosis,
    runtimeFailed,
    invalidRuntimeState,
  ]);

  const handleContinueDispute = useCallback(async () => {
    if (!user || !mediationId || processing || !awaitingDecision) return;
    if (userDecisionMade) return;
    if (!canExecuteRuntimeClientAction(continueDisputeLockRef.current, processing)) return;
    continueDisputeLockRef.current = true;

    const plan = planLiveRuntimeClientAction('continue_session', {
      runtimeSession,
      runtimeFailed,
    });

    isActiveSendRef.current = true;
    setProcessing(true);
    setError('');

    try {
      const events = buildRuntimeClientEvents('continue_session', currentUserActor);

      if (plan.callRuntimeTurn) {
        const ok = await applyRuntimeClientActionTurn(
          events,
          decisionSummaryKind === 'extension_check' ? 'extension_check' : 'final_summary'
        );
        if (!ok) {
          continueDisputeLockRef.current = false;
          setRuntimeFailed(true);
          setError(liveUi.runtimeRecoveryMessage);
        }
        return;
      }

      setError(liveUi.runtimeRecoveryMessage);
    } catch (e: unknown) {
      continueDisputeLockRef.current = false;
      setError(e instanceof Error ? e.message : liveUi.sendError);
    } finally {
      isActiveSendRef.current = false;
      setProcessing(false);
    }
  }, [
    user,
    mediationId,
    processing,
    awaitingDecision,
    userDecisionMade,
    decisionSummaryKind,
    phase,
    liveUi.you,
    liveUi.sendError,
    setMessagesDebug,
    currentUserActor,
    runtimeSession,
    runtimeFailed,
    applyRuntimeClientActionTurn,
  ]);

  const handleProposalAccept = useCallback(async () => {
    if (!user || !mediationId || processing || !awaitingProposalDecision) return;
    if (userProposalDecided) return;
    if (!canExecuteRuntimeClientAction(proposalAcceptLockRef.current, processing)) return;
    proposalAcceptLockRef.current = true;

    const plan = planLiveRuntimeClientAction('proposal_accepted', {
      runtimeSession,
      runtimeFailed,
    });

    isActiveSendRef.current = true;
    setProcessing(true);
    setError('');

    try {
      const events = buildRuntimeClientEvents('proposal_accepted', currentUserActor);

      if (plan.callRuntimeTurn) {
        const ok = await applyRuntimeClientActionTurn(events, 'proposed_solution');
        if (!ok) {
          proposalAcceptLockRef.current = false;
          setRuntimeFailed(true);
          setError(liveUi.runtimeRecoveryMessage);
        }
        return;
      }

      setError(liveUi.runtimeRecoveryMessage);
    } catch (e: unknown) {
      proposalAcceptLockRef.current = false;
      setError(e instanceof Error ? e.message : liveUi.sendError);
    } finally {
      isActiveSendRef.current = false;
      setProcessing(false);
    }
  }, [
    user,
    mediationId,
    processing,
    awaitingProposalDecision,
    userProposalDecided,
    phase,
    liveUi.you,
    liveUi.sendError,
    setMessagesDebug,
    currentUserActor,
    runtimeSession,
    runtimeFailed,
    applyRuntimeClientActionTurn,
  ]);

  const handleProposalReject = useCallback(async () => {
    if (!user || !mediationId || processing || !awaitingProposalDecision) return;
    if (!canExecuteRuntimeClientAction(proposalRejectLockRef.current, processing)) return;
    proposalRejectLockRef.current = true;

    const plan = planLiveRuntimeClientAction('proposal_rejected', {
      runtimeSession,
      runtimeFailed,
    });

    isActiveSendRef.current = true;
    setProcessing(true);
    setError('');

    try {
      const events = buildRuntimeClientEvents('proposal_rejected', currentUserActor);

      if (plan.callRuntimeTurn) {
        const ok = await applyRuntimeClientActionTurn(events, 'proposed_solution');
        if (!ok) {
          proposalRejectLockRef.current = false;
          setRuntimeFailed(true);
          setError(liveUi.runtimeRecoveryMessage);
        }
        return;
      }

      setError(liveUi.runtimeRecoveryMessage);
    } catch (e: unknown) {
      proposalRejectLockRef.current = false;
      setError(e instanceof Error ? e.message : liveUi.sendError);
    } finally {
      isActiveSendRef.current = false;
      setProcessing(false);
    }
  }, [
    user,
    mediationId,
    processing,
    awaitingProposalDecision,
    phase,
    language,
    liveUi.you,
    liveUi.sendError,
    setMessagesDebug,
    currentUserActor,
    runtimeSession,
    runtimeFailed,
    applyRuntimeClientActionTurn,
  ]);

  const handleSend = useCallback(async () => {
    if (!user || !mediationId || !canSubmitLiveMessage(runtimeInputState, input)) return;

    const text = input.trim();
    logSetState('input:clear');
    setInput('');
    isActiveSendRef.current = true;
    logSetState('sending:true');
    setSending(true);
    setError('');

    try {
      const lastQuestion = turnState?.lastQuestion;
      const replyToQuestionId =
        (typeof lastQuestion?.metadata?.questionId === 'string'
          ? lastQuestion.metadata.questionId
          : null) ??
        lastQuestion?.id ??
        null;
      const sent = await sendUserMessage(
        mediationId,
        user.id,
        user.name || liveUi.you,
        text,
        sessionRef.current?.live_phase || 1,
        replyToQuestionId
      );
      const workingMessages = [...messagesRef.current, sent];
      setMessagesDebug(workingMessages);

      const beforeTurn = computeLiveTurnState(messagesRef.current, hostUserId, partnerUserIds);
      const afterTurn = computeLiveTurnState(workingMessages, hostUserId, partnerUserIds);
      const replyQuestionTurn = afterTurn.questionNumber ?? 1;
      enqueueRuntimeClientEvents(
        buildParticipantReplyClientEvents(
          currentUserActor === 'host' ? 'host' : 'partner',
          replyQuestionTurn
        )
      );

      // AI reaguje dopiero gdy OBIE strony odpowiedziały — tylko lider wysyła wskazówki.
      const lastQ = afterTurn.lastQuestion;
      if (
        afterTurn.bothAnswered &&
        !beforeTurn.bothAnswered &&
        lastQ &&
        shouldHostLeadGeneration(user.id, hostUserId)
      ) {
        logSetState('processing:true');
        setProcessing(true);
        await runGenerateNextQuestion(workingMessages);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : liveUi.sendError);
    } finally {
      isActiveSendRef.current = false;
      logSetState('sending:false');
      setSending(false);
      logSetState('processing:false');
      setProcessing(false);
    }
  }, [
    user,
    mediationId,
    input,
    runtimeInputState,
    hostUserId,
    partnerUserIds,
    applyAiTurn,
    logSetState,
    setMessagesDebug,
    liveUi.you,
    liveUi.sendError,
    currentUserActor,
    enqueueRuntimeClientEvents,
    runGenerateNextQuestion,
    runtimeSession,
    language,
  ]);

  async function handlePause() {
    if (!mediationId || paused) return;
    await pauseLiveMediation(mediationId);
    setSessionDebug((prev) => (prev ? { ...prev, live_paused: true } : prev));
  }

  function handleDisputeResolved() {
    setShowDisputeResolvedConfirm(true);
  }

  function confirmDisputeResolved() {
    if (!mediationId || resolveSessionLockRef.current) return;

    const plan = planLiveRuntimeClientAction('resolve_session', {
      runtimeSession,
      runtimeFailed,
    });

    resolveSessionLockRef.current = true;
    setShowDisputeResolvedConfirm(false);

    if (plan.callRuntimeTurn) {
      void (async () => {
        isActiveSendRef.current = true;
        setProcessing(true);
        setError('');
        try {
          const events = buildRuntimeClientEvents('resolve_session', currentUserActor);
          const ok = await applyRuntimeClientActionTurn(
            events,
            decisionSummaryKind === 'extension_check' ? 'extension_check' : 'final_summary'
          );
          if (!ok) {
            resolveSessionLockRef.current = false;
            setRuntimeFailed(true);
            setError(liveUi.runtimeRecoveryMessage);
          }
        } catch (e: unknown) {
          resolveSessionLockRef.current = false;
          setRuntimeFailed(true);
          setError(e instanceof Error ? e.message : liveUi.sendError);
        } finally {
          isActiveSendRef.current = false;
          setProcessing(false);
        }
      })();
      return;
    }

    setError(liveUi.runtimeRecoveryMessage);
  }

  function handleEnd() {
    if (!mediationId) {
      Alert.alert(getClosureBundle(language).ui.errorTitle, liveUi.noMediationId);
      return;
    }
    setShowEndConfirm(true);
  }

  function confirmEnd() {
    if (!mediationId) return;
    setShowEndConfirm(false);
    goToClosure();
  }

  function renderItem({ item }: { item: ChatItem }) {
    return (
      <ChatBubble
        message={item.message}
        currentUserId={user?.id || ''}
        inlineHint={item.inlineHint}
        inlineFunFact={item.inlineFunFact}
        onDismissFunFact={handleDismissFunFact}
        lang={language}
        labels={chatLabels}
      />
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
        <Text style={styles.loadingText}>{liveUi.loadingHistory}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        {__DEV__ ? (
          <LiveRuntimeDevDiagnostics
            mediationId={mediationId}
            runtimeSession={runtimeSession}
            runtimeFailed={runtimeFailed}
            invalidRuntimeState={invalidRuntimeState}
            devDiagnostics={lastEdgeDevDiagnostics ?? syncedDevDiagnostics}
          />
        ) : null}
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{liveUi.title}</Text>
            <Text style={styles.headerPhase}>{phaseHeaderLabel}</Text>
          </View>
          <Pressable onPress={handlePause} style={styles.headerBtn} disabled={paused}>
            <MaterialIcons
              name="pause-circle-outline"
              size={26}
              color={paused ? Colors.textMuted : Colors.warning}
            />
          </Pressable>
        </View>

        {!showContinueDecisionPanel && !showProposalPanel && !showResolvedConfirmationPanel ? (
        <Pressable onPress={handleDisputeResolved} style={styles.disputeResolvedBtn}>
          <MaterialIcons name="gavel" size={20} color="#fff" />
          <Text style={styles.disputeResolvedText}>{liveUi.disputeResolved}</Text>
        </Pressable>
        ) : null}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {paused ? (
          <View style={styles.pausedBanner}>
            <MaterialIcons name="pause-circle" size={18} color={Colors.warning} />
            <Text style={styles.pausedText}>{liveUi.paused}</Text>
          </View>
        ) : null}

        {historyError ? (
          <View style={styles.historyErrorBanner}>
            <Text style={styles.historyErrorText}>{historyError}</Text>
            <Pressable onPress={load} style={styles.retryBtn}>
              <MaterialIcons name="refresh" size={18} color={Colors.primaryLight} />
              <Text style={styles.retryBtnText}>{liveUi.retry}</Text>
            </Pressable>
          </View>
        ) : null}

        {runtimeBootstrapDiagnosis === 'invalid_participants' ? (
          <View style={styles.runtimeRecoveryBanner}>
            <MaterialIcons name="error-outline" size={18} color={Colors.error} />
            <Text style={styles.runtimeRecoveryText}>
              Invalid mediation participants: host and partner must be different users. Fix the
              mediation invite before continuing.
            </Text>
          </View>
        ) : null}

        {runtimeBootstrapDiagnosis === 'bootstrap_required' &&
        !canHostRunRuntimeBootstrap(hostUserId, session?.partner_id) ? (
          <View style={styles.runtimeRecoveryBanner}>
            <MaterialIcons name="group-off" size={18} color={Colors.warning} />
            <Text style={styles.runtimeRecoveryText}>
              Runtime bootstrap requires a distinct partner to join before the live session can
              start.
            </Text>
          </View>
        ) : null}

        {runtimeRecoveryEligible ? (
          <View style={styles.runtimeRecoveryBanner}>
            <MaterialIcons name="cloud-off" size={18} color={Colors.warning} />
            <Text style={styles.runtimeRecoveryText}>
              {runtimeRecovering ? liveUi.loadingHistory : liveUi.runtimeRecoveryMessage}
            </Text>
            <Pressable
              onPress={() => void handleRefreshRuntimeState()}
              disabled={runtimeRecovering}
              style={styles.retryBtn}
            >
              <MaterialIcons name="refresh" size={18} color={Colors.primaryLight} />
              <Text style={styles.retryBtnText}>{liveUi.runtimeRecoveryRefresh}</Text>
            </Pressable>
          </View>
        ) : null}

        {briefing ? (
          <BriefingCard
            briefing={briefing}
            expanded={briefingExpanded}
            onToggle={() => setBriefingExpanded((v) => !v)}
            labels={{
              title: liveUi.briefingTitle,
              trigger: liveUi.briefingTrigger,
              fallback: liveUi.briefingFallback,
            }}
          />
        ) : null}

        <FlatList
          ref={listRef}
          data={chatItems}
          keyExtractor={(item) => item.message.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            {lastAtomicRetryRef.current ? (
              <Pressable
                onPress={() => void lastAtomicRetryRef.current?.()}
                style={styles.errorRetryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.errorRetryText}>Spróbuj ponownie</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {mediatorTypingState === 'requesting' || mediatorTypingState === 'retrying' ? (
          <View style={styles.processingBar}>
            <ActivityIndicator size="small" color={Colors.primaryLight} />
            <Text style={styles.processingText}>
              {mediatorTypingState === 'retrying'
                ? `Mościk analizuje rozmowę${typingDots}`
                : `Mościk pisze${typingDots}`}
            </Text>
          </View>
        ) : null}

        {processing ? (
          <View style={styles.processingBar}>
            <ActivityIndicator size="small" color={Colors.primaryLight} />
            <Text style={styles.processingText}>{lm.service.hintAnalyzing}</Text>
          </View>
        ) : null}

        {waitingAnswerDisplay.label ? (
          <View style={styles.waitingBar}>
            <MaterialIcons name="hourglass-empty" size={16} color={Colors.textMuted} />
            <Text style={styles.waitingText}>{waitingAnswerDisplay.label}</Text>
          </View>
        ) : null}

        {proposalWaitingHint && runtimeProposalPanelState?.awaitingProposal ? (
          <View style={styles.waitingBar}>
            <MaterialIcons name="hourglass-empty" size={16} color={Colors.textMuted} />
            <Text style={styles.waitingText}>{proposalWaitingDisplay.label}</Text>
          </View>
        ) : null}

        {showContinueDecisionPanel ? (
          <View style={styles.generateNextWrap}>
            <Text style={styles.decisionPanelTitle}>{liveUi.decisionPanelTitle}</Text>
            {continueWaitingDisplay.label ? (
              <Text style={styles.generateNextHint}>{continueWaitingDisplay.label}</Text>
            ) : null}
            <Pressable
              onPress={handleContinueDispute}
              disabled={processing || userDecisionMade}
              style={({ pressed }) => [
                styles.generateNextBtn,
                (processing || userDecisionMade) && styles.generateNextBtnDisabled,
                { opacity: pressed && !userDecisionMade && !processing ? 0.9 : 1 },
              ]}
            >
              <MaterialIcons name="navigate-next" size={20} color="#fff" />
              <Text style={styles.generateNextBtnText}>{liveUi.disputeContinue}</Text>
            </Pressable>
            <Pressable
              onPress={handleDisputeResolved}
              style={styles.decisionResolvedBtn}
            >
              <MaterialIcons name="gavel" size={18} color={Colors.success} />
              <Text style={styles.decisionResolvedText}>{liveUi.disputeResolved}</Text>
            </Pressable>
          </View>
        ) : null}

        {showProposalPanel ? (
          <View style={styles.generateNextWrap}>
            <Text style={styles.decisionPanelTitle}>{liveUi.proposalPanelTitle}</Text>
            {proposalWaitingHint ? (
              <Text style={styles.generateNextHint}>{proposalWaitingDisplay.label}</Text>
            ) : null}
            <Pressable
              onPress={handleProposalAccept}
              disabled={processing || userProposalDecided}
              style={({ pressed }) => [
                styles.generateNextBtn,
                (processing || userProposalDecided) && styles.generateNextBtnDisabled,
                { opacity: pressed && !userProposalDecided && !processing ? 0.9 : 1 },
              ]}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.generateNextBtnText}>{liveUi.proposalAcceptYes}</Text>
            </Pressable>
            <Pressable
              onPress={handleProposalReject}
              disabled={processing}
              style={styles.decisionResolvedBtn}
            >
              <MaterialIcons name="refresh" size={18} color={Colors.warning} />
              <Text style={styles.decisionResolvedText}>{liveUi.proposalAcceptNo}</Text>
            </Pressable>
          </View>
        ) : null}

        {runtimeInputState.visible ? (
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={runtimeInputState.placeholder ?? liveUi.inputPlaceholder}
              placeholderTextColor={Colors.textMuted}
              multiline
              style={styles.input}
              editable={runtimeInputState.enabled}
            />
            <Pressable
              onPress={handleSend}
              disabled={!canSubmitLiveMessage(runtimeInputState, input)}
              style={({ pressed }) => [
                styles.sendBtn,
                !canSubmitLiveMessage(runtimeInputState, input) && styles.sendBtnDisabled,
                { opacity: pressed ? 0.88 : 1 },
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialIcons name="send" size={22} color="#fff" />
              )}
            </Pressable>
          </View>

          <Pressable onPress={handleEnd} style={styles.endBtn}>
            <MaterialIcons name="check-circle-outline" size={18} color={Colors.success} />
            <Text style={styles.endBtnText}>{liveUi.finishMediation}</Text>
          </Pressable>
        </View>
        ) : null}

        {showResolvedConfirmationPanel ? (
          <View style={[styles.generateNextWrap, { paddingBottom: insets.bottom + Spacing.sm }]}>
            <Pressable onPress={goToClosure} style={styles.generateNextBtn}>
              <MaterialIcons name="check-circle-outline" size={20} color="#fff" />
              <Text style={styles.generateNextBtnText}>{liveUi.finishMediation}</Text>
            </Pressable>
          </View>
        ) : null}

        <ConfirmDialog
          visible={showEndConfirm}
          title={liveUi.endTitle}
          message={liveUi.endMessage}
          confirmLabel={liveUi.endConfirm}
          cancelLabel={liveUi.endCancel}
          onConfirm={confirmEnd}
          onCancel={() => setShowEndConfirm(false)}
        />

        <ConfirmDialog
          visible={showDisputeResolvedConfirm}
          title={liveUi.disputeResolvedTitle}
          message={liveUi.disputeResolvedMessage}
          confirmLabel={liveUi.disputeResolved}
          cancelLabel={liveUi.endCancel}
          onConfirm={confirmDisputeResolved}
          onCancel={() => setShowDisputeResolvedConfirm(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  headerPhase: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.primaryLight,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  briefingCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  briefingTitle: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  briefingBody: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  briefingSummary: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  briefingTrigger: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.warning,
  },
  briefingTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  briefingTagEmotion: {
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  briefingTagNeed: {
    backgroundColor: Colors.success + '22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  briefingTagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  briefingCollapsed: {
    marginTop: 4,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
  },
  disputeResolvedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.success,
  },
  disputeResolvedText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#fff',
  },
  waitingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginHorizontal: Spacing.lg,
  },
  waitingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  generateNextWrap: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  generateNextHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  generateNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignSelf: 'center',
    minWidth: '72%',
  },
  generateNextBtnDisabled: {
    opacity: 0.5,
  },
  generateNextBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: '#fff',
  },
  decisionPanelTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  decisionResolvedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  decisionResolvedText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.success,
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.warning + '18',
  },
  pausedText: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.warning,
  },
  errorBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.error + '15',
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.error,
  },
  errorRetryBtn: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.error + '12',
    borderWidth: 1,
    borderColor: Colors.error + '33',
  },
  errorRetryText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.error,
  },
  historyErrorBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.error + '12',
    borderWidth: 1,
    borderColor: Colors.error + '33',
    gap: Spacing.sm,
  },
  historyErrorText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  runtimeRecoveryBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.warning + '12',
    borderWidth: 1,
    borderColor: Colors.warning + '33',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  runtimeRecoveryText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.warning,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  retryBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.primaryLight,
  },
  refreshingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    marginBottom: Spacing.xs,
  },
  refreshingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chatLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  chatContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  aiBubbleWrap: {
    alignSelf: 'stretch',
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  aiBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMeta: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  aiBubble: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '28',
  },
  phaseTransitionBubble: {
    borderColor: Colors.gold + '55',
  },
  aiBubbleText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  aiQuestionText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  hintBubbleWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  hintBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    maxWidth: '92%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.warningLight + '66',
    borderWidth: 1,
    borderColor: Colors.warning + '44',
  },
  hintBubbleText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bubbleRow: {
    maxWidth: '82%',
    marginVertical: 4,
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
    marginLeft: 4,
  },
  senderLabelMine: {
    marginLeft: 0,
    marginRight: 4,
    alignSelf: 'flex-end',
  },
  inlineHint: {
    marginTop: 6,
    maxWidth: '100%',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningLight + '55',
    borderWidth: 1,
    borderColor: Colors.warning + '44',
  },
  inlineHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  inlineHintLabel: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: Colors.warning,
  },
  inlineHintText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  inlineHintTooltip: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.warning,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bubble: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleMine: {
    backgroundColor: Colors.primary + '40',
    borderBottomRightRadius: 6,
  },
  bubblePartner: {
    backgroundColor: Colors.surfaceElevated,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bubbleTime: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  bubbleTimeMine: {
    alignSelf: 'flex-end',
  },
  bubbleTimeTheirs: {
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  typingRow: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceElevated,
  },
  typingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  processingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  processingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.primaryLight,
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: Spacing.sm,
  },
  endBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.success,
  },
});
