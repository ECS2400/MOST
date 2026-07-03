import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { getClosureBundle } from '@/constants/i18n/closure';
import type { ClosureSurveyAnswers } from '@/constants/disputeClosureSurvey';
import type { MediationClosureOutcome } from '@/constants/dateIdeas/types';
import {
  buildSoloContext,
  completeSoloClosure,
  generateDateIdea,
  inferClosureOutcomeFromStatus,
  loadSoloChatSession,
  prepareLiveMediationEnd,
  saveLiveClosureResult,
  type DateIdea,
} from '@/services/disputeClosure';
import { supabase } from '@/services/supabase';
import { fmt } from '@/utils/i18nFormat';

type Step = 'survey' | 'loading' | 'dateIdea';

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default function DisputeClosureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const closure = getClosureBundle(language);
  const surveyQuestions = closure.survey;
  const ui = closure.ui;
  const params = useLocalSearchParams<{
    mode?: string | string[];
    mediationId?: string | string[];
    messageCount?: string | string[];
    phase?: string | string[];
    outcome?: string | string[];
  }>();

  const mode = paramString(params.mode) === 'solo' ? 'solo' : 'live';
  const mediationId = paramString(params.mediationId);
  const messageCount = parseInt(paramString(params.messageCount) || '0', 10) || 0;
  const phase = parseInt(paramString(params.phase) || '1', 10) || 1;

  const [step, setStep] = useState<Step>('survey');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ClosureSurveyAnswers>({});
  const [dateIdea, setDateIdea] = useState<DateIdea | null>(null);
  const [closureOutcome, setClosureOutcome] = useState<MediationClosureOutcome>('resolved');
  const [preparing, setPreparing] = useState(mode === 'live');
  const [finishing, setFinishing] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [prepError, setPrepError] = useState('');

  useEffect(() => {
    if (mode !== 'live' || !mediationId) {
      setPreparing(false);
      return;
    }

    prepareLiveMediationEnd(mediationId, messageCount, phase, ui.errorPrep).then((result) => {
      setPreparing(false);
      if (!result.ok) {
        setPrepError(result.error || ui.errorPrep);
      }
    });
  }, [mode, mediationId, messageCount, phase, ui.errorPrep]);

  const currentQuestion = surveyQuestions[questionIndex];
  const progress = (questionIndex + 1) / surveyQuestions.length;

  useEffect(() => {
    const paramOutcome = paramString(params.outcome);
    if (paramOutcome === 'resolved' || paramOutcome === 'unresolved_but_closed') {
      setClosureOutcome(paramOutcome);
      return;
    }

    if (mode !== 'live' || !mediationId) return;

    supabase
      .from('mediations')
      .select('status')
      .eq('id', mediationId)
      .maybeSingle()
      .then(({ data }) => {
        setClosureOutcome(inferClosureOutcomeFromStatus(data?.status));
      });
  }, [mode, mediationId, params.outcome]);

  const loadDateIdea = useCallback(
    async (finalAnswers: ClosureSurveyAnswers, excludeIds: string[] = []) => {
      let situationSummary = '';
      let keyTrigger = '';
      let chatSnippet = '';
      let outcome = closureOutcome;

      if (mode === 'solo') {
        const session = await loadSoloChatSession();
        if (session) {
          const ctx = buildSoloContext(session);
          situationSummary = ctx.situationSummary;
          keyTrigger = ctx.keyTrigger;
          chatSnippet = ctx.chatSnippet;
        }
      } else if (mediationId) {
        const { data: med } = await supabase
          .from('mediations')
          .select('analysis, combined_description, status')
          .eq('id', mediationId)
          .maybeSingle();
        const analysis = (med?.analysis as Record<string, unknown>) || {};
        situationSummary =
          (med?.combined_description as string) ||
          (analysis.situation_summary as string) ||
          '';
        keyTrigger = (analysis.key_trigger as string) || '';
        outcome = inferClosureOutcomeFromStatus(med?.status);
        setClosureOutcome(outcome);
      }

      const { dateIdea: idea } = await generateDateIdea({
        mode,
        language,
        surveyAnswers: finalAnswers,
        situationSummary,
        keyTrigger,
        chatSnippet,
        outcome,
        userId: user?.id,
        excludeIds,
      });

      setDateIdea(idea);
      setStep('dateIdea');
    },
    [mode, mediationId, language, closureOutcome, user?.id]
  );

  const finishSurvey = useCallback(
    async (finalAnswers: ClosureSurveyAnswers) => {
      setStep('loading');
      try {
        await loadDateIdea(finalAnswers);
      } catch {
        Alert.alert(ui.errorTitle, ui.errorSave);
        setStep('survey');
      }
    },
    [loadDateIdea, ui.errorSave, ui.errorTitle]
  );

  const handleShuffleDateIdea = useCallback(async () => {
    if (shuffling || !dateIdea) return;
    setShuffling(true);
    try {
      await loadDateIdea(answers, dateIdea.id ? [dateIdea.id] : []);
    } catch {
      Alert.alert(ui.errorTitle, ui.errorSave);
    } finally {
      setShuffling(false);
    }
  }, [shuffling, dateIdea, loadDateIdea, answers, ui.errorSave, ui.errorTitle]);

  const handleSelectOption = useCallback(
    (option: string) => {
      if (!currentQuestion) return;

      const nextAnswers = { ...answers, [currentQuestion.id]: option };
      setAnswers(nextAnswers);

      if (questionIndex + 1 >= surveyQuestions.length) {
        finishSurvey(nextAnswers);
        return;
      }

      setQuestionIndex((i) => i + 1);
    },
    [answers, currentQuestion, questionIndex, finishSurvey]
  );

  const handleFinish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);

    try {
      const result = {
        surveyAnswers: answers,
        dateIdea: dateIdea!,
        completedAt: new Date().toISOString(),
      };

      if (mode === 'live' && mediationId) {
        await saveLiveClosureResult(mediationId, result, language);
        router.replace({
          pathname: '/mediation/summary',
          params: { mediationId },
        });
      } else {
        const session = await loadSoloChatSession();
        if (!user?.id || !session) {
          throw new Error(ui.noSession);
        }
        await completeSoloClosure(user.id, session, result);
        router.replace('/(tabs)');
      }
    } catch {
      Alert.alert(ui.errorTitle, ui.errorSave);
      setFinishing(false);
    }
  }, [finishing, answers, dateIdea, mode, mediationId, router, user?.id, ui]);

  if (preparing) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
        <Text style={styles.loadingText}>{ui.loadingMediation}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {step === 'survey' && questionIndex > 0 ? (
          <Pressable
            onPress={() => setQuestionIndex((i) => Math.max(0, i - 1))}
            style={styles.headerBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <Text style={styles.headerTitle}>
          {step === 'dateIdea' ? ui.dateIdeaTodayTitle : ui.surveyTitle}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {prepError ? (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>{prepError}</Text>
        </View>
      ) : null}

      {step === 'survey' && currentQuestion ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.stepLabel}>
            {fmt(ui.questionProgress, {
              current: String(questionIndex + 1),
              total: String(surveyQuestions.length),
            })}
          </Text>
          <Text style={styles.question}>{currentQuestion.prompt}</Text>
          <View style={styles.options}>
            {currentQuestion.options.map((option) => (
              <Pressable
                key={option}
                onPress={() => handleSelectOption(option)}
                style={({ pressed }) => [
                  styles.option,
                  answers[currentQuestion.id] === option && styles.optionSelected,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    answers[currentQuestion.id] === option && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {step === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primaryLight} size="large" />
          <Text style={styles.loadingText}>{ui.loadingDateIdea}</Text>
        </View>
      ) : null}

      {step === 'dateIdea' && dateIdea ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[Colors.gradientStart + '44', Colors.gradientMid + '22']}
            style={styles.dateCard}
          >
            <MaterialIcons name="favorite" size={28} color={Colors.primaryLight} />
            <Text style={styles.dateTitle}>{dateIdea.title}</Text>
            <Text style={styles.dateDescription}>{dateIdea.description}</Text>
          </LinearGradient>

          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>{ui.durationLabel}</Text>
            <Text style={styles.detailText}>
              {fmt(ui.durationMinutes, {
                minutes: String(dateIdea.durationMinutes || 30),
              })}
            </Text>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>{ui.cost}</Text>
            <Text style={styles.detailText}>
              {dateIdea.budget === 'free'
                ? ui.budgetFree
                : dateIdea.budget === 'low'
                  ? ui.budgetLow
                  : dateIdea.estimatedCost}
            </Text>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>{ui.whyItFits}</Text>
            <Text style={styles.detailText}>{dateIdea.whyItFits}</Text>
          </View>

          <Pressable
            onPress={handleShuffleDateIdea}
            disabled={shuffling || finishing}
            style={({ pressed }) => [
              styles.shuffleBtn,
              { opacity: pressed || shuffling ? 0.85 : 1 },
            ]}
          >
            {shuffling ? (
              <ActivityIndicator color={Colors.primaryLight} />
            ) : (
              <>
                <MaterialIcons name="shuffle" size={20} color={Colors.primaryLight} />
                <Text style={styles.shuffleBtnText}>{ui.shuffleDateIdea}</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.footerNote}>{ui.footerNote}</Text>

          <Pressable
            onPress={handleFinish}
            disabled={finishing}
            style={({ pressed }) => [
              styles.finishBtn,
              { opacity: pressed || finishing ? 0.85 : 1 },
            ]}
          >
            {finishing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.finishBtnText}>
                  {mode === 'live' ? ui.finishLive : ui.finish}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  warnBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.warning + '18',
    borderRadius: Radius.md,
  },
  warnText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.warning,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: 2,
  },
  stepLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  question: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.textPrimary,
    lineHeight: 30,
    marginTop: Spacing.sm,
  },
  options: { gap: Spacing.sm, marginTop: Spacing.lg },
  option: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionSelected: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primary + '22',
  },
  optionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  optionTextSelected: { color: Colors.primaryLight },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  dateCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  dateTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  dateDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  detailBlock: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  detailLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  footerNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
  },
  finishBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 16,
    color: '#fff',
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  shuffleBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 16,
    color: Colors.primaryLight,
  },
});
