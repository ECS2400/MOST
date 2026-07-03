import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/services/supabase';
import {
  RelationshipData,
  RelationshipAnniversary,
  daysTogether,
  fetchRelationshipData,
  getNextMilestone,
  saveRelationshipData,
} from '@/services/relationshipDates';

export function useRelationship() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { t } = useLanguage();
  const [data, setData] = useState<RelationshipData>({ startDate: null, anniversaries: [] });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const next = await fetchRelationshipData(user.id, couple?.id);
      setData(next);
    } finally {
      setLoading(false);
    }
  }, [user?.id, couple?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-sync z partnerem: nasłuchuj zmian współdzielonego rekordu pary.
  useEffect(() => {
    if (!couple?.id) return;

    const channel = supabase
      .channel(`relationship-dates:${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'couples',
          filter: `id=eq.${couple.id}`,
        },
        (payload) => {
          const row = payload.new as {
            relationship_start_date?: string | null;
            anniversaries?: RelationshipAnniversary[] | null;
          };
          setData({
            startDate: row.relationship_start_date || null,
            anniversaries: Array.isArray(row.anniversaries) ? row.anniversaries : [],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id]);

  const save = useCallback(
    async (next: RelationshipData) => {
      if (!user?.id) return;
      await saveRelationshipData(user.id, couple?.id, next);
      setData(next);
    },
    [user?.id, couple?.id]
  );

  const days = data.startDate ? daysTogether(data.startDate) : null;
  const nextMilestone = getNextMilestone(
    data.startDate,
    data.anniversaries,
    t.dashboard.relationshipAnniversary
  );

  return { data, days, nextMilestone, loading, refresh, save };
}
