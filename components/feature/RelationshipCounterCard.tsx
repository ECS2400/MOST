import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { fmt } from '@/utils/i18nFormat';

type RelationshipCounterCardProps = {
  days: number | null;
  nextMilestone: { label: string; daysUntil: number } | null;
  onPress: () => void;
  labels: {
    together: string;
    daysUnit: string;
    milestoneToday: string;
    milestoneIn: string;
    setStartDate: string;
  };
};

export function RelationshipCounterCard({
  days,
  nextMilestone,
  onPress,
  labels,
}: RelationshipCounterCardProps) {
  const hasDate = days !== null && days > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={[Colors.accent + '22', Colors.gradientEnd + '10']}
        style={styles.card}
      >
        <View style={styles.left}>
          <Text style={styles.emoji}>💕</Text>
          <View style={styles.texts}>
            <Text style={styles.label}>{labels.together}</Text>
            {hasDate ? (
              <>
                <View style={styles.valueRow}>
                  <Text style={styles.value}>{days}</Text>
                  <Text style={styles.unit}> {labels.daysUnit}</Text>
                </View>
                {nextMilestone ? (
                  <Text style={styles.next} numberOfLines={1}>
                    {nextMilestone.daysUntil === 0
                      ? fmt(labels.milestoneToday, { label: nextMilestone.label })
                      : fmt(labels.milestoneIn, {
                          days: String(nextMilestone.daysUntil),
                          label: nextMilestone.label,
                        })}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.placeholder}>{labels.setStartDate}</Text>
            )}
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '35',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  emoji: {
    fontSize: 28,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 24,
    color: Colors.accent,
  },
  unit: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  next: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  placeholder: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
