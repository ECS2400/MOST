import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  UnlockedAchievement,
  StreakData,
  getUnlockedAchievements,
  updateStreak,
  getStreakData,
  checkAndUnlockAchievements,
  getTotalPoints,
} from '@/services/achievementService';
import { AchievementId } from '@/constants/achievements';

interface AchievementContextType {
  unlockedAchievements: UnlockedAchievement[];
  streakData: StreakData;
  totalPoints: number;
  newlyUnlocked: AchievementId[];
  clearNewlyUnlocked: () => void;
  refresh: () => Promise<void>;
  checkAchievements: (stats: Parameters<typeof checkAndUnlockAchievements>[1]) => Promise<void>;
}

export const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

export function AchievementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
  });
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementId[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
      tickStreak();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void tickStreak();
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  async function loadData() {
    if (!user) return;
    const [achievements, streak] = await Promise.all([
      getUnlockedAchievements(user.id),
      getStreakData(user.id),
    ]);
    setUnlockedAchievements(achievements);
    setStreakData(streak);
  }

  async function tickStreak() {
    if (!user) return;
    const updated = await updateStreak(user.id);
    setStreakData(updated);
  }

  const refresh = useCallback(async () => {
    if (user) await tickStreak();
    await loadData();
  }, [user?.id]);

  const checkAchievements = useCallback(
    async (stats: Parameters<typeof checkAndUnlockAchievements>[1]) => {
      if (!user) return;
      const newIds = await checkAndUnlockAchievements(user.id, stats);
      if (newIds.length > 0) {
        setNewlyUnlocked((prev) => [...prev, ...newIds]);
        await loadData();
      }
    },
    [user?.id]
  );

  function clearNewlyUnlocked() {
    setNewlyUnlocked([]);
  }

  const totalPoints = getTotalPoints(unlockedAchievements.map((a) => a.id));

  return (
    <AchievementContext.Provider
      value={{
        unlockedAchievements,
        streakData,
        totalPoints,
        newlyUnlocked,
        clearNewlyUnlocked,
        refresh,
        checkAchievements,
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
}
