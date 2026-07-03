import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import {
  fetchRelationshipReminder,
  MAX_REMINDERS_PER_DAY,
} from '@/services/relationshipReminder';

export function useRelationshipReminder() {
  const { user } = useAuth();
  const { partner } = useCouple();
  const { language } = useLanguage();
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchCount, setFetchCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  const remaining = Math.max(0, MAX_REMINDERS_PER_DAY - fetchCount);

  const load = useCallback(
    async (forceNew = false) => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const result = await fetchRelationshipReminder({
          userId: user.id,
          language,
          partnerName: partner?.name,
          forceNew,
        });
        setTip(result.tip);
        setFetchCount(result.fetchCount);
        setLimitReached(result.limitReached);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, language, partner?.name]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { tip, loading, fetchCount, remaining, limitReached, refresh };
}
