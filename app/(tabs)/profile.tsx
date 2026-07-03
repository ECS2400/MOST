import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAchievements } from '@/hooks/useAchievements';
import { useStreak } from '@/hooks/useStreak';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StreakCounter } from '@/components/feature/StreakCounter';
import { AchievementBadge } from '@/components/feature/AchievementBadge';
import { ShareCard } from '@/components/feature/ShareCard';
import { ACHIEVEMENT_MAP } from '@/constants/achievements';
import { supabase } from '@/services/supabase';
import { fetchMediationStats } from '@/services/mediationStats';

interface ProfileStats {
  totalDisputes: number;
  resolvedCount: number;
  activeCount: number;
  streakDays: number;
}

const STATS_TIMEOUT_MS = 5000;

function withStatsTimeout<T>(promise: PromiseLike<T>, timeoutMessage: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), STATS_TIMEOUT_MS)
    ),
  ]);
}

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, loading, isLoading, updateProfileName } = useAuth();
  const { isPremium, loading: premiumLoading, source } = usePremiumStatus();
  const { unlockedAchievements, totalPoints } = useAchievements();
  const { currentStreak } = useStreak();
  const { t } = useLanguage();

  const [logoutModal, setLogoutModal] = useState(false);
  const [shareStreakVisible, setShareStreakVisible] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    totalDisputes: 0,
    resolvedCount: 0,
    activeCount: 0,
    streakDays: 0,
  });
  const [statsError, setStatsError] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const pt = t.profile;

  function openEditName() {
    setEditNameValue(user?.name || '');
    setNameError('');
    setEditNameVisible(true);
  }

  async function handleSaveName() {
    if (savingName) return;
    setSavingName(true);
    setNameError('');
    try {
      await updateProfileName(editNameValue);
      setEditNameVisible(false);
    } catch (e: any) {
      const message = e?.message || pt.saveNameFailed;
      setNameError(message);
      Alert.alert(pt.saveFailed, message);
    } finally {
      setSavingName(false);
    }
  }

  const authLoading = loading || isLoading;

  // ── Fetch stats directly from Supabase (background, does not block profile UI) ──
  const loadStats = useCallback(async () => {
    if (!user) {
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    setStatsError(false);

    try {
      const [{ data: coupleRow, error: coupleErr }, mediationStats] = await withStatsTimeout(
        Promise.all([
          supabase
            .from('couples')
            .select('id, streak_days')
            .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
            .not('partner_2_id', 'is', null)
            .maybeSingle(),
          fetchMediationStats(user.id),
        ]),
        pt.statsTimeoutError,
      );

      if (coupleErr) throw coupleErr;

      const total = mediationStats.total;
      const resolved = mediationStats.resolved;
      const active = mediationStats.active;
      const streakDays = Math.max(coupleRow?.streak_days || 0, currentStreak || 0);

      setStats({
        totalDisputes: total,
        resolvedCount: resolved,
        activeCount: active,
        streakDays,
      });
    } catch {
      setStatsError(true);
      setStats({
        totalDisputes: 0,
        resolvedCount: 0,
        activeCount: 0,
        streakDays: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }, [user?.id, currentStreak]);

  useEffect(() => {
    if (!user || authLoading) return;
    loadStats();
  }, [user?.id, authLoading, loadStats]);

  async function handleLogout() {
    await logout();
    router.replace('/auth/login');
  }

  function confirmLogout() {
    if (Platform.OS === 'web') {
      setLogoutModal(true);
    } else {
      Alert.alert(pt.logoutConfirm, '', [
        { text: t.common.cancel, style: 'cancel' },
        { text: pt.confirm, style: 'destructive', onPress: handleLogout },
      ]);
    }
  }

  // ── Auth loading only — stats load in background ───────────────────────────
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>{pt.loadingProfile}</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="lock-outline" size={40} color={Colors.textMuted} />
        <Text style={styles.loadingText}>{pt.notLoggedIn}</Text>
        <Button
          title={pt.loginBtn}
          onPress={() => router.replace('/auth/login')}
          style={{ marginTop: Spacing.md }}
        />
      </View>
    );
  }

  function nameLooksLikeEmail(name: string): boolean {
    return name.includes('@') || name.includes('.');
  }

  const profileName = user.name?.trim() || '';
  const needsProfileSetup =
    !profileName ||
    profileName === pt.defaultUser ||
    nameLooksLikeEmail(profileName);
  const displayName = needsProfileSetup ? pt.completeProfileLabel : profileName;
  const avatarName = needsProfileSetup ? '?' : profileName;

  const menuItems = [
    {
      icon: 'star' as const,
      label: pt.manageSubscription,
      action: () => router.push('/premium'),
    },
    {
      icon: 'history' as const,
      label: pt.mediationHistory,
      action: () => router.push('/dispute/history'),
    },
    {
      icon: 'assignment' as const,
      label: pt.ourAgreements,
      action: () => router.push('/agreements'),
    },
    {
      icon: 'psychology' as const,
      label: t.solo.title,
      action: () => router.push('/solo-analysis'),
    },
    {
      icon: 'emoji-events' as const,
      label: t.achievements.title,
      action: () => router.push('/achievements'),
    },
    {
      icon: 'favorite' as const,
      label: pt.relationshipDays,
      action: () => router.push('/settings/relationship'),
    },
    {
      icon: 'language' as const,
      label: pt.language,
      action: () => router.push('/settings/language'),
    },
    {
      icon: 'notifications' as const,
      label: pt.notifications,
      action: () => router.push('/settings/notifications'),
    },
    {
      icon: 'privacy-tip' as const,
      label: pt.privacy,
      action: () => router.push('/settings/privacy'),
    },
    {
      icon: 'help-outline' as const,
      label: pt.help,
      action: () => router.push('/settings/help'),
    },
  ];

  const statItems = [
    {
      label: pt.streakDaysStat,
      value: statsLoading ? '—' : `${stats.streakDays} ${pt.daysUnit}`,
    },
    { label: pt.mediationsStat, value: statsLoading ? '—' : String(stats.totalDisputes) },
    { label: pt.resolvedStat, value: statsLoading ? '—' : String(stats.resolvedCount) },
  ];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <Card variant="elevated" style={styles.profileCard}>
        <LinearGradient
          colors={[Colors.gradientStart + '30', Colors.gradientMid + '10']}
          style={styles.profileGradient}
        >
          <Avatar
            name={avatarName}
            color={user.avatarColor}
            imageUrl={user.avatarUrl}
            size={72}
          />
          <View style={styles.nameRow}>
            <Text style={[styles.name, needsProfileSetup && styles.namePrompt]}>{displayName}</Text>
            <Pressable onPress={openEditName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="edit" size={18} color={Colors.primaryLight} />
            </Pressable>
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badgesRow}>
            {premiumLoading ? (
              <View style={styles.planBadge}>
                <ActivityIndicator size="small" color={Colors.textMuted} />
              </View>
            ) : (
              <View
                style={[
                  styles.planBadge,
                  isPremium ? styles.planBadgePremium : styles.planBadgeFree,
                ]}
              >
                {isPremium ? (
                  <MaterialIcons name="star" size={12} color={Colors.gold} />
                ) : null}
                <Text
                  style={[
                    styles.planText,
                    isPremium ? { color: Colors.gold } : { color: Colors.textSecondary },
                  ]}
                >
                  {isPremium ? t.common.premium : t.common.free}
                </Text>
              </View>
            )}
            {__DEV__ && !premiumLoading && source !== 'none' ? (
              <Text style={styles.devSource}>{source}</Text>
            ) : null}
            {totalPoints > 0 ? (
              <View style={styles.pointsBadge}>
                <MaterialIcons name="emoji-events" size={12} color={Colors.primaryLight} />
                <Text style={styles.pointsBadgeText}>
                  {totalPoints} {t.achievements.pointsUnit}
                </Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </Card>

      {/* Streak */}
      <Pressable onPress={() => setShareStreakVisible(true)}>
        <StreakCounter />
      </Pressable>

      {/* Stats */}
      {statsError ? (
        <View style={styles.statsErrorWrap}>
          <Pressable
            onPress={loadStats}
            style={({ pressed }) => [styles.retryBox, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialIcons name="refresh" size={18} color={Colors.primaryLight} />
            <Text style={styles.retryText}>{pt.statsLoadError}</Text>
          </Pressable>
          <Button
            title={pt.retry}
            onPress={loadStats}
            variant="outline"
            loading={statsLoading}
            fullWidth
          />
        </View>
      ) : (
        <View style={styles.statsRow}>
          {statItems.map((stat) => (
            <Card key={stat.label} style={styles.statCard}>
              {statsLoading ? (
                <ActivityIndicator color={Colors.primaryLight} size="small" style={{ marginVertical: 4 }} />
              ) : (
                <Text style={styles.statValue}>{stat.value}</Text>
              )}
              <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
            </Card>
          ))}
        </View>
      )}

      {/* Recent achievements */}
      {unlockedAchievements.length > 0 ? (
        <View style={styles.achievementsSection}>
          <View style={styles.achievementsHeader}>
            <Text style={styles.achievementsSectionTitle}>
              {t.achievements.title}
            </Text>
            <Pressable
              onPress={() => router.push('/achievements')}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.achievementsSeeAll}>
                {t.achievements.unlocked} →
              </Text>
            </Pressable>
          </View>
          <View style={styles.achievementsBadges}>
            {unlockedAchievements.slice(-5).reverse().map((ua) => {
              const ach = ACHIEVEMENT_MAP[ua.id];
              if (!ach) return null;
              return (
                <AchievementBadge
                  key={ua.id}
                  achievement={ach}
                  unlocked
                  unlockedAt={ua.unlockedAt}
                  size="sm"
                  onPress={() => router.push('/achievements')}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Premium upsell */}
      {!premiumLoading && !isPremium ? (
        <Pressable
          onPress={() => router.push('/premium')}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumBanner}
          >
            <View style={styles.premiumBannerContent}>
              <Text style={styles.premiumBannerTitle}>
                {pt.premiumBannerTitle}
              </Text>
              <Text style={styles.premiumBannerSub}>
                {pt.premiumBannerSub}
              </Text>
              <Text style={styles.premiumBannerCouple}>{t.premium.coupleCoversBoth}</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          </LinearGradient>
        </Pressable>
      ) : null}

      {/* Menu */}
      <Card style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <Pressable
            key={item.label}
            onPress={item.action}
            style={({ pressed }) => [
              styles.menuItem,
              i < menuItems.length - 1 && styles.menuItemBorder,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.menuIconWrap}>
              <MaterialIcons name={item.icon} size={20} color={Colors.primaryLight} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </Pressable>
        ))}
      </Card>

      <Button
        title={pt.logout}
        onPress={confirmLogout}
        variant="outline"
        fullWidth
        style={{ borderColor: Colors.error + '60', marginTop: Spacing.sm }}
        textStyle={{ color: Colors.error }}
      />

      {/* Share streak card */}
      <ShareCard
        visible={shareStreakVisible}
        onClose={() => setShareStreakVisible(false)}
        type="streak"
        data={{
          title: `${currentStreak}-dniowa seria!`,
          subtitle: pt.shareStreakSubtitle,
          value: currentStreak,
          color: ['#F97316', '#EA580C'],
        }}
      />

      {/* Logout modal for web */}
      <Modal visible={editNameVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edytuj imię</Text>
            <Input
              label={pt.nameLabel}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder={pt.namePlaceholder}
              autoCapitalize="words"
              maxLength={60}
              error={nameError}
            />
            <View style={styles.modalActions}>
              <Button
                title={t.common.cancel}
                onPress={() => setEditNameVisible(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title={pt.saveName}
                onPress={handleSaveName}
                loading={savingName}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{pt.logoutConfirm}</Text>
            <View style={styles.modalActions}>
              <Button
                title={t.common.cancel}
                onPress={() => setLogoutModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title={pt.confirm}
                onPress={() => { setLogoutModal(false); handleLogout(); }}
                variant="danger"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statsErrorWrap: {
    gap: Spacing.sm,
  },
  container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  profileCard: { padding: 0, overflow: 'hidden' },
  profileGradient: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
    borderRadius: Radius.xl,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  namePrompt: {
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.semiBold,
  },
  email: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  planBadgeFree: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  planBadgePremium: {
    backgroundColor: Colors.gold + '20',
    borderColor: Colors.gold + '50',
  },
  planText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
  },
  devSource: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    alignSelf: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary + '40',
  },
  pointsBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  retryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.error + '10',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error + '25',
  },
  retryText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    gap: 2,
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  achievementsSection: {
    gap: Spacing.sm,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementsSectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  achievementsSeeAll: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  achievementsBadges: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  premiumBannerContent: { flex: 1, gap: 2 },
  premiumBannerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: '#fff',
    flexShrink: 1,
  },
  premiumBannerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    flexShrink: 1,
  },
  premiumBannerCouple: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.xs,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
    flexShrink: 1,
  },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: 300,
    gap: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
