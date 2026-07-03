import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useRelationshipReminder } from '@/hooks/useRelationshipReminder';
import { MAX_REMINDERS_PER_DAY } from '@/services/relationshipReminder';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { fmt } from '@/utils/i18nFormat';

export function RelationshipReminderBanner() {
  const { t } = useLanguage();
  const r = t.dashboard;
  const { tip, loading, fetchCount, remaining, limitReached, refresh } = useRelationshipReminder();

  if (!tip && !loading) return null;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[Colors.accent + '28', Colors.primary + '18', Colors.surfaceCard]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>💝</Text>
            <View style={styles.titleTexts}>
              <Text style={styles.title}>{r.reminderTitle}</Text>
              <Text style={styles.subtitle}>{r.reminderSubtitle}</Text>
            </View>
          </View>
          {!limitReached && remaining > 0 ? (
            <Pressable
              onPress={refresh}
              disabled={loading}
              style={({ pressed }) => [styles.refreshBtn, { opacity: pressed || loading ? 0.7 : 1 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.primaryLight} />
              ) : (
                <MaterialIcons name="refresh" size={22} color={Colors.primaryLight} />
              )}
            </Pressable>
          ) : null}
        </View>

        {loading && !tip ? (
          <Text style={styles.loadingText}>{r.reminderLoading}</Text>
        ) : (
          <Text style={styles.tip}>{tip}</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.progress}>
            {limitReached
              ? r.reminderLimit
              : fmt(r.reminderProgress, {
                  current: String(fetchCount || (tip ? 1 : 0)),
                  max: String(MAX_REMINDERS_PER_DAY),
                })}
          </Text>
          {!limitReached && remaining > 0 ? (
            <Pressable onPress={refresh} disabled={loading}>
              <Text style={styles.nextLink}>{r.reminderNext}</Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '35',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    minWidth: 0,
  },
  emoji: {
    fontSize: 22,
    marginTop: 2,
  },
  titleTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.primary + '22',
  },
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  tip: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  progress: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  nextLink: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.primaryLight,
  },
});
