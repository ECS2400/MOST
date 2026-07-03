import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { usePurchasesContext } from '@/contexts/PurchasesContext';
import { isCouplePremium } from '@/services/couplePremium';
import { hasMockActivePremium } from '@/services/revenueCat';

export type PremiumSource = 'revenuecat' | 'profile' | 'couple' | 'mock' | 'none';

export interface PremiumStatus {
  isPremium: boolean;
  source: PremiumSource;
  loading: boolean;
}

/**
 * Single entry point for premium status across RevenueCat, couple, profile, and dev mock.
 * Priority: revenuecat → couple → profile → mock(dev) → none
 */
export function usePremiumStatus(): PremiumStatus {
  const { user, isLoading: authLoading } = useAuth();
  const { couple, isLoading: coupleLoading } = useCouple();
  const rc = usePurchasesContext();
  const [mockPremium, setMockPremium] = useState(false);
  const [mockChecked, setMockChecked] = useState(!__DEV__);

  useEffect(() => {
    if (!__DEV__ || !user?.id) {
      setMockPremium(false);
      setMockChecked(true);
      return;
    }

    let mounted = true;
    setMockChecked(false);

    hasMockActivePremium(user.id)
      .then((active) => {
        if (mounted) {
          setMockPremium(active);
          setMockChecked(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setMockPremium(false);
          setMockChecked(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user?.id, rc.isMostPro, user?.plan, couple?.subscriptionTier, couple?.subscriptionExpires]);

  const revenueCatPremium = rc.isMostPro;
  const couplePremium = isCouplePremium(couple, user?.id);
  const profilePremium = user?.plan === 'premium';

  const { isPremium, source } = useMemo((): Pick<PremiumStatus, 'isPremium' | 'source'> => {
    if (revenueCatPremium) {
      return { isPremium: true, source: 'revenuecat' };
    }

    if (couplePremium) {
      return { isPremium: true, source: 'couple' };
    }

    if (profilePremium) {
      return { isPremium: true, source: 'profile' };
    }

    if (__DEV__ && mockPremium) {
      return { isPremium: true, source: 'mock' };
    }

    return { isPremium: false, source: 'none' };
  }, [revenueCatPremium, couplePremium, profilePremium, mockPremium]);

  const loading = authLoading || rc.isLoading || coupleLoading || !mockChecked;

  useEffect(() => {
    if (__DEV__) {
      console.log('[premium status]', {
        userId: user?.id,
        email: user?.email,
        userPlan: user?.plan,
        revenueCatPremium,
        profilePremium,
        couplePremium,
        mockPremium,
        source,
        isPremium,
      });
    }
  }, [
    user?.id,
    user?.email,
    user?.plan,
    revenueCatPremium,
    profilePremium,
    couplePremium,
    mockPremium,
    source,
    isPremium,
  ]);

  return { isPremium, source, loading };
}
