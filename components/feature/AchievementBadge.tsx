import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Achievement } from '@/constants/achievements';
import { useAchievementText } from '@/hooks/useAchievementText';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked?: boolean;
  unlockedAt?: string;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const LOCALE_MAP: Record<string, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

export function AchievementBadge({
  achievement,
  unlocked = false,
  unlockedAt,
  onPress,
  size = 'md',
}: AchievementBadgeProps) {
  const { language, t } = useLanguage();
  const text = useAchievementText(achievement.id);
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  const fontSize = isLg ? 28 : isSm ? 16 : 22;
  const containerSize = isLg ? 72 : isSm ? 44 : 56;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrapper,
        { opacity: pressed ? 0.85 : 1 },
        isSm && styles.wrapperSm,
      ]}
    >
      <View
        style={[
          styles.badgeContainer,
          { width: containerSize, height: containerSize, borderRadius: containerSize / 2 },
          !unlocked && styles.lockedContainer,
          unlocked && Shadow.md,
        ]}
      >
        {unlocked ? (
          <LinearGradient
            colors={achievement.gradient}
            style={[
              styles.badgeGradient,
              { width: containerSize, height: containerSize, borderRadius: containerSize / 2 },
            ]}
          >
            <Text style={{ fontSize }}>{achievement.icon}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.lockedInner}>
            <Text style={[styles.lockedIcon, { fontSize }]}>🔒</Text>
          </View>
        )}
      </View>

      {size !== 'sm' ? (
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, !unlocked && styles.titleLocked]}
            numberOfLines={2}
          >
            {!unlocked && achievement.secret ? '???' : text.title}
          </Text>
          {size === 'lg' && (unlocked || !achievement.secret) ? (
            <Text style={styles.description} numberOfLines={2}>
              {text.description}
            </Text>
          ) : null}
          {unlocked && unlockedAt ? (
            <Text style={styles.date}>
              {new Date(unlockedAt).toLocaleDateString(LOCALE_MAP[language] ?? 'en-US', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          ) : null}
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>+{achievement.points} {t.achievements.pointsUnit}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  wrapperSm: {
    width: 52,
    gap: 4,
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lockedContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  badgeGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedIcon: {
    opacity: 0.4,
  },
  textContainer: {
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  titleLocked: {
    color: Colors.textMuted,
  },
  description: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },
  date: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  pointsBadge: {
    backgroundColor: Colors.primary + '25',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pointsText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 9,
    color: Colors.primaryLight,
  },
});
