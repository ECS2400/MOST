import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AchievementCondition,
  AchievementId,
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
} from '@/constants/achievements';
import { sendAchievementNotification } from './notificationService';
import { getAchievementText } from '@/constants/i18n/achievementItems';
import type { Language } from '@/constants/i18n';
import { supabase } from '@/services/supabase';
import { fetchMediationStats } from '@/services/mediationStats';
import {
  calculateGratitudeStreak,
  fetchMyGratitudeEntries,
} from '@/services/gratitudeJournal';

const STORAGE_KEY = 'most_achievements';
const STREAK_KEY = 'most_streak';
const APP_FIRST_USE_KEY = 'most_first_use';
const LANGUAGE_KEY = 'most_language';

const SUPPORTED_LANGS = ['pl', 'en', 'it', 'es', 'de', 'fr'] as const;

async function getNotificationLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored as Language)) {
      return stored as Language;
    }
  } catch {}
  return 'pl';
}

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface AchievementStats {
  totalDisputes?: number;
  resolvedDisputes?: number;
  successRate?: number;
  currentStreak?: number;
  longestStreak?: number;
  soloCount?: number;
  gratitudeEntries?: number;
  gratitudeStreak?: number;
  isCoupleConnected?: boolean;
  coupleMediations?: number;
  gratitudeShared?: boolean;
  aiSessions?: number;
  aiPhasesCompleted?: number;
  referralCount?: number;
  isPremium?: boolean;
  screenshotCount?: number;
  mirrorCount?: number;
  totalPoints?: number;
  profileComplete?: boolean;
  appDays?: number;
}

export async function getUnlockedAchievements(userId: string): Promise<UnlockedAchievement[]> {
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function unlockAchievement(
  userId: string,
  id: AchievementId
): Promise<{ isNew: boolean }> {
  try {
    const current = await getUnlockedAchievements(userId);
    if (current.find((a) => a.id === id)) return { isNew: false };
    const updated = [...current, { id, unlockedAt: new Date().toISOString() }];
    await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(updated));
    const achievement = ACHIEVEMENT_MAP[id];
    if (achievement && !achievement.secret) {
      const lang = await getNotificationLanguage();
      const { title } = getAchievementText(lang, id);
      await sendAchievementNotification(title);
    }
    return { isNew: true };
  } catch {
    return { isNew: false };
  }
}

function meetsCondition(condition: AchievementCondition, stats: AchievementStats): boolean {
  switch (condition.type) {
    case 'totalDisputes':
      return (stats.totalDisputes ?? 0) >= condition.min;
    case 'resolvedDisputes':
      return (stats.resolvedDisputes ?? 0) >= condition.min;
    case 'streak':
      return Math.max(stats.currentStreak ?? 0, stats.longestStreak ?? 0) >= condition.min;
    case 'soloCount':
      return (stats.soloCount ?? 0) >= condition.min;
    case 'gratitudeEntries':
      return (stats.gratitudeEntries ?? 0) >= condition.min;
    case 'gratitudeStreak':
      return (stats.gratitudeStreak ?? 0) >= condition.min;
    case 'coupleConnected':
      return !!stats.isCoupleConnected;
    case 'coupleMediations':
      return (stats.coupleMediations ?? 0) >= condition.min;
    case 'gratitudeShared':
      return !!stats.gratitudeShared;
    case 'aiSessions':
      return (stats.aiSessions ?? 0) >= condition.min;
    case 'aiPhasesCompleted':
      return (stats.aiPhasesCompleted ?? 0) >= condition.min;
    case 'referralCount':
      return (stats.referralCount ?? 0) >= condition.min;
    case 'isPremium':
      return !!stats.isPremium;
    case 'screenshotCount':
      return (stats.screenshotCount ?? 0) >= condition.min;
    case 'mirrorCount':
      return (stats.mirrorCount ?? 0) >= condition.min;
    case 'successRate':
      return (stats.successRate ?? 0) >= condition.min;
    case 'totalPoints':
      return (stats.totalPoints ?? 0) >= condition.min;
    case 'profileComplete':
      return !!stats.profileComplete;
    case 'appDays':
      return (stats.appDays ?? 0) >= condition.min;
    default:
      return false;
  }
}


export async function checkAndUnlockAchievements(
  userId: string,
  stats: AchievementStats
): Promise<AchievementId[]> {
  const newlyUnlocked: AchievementId[] = [];
  const unlocked = await getUnlockedAchievements(userId);
  const unlockedIds = new Set(unlocked.map((a) => a.id));

  const pointsFromUnlocked = unlocked.reduce(
    (sum, a) => sum + (ACHIEVEMENT_MAP[a.id]?.points ?? 0),
    0
  );
  const statsWithPoints = { ...stats, totalPoints: pointsFromUnlocked };

  for (const achievement of ACHIEVEMENTS) {
    if (achievement.legacy) continue;
    if (!achievement.condition) continue;
    if (unlockedIds.has(achievement.id)) continue;
    if (!meetsCondition(achievement.condition, statsWithPoints)) continue;

    const result = await unlockAchievement(userId, achievement.id);
    if (result.isNew) {
      newlyUnlocked.push(achievement.id);
      unlockedIds.add(achievement.id);
    }
  }

  // Re-check point milestones after new unlocks
  if (newlyUnlocked.length > 0) {
    const extra = await checkPointMilestones(userId);
    newlyUnlocked.push(...extra);
  }

  return newlyUnlocked;
}

async function checkPointMilestones(userId: string): Promise<AchievementId[]> {
  const unlocked = await getUnlockedAchievements(userId);
  const totalPoints = getTotalPoints(unlocked.map((a) => a.id));
  return checkAndUnlockAchievements(userId, { totalPoints });
}

export async function gatherAchievementStats(
  userId: string,
  options: {
    isPremium?: boolean;
    isCoupleConnected?: boolean;
    profileComplete?: boolean;
    referralCount?: number;
  } = {}
): Promise<AchievementStats> {
  const [mediationStats, gratitudeEntries, streak, soloCount, coupleMedCount] =
    await Promise.all([
      fetchMediationStats(userId).catch(() => ({ total: 0, resolved: 0, active: 0 })),
      fetchMyGratitudeEntries(userId).catch(() => []),
      getStreakData(userId),
      countSoloMediations(userId),
      countCoupleMediations(userId),
    ]);

  const gratitudeStreak = calculateGratitudeStreak(gratitudeEntries);
  const successRate =
    mediationStats.total > 0
      ? Math.round((mediationStats.resolved / mediationStats.total) * 100)
      : 0;
  const appDays = await getAppDays(userId);
  const gratitudeShared = gratitudeEntries.some((e) => e.shareWithPartner);

  const unlocked = await getUnlockedAchievements(userId);
  const totalPoints = getTotalPoints(unlocked.map((a) => a.id));

  return {
    totalDisputes: mediationStats.total,
    resolvedDisputes: mediationStats.resolved,
    successRate,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    soloCount,
    gratitudeEntries: gratitudeEntries.length,
    gratitudeStreak: gratitudeStreak.current,
    isCoupleConnected: options.isCoupleConnected,
    coupleMediations: coupleMedCount,
    gratitudeShared,
    aiSessions: mediationStats.total,
    aiPhasesCompleted: 0,
    referralCount: options.referralCount ?? 0,
    isPremium: options.isPremium,
    screenshotCount: 0,
    mirrorCount: 0,
    totalPoints,
    profileComplete: options.profileComplete,
    appDays,
  };
}

async function countSoloMediations(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('mediations')
      .select('live_summary')
      .eq('user_id', userId)
      .eq('status', 'resolved');
    if (error) return 0;
    return (data || []).filter(
      (r) => (r.live_summary as { mode?: string } | null)?.mode === 'solo'
    ).length;
  } catch {
    return 0;
  }
}

async function countCoupleMediations(userId: string): Promise<number> {
  try {
    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`)
      .not('partner_2_id', 'is', null)
      .maybeSingle();

    if (!couple?.id) return 0;

    const { count, error } = await supabase
      .from('mediations')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', couple.id);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getAppDays(userId: string): Promise<number> {
  try {
    const key = `${APP_FIRST_USE_KEY}_${userId}`;
    let firstUse = await AsyncStorage.getItem(key);
    if (!firstUse) {
      firstUse = new Date().toISOString();
      await AsyncStorage.setItem(key, firstUse);
    }
    const diff = Date.now() - new Date(firstUse).getTime();
    return Math.max(1, Math.ceil(diff / 86400000));
  } catch {
    return 1;
  }
}

export async function getStreakData(userId: string): Promise<StreakData> {
  try {
    const stored = await AsyncStorage.getItem(`${STREAK_KEY}_${userId}`);
    return stored
      ? JSON.parse(stored)
      : { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }
}

async function syncStreakToCouple(userId: string, currentStreak: number): Promise<void> {
  try {
    const { data: couple } = await supabase
      .from('couples')
      .select('id, streak_days')
      .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`)
      .not('partner_2_id', 'is', null)
      .maybeSingle();

    if (!couple?.id) return;

    const dbStreak = couple.streak_days || 0;
    if (dbStreak === currentStreak) return;

    await supabase
      .from('couples')
      .update({ streak_days: currentStreak })
      .eq('id', couple.id);
  } catch {
    // Lokalna seria nadal działa bez synchronizacji z Supabase.
  }
}

async function unlockStreakAchievements(userId: string, streak: number): Promise<void> {
  const streakAchievements = ACHIEVEMENTS.filter(
    (a) => a.condition?.type === 'streak' && a.condition.min <= streak
  );
  for (const a of streakAchievements) {
    await unlockAchievement(userId, a.id);
  }
}

export async function updateStreak(userId: string): Promise<StreakData> {
  try {
    const current = await getStreakData(userId);
    const today = new Date().toDateString();
    if (current.lastActiveDate === today) {
      await syncStreakToCouple(userId, current.currentStreak);
      return current;
    }
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const isConsecutive = current.lastActiveDate === yesterday;
    const newStreak = isConsecutive ? current.currentStreak + 1 : 1;
    const updated: StreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(current.longestStreak, newStreak),
      lastActiveDate: today,
    };
    await AsyncStorage.setItem(`${STREAK_KEY}_${userId}`, JSON.stringify(updated));
    await syncStreakToCouple(userId, newStreak);
    await unlockStreakAchievements(userId, newStreak);

    return updated;
  } catch {
    return { currentStreak: 1, longestStreak: 1, lastActiveDate: new Date().toDateString() };
  }
}

export function getTotalPoints(unlockedIds: AchievementId[]): number {
  return unlockedIds.reduce((sum, id) => sum + (ACHIEVEMENT_MAP[id]?.points ?? 0), 0);
}

/** Odblokuj sekretne osiągnięcie (np. nocna mediacja). */
export async function unlockSecretAchievement(
  userId: string,
  id: AchievementId
): Promise<boolean> {
  const achievement = ACHIEVEMENT_MAP[id];
  if (!achievement?.secret) return false;
  const result = await unlockAchievement(userId, id);
  return result.isNew;
}
