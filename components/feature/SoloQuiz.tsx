import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { getSoloQuizBundle } from '@/constants/i18n/soloQuiz';
import { SoloQuizAnswers, type SoloQuizQuestion } from '@/constants/soloQuiz';
import { useLanguage } from '@/hooks/useLanguage';
import { fmt } from '@/utils/i18nFormat';

interface SoloQuizProps {
  onComplete: (answers: SoloQuizAnswers) => void;
  onSkip?: () => void;
}

export function SoloQuiz({ onComplete, onSkip }: SoloQuizProps) {
  const { language, t } = useLanguage();
  const bundle = useMemo(() => getSoloQuizBundle(language), [language]);
  const questions = bundle.questions;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<SoloQuizAnswers>({});

  const question: SoloQuizQuestion = questions[index];
  const progress = (index + 1) / questions.length;
  const selected = answers[question.id];

  const selectedSet = useMemo(() => {
    if (Array.isArray(selected)) return new Set(selected);
    return selected ? new Set([selected]) : new Set<string>();
  }, [selected]);

  function toggleOption(option: string) {
    if (question.multi) {
      const current = Array.isArray(selected) ? selected : selected ? [selected] : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      setAnswers((prev) => ({ ...prev, [question.id]: next }));
      return;
    }
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
  }

  function handleNext() {
    if (!selected || (Array.isArray(selected) && selected.length === 0)) return;
    if (index >= questions.length - 1) {
      onComplete(answers);
      return;
    }
    setIndex((i) => i + 1);
  }

  function handleBack() {
    if (index === 0) return;
    setIndex((i) => i - 1);
  }

  const canNext = !!selected && (!Array.isArray(selected) || selected.length > 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid]}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {fmt(bundle.progress, { current: index + 1, total: questions.length })}
      </Text>

      <Text style={styles.prompt}>{question.prompt}</Text>

      <View style={styles.options}>
        {question.options.map((option) => {
          const isSelected = selectedSet.has(option);
          return (
            <Pressable
              key={option}
              onPress={() => toggleOption(option)}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {isSelected ? (
                <LinearGradient
                  colors={[Colors.gradientStart + '50', Colors.gradientMid + '30']}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option}
              </Text>
              {isSelected ? (
                <MaterialIcons name="check-circle" size={20} color={Colors.primaryLight} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        {index > 0 ? (
          <Button title={t.common.back} onPress={handleBack} variant="outline" fullWidth />
        ) : onSkip ? (
          <Button title={bundle.skipQuiz} onPress={onSkip} variant="outline" fullWidth />
        ) : null}
        <Button
          title={index >= questions.length - 1 ? bundle.nextDescribe : t.common.next}
          onPress={handleNext}
          disabled={!canNext}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  prompt: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  options: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    gap: Spacing.sm,
  },
  optionSelected: { borderColor: Colors.primary },
  optionText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  optionTextSelected: {
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
  },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
