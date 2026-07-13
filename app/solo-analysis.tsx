import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePurchases } from '@/hooks/usePurchases';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatScreenshotFlow } from '@/components/feature/ChatScreenshotFlow';
import { SoloAnalysisReport } from '@/components/feature/SoloAnalysisReport';
import { SoloQuiz } from '@/components/feature/SoloQuiz';
import { SoloQuizAnswers } from '@/constants/soloQuiz';
import { MappedAnalysisView } from '@/services/analysisViewMapper';
import { runSoloAnalysis, type SoloAnalysisRunResult } from '@/services/soloAnalysis';
import { saveSoloChatSession } from '@/services/soloCoach';
import { checkFeatureAccess, ensureFeatureAllowed, incrementFeatureUsage } from '@/services/checkLimits';
import {
  FeatureLimitBlockedError,
  LIMIT_CHECK_ERROR,
  navigateToPaywall,
} from '@/utils/paywallReason';
import { createSoloMediationRecord } from '@/services/soloMediationRecord';
import {
  buildSoloSituationFromForm,
  type StructuredFormResult,
} from '@/services/screenshotInterpret';
import { getProducts } from '@/services/revenueCat';
import { getSoloExtras } from '@/constants/i18n/soloExtras';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';

type AnalysisStep = 'purchase' | 'quiz' | 'input' | 'result';

export default function SoloAnalysis() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { hasSolo, isPurchasing, purchase } = usePurchases();
  const { t, language } = useLanguage();

  const st = t.solo as any;
  const extras = useMemo(() => getSoloExtras(language), [language]);
  const lm = useMemo(() => getLiveMediationExtras(language), [language]);
  const soloPrice = useMemo(
    () => getProducts(language).find((p) => p.id === 'most_solo_analysis')?.price ?? st.price,
    [language, st.price],
  );

  const [step, setStep] = useState<AnalysisStep>('purchase');
  const [situation, setSituation] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisView, setAnalysisView] = useState<MappedAnalysisView | null>(null);
  const [analysisRun, setAnalysisRun] = useState<SoloAnalysisRunResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<SoloQuizAnswers>({});
  const [screenshotFilled, setScreenshotFilled] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  const emotions: string[] = st.emotions || ['😤 Złość', '😢 Smutek', '😐 Zagubienie', '😔 Rozczarowanie', '😰 Lęk'];
  const needsList: string[] = st.needs || ['❤️ Bliskości', '🗣️ Rozmowy', '🤗 Przytulenia', '🧘 Przestrzeni', '🤝 Kompromisu'];

  useEffect(() => {
    if (hasSolo) {
      setStep('quiz');
      return;
    }
    if (!user?.id) return;

    let cancelled = false;
    checkFeatureAccess('solo_analysis', { userId: user.id })
      .then((result) => {
        if (!cancelled && result.allowed) {
          setStep('quiz');
        }
      })
      .catch(() => {
        // Stay on purchase step when limit check fails.
      });

    return () => {
      cancelled = true;
    };
  }, [hasSolo, user?.id]);

  function toggleEmotion(e: string) {
    setSelectedEmotions((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  function toggleNeed(n: string) {
    setSelectedNeeds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  }

  async function handlePurchase() {
    setPurchaseError('');
    const res = await purchase('most_solo_analysis');
    if (res?.success) {
      setStep('quiz');
    } else {
      setPurchaseError(extras.errors.purchaseFailed);
    }
  }

  function handleScreenshotStructured(form: StructuredFormResult) {
    const text = buildSoloSituationFromForm(form);
    if (text) setSituation(text);
    setScreenshotFilled(true);
    setShowScreenshot(false);
  }

  async function handleAnalyze() {
    if (!situation.trim() || !user?.id) return;
    setIsAnalyzing(true);
    setAnalyzeError('');
    try {
      await ensureFeatureAllowed('solo_analysis', { userId: user.id });

      const run = await runSoloAnalysis(
        {
          situation: situation.trim(),
          emotions: selectedEmotions,
          needs: selectedNeeds,
          quizAnswers,
        },
        language || 'pl',
        user.name
      );

      const usageKey = `solo-${Date.now()}`;
      try {
        await incrementFeatureUsage('solo_analysis', {
          userId: user.id,
          usageKey,
        });
      } catch (usageError) {
        console.warn('[solo-analysis] usage increment failed', usageError);
      }

      setAnalysisRun(run);
      setAnalysisView(run.view);
      setStep('result');
    } catch (e: unknown) {
      if (e instanceof FeatureLimitBlockedError) {
        navigateToPaywall(router, e.paywallReason);
        return;
      }
      setAnalyzeError(
        e instanceof Error && e.message === LIMIT_CHECK_ERROR
          ? LIMIT_CHECK_ERROR
          : extras.errors.analyzeFailed
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{st.title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{st.subtitle}</Text>
          </View>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid]}
            style={styles.soloBadge}
          >
            <MaterialIcons name="person" size={16} color="#fff" />
          </LinearGradient>
        </View>

        {/* Step: Purchase */}
        {step === 'purchase' ? (
          <View style={styles.purchaseContent}>
            <LinearGradient
              colors={[Colors.gradientStart + '30', Colors.gradientMid + '15', Colors.gradientEnd + '10']}
              style={styles.purchaseHero}
            >
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid]}
                style={styles.heroIcon}
              >
                <MaterialIcons name="psychology" size={36} color="#fff" />
              </LinearGradient>
              <Text style={styles.heroTitle}>{st.title}</Text>
              <Text style={styles.heroPrice}>{soloPrice}</Text>
              <Text style={styles.heroPriceSub}>{st.priceDesc}</Text>
            </LinearGradient>

            <View style={styles.benefitsList}>
              {[
                { icon: 'edit-note', text: 'Opisz sytuację ze swojej perspektywy' },
                { icon: 'document-scanner', text: 'Wgraj zrzut rozmowy do analizy OCR' },
                { icon: 'smart-toy', text: 'AI mediator analizuje Twój opis' },
                { icon: 'lightbulb', text: 'Otrzymaj konkretne sugestie jak rozmawiać' },
                { icon: 'favorite', text: 'Przygotuj się do rozmowy z partnerem' },
              ].map((b) => (
                <View key={b.text} style={styles.benefitRow}>
                  <LinearGradient
                    colors={[Colors.primary + '30', Colors.gradientMid + '15']}
                    style={styles.benefitIcon}
                  >
                    <MaterialIcons name={b.icon as any} size={16} color={Colors.primaryLight} />
                  </LinearGradient>
                  <Text style={styles.benefitText}>{b.text}</Text>
                  <MaterialIcons name="check" size={16} color={Colors.success} />
                </View>
              ))}
            </View>

            {purchaseError ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{purchaseError}</Text>
              </View>
            ) : null}

            <Button
              title={st.buy}
              onPress={handlePurchase}
              loading={isPurchasing}
              fullWidth
              size="lg"
            />

            <View style={styles.paymentMethods}>
              <MaterialIcons name="lock" size={12} color={Colors.textMuted} />
              <Text style={styles.paymentText}>{extras.errors.securePayment}</Text>
            </View>

            <Pressable
              onPress={() => router.push('/premium')}
              style={({ pressed }) => [styles.premiumLink, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.premiumLinkText}>
                Wolisz nieograniczony dostęp?{' '}
                <Text style={styles.premiumLinkHighlight}>
                  {t.premium.title} →
                </Text>
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Step: Quiz */}
        {step === 'quiz' ? (
          <SoloQuiz
            onComplete={(answers) => {
              setQuizAnswers(answers);
              setStep('input');
            }}
            onSkip={() => {
              setQuizAnswers({});
              setStep('input');
            }}
          />
        ) : null}

        {/* Step: Input */}
        {step === 'input' ? (
          <View style={styles.inputContent}>
            <Card variant="bordered" style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons name="info-outline" size={16} color={Colors.primaryLight} />
                <Text style={styles.infoText}>{st.subtitle}</Text>
              </View>
            </Card>

            {/* Screenshot upload toggle */}
            <Pressable
              onPress={() => setShowScreenshot(!showScreenshot)}
              style={({ pressed }) => [
                styles.screenshotToggle,
                showScreenshot && styles.screenshotToggleActive,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <MaterialIcons
                name="document-scanner"
                size={18}
                color={showScreenshot ? Colors.primaryLight : Colors.textSecondary}
              />
              <Text style={[styles.screenshotToggleText, showScreenshot && { color: Colors.primaryLight }]}>
                {st.screenshotLabel}
              </Text>
              <MaterialIcons
                name={showScreenshot ? 'expand-less' : 'expand-more'}
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>

            {showScreenshot ? (
              <ChatScreenshotFlow
                language={language}
                labels={lm.new}
                userId={user?.id}
                onStructured={handleScreenshotStructured}
                onLimitReached={() => navigateToPaywall(router, 'ocr_limit')}
              />
            ) : null}

            {screenshotFilled && !showScreenshot ? (
              <View style={styles.screenshotBadge}>
                <MaterialIcons name="check-circle" size={14} color={Colors.success} />
                <Text style={styles.screenshotBadgeText}>{lm.new.fillFormSuccess}</Text>
              </View>
            ) : null}

            <Input
              label={st.situationLabel}
              value={situation}
              onChangeText={setSituation}
              placeholder={st.situationPlaceholder}
              multiline
              numberOfLines={5}
            />

            {/* Emotion tags */}
            <View style={styles.tagsSection}>
              <Text style={styles.tagsLabel}>{st.feelingsLabel}</Text>
              <View style={styles.tagsRow}>
                {emotions.map((emotion) => {
                  const isSelected = selectedEmotions.includes(emotion);
                  return (
                    <Pressable
                      key={emotion}
                      onPress={() => toggleEmotion(emotion)}
                      style={({ pressed }) => [
                        styles.tag,
                        isSelected && styles.tagSelected,
                        { opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={[Colors.gradientStart + '60', Colors.gradientMid + '40']}
                          style={StyleSheet.absoluteFill}
                        />
                      ) : null}
                      <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                        {emotion}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Need tags */}
            <View style={styles.tagsSection}>
              <Text style={styles.tagsLabel}>{st.needsLabel}</Text>
              <View style={styles.tagsRow}>
                {needsList.map((need) => {
                  const isSelected = selectedNeeds.includes(need);
                  return (
                    <Pressable
                      key={need}
                      onPress={() => toggleNeed(need)}
                      style={({ pressed }) => [
                        styles.tag,
                        isSelected && styles.tagSelected,
                        { opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={[Colors.gradientStart + '60', Colors.gradientMid + '40']}
                          style={StyleSheet.absoluteFill}
                        />
                      ) : null}
                      <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                        {need}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {analyzeError ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{analyzeError}</Text>
              </View>
            ) : null}

            <Button
              title={st.analyze}
              onPress={handleAnalyze}
              loading={isAnalyzing}
              disabled={!situation.trim()}
              fullWidth
              size="lg"
            />
          </View>
        ) : null}

        {/* Step: Result */}
        {step === 'result' && analysisView ? (
          <SoloAnalysisReport
            analysis={analysisView}
            labels={extras.report}
            conversationTips={extras.conversationTips}
            readyLabel={st.ready}
            suggestionsTitle={st.suggestions}
            inviteLabel={st.invitePartner}
            newAnalysisLabel={st.newAnalysis}
            coachLabel={extras.report.startCoach}
            onStartCoach={async () => {
              if (!analysisRun || !user?.id) return;
              try {
                await ensureFeatureAllowed('ai_chat', { userId: user.id });
              } catch (e: unknown) {
                if (e instanceof FeatureLimitBlockedError) {
                  navigateToPaywall(router, e.paywallReason);
                  return;
                }
                setAnalyzeError(
                  e instanceof Error ? e.message : LIMIT_CHECK_ERROR
                );
                return;
              }

              let mediationId: string | undefined;
              if (user?.id) {
                try {
                  mediationId = await createSoloMediationRecord(user.id, {
                    combinedDescription: analysisRun.combinedDescription,
                    raw: analysisRun.raw,
                    createdAt: new Date().toISOString(),
                  });
                } catch {
                  // Historia zapisze się też przy zakończeniu ankiety.
                }
              }
              await saveSoloChatSession({
                view: analysisRun.view,
                raw: analysisRun.raw,
                combinedDescription: analysisRun.combinedDescription,
                quizAnswers,
                messages: [],
                createdAt: new Date().toISOString(),
                mediationId,
              });
              router.push('/solo-chat');
            }}
            onInvitePartner={() => router.push('/(tabs)/partner')}
            onNewAnalysis={() => {
              setSituation('');
              setSelectedEmotions([]);
              setSelectedNeeds([]);
              setQuizAnswers({});
              setAnalysisView(null);
              setAnalysisRun(null);
              setAnalyzeError('');
              setStep('quiz');
            }}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  soloBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Purchase
  purchaseContent: { gap: Spacing.md },
  purchaseHero: {
    borderRadius: Radius['2xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
  },
  heroPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['3xl'],
    color: Colors.primaryLight,
  },
  heroPriceSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  benefitsList: { gap: 2 },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    flex: 1,
    flexShrink: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error + '15',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
    flex: 1,
  },
  paymentMethods: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  paymentText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  premiumLink: { alignItems: 'center', paddingVertical: 4 },
  premiumLinkText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  premiumLinkHighlight: {
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primaryLight,
  },
  // Input
  inputContent: { gap: Spacing.md },
  infoCard: { padding: Spacing.md },
  infoRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  infoText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    flex: 1,
    flexShrink: 1,
    lineHeight: 20,
  },
  screenshotToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  screenshotToggleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  screenshotToggleText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    flex: 1,
    flexShrink: 1,
  },
  screenshotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success + '15',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  screenshotBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.success,
  },
  tagsSection: { gap: 10 },
  tagsLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  tagSelected: {
    borderColor: Colors.primary,
  },
  tagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  tagTextSelected: {
    color: Colors.primaryLight,
  },
  // Result
  resultContent: { gap: Spacing.md },
  resultHero: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  resultHeroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.success,
  },
  resultHeroSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  insightCard: { gap: 6 },
  insightLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  aiCard: { gap: Spacing.sm },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  aiCardText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  draftCard: { gap: Spacing.sm },
  draftLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  draftBox: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  draftText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  suggestionsSection: { gap: Spacing.md },
  suggestionsSectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  suggestionItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  suggestionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  suggestionNumberText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#fff',
  },
  suggestionText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    flex: 1,
    flexShrink: 1,
    lineHeight: 22,
  },
});
