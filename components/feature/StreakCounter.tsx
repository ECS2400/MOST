import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useStreak } from '@/hooks/useStreak';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';

interface StreakCounterProps {
  compact?: boolean;
}

export function StreakCounter({ compact = false }: StreakCounterProps) {
  const { currentStreak, longestStreak, isStreakActive } = useStreak();
  const { t } = useLanguage();
  const pt = t.profile;

  if (compact) {
    return (
      <View style={styles.compact}>
        <LinearGradient
          colors={
            currentStreak > 0
              ? ['#F97316', '#EA580C']
              : [Colors.surface, Colors.surfaceElevated]
          }
          style={styles.compactGradient}
        >
          <Text style={styles.compactIcon}>{currentStreak > 0 ? '🔥' : '💤'}</Text>
          <Text style={styles.compactCount}>{currentStreak}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={
        currentStreak > 0
          ? ['#F97316' + '30', '#EA580C' + '15']
          : [Colors.surface, Colors.surface]
      }
      style={styles.container}
    >
      <View style={styles.mainRow}>
        <View style={styles.iconWrapper}>
          <Text style={styles.fireEmoji}>{currentStreak > 0 ? '🔥' : '💤'}</Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.countLabel}>{pt.activeStreakLabel}</Text>
          <View style={styles.countRow}>
            <Text
              style={[
                styles.count,
                currentStreak > 0 ? { color: '#F97316' } : { color: Colors.textMuted },
              ]}
            >
              {currentStreak}
            </Text>
            <Text style={styles.unit}>{pt.daysUnit}</Text>
          </View>
        </View>
        <View style={styles.separator} />
        <View style={styles.textBlock}>
          <Text style={styles.countLabel}>{pt.recordLabel}</Text>
          <View style={styles.countRow}>
            <Text style={[styles.count, { color: Colors.primaryLight }]}>{longestStreak}</Text>
            <Text style={styles.unit}>{pt.daysUnit}</Text>
          </View>
        </View>
      </View>

      {!isStreakActive && currentStreak > 0 ? (
        <View style={styles.warningRow}>
          <MaterialIcons name="warning-amber" size={12} color={Colors.warning} />
          <Text style={styles.warningText}>{pt.streakWarningTomorrow}</Text>
        </View>
      ) : currentStreak > 0 ? (
        <View style={styles.successRow}>
          <MaterialIcons name="check-circle" size={12} color={Colors.success} />
          <Text style={styles.successText}>{pt.streakActiveToday}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F97316' + '30',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316' + '20',
    borderRadius: 22,
  },
  fireEmoji: {
    fontSize: 24,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  countLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  count: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
  },
  unit: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  separator: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  warningText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.warning,
    flexShrink: 1,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  successText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.success,
    flexShrink: 1,
  },
  compact: {},
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compactIcon: {
    fontSize: 14,
  },
  compactCount: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.sm,
    color: '#fff',
  },
});
