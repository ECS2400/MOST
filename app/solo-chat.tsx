import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import {
  fetchOpeningCoachMessage,
  loadSoloChatSession,
  processSoloCoachTurn,
  saveSoloChatSession,
  SOLO_CHAT_MESSAGE_LIMIT,
  SoloChatSession,
  SoloCoachMessage,
} from '@/services/soloCoach';
import { getSoloExtras } from '@/constants/i18n/soloExtras';
import { fmt } from '@/utils/i18nFormat';
import { dismissFunFact, loadDismissedFunFacts } from '@/services/aiFunFactStorage';
import { AiFunFactCard } from '@/components/feature/AiFunFactCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { navigateToDisputeClosure } from '@/utils/disputeClosureNavigation';
import { ensureFeatureAllowed } from '@/services/checkLimits';
import {
  FeatureLimitBlockedError,
  LIMIT_CHECK_ERROR,
  navigateToPaywall,
} from '@/utils/paywallReason';

export default function SoloChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const extras = getSoloExtras(language || 'pl');
  const chat = extras.chat;
  const listRef = useRef<FlatList<SoloCoachMessage>>(null);

  const [session, setSession] = useState<SoloChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [dismissedFunFacts, setDismissedFunFacts] = useState<Set<string>>(new Set());
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const funFactScope = session?.createdAt ? `solo-${session.createdAt}` : 'solo';

  useEffect(() => {
    loadDismissedFunFacts(funFactScope).then(setDismissedFunFacts);
  }, [funFactScope]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!user?.id) {
        setError(chat.noSessionError);
        setLoading(false);
        return;
      }

      try {
        await ensureFeatureAllowed('ai_chat', { userId: user.id });
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof FeatureLimitBlockedError) {
          navigateToPaywall(router, e.paywallReason);
          setLoading(false);
          return;
        }
        setError(e instanceof Error ? e.message : LIMIT_CHECK_ERROR);
        setLoading(false);
        return;
      }

      const s = await loadSoloChatSession();
      if (cancelled) return;

      if (!s) {
        setError(chat.noSessionError);
        setLoading(false);
        return;
      }

      if (s.messages.length === 0) {
        const content = await fetchOpeningCoachMessage(s, language || 'pl');
        if (cancelled) return;
        const opening: SoloCoachMessage = {
          id: `coach-open-${Date.now()}`,
          role: 'coach',
          content,
          created_at: new Date().toISOString(),
        };
        const next = { ...s, messages: [opening] };
        setSession(next);
        saveSoloChatSession(next);
      } else {
        setSession(s);
      }
      setLoading(false);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [language, chat.noSessionError, user?.id, router]);

  const persist = useCallback(async (next: SoloChatSession) => {
    setSession(next);
    await saveSoloChatSession(next);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !session || sending || !user?.id) return;

    if (session.messages.filter((m) => m.role === 'user').length >= SOLO_CHAT_MESSAGE_LIMIT) {
      setError(fmt(chat.messageLimitError, { max: SOLO_CHAT_MESSAGE_LIMIT }));
      return;
    }

    setSending(true);
    setError('');

    try {
      await ensureFeatureAllowed('ai_chat', { userId: user.id });
    } catch (e: unknown) {
      if (e instanceof FeatureLimitBlockedError) {
        navigateToPaywall(router, e.paywallReason);
      } else {
        setError(e instanceof Error ? e.message : LIMIT_CHECK_ERROR);
      }
      setSending(false);
      return;
    }

    setInput('');

    const userMsg: SoloCoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    const withUser = { ...session, messages: [...session.messages, userMsg] };
    await persist(withUser);

    try {
      const turn = await processSoloCoachTurn(text, withUser, language || 'pl');
      const coachMsg: SoloCoachMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: turn.reply,
        funFact: turn.funFact,
        created_at: new Date().toISOString(),
      };
      await persist({ ...withUser, messages: [...withUser.messages, coachMsg] });
    } catch {
      setError(chat.coachReplyError);
    } finally {
      setSending(false);
    }
  }, [input, session, sending, persist, language, user?.id, router, chat.messageLimitError, chat.coachReplyError]);

  const userCount = session?.messages.filter((m) => m.role === 'user').length || 0;

  const handleEnd = useCallback(() => {
    setShowEndConfirm(true);
  }, []);

  const confirmEnd = useCallback(() => {
    setShowEndConfirm(false);
    navigateToDisputeClosure(router, { mode: 'solo' });
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
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
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter} pointerEvents="box-none">
            <Text style={styles.headerTitle}>{chat.title}</Text>
            <Text style={styles.headerSub}>
              {fmt(chat.messagesCount, {
                current: userCount,
                max: SOLO_CHAT_MESSAGE_LIMIT,
              })}
            </Text>
          </View>
          <Pressable
            onPress={handleEnd}
            style={styles.headerBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={chat.endA11y}
          >
            <MaterialIcons name="check-circle-outline" size={24} color={Colors.success} />
          </Pressable>
        </View>

        <ConfirmDialog
          visible={showEndConfirm}
          title={chat.endConfirmTitle}
          message={chat.endConfirmMessage}
          confirmLabel={chat.endConfirm}
          cancelLabel={t.common.cancel}
          onConfirm={confirmEnd}
          onCancel={() => setShowEndConfirm(false)}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={session?.messages || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isCoach = item.role === 'coach';
            const showFact =
              isCoach &&
              item.funFact &&
              !dismissedFunFacts.has(`${item.id}-fact`);
            return (
              <View style={[styles.bubbleRow, isCoach ? styles.rowCoach : styles.rowUser]}>
                {isCoach ? (
                  <View style={styles.coachCol}>
                    <LinearGradient
                      colors={[Colors.gradientStart + '55', Colors.gradientMid + '33']}
                      style={styles.coachBubble}
                    >
                      <MaterialIcons name="psychology" size={14} color={Colors.primaryLight} />
                      <Text style={styles.coachText}>{item.content}</Text>
                    </LinearGradient>
                    {showFact ? (
                      <AiFunFactCard
                        text={item.funFact!}
                        onDismiss={async () => {
                          const factId = `${item.id}-fact`;
                          setDismissedFunFacts((prev) => new Set([...prev, factId]));
                          await dismissFunFact(funFactScope, factId);
                        }}
                      />
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{item.content}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />

        <View style={[styles.inputArea, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={chat.inputPlaceholder}
            placeholderTextColor={Colors.textMuted}
            multiline
            style={styles.input}
            editable={!sending && userCount < SOLO_CHAT_MESSAGE_LIMIT}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sending || userCount >= SOLO_CHAT_MESSAGE_LIMIT}
            style={styles.sendBtn}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialIcons name="send" size={22} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.error + '15',
    borderRadius: Radius.md,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  bubbleRow: { marginBottom: Spacing.sm },
  rowCoach: { alignItems: 'flex-start' },
  rowUser: { alignItems: 'flex-end' },
  coachCol: { maxWidth: '92%' },
  coachBubble: {
    flexDirection: 'row',
    gap: 8,
    maxWidth: '92%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'flex-start',
  },
  coachText: {
    flex: 1,
    flexShrink: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: Colors.primary + '33',
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  userText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
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
});
