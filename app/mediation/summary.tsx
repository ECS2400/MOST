import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  AgreementItem,
  buildDefaultSummary,
  buildSummaryText,
  createAgreementId,
  cycleResponsible,
  fetchMediationForSummary,
  getResponsibleLabel,
  MediationSummaryData,
  NextStepItem,
  saveMediationSummary,
  sendSummaryEmail,
} from '@/services/mediationSummary';

import type { Language } from '@/constants/i18n';

const MOOD_EMOJIS = ['😊', '😐', '😢'] as const;

function CelebrationHeader() {
  return <Text style={styles.celebrationEmoji}>🎉</Text>;
}

function AgreementRow({
  item,
  language,
  agreementPlaceholder,
  onToggle,
  onChangeText,
  onCycleResponsible,
  onRemove,
}: {
  item: AgreementItem;
  language: Language;
  agreementPlaceholder: string;
  onToggle: () => void;
  onChangeText: (text: string) => void;
  onCycleResponsible: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.agreementRow}>
      <Pressable onPress={onToggle} style={styles.checkboxWrap}>
        <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
          {item.done ? (
            <MaterialIcons name="check" size={14} color="#fff" />
          ) : null}
        </View>
      </Pressable>
      <TextInput
        value={item.text}
        onChangeText={onChangeText}
        placeholder={agreementPlaceholder}
        placeholderTextColor={Colors.textMuted}
        multiline
        style={[styles.agreementInput, item.done && styles.agreementInputDone]}
      />
      <Pressable onPress={onCycleResponsible} style={styles.responsibleTag}>
        <Text style={styles.responsibleTagText}>
          {getResponsibleLabel(item.responsible, language)}
        </Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8}>
        <MaterialIcons name="close" size={18} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <MaterialIcons
            name={n <= value ? 'star' : 'star-border'}
            size={28}
            color={n <= value ? Colors.gold : Colors.textMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function MediationSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const lm = getLiveMediationExtras(language);
  const moods = MOOD_EMOJIS.map((emoji, index) => ({
    emoji,
    label: lm.summary.moods[index],
  }));
  const { mediationId } = useLocalSearchParams<{ mediationId?: string }>();

  const [summary, setSummary] = useState<MediationSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!user || !mediationId) return;
    setLoading(true);
    try {
      const { live_summary, analysis } = await fetchMediationForSummary(
        mediationId,
        user.id
      );
      setSummary(live_summary || buildDefaultSummary(analysis, 0, 3));
    } catch (e: any) {
      Alert.alert(lm.summary.title, e.message || lm.summary.loadError);
    } finally {
      setLoading(false);
    }
  }, [lm.summary.loadError, lm.summary.title, mediationId, user]);

  useEffect(() => {
    load();
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function updateAgreement(id: string, patch: Partial<AgreementItem>) {
    setSummary((prev) =>
      prev
        ? {
            ...prev,
            agreements: (prev.agreements || []).map((a) =>
              a.id === id ? { ...a, ...patch } : a
            ),
          }
        : prev
    );
  }

  function addAgreement() {
    setSummary((prev) =>
      prev
        ? {
            ...prev,
            agreements: [
              ...(prev.agreements || []),
              {
                id: createAgreementId(),
                text: '',
                done: false,
                responsible: 'both',
              },
            ],
          }
        : prev
    );
  }

  function removeAgreement(id: string) {
    setSummary((prev) =>
      prev
        ? {
            ...prev,
            agreements: (prev.agreements || []).filter((a) => a.id !== id),
          }
        : prev
    );
  }

  function updateNextStep(id: string, patch: Partial<NextStepItem>) {
    setSummary((prev) =>
      prev
        ? {
            ...prev,
            nextSteps: (prev.nextSteps || []).map((s) =>
              s.id === id ? { ...s, ...patch } : s
            ),
          }
        : prev
    );
  }

  async function handleSaveHistory() {
    if (!summary || !mediationId) return;
    setSaving(true);
    try {
      const status = await saveMediationSummary(mediationId, summary);
      showToast(
        status === 'resolved' ? lm.summary.savedResolved : lm.summary.savedPending
      );
      setTimeout(() => router.replace('/(tabs)'), 800);
    } catch (e: any) {
      Alert.alert(lm.summary.title, e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyText() {
    if (!summary) return;
    await Clipboard.setStringAsync(buildSummaryText(summary));
    showToast(lm.summary.copied);
  }

  async function handleEmailSummary() {
    if (!summary || !user?.email) {
      Alert.alert(lm.summary.noEmailTitle, lm.summary.noEmailBody);
      return;
    }
    try {
      await sendSummaryEmail(
        user.email,
        lm.summary.emailSubject,
        buildSummaryText(summary)
      );
    } catch (e: any) {
      Alert.alert(lm.summary.title, e.message);
    }
  }

  if (loading || !summary) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{lm.summary.title}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <CelebrationHeader />
        <Text style={styles.headerTitle}>{lm.summary.title}</Text>

        {toast ? (
          <View style={styles.toast}>
            <MaterialIcons name="check-circle" size={16} color={Colors.success} />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        <LinearGradient
          colors={[Colors.success + '18', Colors.surfaceElevated]}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryTitle}>{lm.summary.celebration}</Text>
          <Text style={styles.summarySub}>
            Oto co ustaliliście wspólnie z AI Mediatorem:
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wspólne zrozumienie</Text>
            <Text style={styles.sectionBody}>{summary.commonUnderstanding}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Co robicie dobrze</Text>
            <Text style={styles.sectionBody}>{summary.doingWell}</Text>
          </View>

          {summary.dateIdea ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{lm.summary.dateIdeaSection}</Text>
              <Text style={styles.dateIdeaTitle}>{summary.dateIdea.title}</Text>
              <Text style={styles.sectionBody}>{summary.dateIdea.description}</Text>
              <Text style={styles.dateIdeaMeta}>
                {summary.dateIdea.estimatedCost} · {summary.dateIdea.whyItFits}
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        <Text style={styles.blockLabel}>{lm.summary.agreementsTitle}</Text>
        <Card variant="bordered" style={styles.agreementsCard}>
          {(summary.agreements || []).map((item) => (
            <AgreementRow
              key={item.id}
              item={item}
              language={language}
              agreementPlaceholder={lm.summary.agreementPlaceholder}
              onToggle={() => updateAgreement(item.id, { done: !item.done })}
              onChangeText={(text) => updateAgreement(item.id, { text })}
              onCycleResponsible={() =>
                updateAgreement(item.id, {
                  responsible: cycleResponsible(item.responsible),
                })
              }
              onRemove={() => removeAgreement(item.id)}
            />
          ))}
          <Pressable onPress={addAgreement} style={styles.addBtn}>
            <MaterialIcons name="add-circle-outline" size={20} color={Colors.success} />
            <Text style={styles.addBtnText}>Dodaj ustalenie</Text>
          </Pressable>
        </Card>

        <Text style={styles.blockLabel}>{lm.summary.nextStepsTitle}</Text>
        <Card variant="bordered" style={styles.stepsCard}>
          {(summary.nextSteps || []).map((step) => (
            <View key={step.id} style={styles.stepRow}>
              <TextInput
                value={step.text}
                onChangeText={(text) => updateNextStep(step.id, { text })}
                placeholder={lm.summary.nextStepPlaceholder}
                placeholderTextColor={Colors.textMuted}
                style={styles.stepInput}
              />
              <TextInput
                value={step.date}
                onChangeText={(date) => updateNextStep(step.id, { date })}
                placeholder={lm.summary.datePlaceholder}
                placeholderTextColor={Colors.textMuted}
                style={styles.dateInput}
              />
            </View>
          ))}
        </Card>

        <Text style={styles.blockLabel}>Refleksja</Text>
        <Card variant="bordered" style={styles.reflectionCard}>
          <Text style={styles.reflectionLabel}>Jak czujesz się teraz?</Text>
          <View style={styles.moodRow}>
            {moods.map((m) => (
              <Pressable
                key={m.emoji}
                onPress={() => setSummary((prev) => (prev ? { ...prev, mood: m.emoji } : prev))}
                style={[
                  styles.moodBtn,
                  summary.mood === m.emoji && styles.moodBtnActive,
                ]}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={styles.moodLabel}>{m.label}</Text>
              </Pressable>
            ))}
          </View>

          <Input
            label={lm.summary.reflectionTitle}
            value={summary.hardestPart || ''}
            onChangeText={(hardestPart) =>
              setSummary((prev) => (prev ? { ...prev, hardestPart } : prev))
            }
            placeholder={lm.summary.reflectionPlaceholder}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.reflectionLabel}>Czy mediator był pomocny?</Text>
          <StarRating
            value={summary.mediatorRating || 0}
            onChange={(mediatorRating) =>
              setSummary((prev) => (prev ? { ...prev, mediatorRating } : prev))
            }
          />
        </Card>

        <View style={styles.exportSection}>
          <Button
            title={lm.summary.saveHistory}
            onPress={handleSaveHistory}
            loading={saving}
            fullWidth
            size="lg"
          />
          <Button
            title={lm.summary.sendEmail}
            onPress={handleEmailSummary}
            variant="outline"
            fullWidth
          />
          <Button
            title={lm.summary.copyText}
            onPress={handleCopyText}
            variant="ghost"
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  celebrationEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success + '18',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  toastText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.success,
  },
  summaryCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '30',
    ...Shadow.sm,
  },
  summaryTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.success,
  },
  summarySub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: { gap: 6 },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  sectionBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  dateIdeaTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: Colors.primaryLight,
    marginTop: 4,
  },
  dateIdeaMeta: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  blockLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  agreementsCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkboxWrap: { paddingTop: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  agreementInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
    minHeight: 36,
  },
  agreementInputDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  responsibleTag: {
    backgroundColor: Colors.primary + '20',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  responsibleTagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.primaryLight,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.success,
  },
  stepsCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  stepRow: {
    gap: Spacing.xs,
  },
  stepInput: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  dateInput: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  reflectionCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reflectionLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  moodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  moodBtnActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '12',
  },
  moodEmoji: { fontSize: 28 },
  moodLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  exportSection: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
