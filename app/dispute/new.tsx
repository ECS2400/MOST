import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useDisputes } from '@/hooks/useDisputes';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { LIMIT_CHECK_ERROR, navigateToPaywall } from '@/utils/paywallReason';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenshotUpload } from '@/components/feature/ScreenshotUpload';
import { OCRResult } from '@/services/ocrService';

export default function NewDispute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { couple } = useCouple();
  const { createDispute, checkLimits } = useDisputes();
  const { t } = useLanguage();
  const dt = t.dispute;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOCR, setShowOCR] = useState(false);
  const [ocrUsed, setOcrUsed] = useState(false);

  async function handleCreate() {
    if (!title.trim()) { setError('Podaj temat sporu'); return; }
    if (!user || !couple) return;
    setError('');
    setLoading(true);
    try {
      const { allowed, reason } = await checkLimits(user.id);
      if (!allowed) {
        if (reason === 'limit_reached') {
          setError('Osiągnięto miesięczny limit sporów w planie Free.');
        }
        navigateToPaywall(router, 'dispute_limit');
        return;
      }
      const partnerId = couple.user1Id === user.id ? couple.user2Id : couple.user1Id;
      const dispute = await createDispute(title.trim(), description.trim(), user, couple.id, partnerId);
      router.replace(`/dispute/${dispute.id}`);
    } catch (e: any) {
      setError(e?.message === LIMIT_CHECK_ERROR ? LIMIT_CHECK_ERROR : e.message);
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
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
          <Text style={styles.title}>{dt.newDispute}</Text>
        </View>

        {/* OCR Screenshot toggle */}
        <Pressable
          onPress={() => setShowOCR(!showOCR)}
          style={({ pressed }) => [
            styles.ocrToggle,
            showOCR && styles.ocrToggleActive,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialIcons name="document-scanner" size={18} color={showOCR ? Colors.primaryLight : Colors.textSecondary} />
          <Text style={[styles.ocrToggleText, showOCR && { color: Colors.primaryLight }]}>
            {dt.ocrUpload}
          </Text>
          <MaterialIcons name={showOCR ? 'expand-less' : 'expand-more'} size={18} color={Colors.textMuted} />
        </Pressable>

        {showOCR ? (
          <ScreenshotUpload
            onAnalysisComplete={(result: OCRResult, suggestedTitle: string) => {
              setTitle(suggestedTitle);
              setDescription(result.extractedText.substring(0, 300));
              setOcrUsed(true);
              setShowOCR(false);
            }}
          />
        ) : null}

        {ocrUsed && !showOCR ? (
          <View style={styles.ocrBadge}>
            <MaterialIcons name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.ocrBadgeText}>{dt.ocrFilled}</Text>
          </View>
        ) : null}

        <Text style={styles.intro}>{dt.intro}</Text>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={14} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Input
          label={dt.title}
          value={title}
          onChangeText={setTitle}
          placeholder={dt.titlePlaceholder}
          maxLength={80}
        />

        {/* Topic suggestions */}
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsLabel}>{dt.quickTopics}</Text>
          <View style={styles.suggestions}>
            {dt.topicSuggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => setTitle(s)}
                style={({ pressed }) => [
                  styles.suggestionChip,
                  title === s && styles.suggestionChipActive,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.suggestionText, title === s && styles.suggestionTextActive]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Input
          label={dt.description}
          value={description}
          onChangeText={setDescription}
          placeholder={dt.descPlaceholder}
          multiline
          numberOfLines={4}
        />

        {/* Info */}
        <Card variant="bordered" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="info-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.infoText}>
              {dt.infoCreate}{' '}
              <Text style={styles.infoHighlight}>{dt.infoPhase1}</Text>.
            </Text>
          </View>
        </Card>

        <Button
          title={dt.startDispute}
          onPress={handleCreate}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  intro: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.base, color: Colors.textSecondary, lineHeight: 22 },
  ocrToggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border,
  },
  ocrToggleActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  ocrToggleText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.base, color: Colors.textSecondary, flex: 1 },
  ocrBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success + '15',
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  ocrBadgeText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.sm, color: Colors.success },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error + '15',
    borderRadius: Radius.md, padding: Spacing.md,
  },
  errorText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.error, flex: 1 },
  suggestionsSection: { gap: 8 },
  suggestionsLabel: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.sm, color: Colors.textSecondary },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.md,
    paddingVertical: 8, borderWidth: 1, borderColor: Colors.border,
  },
  suggestionChipActive: { backgroundColor: Colors.primary + '30', borderColor: Colors.primary },
  suggestionText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary },
  suggestionTextActive: { color: Colors.primaryLight, fontFamily: Typography.fontFamily.medium },
  infoCard: { padding: Spacing.md },
  infoRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  infoText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.sm, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  infoHighlight: { fontFamily: Typography.fontFamily.semiBold, color: Colors.primaryLight },
});
