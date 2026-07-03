import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useDisputes } from '@/hooks/useDisputes';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { PhaseIndicator } from '@/components/ui/PhaseIndicator';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DisputeMessage } from '@/types';
import {
  getMediatorTip,
  askMediator,
  getResolutionSuggestion,
  analyzeMessage,
  getMirrorAnalysis,
  getResolutionSummary,
  AIMediatorResponse,
  MirrorAnalysis,
} from '@/services/aiMediator';

const FREE_PHASE3_LIMIT = 10;

const phaseColors = [Colors.phase1, Colors.phase2, Colors.phase3, Colors.phase4];
const phaseNames = ['Twoja Perspektywa', 'Lustro', 'Wspólna Przestrzeń', 'Podsumowanie'];

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function AIBubble({ message, type }: { message: string; type?: string }) {
  const isWarning = type === 'warning';
  const isCelebration = type === 'celebration';
  const isBreak = type === 'break';
  const borderColor = isWarning ? Colors.warning + '60' : isCelebration ? Colors.phase2 + '60' : isBreak ? Colors.info + '60' : Colors.primary + '40';
  const bgColor = isWarning ? Colors.warning + '15' : isCelebration ? Colors.phase2 + '15' : isBreak ? Colors.info + '12' : Colors.primary + '15';
  return (
    <View style={[styles.aiBubble, { borderColor, backgroundColor: bgColor }]}>
      <View style={styles.aiBubbleHeader}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={styles.aiBubbleIcon}>
          <MaterialIcons name="smart-toy" size={12} color="#fff" />
        </LinearGradient>
        <Text style={styles.aiBubbleName}>AI Mediator</Text>
      </View>
      <Text style={styles.aiBubbleText}>{message}</Text>
    </View>
  );
}

function ChatBubble({ message, isMine }: { message: DisputeMessage; isMine: boolean }) {
  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      {!isMine ? (
        <View style={styles.bubbleAvatar}>
          <Text style={styles.bubbleAvatarText}>{message.authorName.charAt(0)}</Text>
        </View>
      ) : null}
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {!isMine ? <Text style={styles.bubbleAuthor}>{message.authorName}</Text> : null}
        <Text style={styles.bubbleText}>{message.content}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={styles.bubbleTime}>
            {new Date(message.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {message.sentimentIndicator ? <Text style={styles.sentimentIndicator}>{message.sentimentIndicator}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export default function DisputeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const { language } = useLanguage();
  const {
    getDispute, updatePhaseData, setReady, advancePhase, resolveDispute,
    addMessage, addLessonNote, analyzePerspectives, subscribeToMessages,
  } = useDisputes();

  const chatScrollRef = useRef<ScrollView>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [perspective, setPerspective] = useState('');
  const [feelings, setFeelings] = useState('');
  const [needs, setNeeds] = useState('');

  const [mirrorAnalysis, setMirrorAnalysis] = useState<MirrorAnalysis | null>(null);
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [mirrorConfirmed, setMirrorConfirmed] = useState(false);

  const [jointMessage, setJointMessage] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [recentNegativeCount, setRecentNegativeCount] = useState(0);

  const [resolutionProposal, setResolutionProposal] = useState('');
  const [resolutionAgreed, setResolutionAgreed] = useState(false);
  const [aiResolution, setAiResolution] = useState('');
  const [loadingResolution, setLoadingResolution] = useState(false);
  const [lessonNote, setLessonNote] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);

  const [aiTab, setAiTab] = useState<'tip' | 'chat'>('tip');
  const [aiTip, setAiTip] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [aiTyping, setAiTyping] = useState(false);

  const dispute = getDispute(id || '');

  useEffect(() => {
    if (dispute) loadAiTip();
  }, [dispute?.phase]);

  // Load mirror analysis when entering phase 2
  useEffect(() => {
    if (!dispute || dispute.phase !== 2 || mirrorAnalysis || mirrorLoading) return;
    loadMirrorAnalysis();
  }, [dispute?.phase]);

  // Subscribe to real-time messages in phase 3
  useEffect(() => {
    if (!dispute || dispute.phase !== 3 || dispute.status === 'resolved') return;
    const unsubscribe = subscribeToMessages(dispute.id, () => {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsubscribe;
  }, [dispute?.phase, dispute?.id]);

  // Inactivity prompt for phase 3
  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      if (dispute?.phase === 3) {
        const aiMsg: DisputeMessage = {
          id: generateId(), disputeId: dispute.id, authorId: 'ai', authorName: 'AI Mediator',
          content: 'Jak się czujecie? Może spróbujcie: "Chcę, żebyś wiedział/a..."',
          phase: 3, createdAt: new Date().toISOString(), isAI: true, aiResponseType: 'prompt',
        };
        await addMessage(dispute.id, aiMsg);
      }
    }, 5 * 60 * 1000);
  }, [dispute?.phase]);

  useEffect(() => {
    if (dispute?.phase === 3) resetInactivity();
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [dispute?.phase]);

  async function loadAiTip() {
    if (!dispute) return;
    setAiLoading(true);
    try { const { message } = await getMediatorTip(dispute.phase); setAiTip(message); } catch {}
    setAiLoading(false);
  }

  async function loadMirrorAnalysis() {
    if (!dispute) return;
    setMirrorLoading(true);
    try {
      // Try Edge Function with real perspectives
      const perspA = `${dispute.user1PhaseData[1]?.perspective || ''} ${dispute.user1PhaseData[1]?.feelings || ''} ${dispute.user1PhaseData[1]?.needs || ''}`.trim();
      const perspB = `${dispute.user2PhaseData[1]?.perspective || ''} ${dispute.user2PhaseData[1]?.feelings || ''} ${dispute.user2PhaseData[1]?.needs || ''}`.trim();
      const analysis = await getMirrorAnalysis(dispute.title, perspA, perspB, language);
      setMirrorAnalysis(analysis);
    } catch { }
    setMirrorLoading(false);
  }

  async function handleAskAI() {
    if (!aiQuestion.trim() || !dispute) return;
    const q = aiQuestion.trim();
    setAiQuestion('');
    setAiChatMessages((prev) => [...prev, { role: 'user', text: q }]);
    setAiTyping(true);
    try {
      const { message } = await askMediator(q, dispute.phase, dispute.title);
      setAiChatMessages((prev) => [...prev, { role: 'ai', text: message }]);
    } catch {}
    setAiTyping(false);
  }

  async function handlePhase1Submit() {
    if (!dispute || !user || perspective.trim().length < 10) return;
    await updatePhaseData(dispute.id, user.id, 1, { perspective, feelings, needs });
    await setReady(dispute.id, user.id);
    const updated = getDispute(dispute.id);
    if (updated?.user1Ready && updated?.user2Ready) await advancePhase(dispute.id);
  }

  async function handlePhase2Confirm() {
    if (!dispute || !user || !mirrorConfirmed) return;
    await setReady(dispute.id, user.id);
    const updated = getDispute(dispute.id);
    if (updated?.user1Ready && updated?.user2Ready) await advancePhase(dispute.id);
  }

  async function handlePhase3Send() {
    if (!jointMessage.trim() || !dispute || !user || chatSending) return;
    const content = jointMessage.trim();
    setJointMessage('');
    setChatSending(true);
    resetInactivity();

    if (!premiumLoading && !isPremium) {
      const myPhase3Count = dispute.messages.filter((m) => m.phase === 3 && m.authorId === user.id && !m.isAI).length;
      if (myPhase3Count >= FREE_PHASE3_LIMIT) {
        setChatSending(false);
        router.push('/premium');
        return;
      }
    }

    // Get previous messages context for AI
    const prevMessages = dispute.messages.slice(-10).map((m) => ({ content: m.content, isAI: m.isAI || false }));

    const analysis = await analyzeMessage(content, recentNegativeCount, prevMessages, language);

    const msg: DisputeMessage = {
      id: generateId(), disputeId: dispute.id, authorId: user.id, authorName: user.name,
      content, phase: 3, createdAt: new Date().toISOString(),
      sentiment: analysis.sentiment, sentimentIndicator: analysis.indicator,
    };

    await addMessage(dispute.id, msg);

    if (analysis.sentiment === 'negative') {
      setRecentNegativeCount((c) => c + 1);
    } else {
      setRecentNegativeCount(0);
    }

    // Add AI response if needed
    if (analysis.response) {
      setTimeout(async () => {
        if (!dispute) return;
        const aiMsg: DisputeMessage = {
          id: generateId(), disputeId: dispute.id, authorId: 'ai', authorName: 'AI Mediator',
          content: analysis.response!.message, phase: 3, createdAt: new Date().toISOString(),
          isAI: true, aiResponseType: analysis.response!.type,
        };
        await addMessage(dispute.id, aiMsg);
      }, 1000);
    }

    setChatSending(false);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handlePhase3Resolve() {
    if (!dispute || !user) return;
    await setReady(dispute.id, user.id);
    const updated = getDispute(dispute.id);
    if (updated?.user1Ready && updated?.user2Ready) await advancePhase(dispute.id);
  }

  async function handleGetAIResolution() {
    if (!dispute) return;
    setLoadingResolution(true);
    try {
      const isUser1 = user?.id === dispute.user1Id;
      const myData = isUser1 ? dispute.user1PhaseData[1] : dispute.user2PhaseData[1];
      const partnerData = isUser1 ? dispute.user2PhaseData[1] : dispute.user1PhaseData[1];
      const suggestion = await getResolutionSuggestion(myData || {}, partnerData || {}, dispute.title);
      setAiResolution(suggestion);
      setResolutionProposal(suggestion);
    } catch {}
    setLoadingResolution(false);
  }

  async function handlePhase4Submit() {
    if (!dispute || !user || !resolutionProposal.trim() || !resolutionAgreed) return;
    const summary = await getResolutionSummary(dispute.title);
    await setReady(dispute.id, user.id);
    const updated = getDispute(dispute.id);
    if (updated?.user1Ready && updated?.user2Ready) {
      await resolveDispute(dispute.id, resolutionProposal, summary);
    }
  }

  async function handleSaveLessonNote() {
    if (!dispute || !lessonNote.trim()) return;
    setSavingLesson(true);
    await addLessonNote(dispute.id, lessonNote.trim());
    setSavingLesson(false);
  }

  if (!dispute || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const isUser1 = user.id === dispute.user1Id;
  const myReady = isUser1 ? dispute.user1Ready : dispute.user2Ready;
  const phaseColor = phaseColors[dispute.phase - 1];
  const isResolved = dispute.status === 'resolved';
  const phase3Messages = dispute.messages.filter((m) => m.phase === 3);
  const myPhase3Count = phase3Messages.filter((m) => m.authorId === user.id && !m.isAI).length;
  const nearLimit =
    !premiumLoading && !isPremium && myPhase3Count >= FREE_PHASE3_LIMIT - 2;
  const atLimit =
    !premiumLoading && !isPremium && myPhase3Count >= FREE_PHASE3_LIMIT;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.flex, { paddingTop: insets.top }]}>

        {/* Header */}
        <LinearGradient colors={[Colors.surface, Colors.background]} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
            </Pressable>
            <View style={styles.headerTitles}>
              <Text style={styles.headerTitle} numberOfLines={1}>{dispute.title}</Text>
              {!isResolved ? (
                <View style={styles.phaseBadge}>
                  <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
                  <Text style={[styles.phaseLabel, { color: phaseColor }]}>Faza {dispute.phase}: {phaseNames[dispute.phase - 1]}</Text>
                </View>
              ) : (
                <View style={[styles.phaseBadge, { backgroundColor: Colors.success + '20', borderColor: Colors.success + '40' }]}>
                  <MaterialIcons name="check-circle" size={12} color={Colors.success} />
                  <Text style={[styles.phaseLabel, { color: Colors.success }]}>Rozwiązany</Text>
                </View>
              )}
            </View>
          </View>
          {!isResolved ? <PhaseIndicator currentPhase={dispute.phase} /> : null}
        </LinearGradient>

        <ScrollView
          ref={dispute.phase !== 3 ? undefined : undefined}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            dispute.phase === 3 && !isResolved ? styles.scrollContentChat : styles.scrollContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ══ RESOLVED ═══════════════════════════════════════════ */}
          {isResolved ? (
            <View style={styles.resolvedContainer}>
              <LinearGradient colors={[Colors.success + '25', Colors.success + '08']} style={styles.resolvedCard}>
                <Text style={styles.resolvedEmoji}>🎉</Text>
                <Text style={styles.resolvedTitle}>Spór rozwiązany!</Text>
                {dispute.resolution ? (
                  <>
                    <Text style={styles.resolvedSubLabel}>Uzgodnione rozwiązanie:</Text>
                    <Text style={styles.resolvedText}>{dispute.resolution}</Text>
                  </>
                ) : null}
              </LinearGradient>

              {dispute.resolutionSummary ? (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={styles.summaryIconBg}>
                      <MaterialIcons name="lightbulb" size={16} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.summaryTitle}>Czego się nauczyliście</Text>
                  </View>
                  <Text style={styles.summaryText}>{dispute.resolutionSummary.lesson}</Text>
                  <View style={styles.summaryKeyMoment}>
                    <Text style={styles.summaryKeyLabel}>Kluczowy moment:</Text>
                    <Text style={styles.summaryKeyText}>{dispute.resolutionSummary.keyMoment}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.lessonSection}>
                <Text style={styles.lessonTitle}>Co się nauczyliście? (notatka)</Text>
                {dispute.lessonNote ? (
                  <View style={styles.lessonNote}>
                    <Text style={styles.lessonNoteText}>{dispute.lessonNote}</Text>
                  </View>
                ) : (
                  <>
                    <Input value={lessonNote} onChangeText={setLessonNote} placeholder="Wpisz wspólną refleksję..." multiline numberOfLines={3} />
                    <Button title="Zapisz notatkę" onPress={handleSaveLessonNote} loading={savingLesson} disabled={!lessonNote.trim()} fullWidth variant="outline" />
                  </>
                )}
              </View>

              <View style={styles.resolvedStats}>
                {[
                  { num: String(phase3Messages.length), label: 'wiadomości' },
                  { num: '4', label: 'fazy' },
                  { num: String(dispute.resolvedAt ? Math.max(1, Math.ceil((new Date(dispute.resolvedAt).getTime() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 1), label: 'dni' },
                ].map((s, i) => (
                  <React.Fragment key={s.label}>
                    {i > 0 ? <View style={styles.resolvedStatDivider} /> : null}
                    <View style={styles.resolvedStatItem}>
                      <Text style={styles.resolvedStatNum}>{s.num}</Text>
                      <Text style={styles.resolvedStatLabel}>{s.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
              <Button title="Wróć do historii" onPress={() => router.back()} variant="outline" fullWidth />
            </View>
          ) : null}

          {/* ══ PHASE 1 ═══════════════════════════════════════════ */}
          {!isResolved && dispute.phase === 1 ? (
            <View style={styles.phaseContent}>
              {myReady ? (
                <View style={styles.waitingState}>
                  <View style={styles.waitingIconBg}>
                    <MaterialIcons name="hourglass-empty" size={32} color={Colors.phase1} />
                  </View>
                  <Text style={styles.waitingTitle}>Twoja perspektywa została wysłana</Text>
                  <Text style={styles.waitingText}>Czekamy, aż partner również wypełni swoją perspektywę. Dostaniesz powiadomienie!</Text>
                  <View style={styles.privacyBadge}>
                    <MaterialIcons name="lock" size={14} color={Colors.textMuted} />
                    <Text style={styles.privacyText}>Tylko AI przeczyta obie perspektywy</Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.privacyNotice}>
                    <LinearGradient colors={[Colors.phase1 + '20', Colors.phase1 + '08']} style={styles.privacyNoticeGradient}>
                      <MaterialIcons name="lock" size={16} color={Colors.phase1} />
                      <View style={styles.privacyNoticeText}>
                        <Text style={styles.privacyNoticeTitle}>🔒 Tylko AI przeczyta</Text>
                        <Text style={styles.privacyNoticeSub}>Partner nie zobaczy Twojej perspektywy. AI użyje jej, żeby pomóc Wam się zrozumieć.</Text>
                      </View>
                    </LinearGradient>
                  </View>
                  <Input label="Twoja perspektywa *" value={perspective} onChangeText={setPerspective} placeholder="Opisz jak widzisz tę sytuację. Co się stało? Co Cię dotknęło?" multiline numberOfLines={5} />
                  <Text style={styles.charCount}>{perspective.length} / min. 10 znaków</Text>
                  <Input label="Moje uczucia" value={feelings} onChangeText={setFeelings} placeholder="Np. czuję się niezrozumiany/a, sfrustrowany/a..." multiline numberOfLines={3} />
                  <Input label="Czego potrzebuję" value={needs} onChangeText={setNeeds} placeholder="Np. potrzebuję więcej docenienia, lepszej komunikacji..." multiline numberOfLines={3} />
                  <Button title="Wyślij perspektywę" onPress={handlePhase1Submit} disabled={perspective.trim().length < 10} fullWidth size="lg" />
                </>
              )}
            </View>
          ) : null}

          {/* ══ PHASE 2 ═══════════════════════════════════════════ */}
          {!isResolved && dispute.phase === 2 ? (
            <View style={styles.phaseContent}>
              {mirrorLoading || (!mirrorAnalysis && !mirrorLoading) ? (
                <View style={styles.mirrorLoading}>
                  <ActivityIndicator color={Colors.gradientMid} size="large" />
                  <Text style={styles.mirrorLoadingText}>AI analizuje obie perspektywy...{'\n'}(kilka sekund)</Text>
                </View>
              ) : mirrorAnalysis ? (
                <>
                  <View style={styles.mirrorAnalysisCard}>
                    <LinearGradient colors={[Colors.phase2 + '20', Colors.phase2 + '08']} style={styles.mirrorAnalysisGradient}>
                      <View style={styles.mirrorAnalysisHeader}>
                        <LinearGradient colors={[Colors.gradientStart, Colors.phase2]} style={styles.mirrorAIIcon}>
                          <MaterialIcons name="smart-toy" size={18} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.mirrorAITitle}>Analiza AI Mediatora</Text>
                      </View>
                      <View style={styles.mirrorSection}>
                        <Text style={styles.mirrorSectionLabel}>🎭 Emocje</Text>
                        <Text style={styles.mirrorSectionText}>{mirrorAnalysis.emotionsSummary}</Text>
                      </View>
                      <View style={styles.mirrorSection}>
                        <Text style={styles.mirrorSectionLabel}>❤️ Potrzeby</Text>
                        <Text style={styles.mirrorSectionText}>{mirrorAnalysis.needsSummary}</Text>
                      </View>
                      <View style={styles.mirrorSection}>
                        <Text style={styles.mirrorSectionLabel}>🌉 Most</Text>
                        <Text style={[styles.mirrorSectionText, styles.mirrorBridgeText]}>{mirrorAnalysis.bridgeStatement}</Text>
                      </View>
                    </LinearGradient>
                  </View>
                  {!myReady ? (
                    <>
                      <Pressable onPress={() => setMirrorConfirmed(!mirrorConfirmed)} style={({ pressed }) => [styles.confirmRow, mirrorConfirmed && styles.confirmRowActive, { opacity: pressed ? 0.8 : 1 }]}>
                        <View style={[styles.checkbox, mirrorConfirmed && styles.checkboxChecked]}>
                          {mirrorConfirmed ? <MaterialIcons name="check" size={14} color="#fff" /> : null}
                        </View>
                        <Text style={styles.confirmText}>Rozumiem perspektywę partnera i jestem gotowy/a na wspólną przestrzeń</Text>
                      </Pressable>
                      <Button title="Wejdź do wspólnej przestrzeni →" onPress={handlePhase2Confirm} disabled={!mirrorConfirmed} fullWidth size="lg" />
                    </>
                  ) : (
                    <View style={styles.waitingState}>
                      <MaterialIcons name="hourglass-empty" size={28} color={Colors.phase2} />
                      <Text style={styles.waitingTitle}>Czekamy na partnera</Text>
                      <Text style={styles.waitingText}>Gdy partner potwierdzi zrozumienie, razem wejdziecie do wspólnej przestrzeni.</Text>
                    </View>
                  )}
                </>
              ) : null}
            </View>
          ) : null}

          {/* ══ PHASE 3 — Joint Chat ═══════════════════════════════ */}
          {!isResolved && dispute.phase === 3 ? (
            <View style={styles.phase3Container}>
              <View style={styles.phase3Header}>
                <Text style={styles.phase3Title}>Wspólna Przestrzeń</Text>
                <Text style={styles.phase3Sub}>AI Mediator jest tutaj z Wami i analizuje każdą wiadomość w czasie rzeczywistym</Text>
                {nearLimit && !atLimit ? (
                  <View style={styles.limitWarning}>
                    <MaterialIcons name="warning" size={14} color={Colors.warning} />
                    <Text style={styles.limitWarningText}>Plan Free: zostało {FREE_PHASE3_LIMIT - myPhase3Count} wiadomości</Text>
                  </View>
                ) : null}
              </View>

              <ScrollView ref={chatScrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}>
                {phase3Messages.length === 0 ? (
                  <AIBubble message="Witajcie w wspólnej przestrzeni! Jestem tu, żeby pomóc Wam zrozumieć siebie nawzajem. Zacznijcie od powiedzenia sobie jednego dobrego słowa." type="tip" />
                ) : null}
                {phase3Messages.map((msg) =>
                  msg.isAI ? (
                    <AIBubble key={msg.id} message={msg.content} type={msg.aiResponseType} />
                  ) : (
                    <ChatBubble key={msg.id} message={msg} isMine={msg.authorId === user.id} />
                  )
                )}
                {chatSending ? (
                  <View style={styles.typingIndicator}>
                    <ActivityIndicator color={Colors.textMuted} size="small" />
                    <Text style={styles.typingText}>AI analizuje...</Text>
                  </View>
                ) : null}
              </ScrollView>

              {atLimit ? (
                <Pressable onPress={() => router.push('/premium')} style={styles.paywallBanner}>
                  <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={styles.paywallGradient}>
                    <MaterialIcons name="lock" size={18} color="#fff" />
                    <Text style={styles.paywallText}>Wykup Premium, aby kontynuować mediację</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
                  </LinearGradient>
                </Pressable>
              ) : !myReady ? (
                <View style={styles.chatInputArea}>
                  <View style={styles.chatInputRow}>
                    <View style={styles.chatInputWrapper}>
                      <TextInput value={jointMessage} onChangeText={setJointMessage} placeholder="Napisz do partnera..." placeholderTextColor={Colors.textMuted} style={styles.chatInput} multiline maxLength={500} onFocus={resetInactivity} />
                    </View>
                    <Pressable onPress={handlePhase3Send} disabled={!jointMessage.trim() || chatSending} style={({ pressed }) => [styles.sendBtn, { opacity: !jointMessage.trim() || chatSending ? 0.5 : pressed ? 0.8 : 1 }]}>
                      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={styles.sendBtnGradient}>
                        <MaterialIcons name="send" size={18} color="#fff" />
                      </LinearGradient>
                    </Pressable>
                  </View>
                  <Pressable onPress={handlePhase3Resolve} style={({ pressed }) => [styles.resolveBtn, { opacity: pressed ? 0.8 : 1 }]}>
                    <MaterialIcons name="check-circle" size={16} color={Colors.success} />
                    <Text style={styles.resolveBtnText}>Gotowi na rozwiązanie</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.waitingBanner}>
                  <MaterialIcons name="hourglass-empty" size={20} color={Colors.phase3} />
                  <Text style={styles.waitingBannerText}>Czekamy na partnera, żeby razem przejść do rozwiązania</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* ══ PHASE 4 — Resolution ═══════════════════════════════ */}
          {!isResolved && dispute.phase === 4 ? (
            <View style={styles.phaseContent}>
              {myReady ? (
                <View style={styles.waitingState}>
                  <MaterialIcons name="hourglass-empty" size={32} color={Colors.phase4} />
                  <Text style={styles.waitingTitle}>Twoje rozwiązanie zostało wysłane!</Text>
                  <Text style={styles.waitingText}>Czekamy, aż partner zatwierdzi. Jeszcze chwila!</Text>
                </View>
              ) : (
                <>
                  <Pressable onPress={handleGetAIResolution} style={({ pressed }) => [styles.aiSuggestionBtn, { opacity: pressed ? 0.8 : 1 }]} disabled={loadingResolution}>
                    <LinearGradient colors={[Colors.primary + '25', Colors.gradientMid + '15']} style={styles.aiSuggestionBtnGradient}>
                      {loadingResolution ? <ActivityIndicator color={Colors.primaryLight} size="small" /> : <MaterialIcons name="smart-toy" size={18} color={Colors.primaryLight} />}
                      <Text style={styles.aiSuggestionBtnText}>{loadingResolution ? 'AI tworzy sugestię...' : 'Zaproponuj rozwiązanie z AI'}</Text>
                    </LinearGradient>
                  </Pressable>
                  {aiResolution ? (
                    <View style={styles.aiResCard}>
                      <View style={styles.aiResHeader}>
                        <MaterialIcons name="smart-toy" size={14} color={Colors.primaryLight} />
                        <Text style={styles.aiResTitle}>Sugestia AI Mediatora</Text>
                      </View>
                      <Text style={styles.aiResText}>{aiResolution}</Text>
                    </View>
                  ) : null}
                  <Input label="Twoje rozwiązanie *" value={resolutionProposal} onChangeText={setResolutionProposal} placeholder="Opisz konkretne rozwiązanie, z którym oboje możecie się zgodzić..." multiline numberOfLines={5} />
                  <Pressable onPress={() => setResolutionAgreed(!resolutionAgreed)} style={({ pressed }) => [styles.confirmRow, resolutionAgreed && styles.confirmRowActive, { opacity: pressed ? 0.8 : 1 }]}>
                    <View style={[styles.checkbox, resolutionAgreed && styles.checkboxChecked]}>
                      {resolutionAgreed ? <MaterialIcons name="check" size={14} color="#fff" /> : null}
                    </View>
                    <Text style={styles.confirmText}>Akceptuję to rozwiązanie i zobowiązuję się je wdrożyć</Text>
                  </Pressable>
                  <Button title="Zatwierdź rozwiązanie" onPress={handlePhase4Submit} disabled={!resolutionProposal.trim() || !resolutionAgreed} fullWidth size="lg" />
                </>
              )}
            </View>
          ) : null}

          {/* ══ AI PANEL (non-phase-3) ══════════════════════════════ */}
          {!isResolved && dispute.phase !== 3 ? (
            <View style={styles.aiPanel}>
              <View style={styles.aiPanelHeader}>
                <LinearGradient colors={[Colors.primary + '30', Colors.gradientMid + '20']} style={styles.aiPanelIconBg}>
                  <MaterialIcons name="smart-toy" size={14} color={Colors.primaryLight} />
                </LinearGradient>
                <Text style={styles.aiPanelTitle}>AI Mediator</Text>
                <View style={styles.aiTabs}>
                  {(['tip', 'chat'] as const).map((key, i) => (
                    <Pressable key={key} onPress={() => setAiTab(key)} style={[styles.aiTab, aiTab === key && styles.aiTabActive]}>
                      <Text style={[styles.aiTabText, aiTab === key && styles.aiTabTextActive]}>{i === 0 ? 'Wskazówka' : 'Zapytaj'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {aiTab === 'tip' ? (
                <View style={styles.aiTipContent}>
                  {aiLoading ? <ActivityIndicator color={Colors.primaryLight} size="small" /> : <Text style={styles.aiTipText}>{aiTip}</Text>}
                  <Pressable onPress={loadAiTip} style={({ pressed }) => [styles.refreshBtn, { opacity: pressed ? 0.7 : 1 }]}>
                    <MaterialIcons name="refresh" size={14} color={Colors.primaryLight} />
                    <Text style={styles.refreshBtnText}>Nowa wskazówka</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.aiChatContent}>
                  <ScrollView style={styles.aiChatScroll} showsVerticalScrollIndicator={false}>
                    {aiChatMessages.length === 0 ? <Text style={styles.aiNoMsg}>Zadaj pytanie mediatorowi...</Text> : aiChatMessages.map((msg, i) => (
                      <View key={i} style={[styles.aiChatBubble, msg.role === 'user' ? styles.aiChatUser : styles.aiChatAI]}>
                        <Text style={[styles.aiChatText, msg.role === 'user' && { color: '#fff' }]}>{msg.text}</Text>
                      </View>
                    ))}
                    {aiTyping ? <ActivityIndicator color={Colors.primaryLight} size="small" /> : null}
                  </ScrollView>
                  <View style={styles.aiInputRow}>
                    <TextInput value={aiQuestion} onChangeText={setAiQuestion} placeholder='Np. "Jak wyrazić swoje potrzeby?"' placeholderTextColor={Colors.textMuted} style={styles.aiInput} returnKeyType="send" onSubmitEditing={handleAskAI} />
                    <Pressable onPress={handleAskAI} style={({ pressed }) => [styles.aiSendBtn, { opacity: pressed ? 0.7 : 1 }]}>
                      <MaterialIcons name="send" size={16} color={Colors.primaryLight} />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: Spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.sm, marginBottom: 4 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitles: { flex: 1, minWidth: 0, gap: 4 },
  headerTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  phaseDot: { width: 6, height: 6, borderRadius: 3 },
  phaseLabel: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.xs },
  scrollContent: { paddingHorizontal: 20, paddingTop: Spacing.md, gap: Spacing.md },
  scrollContentChat: { flexGrow: 1 },
  phaseContent: { gap: Spacing.md },
  waitingState: { alignItems: 'center', paddingVertical: 32, gap: 10, backgroundColor: Colors.surfaceCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 24 },
  waitingIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.phase1 + '20', alignItems: 'center', justifyContent: 'center' },
  waitingTitle: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.base, color: Colors.textPrimary, textAlign: 'center' },
  waitingText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  charCount: { fontFamily: Typography.fontFamily.regular, fontSize: 11, color: Colors.textMuted, alignSelf: 'flex-end', marginTop: -8 },
  privacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  privacyText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  privacyNotice: { borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.phase1 + '40' },
  privacyNoticeGradient: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: Spacing.md },
  privacyNoticeText: { flex: 1 },
  privacyNoticeTitle: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  privacyNoticeSub: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  mirrorLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 16 },
  mirrorLoadingText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  mirrorAnalysisCard: { borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.phase2 + '40' },
  mirrorAnalysisGradient: { padding: Spacing.lg, gap: Spacing.md },
  mirrorAnalysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  mirrorAIIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mirrorAITitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.base, color: Colors.textPrimary },
  mirrorSection: { gap: 6 },
  mirrorSectionLabel: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  mirrorSectionText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 20 },
  mirrorBridgeText: { color: Colors.primaryLight, fontStyle: 'italic' },
  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  confirmRowActive: { borderColor: Colors.phase2, backgroundColor: Colors.phase2 + '15' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  checkboxChecked: { backgroundColor: Colors.phase2, borderColor: Colors.phase2 },
  confirmText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.base, color: Colors.textPrimary, flex: 1, lineHeight: 22 },
  phase3Container: { flex: 1, flexDirection: 'column', minHeight: 500 },
  phase3Header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 4 },
  phase3Title: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  phase3Sub: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 18 },
  limitWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warning + '15', borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  limitWarningText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: Colors.warning },
  chatScroll: { flex: 1, minHeight: 300 },
  chatContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  aiBubble: { alignSelf: 'center', maxWidth: '90%', borderRadius: Radius.xl, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginVertical: 6, gap: 6 },
  aiBubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiBubbleIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  aiBubbleName: { fontFamily: Typography.fontFamily.semiBold, fontSize: 11, color: Colors.primaryLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  aiBubbleText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 20 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.phase2 + '40', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubbleAvatarText: { fontFamily: Typography.fontFamily.bold, fontSize: 12, color: Colors.phase2 },
  bubble: { maxWidth: '78%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10, gap: 3 },
  bubbleMine: { backgroundColor: Colors.primary + '45', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.surfaceElevated, borderBottomLeftRadius: 4 },
  bubbleAuthor: { fontFamily: Typography.fontFamily.medium, fontSize: 11, color: Colors.textMuted },
  bubbleText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.base, color: Colors.textPrimary, lineHeight: 22 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bubbleTime: { fontFamily: Typography.fontFamily.regular, fontSize: 10, color: Colors.textMuted },
  sentimentIndicator: { fontSize: 10 },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  typingText: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Colors.textMuted },
  chatInputArea: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 8, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  chatInputWrapper: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 10, minHeight: 48, maxHeight: 120 },
  chatInput: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.base, color: Colors.textPrimary, includeFontPadding: false },
  sendBtn: { borderRadius: Radius.full, overflow: 'hidden', flexShrink: 0 },
  sendBtnGradient: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: Colors.success + '15', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.success + '40' },
  resolveBtnText: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.sm, color: Colors.success },
  paywallBanner: { margin: 20, borderRadius: Radius.xl, overflow: 'hidden' },
  paywallGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  paywallText: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.base, color: '#fff', flex: 1 },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  waitingBannerText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.sm, color: Colors.textSecondary, flex: 1, flexShrink: 1, lineHeight: 18 },
  aiSuggestionBtn: { borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.primary + '40' },
  aiSuggestionBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  aiSuggestionBtnText: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.base, color: Colors.primaryLight, flex: 1 },
  aiResCard: { backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg, padding: Spacing.md, gap: 6, borderWidth: 1, borderColor: Colors.primary + '30' },
  aiResHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiResTitle: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.sm, color: Colors.primaryLight },
  aiResText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 20 },
  resolvedContainer: { paddingHorizontal: 20, paddingTop: 16, gap: Spacing.lg },
  resolvedCard: { borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.success + '30' },
  resolvedEmoji: { fontSize: 48 },
  resolvedTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.xl, color: Colors.success, textAlign: 'center' },
  resolvedSubLabel: { fontFamily: Typography.fontFamily.medium, fontSize: 11, color: Colors.textSecondary, alignSelf: 'flex-start', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  resolvedText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.base, color: Colors.textPrimary, lineHeight: 22, alignSelf: 'flex-start' },
  summaryCard: { backgroundColor: Colors.surfaceCard, borderRadius: Radius.xl, padding: Spacing.lg, gap: 12, borderWidth: 1, borderColor: Colors.primary + '30' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIconBg: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.base, color: Colors.textPrimary },
  summaryText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 20 },
  summaryKeyMoment: { backgroundColor: Colors.primary + '15', borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  summaryKeyLabel: { fontFamily: Typography.fontFamily.semiBold, fontSize: 11, color: Colors.primaryLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryKeyText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 18 },
  lessonSection: { gap: Spacing.sm, backgroundColor: Colors.surfaceCard, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  lessonTitle: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.base, color: Colors.textPrimary },
  lessonNote: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  lessonNoteText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.base, color: Colors.textPrimary, lineHeight: 22 },
  resolvedStats: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  resolvedStatItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  resolvedStatDivider: { width: 1, backgroundColor: Colors.border },
  resolvedStatNum: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size['2xl'], color: Colors.textPrimary },
  resolvedStatLabel: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Colors.textMuted },
  aiPanel: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  aiPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  aiPanelIconBg: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  aiPanelTitle: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.sm, color: Colors.textPrimary, flex: 1 },
  aiTabs: { flexDirection: 'row', gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 2 },
  aiTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  aiTabActive: { backgroundColor: Colors.primary + '50' },
  aiTabText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: Colors.textMuted },
  aiTabTextActive: { color: Colors.primaryLight },
  aiTipContent: { padding: Spacing.md, gap: Spacing.sm },
  aiTipText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 20 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  refreshBtnText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: Colors.primaryLight },
  aiChatContent: { padding: Spacing.md, gap: 8 },
  aiChatScroll: { maxHeight: 180 },
  aiNoMsg: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  aiChatBubble: { maxWidth: '85%', borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: 6 },
  aiChatUser: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  aiChatAI: { alignSelf: 'flex-start', backgroundColor: Colors.surfaceElevated, borderBottomLeftRadius: 4, paddingHorizontal: Spacing.md },
  aiChatText: { fontFamily: Typography.fontFamily.regular, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  aiInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  aiInput: { flex: 1, fontFamily: Typography.fontFamily.regular, fontSize: 13, color: Colors.textPrimary, includeFontPadding: false, height: 32 },
  aiSendBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary + '30', borderRadius: 16 },
});
