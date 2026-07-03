import { useContext } from 'react';
import { AchievementContext } from '@/contexts/AchievementContext';

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (!context) throw new Error('useAchievements must be used within AchievementProvider');
  return context;
}
