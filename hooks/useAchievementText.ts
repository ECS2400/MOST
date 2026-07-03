import { useLanguage } from '@/hooks/useLanguage';
import { getAchievementText } from '@/constants/i18n/achievementItems';

export function useAchievementText(id: string) {
  const { language } = useLanguage();
  return getAchievementText(language, id);
}
