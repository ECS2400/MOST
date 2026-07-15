import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  CONFLICT_CATEGORIES,
  type ConflictCategory,
} from '@/constants/conflictCategories';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  ChatScreenshotFlow,
  type ChatScreenshotStep,
} from '@/components/feature/ChatScreenshotFlow';
import { buildCombinedDescription } from '@/services/mediationCreate';
import {
  applyStructuredForm,
  type StructuredFormResult,
} from '@/services/screenshotInterpret';
import { ensureFeatureAllowed } from '@/services/checkLimits';
import {
  FeatureLimitBlockedError,
  LIMIT_CHECK_ERROR,
  navigateToPaywall,
} from '@/utils/paywallReason';
import { LimitCheckTechnicalError } from '@/services/checkLimits.types';
import {
  MediationSubmitError,
  submitNewMediation,
} from '@/services/mediationSubmit';

export default function NewMediationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { couple } = useCouple();
  const { language } = useLanguage();
  const lm = getLiveMediationExtras(language);

  const [screenshotUris, setScreenshotUris] = useState<string[]>([]);
  const [usePasteInstead, setUsePasteInstead] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const [conflictCategory, setConflictCategory] = useState<ConflictCategory | null>(
    null
  );
  const [whatHappened, setWhatHappened] = useState('');
  const [whatAngered, setWhatAngered] = useState('');
  const [howFelt, setHowFelt] = useState('');
  const [whatNeeded, setWhatNeeded] = useState('');
  const [whatToSay, setWhatToSay] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [interpretStep, setInterpretStep] = useState<ChatScreenshotStep>('idle');

  const combinedDescription = useMemo(
    () =>
      buildCombinedDescription(
        whatHappened,
        whatAngered,
        howFelt,
        whatNeeded,
        whatToSay
      ),
    [whatHappened, whatAngered, howFelt, whatNeeded, whatToSay]
  );

  const hasDescription = combinedDescription.trim().length > 0;
  const hasPasteText = pastedText.trim().length > 0;
  const effectivePastedText = pastedText.trim() || null;
  const hasConflictCategory = conflictCategory !== null;

  const canSubmit =
    hasConflictCategory &&
    (hasDescription ||
      (usePasteInstead && hasPasteText) ||
      (screenshotUris.length > 0 && interpretStep === 'structured') ||
      (screenshotUris.length === 0 && hasPasteText));

  function handleStructured(form: StructuredFormResult) {
    applyStructuredForm(form, {
      setWhatHappened,
      setWhatAngered,
      setHowFelt,
      setWhatNeeded,
      setWhatToSay,
      setPastedText,
    });
  }

  async function handleSubmit() {
    if (!user || loading) return;

    if (!conflictCategory) {
      setError(lm.new.categoryRequiredError);
      return;
    }

    if (!canSubmit) return;

    setError('');
    setLoading(true);

    try {
      if (!couple?.id) {
        setError(lm.new.submitError);
        return;
      }

      await ensureFeatureAllowed('create_live_mediation', {
        userId: user.id,
        coupleId: couple.id,
      });

      const { mediationId } = await submitNewMediation({
        userId: user.id,
        coupleId: couple.id,
        language: language || 'pl',
        conflictCategory,
        whatHappened,
        whatAngered,
        howFelt,
        whatNeeded,
        whatToSay,
        pastedText: effectivePastedText,
        screenshotUris,
        hasDescription,
      });

      router.replace({
        pathname: '/mediation/analysis',
        params: { mediationId },
      });
    } catch (e: unknown) {
      if (e instanceof FeatureLimitBlockedError) {
        navigateToPaywall(router, e.paywallReason);
        return;
      }
      if (e instanceof LimitCheckTechnicalError) {
        setError(LIMIT_CHECK_ERROR);
        return;
      }
      if (e instanceof MediationSubmitError) {
        setError(
          e.code === 'CONFLICT_CATEGORY_REQUIRED'
            ? lm.new.categoryRequiredError
            : lm.new.submitError
        );
        return;
      }
      setError(e instanceof Error ? e.message : lm.new.submitError);
    } finally {
      setLoading(false);
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
          {
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{lm.new.title}</Text>
        </View>

        <Text style={styles.intro}>{lm.new.intro}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lm.new.categorySectionTitle}</Text>
          <Text style={styles.sectionSub}>{lm.new.categorySectionSub}</Text>
          <View style={styles.categoryGrid}>
            {CONFLICT_CATEGORIES.map((slug) => {
              const selected = conflictCategory === slug;
              return (
                <Pressable
                  key={slug}
                  onPress={() => {
                    setConflictCategory(slug);
                    if (error === lm.new.categoryRequiredError) {
                      setError('');
                    }
                  }}
                  style={[styles.categoryChip, selected && styles.categoryChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextActive,
                    ]}
                  >
                    {lm.new.conflictCategories[slug]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          {!usePasteInstead ? (
            <ChatScreenshotFlow
              language={language}
              labels={lm.new}
              userId={user?.id}
              disabled={usePasteInstead}
              onScreenshotsChange={setScreenshotUris}
              onStepChange={setInterpretStep}
              onStructured={handleStructured}
              onError={setError}
              onLimitReached={() => navigateToPaywall(router, 'ocr_limit')}
            />
          ) : null}

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleLabel}>{lm.new.pasteToggle}</Text>
              <Text style={styles.toggleSub}>{lm.new.pasteToggleSub}</Text>
            </View>
            <Switch
              value={usePasteInstead}
              onValueChange={setUsePasteInstead}
              trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
              thumbColor={usePasteInstead ? Colors.primaryLight : Colors.textMuted}
            />
          </View>

          {usePasteInstead ? (
            <Input
              label={lm.new.pasteLabel}
              value={pastedText}
              onChangeText={setPastedText}
              placeholder={lm.new.pastePlaceholder}
              multiline
              numberOfLines={5}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lm.new.formSectionTitle}</Text>
          <Text style={styles.sectionSub}>{lm.new.formSectionSub}</Text>

          <Input
            label={lm.new.whatHappened}
            value={whatHappened}
            onChangeText={setWhatHappened}
            placeholder={lm.new.whatHappenedPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Input
            label={lm.new.whatAngered}
            value={whatAngered}
            onChangeText={setWhatAngered}
            placeholder={lm.new.whatAngeredPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Input
            label={lm.new.howFelt}
            value={howFelt}
            onChangeText={setHowFelt}
            placeholder={lm.new.howFeltPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Input
            label={lm.new.whatNeeded}
            value={whatNeeded}
            onChangeText={setWhatNeeded}
            placeholder={lm.new.whatNeededPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Input
            label={lm.new.whatToSay}
            value={whatToSay}
            onChangeText={setWhatToSay}
            placeholder={lm.new.whatToSayPlaceholder}
            multiline
            numberOfLines={4}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          title={lm.new.submit}
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.sm }}
        />
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
    marginBottom: Spacing.xs,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  intro: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  section: { gap: Spacing.sm, paddingTop: Spacing.sm },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '25',
  },
  categoryChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  categoryChipTextActive: {
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.semiBold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  toggleTextWrap: { flex: 1, gap: 2 },
  toggleLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  toggleSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error + '15',
    borderRadius: 8,
    padding: Spacing.md,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
    flex: 1,
  },
});
