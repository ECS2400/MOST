import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import type { Language } from '@/constants/i18n';
import type { LiveMediationBundle } from '@/constants/i18n/liveMediation/types';
import { MAX_SCREENSHOTS } from '@/constants/screenshots';
import { fmt } from '@/utils/i18nFormat';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  buildTranscriptFromClusterChoice,
  clusterIdsNeedingChoice,
  extractMediationChatFromScreenshotUris,
  hasLowClusterConfidence,
  hasSingleHumanCluster,
  isOcrAnalyzeAvailable,
  sampleTextsForCluster,
  type OcrExtractionResult,
  type SpeakerClusterId,
} from '@/services/mediationOcr';
import { FeatureLimitBlockedError } from '@/utils/paywallReason';
import {
  structureChatToForm,
  type StructuredFormResult,
} from '@/services/screenshotInterpret';

export type ChatScreenshotStep = 'idle' | 'extracted' | 'structured';

interface ScreenshotItem {
  id: string;
  uri: string;
}

export interface ChatScreenshotFlowProps {
  language: Language;
  labels: LiveMediationBundle['new'];
  userId?: string;
  disabled?: boolean;
  maxScreenshots?: number;
  onScreenshotsChange?: (uris: string[]) => void;
  onStepChange?: (step: ChatScreenshotStep) => void;
  onStructured?: (form: StructuredFormResult) => void;
  onError?: (message: string) => void;
  onLimitReached?: () => void;
}

export function ChatScreenshotFlow({
  language,
  labels,
  userId,
  disabled = false,
  maxScreenshots = MAX_SCREENSHOTS,
  onScreenshotsChange,
  onStepChange,
  onStructured,
  onError,
  onLimitReached,
}: ChatScreenshotFlowProps) {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);

  const [step, setStep] = useState<ChatScreenshotStep>('idle');
  const [readLoading, setReadLoading] = useState(false);
  const [fillLoading, setFillLoading] = useState(false);
  const [fillSuccess, setFillSuccess] = useState(false);
  const [chatTranscript, setChatTranscript] = useState('');
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
  const [myClusterId, setMyClusterId] = useState<SpeakerClusterId | null>(null);
  const [userDisplayName, setUserDisplayName] = useState('');

  useEffect(() => {
    let mounted = true;
    isOcrAnalyzeAvailable().then((available) => {
      if (mounted) setOcrAvailable(available);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    onScreenshotsChange?.(screenshots.map((s) => s.uri));
  }, [screenshots, onScreenshotsChange]);

  function updateStep(next: ChatScreenshotStep) {
    setStep(next);
    onStepChange?.(next);
  }

  function resetInterpretState() {
    updateStep('idle');
    setChatTranscript('');
    setOcrResult(null);
    setMyClusterId(null);
    setUserDisplayName('');
    setFillSuccess(false);
  }

  async function handlePickScreenshot() {
    if (disabled || screenshots.length >= maxScreenshots) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      onError?.(labels.galleryError);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxScreenshots - screenshots.length,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    resetInterpretState();
    const newItems = result.assets
      .filter((a) => a.uri)
      .map((asset, idx) => ({
        id: `${Date.now()}-${screenshots.length + idx}`,
        uri: asset.uri,
      }));

    setScreenshots((prev) => [...prev, ...newItems].slice(0, maxScreenshots));
  }

  function handleRemoveScreenshot(id: string) {
    resetInterpretState();
    setScreenshots((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleReadChat() {
    if (screenshots.length === 0 || readLoading || disabled) return;

    setFillSuccess(false);
    setReadLoading(true);

    try {
      const uris = screenshots.map((s) => s.uri);
      const extracted = await extractMediationChatFromScreenshotUris(
        uris,
        language,
        userId ? { userId } : undefined
      );
      if (!extracted) {
        throw new Error(labels.readChatError);
      }

      if (!extracted.combinedText.trim() && extracted.messages.length === 0) {
        throw new Error(labels.readChatError);
      }

      setOcrResult(extracted);
      setChatTranscript(extracted.combinedText);
      setMyClusterId(null);
      updateStep('extracted');
    } catch (e: unknown) {
      if (e instanceof FeatureLimitBlockedError) {
        onLimitReached?.();
        return;
      }
      const message = e instanceof Error ? e.message : labels.readChatError;
      onError?.(message);
      resetInterpretState();
    } finally {
      setReadLoading(false);
    }
  }

  async function handleFillForm() {
    if (fillLoading || disabled) return;

    const clusters = ocrResult ? clusterIdsNeedingChoice(ocrResult) : [];
    const resolvedMyClusterId =
      myClusterId ?? (clusters.length === 1 ? clusters[0] : null);

    if (clusters.length > 1 && !resolvedMyClusterId) {
      onError?.(labels.selectSpeakerError);
      return;
    }

    const transcriptForAnalysis =
      ocrResult && resolvedMyClusterId && ocrResult.messages.length > 0
        ? buildTranscriptFromClusterChoice(ocrResult, resolvedMyClusterId)
        : chatTranscript.trim();

    if (!transcriptForAnalysis) return;

    setFillLoading(true);
    setFillSuccess(false);

    try {
      const structured = await structureChatToForm(
        transcriptForAnalysis,
        language,
        'speaker_me',
        userDisplayName || undefined
      );

      updateStep('structured');
      setFillSuccess(true);
      onStructured?.(structured);
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : labels.readChatError);
    } finally {
      setFillLoading(false);
    }
  }

  const showSpeakerPanel = step === 'extracted' || step === 'structured';
  const clusterCards = (
    [
      {
        clusterId: 'clusterA' as const,
        label: labels.speakerClusterA,
        samples: ocrResult ? sampleTextsForCluster(ocrResult, 'clusterA') : [],
      },
      {
        clusterId: 'clusterB' as const,
        label: labels.speakerClusterB,
        samples: ocrResult ? sampleTextsForCluster(ocrResult, 'clusterB') : [],
      },
    ] satisfies Array<{ clusterId: SpeakerClusterId; label: string; samples: string[] }>
  ).filter((card) => card.samples.length > 0);

  const showSingleClusterWarning = ocrResult ? hasSingleHumanCluster(ocrResult) : false;
  const showLowConfidenceWarning = ocrResult ? hasLowClusterConfidence(ocrResult) : false;

  if (disabled) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{labels.screenshotsTitle}</Text>
      <Text style={styles.sectionSub}>
        {fmt(labels.screenshotsSub, { max: maxScreenshots })}
      </Text>

      {screenshots.length > 0 && ocrAvailable !== false ? (
        <Text style={styles.flowHint}>{labels.screenshotFlowHint}</Text>
      ) : null}

      {screenshots.length > 0 ? (
        <View style={styles.screenshotGrid}>
          {screenshots.map((item) => (
            <View key={item.id} style={styles.thumbnailWrap}>
              <Image
                source={{ uri: item.uri }}
                style={styles.thumbnail}
                contentFit="cover"
                transition={200}
              />
              <Pressable
                onPress={() => handleRemoveScreenshot(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {screenshots.length < maxScreenshots ? (
        <Pressable
          onPress={handlePickScreenshot}
          style={({ pressed }) => [
            styles.addScreenshotBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons name="add-photo-alternate" size={20} color={Colors.primaryLight} />
          <Text style={styles.addScreenshotText}>{labels.addScreenshot}</Text>
        </Pressable>
      ) : null}

      {screenshots.length > 0 && ocrAvailable !== false ? (
        <Button
          title={readLoading ? labels.readChatLoading : labels.readChatBtn}
          onPress={handleReadChat}
          loading={readLoading}
          disabled={readLoading || fillLoading}
          variant="secondary"
          fullWidth
        />
      ) : null}

      {screenshots.length > 0 && ocrAvailable === false ? (
        <View style={styles.ocrNote}>
          <MaterialIcons name="info-outline" size={18} color={Colors.warning} />
          <View style={styles.ocrNoteContent}>
            <Text style={styles.ocrNoteTitle}>{labels.ocrUnavailableTitle}</Text>
            <Text style={styles.ocrNoteText}>{labels.ocrUnavailableNote}</Text>
          </View>
        </View>
      ) : null}

      {showSpeakerPanel ? (
        <View style={styles.speakerSection}>
          <Text style={styles.sectionTitle}>{labels.speakerTitle}</Text>
          <Text style={styles.sectionSub}>{labels.speakerSub}</Text>

          {showSingleClusterWarning ? (
            <View style={styles.warningBox}>
              <MaterialIcons name="info-outline" size={18} color={Colors.warning} />
              <Text style={styles.warningText}>{labels.speakerSingleClusterWarning}</Text>
            </View>
          ) : null}

          {showLowConfidenceWarning ? (
            <View style={styles.warningBox}>
              <MaterialIcons name="warning-amber" size={18} color={Colors.warning} />
              <Text style={styles.warningText}>{labels.speakerLowConfidenceWarning}</Text>
            </View>
          ) : null}

          {clusterCards.length > 0 ? (
            <View style={styles.speakerList}>
              {clusterCards.map((card) => {
                const selected = myClusterId === card.clusterId;

                return (
                  <View
                    key={card.clusterId}
                    style={[
                      styles.speakerCard,
                      selected && styles.speakerCardSelected,
                    ]}
                  >
                    <Text style={styles.speakerLabel}>{card.label}</Text>

                    <Text style={styles.speakerSamplePrefix}>
                      {labels.speakerSamplePrefix}
                    </Text>
                    {card.samples.map((msg, idx) => (
                      <Text key={idx} style={styles.speakerSample} numberOfLines={2}>
                        «{msg}»
                      </Text>
                    ))}

                    <Pressable
                      onPress={() => setMyClusterId(card.clusterId)}
                      style={({ pressed }) => [
                        styles.pickSideBtn,
                        selected && styles.pickSideBtnSelected,
                        { opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickSideBtnText,
                          selected && styles.pickSideBtnTextSelected,
                        ]}
                      >
                        {labels.speakerWhichIsYou}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.transcriptPreview}>
              <Text style={styles.transcriptText} numberOfLines={8}>
                {chatTranscript}
              </Text>
            </View>
          )}

          <Input
            label={labels.userNameLabel}
            value={userDisplayName}
            onChangeText={setUserDisplayName}
            placeholder={labels.userNamePlaceholder}
          />

          <Button
            title={fillLoading ? labels.fillFormLoading : labels.fillFormBtn}
            onPress={handleFillForm}
            loading={fillLoading}
            disabled={fillLoading || readLoading}
            fullWidth
          />

          {fillSuccess ? (
            <View style={styles.successBox}>
              <MaterialIcons name="check-circle" size={18} color={Colors.success} />
              <Text style={styles.successText}>{labels.fillFormSuccess}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const THUMB_SIZE = 88;

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
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
  flowHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    lineHeight: 20,
  },
  screenshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  thumbnailWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  thumbnail: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addScreenshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.surface,
  },
  addScreenshotText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.primaryLight,
  },
  ocrNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight + '55',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  ocrNoteContent: { flex: 1, gap: 4 },
  ocrNoteTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  ocrNoteText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  speakerSection: { gap: Spacing.sm, paddingTop: Spacing.xs },
  speakerList: { gap: Spacing.sm },
  speakerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  speakerCardSelected: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primary + '12',
  },
  speakerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  speakerLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  speakerBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  speakerBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.xs,
    color: '#fff',
  },
  speakerPosition: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  speakerSamplePrefix: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  speakerSample: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  pickSideBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  pickSideBtnSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  pickSideBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  pickSideBtnTextSelected: {
    color: '#fff',
  },
  transcriptPreview: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transcriptText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success + '15',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  successText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.success,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight + '55',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  warningText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
