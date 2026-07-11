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
  compareLiveDecisionPanels,
  logLiveDecisionPanelComparison,
} from '@/services/mediatorRuntimeClient/compareLiveDecisionPanels';
import {
  compareRuntimeNextBeat,
  logLiveGenerationIntentComparison,
} from '@/services/mediatorRuntimeClient/compareRuntimeNextBeat';
import {
  logRuntimeGenerationModeResolution,
  resolveRuntimeGenerationMode,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationMode';
import { resolveLegacyLiveDecisionPanelState } from '@/services/mediatorRuntimeClient/resolveLegacyLiveDecisionPanel';
import { resolveRuntimeDecisionPanelVisibility } from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';
import { buildRuntimeClientEvents } from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';
import type { RuntimeClientEvent } from '@/types/mediator';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { getClosureBundle } from '@/constants/i18n/closure';
import type { Language } from '@/constants/i18n';
import { fmt } from '@/utils/i18nFormat';
import { fetchPriorAgreementsContext } from '@/services/agreementArchive';
import { supabase } from '@/services/supabase';
import {
  appendLiveMessage,
  applyAiResponseLocally,
  buildBriefingFromContext,
  buildLocalAiMessages,
  buildOpeningLiveMessages,
  clearSentAiMessagesRef,
  computeLiveSessionFlow,
  computeLiveTurnState,
  getSessionDecisionState,
  signalExtensionStart,
  signalSessionDecision,
  SESSION_DECISION_ACTION,
  PROPOSAL_DECISION_ACTION,
  PROPOSAL_ACCEPTED_FINAL_KIND,
  ALTERNATIVE_SOLUTION_KIND,
  getProposalDecisionState,
  signalProposalDecision,
  buildAlternativeProposalMessage,
  buildProposalAcceptedFinalMessage,
  insertProposalClosureSummary,
  generationLockAfter,
  CONVERSATION_STATE_ACTION,
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
  hintsSentAfterQuestion,
  canGenerateNextQuestion,
  LiveBriefing,
  MediationContext,
  getPhaseLabel,
  getPhaseProgress,
  getConversationState,
  initLiveSession,
  insertAiMessages,
  LiveMessage,
  LiveSession,
  mergeLiveMessages,
  pauseLiveMediation,
  processGenerateNextTurn,
  processMediationTurn,
  resolveGenerateMode,
  sendUserMessage,
  signalReadyForNextQuestion,
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
  const { mediationId } = useLocalSearchParams<{
    mediationId?: string;
  }>();

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

  const runtimeSessionReadonly = useRuntimeSession(mediationId);
  const { runtimeSession, refreshRuntimeSession } = runtimeSessionReadonly;
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
  const initialLoadKeyRef = useRef<string | null>(null);
  const lastSyncedProgressRef = useRef<number | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;
  const sentAiMessagesRef = useRef(new Set<string>());
  const mediationContextRef = useRef<MediationContext | null>(null);
  const generateLockRef = useRef<string | null>(null);
  const sessionBootstrapLockRef = useRef(false);
  const liveUsageIncrementedRef = useRef(false);
  const extensionStartLockRef = useRef(false);
  const proposedSolutionLockRef = useRef(false);
  const proposalAcceptedFinalLockRef = useRef(false);
  const proposalRejectLockRef = useRef(false);
  const generationInProgressRef = useRef(false);
  const pendingClientEventsRef = useRef<RuntimeClientEvent[]>([]);

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
      state?: ReturnType<typeof getConversationState> | null,
      client: 'host' | 'partner' = 'host'
    ) => {
      console.log('[mediator call]', {
        mode,
        mediationId,
        roomId: mediationId,
        questionCount: state?.questionCount,
        currentQuestion: state?.currentQuestion,
        mainConflictQuestionAsked: state?.mainConflictQuestionAsked,
        openingSummaryDone: state?.openingSummaryDone,
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

  const hostUserId = mediationHostId || session?.user_id || user?.id || '';

  const partnerUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (session?.partner_id) ids.add(session.partner_id);
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
      if (m.metadata?.action === CONVERSATION_STATE_ACTION) return false;
      if (m.metadata?.action === 'extension_start') return false;
      return true;
    });
  }, [messages, user]);

  const sessionFlow = useMemo(() => {
    if (!hostUserId) return null;
    return computeLiveSessionFlow(messages, hostUserId, partnerUserIds);
  }, [messages, hostUserId, partnerUserIds]);

  const turnState = useMemo(() => {
    if (!hostUserId) return null;
    return computeLiveTurnState(messages, hostUserId, partnerUserIds);
  }, [messages, hostUserId, partnerUserIds]);

  const questionCount = turnState?.questionNumber ?? countAskedQuestions(messages);
  const phase = questionCount || session?.live_phase || 1;
  const legacyProgress = getPhaseProgress(phase, session?.live_progress, sessionFlow?.maxQuestions);
  const legacyPhaseLabel = getPhaseLabel(phase, language, sessionFlow, messages);
  const progress = resolveLiveProgressPercent(runtimeSession, legacyProgress);
  const phaseHeaderLabel = resolveLivePhaseHeaderLabel(
    runtimeSession,
    legacyPhaseLabel,
    language
  );

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

  const showGenerateNext = false;

  const continueHint = useMemo(() => {
    if (!decisionState) return '';
    const userDecided = isCurrentUserHost
      ? decisionState.hostDecided
      : decisionState.partnerDecided;
    const otherDecided = isCurrentUserHost
      ? decisionState.partnerDecided
      : decisionState.hostDecided;
    if (userDecided) return liveUi.disputeContinueWaiting;
    if (otherDecided) return liveUi.disputeContinuePartner;
    return liveUi.disputeContinueConfirm;
  }, [decisionState, isCurrentUserHost, liveUi]);

  const legacyShowDecisionPanel = Boolean(
    awaitingDecision && decisionState && !decisionState.bothContinue && !processing
  );

  const proposalDecisionState = useMemo(() => {
    if (!hostUserId || !awaitingProposalDecision) return null;
    return getProposalDecisionState(messages, hostUserId, partnerUserIds);
  }, [awaitingProposalDecision, messages, hostUserId, partnerUserIds]);

  const userProposalDecided = proposalDecisionState
    ? isCurrentUserHost
      ? proposalDecisionState.hostDecided
      : proposalDecisionState.partnerDecided
    : false;

  const legacyShowProposalPanel = Boolean(
    awaitingProposalDecision && proposalDecisionState && !userProposalDecided && !processing
  );

  const legacyDecisionPanelState = useMemo(
    () =>
      resolveLegacyLiveDecisionPanelState({
        sessionFlowStage: sessionFlow?.stage,
        showDecisionPanel: legacyShowDecisionPanel,
        showProposalPanel: legacyShowProposalPanel,
        sessionUnresolvedClosed,
        sessionFinished,
      }),
    [
      sessionFlow?.stage,
      legacyShowDecisionPanel,
      legacyShowProposalPanel,
      sessionUnresolvedClosed,
      sessionFinished,
    ]
  );

  const decisionPanelVisibility = useMemo(
    () =>
      resolveRuntimeDecisionPanelVisibility({
        runtimeSession,
        legacy: legacyDecisionPanelState,
        legacyVisibility: {
          showDecisionPanel: legacyShowDecisionPanel,
          showProposalPanel: legacyShowProposalPanel,
          sessionUnresolvedClosed,
        },
        sessionFlowStage: sessionFlow?.stage,
      }),
    [
      runtimeSession,
      legacyDecisionPanelState,
      legacyShowDecisionPanel,
      legacyShowProposalPanel,
      sessionUnresolvedClosed,
      sessionFlow?.stage,
    ]
  );

  const showContinueDecisionPanel =
    decisionPanelVisibility.showMainDecisionPanel ||
    decisionPanelVisibility.showExtensionDecisionPanel;
  const showProposalPanel = decisionPanelVisibility.showProposalPanel;
  const showResolvedConfirmationPanel =
    decisionPanelVisibility.showResolvedConfirmationPanel;

  useEffect(() => {
    if (!__DEV__) return;
    logLiveDecisionPanelComparison(
      compareLiveDecisionPanels(runtimeSession, legacyDecisionPanelState)
    );
  }, [runtimeSession, legacyDecisionPanelState]);

  useEffect(() => {
    if (!__DEV__ || !hostUserId) return;
    const turn = computeLiveTurnState(messages, hostUserId, partnerUserIds);
    const legacyMode = resolveGenerateMode(turn, messages, hostUserId, partnerUserIds);
    logLiveGenerationIntentComparison(
      compareRuntimeNextBeat({ runtimeSession, legacyMode })
    );
    logRuntimeGenerationModeResolution(
      resolveRuntimeGenerationMode({ runtimeSession, legacyMode })
    );
  }, [runtimeSession, messages, hostUserId, partnerUserIds]);

  const proposalWaitingHint = useMemo(() => {
    if (!awaitingProposalDecision || !proposalDecisionState) return '';
    const userDecided = isCurrentUserHost
      ? proposalDecisionState.hostDecided
      : proposalDecisionState.partnerDecided;
    const otherDecided = isCurrentUserHost
      ? proposalDecisionState.partnerDecided
      : proposalDecisionState.hostDecided;
    if (userDecided && !otherDecided) return liveUi.proposalAcceptWaiting;
    if (!userDecided && otherDecided) return liveUi.proposalAcceptPartner;
    return '';
  }, [awaitingProposalDecision, proposalDecisionState, isCurrentUserHost, liveUi]);

  const legacyWaitingAnswerHint = useMemo(() => {
    if (!turnState?.lastQuestion || turnState.bothAnswered) return '';
    const userAnswered = isCurrentUserHost
      ? turnState.hostAnswered
      : turnState.partnerAnswered;
    const otherAnswered = isCurrentUserHost
      ? turnState.partnerAnswered
      : turnState.hostAnswered;
    if (userAnswered && !otherAnswered) {
      return liveUi.waitingPartnerAnswer;
    }
    if (!userAnswered && otherAnswered) {
      return liveUi.waitingYourAnswer;
    }
    return liveUi.waitingBothAnswers;
  }, [turnState, isCurrentUserHost, liveUi]);

  const waitingAnswerDisplay = useMemo(
    () =>
      resolveLiveWaitingAnswerDisplay(
        runtimeSession,
        legacyWaitingAnswerHint,
        language,
        isCurrentUserHost
      ),
    [runtimeSession, legacyWaitingAnswerHint, language, isCurrentUserHost]
  );

  const proposalWaitingDisplay = useMemo(
    () =>
      resolveLiveProposalWaitingDisplay(
        runtimeSession,
        proposalWaitingHint,
        language,
        isCurrentUserHost
      ),
    [runtimeSession, proposalWaitingHint, language, isCurrentUserHost]
  );

  const continueWaitingDisplay = useMemo(
    () => resolveLiveContinueWaitingDisplay(runtimeSession, continueHint, language),
    [runtimeSession, continueHint, language]
  );

  const runtimeInputState = useMemo(
    () =>
      resolveRuntimeInputState({
        runtimeSession,
        legacy: {
          showDecisionPanel: showContinueDecisionPanel,
          showProposalPanel,
          sessionFinished,
          awaitingProposalDecision,
          sessionUnresolvedClosed: showResolvedConfirmationPanel,
          paused,
        },
        technical: { sending, processing },
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
      showContinueDecisionPanel,
      showProposalPanel,
      sessionFinished,
      awaitingProposalDecision,
      showResolvedConfirmationPanel,
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
          .select('user_id, status')
          .eq('id', mediationId)
          .maybeSingle();
        isHost = medRow?.user_id === user.id;
        mediationHostIdRef.current = medRow?.user_id ?? null;
        setMediationHostId(medRow?.user_id ?? null);

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
      const hasNewMessages =
        merged.length !== current.length ||
        merged[merged.length - 1]?.id !== current[current.length - 1]?.id;
      if (hasNewMessages) {
        setMessagesDebug(merged);
        void refreshRuntimeSession();
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
        if (prevProgress !== null && sess.live_progress !== prevProgress) {
          void silentSyncRef.current();
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
  }, [mediationId, user, loading, setSessionDebug]);

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

        const status = (update as { status?: string }).status;
        if (status === 'pending_agreements' || status === 'resolved') {
          goToClosure();
        }
      }
    );
  }, [mediationId, setMessagesDebug, setSessionDebug, goToClosure]);

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
      mode: MediatorMode = 'answer_ack',
      force = false,
      clientEvents?: RuntimeClientEvent[]
    ): Promise<LiveMessage[]> => {
      if (!user || !mediationId || !hostUserId) return currentMessages;

      if (mode === 'opening_summary' || mode === 'generate_question') {
        if (!shouldHostLeadGeneration(user.id, hostUserId)) return currentMessages;
      }

      if (mode === 'opening_summary') {
        const convState = getConversationState(currentMessages);
        if (shouldSkipOpeningBootstrap(currentMessages, convState)) {
          return currentMessages;
        }
      }

      if (mode === 'answer_ack') {
        if (!shouldHostLeadGeneration(user.id, hostUserId)) return currentMessages;
        const ackQuestion = getLastQuestionMessage(currentMessages);
        if (ackQuestion && hintsSentAfterQuestion(currentMessages, ackQuestion.id)) {
          return currentMessages;
        }
      }

      if (mode !== 'answer_ack' && !force) {
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

      const currentPhase = sessionRef.current?.live_phase || questionCount || 1;
      try {
      if (!mediationContextRef.current) {
        const base = await fetchMediationContext(mediationId);
        const priorAgreements = await fetchPriorAgreementsContext(user.id, couple?.id, language);
        mediationContextRef.current = priorAgreements
          ? { ...base, priorAgreements }
          : base;
      }

      const useDirect =
        force ||
        mode === 'opening_summary' ||
        mode === 'proposed_solution' ||
        mode === 'final_summary' ||
        mode === 'extension_check' ||
        mode === 'mid_summary';

      const participantNames = stableParticipantNames;
      const convState = getConversationState(currentMessages);
      logMediatorCall(
        mode,
        convState,
        isCurrentUserHost ? 'host' : 'partner'
      );

      const runtimeClientEvents = consumeRuntimeClientEvents(clientEvents);

      const aiResponse = useDirect
        ? await processMediationTurn(
            triggerMessage,
            hostUserId,
            partnerUserIds,
            currentPhase,
            currentMessages,
            sessionRef.current?.current_question_index ?? questionCount,
            language,
            mediationContextRef.current,
            mode,
            participantNames,
            runtimeClientEvents
          )
        : mode === 'answer_ack'
          ? await processMediationTurn(
              triggerMessage,
              hostUserId,
              partnerUserIds,
              currentPhase,
              currentMessages,
              sessionRef.current?.current_question_index ?? questionCount,
              language,
              mediationContextRef.current,
              'answer_ack',
              participantNames,
              runtimeClientEvents
            )
          : await processGenerateNextTurn(
              mediationId,
              hostUserId,
              partnerUserIds,
              currentMessages,
              language,
              mediationContextRef.current,
              participantNames,
              runtimeClientEvents
            );

      if (mode === 'opening_summary') {
        console.log('[live opening response]', aiResponse);
      }

      const localAiMessages = buildLocalAiMessages(
        mediationId,
        aiResponse.phase ?? currentPhase,
        aiResponse,
        hostUserId,
        partnerUserId
      );

      if (mode === 'opening_summary') {
        console.log('[messages before insert]', currentMessages);
        console.log('[messages to insert]', localAiMessages);
      }

      const nextMessages = dedupeLiveMessages([...currentMessages, ...localAiMessages]);
      setMessagesDebug(nextMessages);

      if (mode === 'opening_summary') {
        console.log('[messages after insert]', nextMessages);
      }

      try {
        await insertAiMessages(
          mediationId,
          currentPhase,
          aiResponse,
          hostUserId,
          partnerUserId,
          sentAiMessagesRef.current
        );
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
      } catch (e) {
        console.error('[live mediation crash]', e);
        console.error('[live mediation crash string]', String(e));
        try {
          console.error('[live mediation crash json]', JSON.stringify(e, null, 2));
        } catch {
          // Non-serializable error payload.
        }
        console.warn('[applyAiTurn] insertAiMessages failed:', e);
        setSessionDebug((prev) =>
          applyAiResponseLocally(prev, aiResponse, currentPhase, mediationId, hostUserId)
        );
      }

      return nextMessages;
      } catch (error) {
        console.error('[live mediation crash]', error);
        console.error('[live mediation crash string]', String(error));
        try {
          console.error('[live mediation crash json]', JSON.stringify(error, null, 2));
        } catch {
          // Non-serializable error payload.
        }
        throw error instanceof Error ? error : new Error(String(error ?? 'Unknown mediation error'));
      }
    },
    [user, mediationId, hostUserId, partnerUserIds, partnerUserId, partner?.name, setMessagesDebug, setSessionDebug, language, couple?.id, questionCount, stableParticipantNames, isCurrentUserHost, logMediatorCall, refreshRuntimeSession, consumeRuntimeClientEvents]
  );

  const runGenerateNextQuestion = useCallback(
    async (currentMessages: LiveMessage[]) => {
      if (navigatingAwayRef.current) return;
      if (!user || !mediationId || !hostUserId || processing || paused) return;
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
        setError('');

        const legacyMode = resolveGenerateMode(turn, withLock, hostUserId, partnerUserIds);
        const { mode } = resolveRuntimeGenerationMode({
          runtimeSession,
          legacyMode,
        });
        if (!mode) {
          generateLockRef.current = null;
          return;
        }

        await applyAiTurn(
          {
            id: `gen-${Date.now()}`,
            mediation_id: mediationId,
            sender_id: 'ai',
            sender_name: 'ai',
            content: '',
            message_type: 'message',
            is_private: false,
            recipient_id: null,
            phase: turn.questionNumber + 1,
            metadata: { generateNext: true, afterQuestionId: lastQ.id },
            created_at: new Date().toISOString(),
          },
          withLock,
          mode
        );
      } catch (e: unknown) {
        generateLockRef.current = null;
        setError(e instanceof Error ? e.message : liveUi.sendError);
      } finally {
        endGeneration(mediationId, lastQ.id);
        generationInProgressRef.current = false;
        isActiveSendRef.current = false;
        setProcessing(false);
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
    ]
  );

  const handleGenerateNext = useCallback(async () => {
    if (!user || !mediationId || !hostUserId || processing || paused) return;

    const turn = computeLiveTurnState(messagesRef.current, hostUserId, partnerUserIds);
    if (!turn.bothAnswered || !turn.lastQuestion) return;
    const alreadyReady = isCurrentUserHost ? turn.hostReady : turn.partnerReady;
    if (alreadyReady) return;

    const lastQ = getLastQuestionMessage(messagesRef.current);
    if (!lastQ) return;

    isActiveSendRef.current = true;
    setProcessing(true);
    setError('');

    try {
      const readyMsg = await signalReadyForNextQuestion(
        mediationId,
        user.id,
        user.name || liveUi.you,
        lastQ.id,
        phase
      );
      const withReady = dedupeLiveMessages([...messagesRef.current, readyMsg]);
      setMessagesDebug(withReady);
      // Generowanie uruchamia wyłącznie useEffect (lider) gdy oboje gotowi.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : liveUi.sendError);
    } finally {
      isActiveSendRef.current = false;
      setProcessing(false);
    }
  }, [
    user,
    mediationId,
    hostUserId,
    isCurrentUserHost,
    processing,
    paused,
    partnerUserIds,
    phase,
    liveUi.you,
    liveUi.sendError,
    setMessagesDebug,
  ]);

  // Gdy oboje gotowi — tylko lider generuje (unikaj podwójnych pytań na 2 urządzeniach).
  useEffect(() => {
    if (navigatingAwayRef.current) return;
    if (!user || !turnState?.bothAnswered || !isCurrentUserHost) return;
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
    partnerUserIds,
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
    if (!shouldHostLeadGeneration(user.id, hostUserId)) return;
    if (sessionBootstrapLockRef.current) return;

    const msgs = messagesRef.current;
    const convState = getConversationState(msgs);
    if (shouldSkipOpeningBootstrap(msgs, convState)) return;

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
        console.error('[live mediation bootstrap string]', String(e));
        setError(e instanceof Error ? e.message : liveUi.sendError);
      })
      .finally(() => {
        sessionBootstrapLockRef.current = false;
      });
  }, [
    user,
    mediationId,
    hostUserId,
    partnerUserIds,
    loading,
    processing,
    paused,
    messages.length,
    applyAiTurn,
    liveUi.sendError,
  ]);

  const userDecisionMade = isCurrentUserHost
    ? decisionState?.hostDecided
    : decisionState?.partnerDecided;

  const handleContinueDispute = useCallback(async () => {
    if (!user || !mediationId || processing || !awaitingDecision) return;
    if (userDecisionMade) return;

    isActiveSendRef.current = true;
    setProcessing(true);
    setError('');

    try {
      const msg = await signalSessionDecision(
        mediationId,
        user.id,
        user.name || liveUi.you,
        'continue',
        decisionSummaryKind,
        phase
      );
      enqueueRuntimeClientEvents(
        buildRuntimeClientEvents('continue_session', currentUserActor)
      );
      setMessagesDebug((prev) => dedupeLiveMessages([...prev, msg]));
    } catch (e: unknown) {
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
    enqueueRuntimeClientEvents,
    currentUserActor,
  ]);

  // Oboje potwierdzili kontynuację po podsumowaniu → start 5 dodatkowych pytań.
  useEffect(() => {
    if (navigatingAwayRef.current) return;
    if (!user || !mediationId || processing) return;
    if (sessionFlow?.stage !== 'questions' || isExtensionActive(messages)) return;
    if (!hasSummaryKind(messages, 'final_summary')) return;

    const decision = getSessionDecisionState(
      messages,
      'final_summary',
      hostUserId,
      partnerUserIds
    );
    if (!decision.bothContinue) return;
    if (!shouldHostLeadGeneration(user.id, hostUserId)) return;
    if (extensionStartLockRef.current) return;

    extensionStartLockRef.current = true;
    void (async () => {
      setProcessing(true);
      try {
        const extMsg = await signalExtensionStart(mediationId, phase);
        const withExt = dedupeLiveMessages([...messagesRef.current, extMsg]);
        setMessagesDebug(withExt);
        await applyAiTurn(
          {
            id: `ext-q-${Date.now()}`,
            mediation_id: mediationId,
            sender_id: 'ai',
            sender_name: 'ai',
            content: '',
            message_type: 'message',
            is_private: false,
            recipient_id: null,
            phase: LIVE_QUESTIONS_TARGET + 1,
            metadata: { extensionStart: true },
            created_at: new Date().toISOString(),
          },
          withExt,
          'generate_question',
          true,
          buildRuntimeClientEvents('start_extension', 'host')
        );
      } catch (e: unknown) {
        extensionStartLockRef.current = false;
        setError(e instanceof Error ? e.message : liveUi.sendError);
      } finally {
        setProcessing(false);
      }
    })();
  }, [
    user,
    mediationId,
    processing,
    sessionFlow?.stage,
    messages.length,
    hostUserId,
    partnerUserIds,
    phase,
    applyAiTurn,
    liveUi.sendError,
    setMessagesDebug,
  ]);

  // Oboje potwierdzili kontynuację po rundzie dodatkowej → propozycja rozwiązania AI.
  useEffect(() => {
    if (navigatingAwayRef.current) return;
    if (!user || !mediationId || processing) return;
    if (!hasSummaryKind(messages, 'extension_check')) return;
    if (hasSummaryKind(messages, 'proposed_solution')) return;

    const decision = getSessionDecisionState(
      messages,
      'extension_check',
      hostUserId,
      partnerUserIds
    );
    if (!decision.bothContinue) return;
    if (!shouldHostLeadGeneration(user.id, hostUserId)) return;
    if (proposedSolutionLockRef.current) return;

    proposedSolutionLockRef.current = true;
    void (async () => {
      setProcessing(true);
      try {
        await applyAiTurn(
          {
            id: `proposal-${Date.now()}`,
            mediation_id: mediationId,
            sender_id: 'ai',
            sender_name: 'ai',
            content: '',
            message_type: 'message',
            is_private: false,
            recipient_id: null,
            phase,
            metadata: { proposedSolution: true },
            created_at: new Date().toISOString(),
          },
          messagesRef.current,
          'proposed_solution',
          true
        );
      } catch (e: unknown) {
        proposedSolutionLockRef.current = false;
        setError(e instanceof Error ? e.message : liveUi.sendError);
      } finally {
        setProcessing(false);
      }
    })();
  }, [
    user,
    mediationId,
    processing,
    messages.length,
    partnerUserIds,
    phase,
    applyAiTurn,
    liveUi.sendError,
  ]);

  const handleProposalAccept = useCallback(async () => {
    if (!user || !mediationId || processing || !awaitingProposalDecision) return;
    if (userProposalDecided) return;

    isActiveSendRef.current = true;
    setProcessing(true);
    setError('');

    try {
      const msg = await signalProposalDecision(
        mediationId,
        user.id,
        user.name || liveUi.you,
        'accepted',
        phase
      );
      enqueueRuntimeClientEvents(
        buildRuntimeClientEvents('proposal_accepted', currentUserActor)
      );
      setMessagesDebug((prev) => dedupeLiveMessages([...prev, msg]));
    } catch (e: unknown) {
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
    enqueueRuntimeClientEvents,
    currentUserActor,
  ]);

  const handleProposalReject = useCallback(async () => {
    if (!user || !mediationId || processing || !awaitingProposalDecision) return;
    if (proposalRejectLockRef.current) return;
    proposalRejectLockRef.current = true;

    isActiveSendRef.current = true;
    setProcessing(true);
    setError('');

    try {
      const decisionMsg = await signalProposalDecision(
        mediationId,
        user.id,
        user.name || liveUi.you,
        'rejected',
        phase
      );
      enqueueRuntimeClientEvents(
        buildRuntimeClientEvents('proposal_rejected', currentUserActor)
      );
      const altMsg = await insertProposalClosureSummary(
        mediationId,
        buildAlternativeProposalMessage(language),
        ALTERNATIVE_SOLUTION_KIND,
        phase,
        'unresolved_but_closed'
      );
      setMessagesDebug((prev) => dedupeLiveMessages([...prev, decisionMsg, altMsg]));
      goToClosure();
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
    goToClosure,
    enqueueRuntimeClientEvents,
    currentUserActor,
  ]);

  // Oboje zaakceptowali propozycję → final summary i zamknięcie.
  useEffect(() => {
    if (navigatingAwayRef.current) return;
    if (!user || !mediationId || processing) return;
    if (!hasSummaryKind(messages, 'proposed_solution')) return;
    if (hasSummaryKind(messages, PROPOSAL_ACCEPTED_FINAL_KIND)) return;
    if (hasSummaryKind(messages, ALTERNATIVE_SOLUTION_KIND)) return;

    const proposalState = getProposalDecisionState(messages, hostUserId, partnerUserIds);
    if (!proposalState.bothAccepted) return;
    if (!shouldHostLeadGeneration(user.id, hostUserId)) return;
    if (proposalAcceptedFinalLockRef.current) return;

    proposalAcceptedFinalLockRef.current = true;
    void (async () => {
      setProcessing(true);
      try {
        const finalMsg = await insertProposalClosureSummary(
          mediationId,
          buildProposalAcceptedFinalMessage(language),
          PROPOSAL_ACCEPTED_FINAL_KIND,
          phase,
          'accepted'
        );
        setMessagesDebug((prev) => dedupeLiveMessages([...prev, finalMsg]));
        goToClosure();
      } catch (e: unknown) {
        proposalAcceptedFinalLockRef.current = false;
        setError(e instanceof Error ? e.message : liveUi.sendError);
      } finally {
        setProcessing(false);
      }
    })();
  }, [
    user,
    mediationId,
    processing,
    messages.length,
    hostUserId,
    partnerUserIds,
    phase,
    language,
    goToClosure,
    liveUi.sendError,
    setMessagesDebug,
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
      const convState = getConversationState(messagesRef.current);
      const replyToQuestionId = convState.currentQuestion?.id ?? turnState?.lastQuestion?.metadata?.questionId ?? null;
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

      // AI reaguje dopiero gdy OBIE strony odpowiedziały — tylko lider wysyła wskazówki.
      const lastQ = afterTurn.lastQuestion;
      if (
        afterTurn.bothAnswered &&
        !beforeTurn.bothAnswered &&
        lastQ &&
        !hintsSentAfterQuestion(workingMessages, lastQ.id) &&
        shouldHostLeadGeneration(user.id, hostUserId)
      ) {
        logSetState('processing:true');
        setProcessing(true);
        await applyAiTurn(sent, workingMessages, 'answer_ack');
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
    if (!mediationId) return;
    enqueueRuntimeClientEvents(
      buildRuntimeClientEvents('resolve_session', currentUserActor)
    );
    setShowDisputeResolvedConfirm(false);
    goToClosure();
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
          </View>
        ) : null}

        {processing && !showGenerateNext ? (
          <View style={styles.processingBar}>
            <ActivityIndicator size="small" color={Colors.primaryLight} />
            <Text style={styles.processingText}>{lm.service.hintAnalyzing}</Text>
          </View>
        ) : null}

        {legacyWaitingAnswerHint ? (
          <View style={styles.waitingBar}>
            <MaterialIcons name="hourglass-empty" size={16} color={Colors.textMuted} />
            <Text style={styles.waitingText}>{waitingAnswerDisplay.label}</Text>
          </View>
        ) : null}

        {proposalWaitingHint && awaitingProposalDecision ? (
          <View style={styles.waitingBar}>
            <MaterialIcons name="hourglass-empty" size={16} color={Colors.textMuted} />
            <Text style={styles.waitingText}>{proposalWaitingDisplay.label}</Text>
          </View>
        ) : null}

        {showContinueDecisionPanel ? (
          <View style={styles.generateNextWrap}>
            <Text style={styles.decisionPanelTitle}>{liveUi.decisionPanelTitle}</Text>
            {continueHint ? (
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

        {showGenerateNext ? (
          <View style={styles.generateNextWrap}>
            {generateNextHint ? (
              <Text style={styles.generateNextHint}>{generateNextHint}</Text>
            ) : null}
            <Pressable
              onPress={handleGenerateNext}
              disabled={processing || userReady}
              style={({ pressed }) => [
                styles.generateNextBtn,
                (processing || userReady) && styles.generateNextBtnDisabled,
                { opacity: pressed && !userReady && !processing ? 0.9 : 1 },
              ]}
            >
              <MaterialIcons name="navigate-next" size={20} color="#fff" />
              <Text style={styles.generateNextBtnText}>{liveUi.generateNextQuestion}</Text>
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
