import { useAchievements } from './useAchievements';

export function useStreak() {
  const { streakData } = useAchievements();
  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    lastActiveDate: streakData.lastActiveDate,
    isStreakActive: streakData.lastActiveDate === new Date().toDateString(),
  };
}
