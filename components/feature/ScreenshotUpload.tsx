// Most App — Screenshot Upload with OCR Analysis

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import {
  pickScreenshot,
  takeScreenshot,
  analyzeScreenshot,
  getSentimentLabel,
  getConflictLevelLabel,
  getConflictLevelColor,
  OCRResult,
} from '@/services/ocrService';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ScreenshotUploadProps {
  onAnalysisComplete?: (result: OCRResult, suggestedTitle: string) => void;
  compact?: boolean;
}

export function ScreenshotUpload({ onAnalysisComplete, compact = false }: ScreenshotUploadProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState('');

  async function handlePickImage() {
    setError('');
    const uri = await pickScreenshot();
    if (uri) {
      setImageUri(uri);
      setResult(null);
      await runAnalysis(uri);
    }
  }

  async function handleTakePhoto() {
    setError('');
    const uri = await takeScreenshot();
    if (uri) {
      setImageUri(uri);
      setResult(null);
      await runAnalysis(uri);
    }
  }

  async function runAnalysis(uri: string) {
    setIsAnalyzing(true);
    try {
      const ocrResult = await analyzeScreenshot(uri);
      setResult(ocrResult);
      onAnalysisComplete?.(ocrResult, ocrResult.analysis.suggestedTitle);
    } catch (e: any) {
      setError('Analiza nie powiodła się. Spróbuj ponownie.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleReset() {
    setImageUri(null);
    setResult(null);
    setError('');
  }

  if (compact && result) {
    return (
      <View style={styles.compactResult}>
        <View style={styles.compactHeader}>
          <MaterialIcons name="document-scanner" size={16} color={Colors.primaryLight} />
          <Text style={styles.compactTitle}>Wynik analizy zrzutu</Text>
          <Pressable onPress={handleReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.compactSuggested}>{result.analysis.suggestedTitle}</Text>
        <View style={styles.compactTags}>
          {result.analysis.keyTopics.slice(0, 2).map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Upload zone */}
      {!imageUri ? (
        <View style={styles.uploadZone}>
          <LinearGradient
            colors={[Colors.surfaceElevated, Colors.surface]}
            style={styles.uploadGradient}
          >
            <View style={styles.uploadIconBg}>
              <MaterialIcons name="document-scanner" size={32} color={Colors.primaryLight} />
            </View>
            <Text style={styles.uploadTitle}>Wgraj zrzut ekranu</Text>
            <Text style={styles.uploadSub}>
              AI przeanalizuje rozmowę i zaproponuje temat sporu
            </Text>
            <View style={styles.uploadBtns}>
              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [styles.uploadBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientMid]}
                  style={styles.uploadBtnGradient}
                >
                  <MaterialIcons name="photo-library" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>Galeria</Text>
                </LinearGradient>
              </Pressable>
              {Platform.OS !== 'web' ? (
                <Pressable
                  onPress={handleTakePhoto}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    styles.uploadBtnOutline,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <MaterialIcons name="camera-alt" size={18} color={Colors.primaryLight} />
                  <Text style={[styles.uploadBtnText, { color: Colors.primaryLight }]}>Aparat</Text>
                </Pressable>
              ) : null}
            </View>
          </LinearGradient>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          {/* Image preview */}
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              contentFit="cover"
              transition={200}
            />
            {isAnalyzing ? (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator color={Colors.primaryLight} size="large" />
                <Text style={styles.analyzingText}>Analizuję rozmowę...</Text>
              </View>
            ) : null}
          </View>

          {/* Analysis result */}
          {result && !isAnalyzing ? (
            <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
              {/* Sentiment header */}
              <LinearGradient
                colors={[Colors.primary + '25', Colors.gradientMid + '10']}
                style={styles.resultHeader}
              >
                <View style={styles.resultHeaderRow}>
                  <MaterialIcons name="smart-toy" size={18} color={Colors.primaryLight} />
                  <Text style={styles.resultHeaderTitle}>Analiza AI</Text>
                </View>

                {/* Suggested title */}
                <View style={styles.suggestedRow}>
                  <Text style={styles.suggestedLabel}>Sugerowany temat:</Text>
                  <Text style={styles.suggestedValue}>{result.analysis.suggestedTitle}</Text>
                </View>

                {/* Metrics row */}
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Nastrój</Text>
                    <Text style={styles.metricValue}>
                      {getSentimentLabel(result.analysis.sentiment)}
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Intensywność</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: getConflictLevelColor(result.analysis.conflictLevel) },
                      ]}
                    >
                      {getConflictLevelLabel(result.analysis.conflictLevel)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Extracted text */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Odczytany tekst:</Text>
                <Card variant="bordered" style={styles.textCard}>
                  <Text style={styles.extractedText}>{result.extractedText}</Text>
                </Card>
              </View>

              {/* Key topics */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Kluczowe tematy:</Text>
                <View style={styles.tags}>
                  {result.analysis.keyTopics.map((t) => (
                    <View key={t} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Emotions */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Wykryte emocje:</Text>
                <View style={styles.tags}>
                  {result.analysis.emotionIndicators.map((e) => (
                    <View key={e} style={[styles.tag, styles.tagEmotion]}>
                      <Text style={[styles.tagText, { color: Colors.accentLight }]}>{e}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {onAnalysisComplete ? (
                  <Button
                    title="Użyj jako temat sporu"
                    onPress={() =>
                      onAnalysisComplete(result, result.analysis.suggestedTitle)
                    }
                    fullWidth
                  />
                ) : null}
                <Button
                  title="Analizuj inny zrzut"
                  onPress={handleReset}
                  variant="outline"
                  fullWidth
                />
              </View>
            </ScrollView>
          ) : null}

          {/* Error state */}
          {error ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button title="Spróbuj ponownie" onPress={handleReset} variant="outline" />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  uploadZone: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  uploadIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  uploadSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  uploadBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  uploadBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  uploadBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  uploadBtnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: '#fff',
  },
  previewContainer: { gap: Spacing.md },
  imageWrapper: {
    height: 180,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  analyzingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  resultScroll: { maxHeight: 500 },
  resultHeader: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultHeaderTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  suggestedRow: { gap: 2 },
  suggestedLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestedValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  metricLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  metricValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  section: { gap: 6, marginBottom: Spacing.sm },
  sectionLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textCard: { padding: Spacing.sm },
  extractedText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.primary + '25',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.primaryLight,
  },
  tagEmotion: {
    backgroundColor: Colors.accent + '20',
  },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm, paddingBottom: Spacing.md },
  errorBox: {
    gap: Spacing.sm,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.error + '10',
    borderRadius: Radius.lg,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  // Compact mode
  compactResult: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    gap: 6,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    flex: 1,
  },
  compactSuggested: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  compactTags: { flexDirection: 'row', gap: 6 },
});
