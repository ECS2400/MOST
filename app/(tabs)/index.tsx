import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useDisputes } from '@/hooks/useDisputes';
import { useStreak } from '@/hooks/useStreak';
import { useLanguage } from '@/hooks/useLanguage';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAchievements } from '@/hooks/useAchievements';
import { useRelationship } from '@/hooks/useRelationship';
import { gatherAchievementStats } from '@/services/achievementService';
import { RelationshipCounterCard } from '@/components/feature/RelationshipCounterCard';
import { RelationshipReminderBanner } from '@/components/feature/RelationshipReminderBanner';
import { PartnerMediationBanner } from '@/components/feature/PartnerMediationBanner';
import { RelationshipSettingsModal } from '@/components/feature/RelationshipSettingsModal';
import { PartnerNeedCard } from '@/components/feature/PartnerNeedCard';
import { supabase } from '@/services/supabase';
import { fetchMediationStats } from '@/services/mediationStats';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { DisputeCard } from '@/components/feature/DisputeCard';
import { BlurOverlay } from '@/components/ui/BlurOverlay';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { fmt } from '@/utils/i18nFormat';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function DisputesTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authBootstrapLoading, isLoading: authProfileLoading } = useAuth();
  const authLoading = authBootstrapLoading || authProfileLoading;
  const { isPremium: isPremiumUser, loading: premiumLoading } = usePremiumStatus();
  const { couple, isConnected, refreshCouple } = useCouple();
  const { activeDisputes, resolvedDisputes, disputes, isLoading: disputesLoading, loadDisputes, getMonthlyCount } = useDisputes();
  const [supabaseStats, setSupabaseStats] = useState({ total: 0, resolved: 0, active: 0, streak: 0 });
  const { currentStreak, longestStreak } = useStreak();
  const { t, language } = useLanguage();
  const d = t.dashboard;
  const { checkAchievements } = useAchievements();
  const { data: relationshipData, days: relationshipDays, nextMilestone, save: saveRelationship, refresh: refreshRelationship } = useRelationship();
  const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);

  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (couple) {
      loadDisputes(couple.id);
    }
  }, [couple?.id]);

  useEffect(() => {
    if (user?.id && !authLoading) {
      refreshCouple(user.id);
    }
  }, [user?.id, authLoading]);

  const fetchStats = useCallback(async () => {
    if (!user || authLoading || premiumLoading) return;
    try {
      const [{ data: coupleRow }, mediationStats] = await Promise.all([
        supabase
          .from('couples')
          .select('id, streak_days')
          .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
          .not('partner_2_id', 'is', null)
          .maybeSingle(),
        fetchMediationStats(user.id),
      ]);

      const streak = Math.max(coupleRow?.streak_days || 0, currentStreak || 0);
      setSupabaseStats({
        total: mediationStats.total,
        resolved: mediationStats.resolved,
        active: mediationStats.active,
        streak,
      });

      const profileName = user.name?.trim() || '';
      const profileOk =
        !!profileName &&
        profileName !== t.profile.defaultUser &&
        !profileName.includes('@');

      const stats = await gatherAchievementStats(user.id, {
        isPremium: isPremiumUser,
        isCoupleConnected: !!coupleRow?.id,
        profileComplete: profileOk,
      });
      await checkAchievements(stats);
    } catch {
      // Keep previous stats on error.
    }
  }, [user, authLoading, premiumLoading, currentStreak, isPremiumUser, checkAchievements, t.profile.defaultUser]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      refreshRelationship();
    }, [fetchStats, refreshRelationship])
  );

  // 👋 wave greeting (only animation kept in the app)
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: -1, duration: 300, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0.7, duration: 250, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.delay(3000),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const waveRotate = waveAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const FREE_LIMIT = 3;
  const monthlyCount =
    user && !premiumLoading && !isPremiumUser ? getMonthlyCount(user.id) : 0;
  const remaining = FREE_LIMIT - monthlyCount;

  const totalMediations = supabaseStats.total;
  const resolvedCount = supabaseStats.resolved;
  const activeCount = supabaseStats.active;
  // Streak: wyższa wartość z lokalnej serii i Supabase (po synchronizacji powinny być równe)
  const displayStreak = Math.max(supabaseStats.streak, currentStreak);
  const displayLongest = longestStreak;

  const dashboardMenuItems = [
    {
      emoji: '📚',
      label: d.menuKnowledge,
      sub: d.menuKnowledgeSub,
      route: '/knowledge-center',
    },
    {
      emoji: '💬',
      label: d.menuNewMediation,
      sub: d.menuNewMediationSub,
      route: '/mediation/new',
    },
    {
      emoji: '🧠',
      label: d.menuSolo,
      sub: d.menuSoloSub,
      route: '/solo-analysis',
    },
    {
      emoji: '💜',
      label: d.menuGratitude,
      sub: d.menuGratitudeSub,
      route: '/gratitude',
    },
    {
      emoji: '📋',
      label: d.menuAgreements,
      sub: d.menuAgreementsSub,
      route: '/agreements',
    },
    {
      emoji: '🏆',
      label: t.achievements.title,
      sub: t.achievements.subtitle,
      route: '/achievements',
    },
  ];

  function renderMenuCard() {
    return (
      <View style={styles.menuCard}>
        {dashboardMenuItems.map((item, i, arr) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route as any)}
            style={({ pressed }) => [
              styles.menuItem,
              i < arr.length - 1 && styles.menuItemBorder,
              { backgroundColor: pressed ? Colors.primary + '12' : 'transparent' },
            ]}
          >
            <View style={styles.menuItemIconWrap}>
              <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
            </View>
            <View style={styles.menuItemText}>
              <Text style={styles.menuItemLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.menuItemSub} numberOfLines={2}>{item.sub}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </Pressable>
        ))}
      </View>
    );
  }

  function renderGratitudeStrip() {
    return (
      <View>
        <Pressable
          onPress={() => router.push('/gratitude')}
          style={({ pressed }) => [
            styles.soloStrip,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={['#F97316' + '22', Colors.gradientEnd + '10']}
            style={styles.soloStripGradient}
          >
            <View style={styles.soloStripLeft}>
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                style={styles.soloStripIcon}
              >
                <Text style={{ fontSize: 16 }}>💜</Text>
              </LinearGradient>
              <View style={styles.soloStripTexts}>
                <Text style={styles.soloStripTitle} numberOfLines={1}>{d.menuGratitude}</Text>
                <Text style={styles.soloStripSub} numberOfLines={2}>
                  {d.stripGratitudeSub}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  function renderAgreementsStrip() {
    return (
      <View>
        <Pressable
          onPress={() => router.push('/agreements')}
          style={({ pressed }) => [
            styles.soloStrip,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={[Colors.primary + '22', Colors.gradientMid + '10']}
            style={styles.soloStripGradient}
          >
            <View style={styles.soloStripLeft}>
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid]}
                style={styles.soloStripIcon}
              >
                <Text style={{ fontSize: 16 }}>📋</Text>
              </LinearGradient>
              <View style={styles.soloStripTexts}>
                <Text style={styles.soloStripTitle} numberOfLines={1}>{d.menuAgreements}</Text>
                <Text style={styles.soloStripSub} numberOfLines={2}>
                  {d.stripAgreementsSub}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  function renderSoloAnalysisStrip() {
    return (
      <View>
        <Pressable
          onPress={() => router.push('/solo-analysis')}
          style={({ pressed }) => [
            styles.soloStrip,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={[Colors.gradientMid + '22', Colors.gradientEnd + '10']}
            style={styles.soloStripGradient}
          >
            <View style={styles.soloStripLeft}>
              <LinearGradient
                colors={[Colors.gradientMid, Colors.gradientEnd]}
                style={styles.soloStripIcon}
              >
                <MaterialIcons name="person" size={16} color="#fff" />
              </LinearGradient>
              <View style={styles.soloStripTexts}>
                <Text style={styles.soloStripTitle} numberOfLines={1}>{d.menuSolo}</Text>
                <Text style={styles.soloStripSub} numberOfLines={2}>
                  {d.stripSoloSub}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  const firstName = user?.name?.trim().split(' ')[0] || '';

  // ── Translated strings (always use t.xxx, never hardcode) ──────────────────
  const tagline = t.app.tagline;
  const streakLabel = t.profile.streakLabel;
  const streakRecord = t.profile.streakRecord;
  const streakUnit = d.streakDays;
  const labelMediations = d.statMediations;
  const labelResolved = d.statResolved;
  const labelActive = d.statActive;

  function getStatusText() {
    if (isPremiumUser) return d.limitPremium;
    if (remaining <= 0) return d.limitExhausted;
    return fmt(d.limitRemaining, { remaining });
  }

  const statusText = getStatusText();
  const upgradeText = t.dispute.freePlanBannerUpgrade;

  function nameLooksLikeEmail(name: string): boolean {
    return name.includes('@') || name.includes('.');
  }

  const profileName = user?.name?.trim() || '';
  const needsProfileSetup =
    !profileName ||
    profileName === t.profile.defaultUser ||
    nameLooksLikeEmail(profileName);
  const greetingName = profileName && !needsProfileSetup ? firstName : t.common.user;

  const renderProfilePrompt = () =>
    needsProfileSetup ? (
      <Pressable
        onPress={() => router.push('/(tabs)/profile')}
        style={({ pressed }) => [styles.profilePrompt, { opacity: pressed ? 0.85 : 1 }]}
      >
        <MaterialIcons name="person-outline" size={20} color={Colors.primaryLight} />
        <View style={styles.profilePromptText}>
          <Text style={styles.profilePromptTitle}>{d.completeProfile}</Text>
          <Text style={styles.profilePromptSub}>{d.completeProfileSub}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
      </Pressable>
    ) : null;

  // ─── Shared sections ──────────────────────────────────────────────────────
  const renderHeader = (showAddBtn: boolean) => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {fmt(d.greeting, { name: greetingName })}
          </Text>
          <Animated.Text style={[styles.waveEmoji, { transform: [{ rotate: waveRotate }] }]}>
            👋
          </Animated.Text>
        </View>
        <Text style={styles.tagline}>{tagline}</Text>
      </View>
      <View style={styles.headerRight}>
        {!premiumLoading && isPremiumUser ? (
          <Pressable
            onPress={() => router.push('/premium')}
            style={({ pressed }) => [styles.premiumBadge, { opacity: pressed ? 0.85 : 1 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="star" size={14} color={Colors.gold} />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </Pressable>
        ) : null}
        {showAddBtn ? (
          <Pressable
            onPress={() => router.push('/couple/connect')}
            style={styles.avatarAddBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Avatar
              name={needsProfileSetup ? '?' : profileName}
              color={user?.avatarColor}
              imageUrl={user?.avatarUrl}
              size={42}
            />
            <View style={styles.addBadge}>
              <MaterialIcons name="add" size={10} color="#fff" />
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/mediation/new')}
            style={({ pressed }) => [
              styles.newDisputeBtn,
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientMid]}
              style={styles.newDisputeBtnGradient}
            >
              <MaterialIcons name="add" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderStatusCard = () => {
    if (premiumLoading || isPremiumUser) return null;

    return (
    <View style={styles.fullWidth}>
      <Pressable
        onPress={() => router.push('/premium')}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={[Colors.primary + '18', Colors.gradientMid + '0A']}
          style={styles.statusCard}
        >
          <View style={styles.statusCardLeft}>
            <Text style={styles.statusEmoji}>💜</Text>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
          <Text style={styles.statusLink} numberOfLines={1}>{upgradeText}</Text>
        </LinearGradient>
      </Pressable>
    </View>
    );
  };

  const renderRelationshipCard = () => (
    <View>
      <RelationshipCounterCard
        days={relationshipDays}
        nextMilestone={nextMilestone}
        onPress={() => setRelationshipModalVisible(true)}
        labels={{
          together: d.relationshipTogether,
          daysUnit: d.streakDays,
          milestoneToday: d.relationshipMilestoneToday,
          milestoneIn: d.relationshipMilestoneIn,
          setStartDate: d.relationshipSetDate,
        }}
      />
    </View>
  );

  const renderStreakCard = () => (
    <View>
      <View style={styles.streakCard}>
        {/* Left column */}
        <View style={styles.streakCol}>
          <Text style={styles.streakFireEmoji}>🔥</Text>
          <View style={styles.streakColText}>
            <Text style={styles.streakLabel} numberOfLines={1}>{streakLabel}</Text>
            <View style={styles.streakValueRow}>
              <Text style={[styles.streakValue, { color: '#F97316' }]}>{displayStreak}</Text>
              <Text style={styles.streakUnit}> {streakUnit}</Text>
            </View>
          </View>
        </View>
        {/* Divider */}
        <View style={styles.streakDivider} />
        {/* Right column */}
        <View style={styles.streakCol}>
          <Text style={styles.streakFireEmoji}>🏆</Text>
          <View style={styles.streakColText}>
            <Text style={styles.streakLabel} numberOfLines={1}>{streakRecord}</Text>
            <View style={styles.streakValueRow}>
              <Text style={[styles.streakValue, { color: Colors.primaryLight }]}>{displayLongest}</Text>
              <Text style={styles.streakUnit}> {streakUnit}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderReminderBanner = () =>
    user ? (
      <View>
        <RelationshipReminderBanner />
      </View>
    ) : null;

  const renderPartnerMediationBanner = () =>
    user && isConnected ? (
      <View>
        <PartnerMediationBanner />
      </View>
    ) : null;

  const renderStats = () => (
    <View style={styles.statsRow}>
      <StatCard label={labelMediations} value={totalMediations} />
      <StatCard label={labelResolved} value={resolvedCount} />
      <StatCard label={labelActive} value={activeCount} />
    </View>
  );

  const renderPremiumCTA = () =>
    !premiumLoading && !isPremiumUser ? (
      <View>
        <Pressable
          onPress={() => router.push('/premium')}
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumCard}
          >
            <View style={styles.premiumDecor1} />
            <View style={styles.premiumDecor2} />
            <View style={styles.premiumContent}>
              <MaterialIcons name="star" size={22} color={Colors.gold} />
              <View style={styles.premiumTexts}>
                <Text style={styles.premiumTitle}>{t.premium.unlockPower}</Text>
                <Text style={styles.premiumSub}>{t.premium.unlockSub}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    ) : null;

  // ─── No partner content ────────────────────────────────────────────────────
  const noCoupleContent = (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {renderHeader(true)}
      {renderProfilePrompt()}
      {renderStatusCard()}
      {renderStreakCard()}
      {renderRelationshipCard()}
      {renderStats()}
      {renderReminderBanner()}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <View style={styles.actionBtnFlex}>
          <Pressable
            onPress={() => router.push('/mediation/new')}
            style={styles.actionBtnPressable}
          >
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <MaterialIcons name="psychology" size={18} color="#fff" />
              <Text style={styles.primaryBtnText} numberOfLines={1}>
                {d.menuNewMediation}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/couple/connect')}
          style={styles.outlineBtn}
        >
          <MaterialIcons name="favorite" size={16} color={Colors.primaryLight} />
          <Text style={styles.outlineBtnText}>{t.profile.partner}</Text>
        </Pressable>
      </View>

      <PartnerNeedCard />

      {/* Menu list */}
      {renderMenuCard()}

      {renderPremiumCTA()}
    </ScrollView>
  );

  // ─── Partner connected content ─────────────────────────────────────────────
  const disputesContent = (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {renderHeader(false)}
      {renderProfilePrompt()}
      {renderStatusCard()}
      {renderStreakCard()}
      {renderRelationshipCard()}
      {renderStats()}
      {renderReminderBanner()}
      {renderPartnerMediationBanner()}

      {/* Active disputes */}
      {disputesLoading ? (
        <ActivityIndicator color={Colors.primaryLight} style={{ marginVertical: 20 }} />
      ) : (
        <>
          <View style={styles.disputesSection}>
            <Text style={styles.sectionLabel}>{t.dispute.activeDisputes}</Text>
            {activeDisputes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✨</Text>
                <Text style={styles.emptyTitle}>{t.dispute.noDisputes}</Text>
                <Text style={styles.emptyText}>{t.dispute.noDisputesSub}</Text>
              </View>
            ) : (
              activeDisputes.map((d) => (
                <DisputeCard key={d.id} dispute={d} currentUserId={user?.id || ''} />
              ))
            )}
          </View>

          {resolvedDisputes.length > 0 ? (
            <View style={[styles.disputesSection, { position: 'relative' }]}>
              <Text style={styles.sectionLabel}>{t.dispute.resolvedDisputes}</Text>
              {resolvedDisputes.map((d) => (
                <DisputeCard key={d.id} dispute={d} currentUserId={user?.id || ''} />
              ))}
              {user && !premiumLoading && !isPremiumUser ? (
                <BlurOverlay
                  featureName={t.dispute.resolvedDisputes.toLowerCase()}
                  style="bottom"
                  showSoloOption
                />
              ) : null}
            </View>
          ) : null}
        </>
      )}

      {/* History strip */}
      <View>
        <Pressable
          onPress={() => router.push('/dispute/history' as any)}
          style={({ pressed }) => [styles.historyStrip, { opacity: pressed ? 0.85 : 1 }]}
        >
          <MaterialIcons name="history" size={20} color={Colors.textSecondary} />
          <Text style={styles.historyStripText} numberOfLines={1}>{d.menuHistory}</Text>
          {activeCount > 0 ? (
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>{activeCount}</Text>
            </View>
          ) : null}
          <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* New mediation strip */}
      <View>
        <Pressable
          onPress={() => router.push('/mediation/new')}
          style={({ pressed }) => [
            styles.soloStrip,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={[Colors.gradientStart + '25', Colors.gradientMid + '12']}
            style={styles.soloStripGradient}
          >
            <View style={styles.soloStripLeft}>
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid]}
                style={styles.soloStripIcon}
              >
                <MaterialIcons name="psychology" size={16} color="#fff" />
              </LinearGradient>
              <View style={styles.soloStripTexts}>
                <Text style={styles.soloStripTitle} numberOfLines={1}>{d.menuNewMediation}</Text>
                <Text style={styles.soloStripSub} numberOfLines={1}>
                  {d.stripMediationSub}
                </Text>
              </View>
            </View>
            <View style={styles.soloStripRight}>
              <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <PartnerNeedCard />

      {/* Knowledge center strip */}
      <View>
        <Pressable
          onPress={() => router.push('/knowledge-center')}
          style={({ pressed }) => [
            styles.soloStrip,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={[Colors.gradientEnd + '22', Colors.primary + '10']}
            style={styles.soloStripGradient}
          >
            <View style={styles.soloStripLeft}>
              <LinearGradient
                colors={[Colors.gradientMid, Colors.gradientEnd]}
                style={styles.soloStripIcon}
              >
                <Text style={{ fontSize: 16 }}>📚</Text>
              </LinearGradient>
              <View style={styles.soloStripTexts}>
                <Text style={styles.soloStripTitle} numberOfLines={1}>{d.menuKnowledge}</Text>
                <Text style={styles.soloStripSub} numberOfLines={2}>
                  {d.stripKnowledgeSub}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </LinearGradient>
        </Pressable>
      </View>

      {renderSoloAnalysisStrip()}
      {renderGratitudeStrip()}
      {renderAgreementsStrip()}

      {renderPremiumCTA()}
    </ScrollView>
  );

  if (authLoading) {
    return (
      <View style={[styles.container, styles.loadingFull, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingFullText}>{d.loading}</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.authGuard, { paddingTop: insets.top + Spacing.xl }]}>
        <MaterialIcons name="lock-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.authGuardTitle}>{t.profile.notLoggedIn}</Text>
        <Text style={styles.authGuardText}>{d.loginPrompt}</Text>
        <Button
          title={t.profile.loginBtn}
          onPress={() => router.replace('/auth/login')}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isConnected ? noCoupleContent : disputesContent}
      <RelationshipSettingsModal
        visible={relationshipModalVisible}
        initialData={relationshipData}
        onClose={() => setRelationshipModalVisible(false)}
        onSave={saveRelationship}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingFullText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  profilePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary + '12',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    padding: Spacing.md,
  },
  profilePromptText: {
    flex: 1,
    gap: 2,
  },
  profilePromptTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  profilePromptSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  authGuard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  authGuardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  authGuardText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    ...(Platform.OS === 'web'
      ? { maxWidth: 560, width: '100%', alignSelf: 'center' as const }
      : null),
  },
  fullWidth: {
    // ensures Animated.View wrapper doesn't constrain children
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
    marginLeft: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold + '18',
    borderWidth: 1,
    borderColor: Colors.gold + '40',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  premiumBadgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.gold,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  greeting: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  waveEmoji: {
    fontSize: 24,
    marginLeft: 2,
  },
  tagline: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  avatarAddBtn: {
    position: 'relative',
    flexShrink: 0,
  },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.gradientStart,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  newDisputeBtn: {
    flexShrink: 0,
  },
  newDisputeBtnGradient: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },

  // ── Status card ────────────────────────────────────────────────────────────
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    paddingHorizontal: 16,
    paddingVertical: 14,
    // NO gap here — we use padding/margin on children
  },
  statusCardLeft: {
    flex: 1,          // ← take all available width
    minWidth: 0,      // ← CRITICAL: allows text to wrap instead of overflow
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 10, // space before the link
  },
  statusEmoji: {
    fontSize: 18,
    marginRight: 10,
    flexShrink: 0,    // ← never shrink the emoji
    marginTop: 1,     // align with text baseline
  },
  statusText: {
    flex: 1,          // ← fill remaining width in statusCardLeft
    minWidth: 0,      // ← CRITICAL for text wrapping
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    // NO flexShrink needed here because parent already has flex:1
  },
  statusLink: {
    flexShrink: 0,    // ← never shrink the link
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.accent,
    maxWidth: 90,     // cap the link width
    textAlign: 'right',
  },

  // ── Streak card ────────────────────────────────────────────────────────────
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakCol: {
    flex: 1,
    minWidth: 0,      // ← allows shrinking
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakFireEmoji: {
    fontSize: 26,
    flexShrink: 0,
  },
  streakColText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  streakLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
  },
  streakUnit: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },
  streakDivider: {
    width: 1,
    height: 38,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
    flexShrink: 0,
  },

  // ── Stats row ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 26,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionBtnFlex: {
    flex: 1,
    minWidth: 0,
  },
  actionBtnPressable: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: '#fff',
    flexShrink: 1,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '12',
    flexShrink: 0,
  },
  outlineBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.primaryLight,
  },

  // ── Menu card ──────────────────────────────────────────────────────────────
  menuCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  menuItemText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  menuItemLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  menuItemSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Premium card ──────────────────────────────────────────────────────────
  premiumCard: {
    borderRadius: Radius.xl,
    height: 80,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  premiumDecor1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  premiumDecor2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -30,
    left: 80,
  },
  premiumContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  premiumTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  premiumTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#fff',
  },
  premiumSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 16,
  },

  // ── Disputes section ──────────────────────────────────────────────────────
  disputesSection: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // ── Solo strip ─────────────────────────────────────────────────────────────
  soloStrip: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  soloStripGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  soloStripLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soloStripIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  soloStripTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  soloStripTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  soloStripSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  soloStripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  soloStripPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.primaryLight,
  },

  // ── History strip ───────────────────────────────────────────────────────────
  historyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyStripText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  historyBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  historyBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Colors.primaryLight,
  },
});
