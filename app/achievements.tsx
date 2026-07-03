import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ACHIEVEMENTS, ACTIVE_ACHIEVEMENTS, isDisplayedAchievement } from '@/constants/achievements';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementBadge } from '@/components/feature/AchievementBadge';
import { StreakCounter } from '@/components/feature/StreakCounter';
import { ShareCard } from '@/components/feature/ShareCard';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { useStreak } from '@/hooks/useStreak';
import { useLanguage } from '@/hooks/useLanguage';
import { fmt } from '@/utils/i18nFormat';

type FilterTab = 'all' | 'unlocked' | 'locked';

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unlockedAchievements, totalPoints } = useAchievements();
  const { currentStreak } = useStreak();
  const { t } = useLanguage();
  const at = t.achievements;
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [shareVisible, setShareVisible] = useState(false);

  const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));
  const unlockedActiveCount = ACTIVE_ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).length;
  const totalCount = ACTIVE_ACHIEVEMENTS.length;
  const progress = totalCount > 0 ? unlockedActiveCount / totalCount : 0;

  const filteredAchievements = ACHIEVEMENTS.filter((a) => {
    if (!isDisplayedAchievement(a, unlockedIds)) return false;
    if (filterTab === 'unlocked') return unlockedIds.has(a.id);
    if (filterTab === 'locked') return !unlockedIds.has(a.id);
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: at.tabAll },
    { key: 'unlocked', label: `${at.tabUnlocked} (${unlockedActiveCount})` },
    { key: 'locked', label: at.tabLocked },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{at.title}</Text>
            <Text style={styles.subtitle}>{at.subtitle}</Text>
          </View>
          <Pressable
            onPress={() => setShareVisible(true)}
            style={styles.shareBtn}
          >
            <MaterialIcons name="share" size={22} color={Colors.primaryLight} />
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <LinearGradient
            colors={[Colors.gradientStart + '30', Colors.gradientMid + '15']}
            style={styles.statCard}
          >
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>{at.pointsLabel}</Text>
          </LinearGradient>
          <LinearGradient
            colors={[Colors.success + '30', Colors.success + '10']}
            style={styles.statCard}
          >
            <Text style={[styles.statValue, { color: Colors.success }]}>{unlockedActiveCount}/{totalCount}</Text>
            <Text style={styles.statLabel}>{at.unlocked}</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#F97316' + '30', '#F97316' + '10']}
            style={styles.statCard}
          >
            <Text style={[styles.statValue, { color: '#F97316' }]}>{currentStreak}</Text>
            <Text style={styles.statLabel}>{at.streak}</Text>
          </LinearGradient>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{at.overallProgress}</Text>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.max(2, progress * 100)}%` }]}
            />
          </View>
        </View>

        {/* Streak counter */}
        <StreakCounter />

        {/* Filter tabs */}
        <View style={styles.tabsRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setFilterTab(tab.key)}
              style={({ pressed }) => [
                styles.tab,
                filterTab === tab.key && styles.tabActive,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.tabText, filterTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Achievement grid */}
        <View style={styles.grid}>
          {filteredAchievements.map((achievement) => {
            const unlocked = unlockedAchievements.find((a) => a.id === achievement.id);
            return (
              <View key={achievement.id} style={styles.gridItem}>
                <AchievementBadge
                  achievement={achievement}
                  unlocked={!!unlocked}
                  unlockedAt={unlocked?.unlockedAt}
                  size="md"
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      <ShareCard
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        type="achievement"
        data={{
          title: fmt(at.shareTitle, { count: unlockedActiveCount, points: totalPoints }),
          subtitle: at.shareSubtitle,
          icon: '🏆',
          color: [Colors.gradientStart, Colors.gradientEnd],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  shareBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '20',
    borderRadius: Radius.full,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    gap: 2,
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.primaryLight,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  progressPct: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary + '40',
  },
  tabText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.semiBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '31%',
    marginBottom: Spacing.sm,
  },
});
