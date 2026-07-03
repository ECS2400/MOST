import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  addCustomerInfoListener,
  getRevenueCatCustomerInfo,
  hasMostProEntitlement,
  isRevenueCatNativeAvailable,
  loginRevenueCat,
  logoutRevenueCat,
  presentRevenueCatCustomerCenter,
  presentRevenueCatPaywall,
  purchaseByProductId,
  restoreRevenueCatPurchases,
  type RcCustomerInfo,
  RcPurchaseError,
} from '@/services/revenueCatSdk';
import { syncCouplePremiumSubscription } from '@/services/couplePremium';

interface PurchasesContextValue {
  isNativeAvailable: boolean;
  isConfigured: boolean;
  isMostPro: boolean;
  customerInfo: RcCustomerInfo | null;
  isLoading: boolean;
  error: string;
  refreshCustomerInfo: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  presentPaywall: () => Promise<boolean>;
  presentCustomerCenter: () => Promise<boolean>;
}

const PurchasesContext = createContext<PurchasesContextValue | undefined>(undefined);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { user, upgradeToPremium, downgradeToFree } = useAuth();
  const [isConfigured, setIsConfigured] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<RcCustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const prevUserIdRef = useRef<string | undefined>(undefined);

  const isNativeAvailable = isRevenueCatNativeAvailable();

  const syncProfileFromEntitlement = useCallback(
    async (info: RcCustomerInfo | null) => {
      if (!user) return;

      if (info?.isMostPro) {
        await upgradeToPremium(info.expirationDate ?? undefined);
        if (user.coupleId) {
          try {
            await syncCouplePremiumSubscription({
              coupleId: user.coupleId,
              paidByUserId: user.id,
              expiresAt: info.expirationDate ?? null,
            });
          } catch (syncError) {
            console.warn('[PurchasesContext] couple premium sync failed', syncError);
          }
        }
      } else if (user.plan === 'premium') {
        // Keep profile premium if set manually; RC is source of truth when native works
        if (isNativeAvailable && isConfigured) {
          await downgradeToFree();
        }
      }
    },
    [user, upgradeToPremium, downgradeToFree, isNativeAvailable, isConfigured]
  );

  const applyCustomerInfo = useCallback(
    async (info: RcCustomerInfo | null) => {
      setCustomerInfo(info);
      await syncProfileFromEntitlement(info);
    },
    [syncProfileFromEntitlement]
  );

  const refreshCustomerInfo = useCallback(async () => {
    if (!isNativeAvailable || !isConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const info = await getRevenueCatCustomerInfo();
      await applyCustomerInfo(info);
      setError('');
    } catch {
      setError('Nie udało się pobrać statusu subskrypcji');
    } finally {
      setIsLoading(false);
    }
  }, [isNativeAvailable, isConfigured, applyCustomerInfo]);

  useEffect(() => {
    let mounted = true;

    async function handleUserChange() {
      const userId = user?.id;
      const prevUserId = prevUserIdRef.current;
      prevUserIdRef.current = userId;

      setCustomerInfo(null);
      setError('');

      if (!userId) {
        await logoutRevenueCat();
        if (mounted) {
          setIsConfigured(false);
          setIsLoading(false);
        }
        return;
      }

      if (!isNativeAvailable || Platform.OS === 'web') {
        if (mounted) {
          setIsConfigured(false);
          setIsLoading(false);
        }
        return;
      }

      if (mounted) setIsLoading(true);

      if (prevUserId && prevUserId !== userId) {
        await logoutRevenueCat();
      }

      const ok = await loginRevenueCat(userId);
      if (!mounted) return;
      setIsConfigured(ok);

      if (ok) {
        const info = await getRevenueCatCustomerInfo();
        if (mounted) await applyCustomerInfo(info);
      }
      if (mounted) setIsLoading(false);
    }

    handleUserChange();

    return () => {
      mounted = false;
    };
  }, [user?.id, isNativeAvailable, applyCustomerInfo]);

  useEffect(() => {
    if (!isConfigured || !isNativeAvailable) return;
    return addCustomerInfoListener((info) => {
      void applyCustomerInfo(info);
    });
  }, [isConfigured, isNativeAvailable, applyCustomerInfo]);

  const purchaseProduct = useCallback(
    async (productId: string): Promise<boolean> => {
      setError('');
      try {
        const info = await purchaseByProductId(productId);
        await applyCustomerInfo(info);
        return info.isMostPro;
      } catch (e) {
        if (e instanceof RcPurchaseError && e.code === 'USER_CANCELLED') {
          return false;
        }
        setError(e instanceof Error ? e.message : 'Zakup nie powiódł się');
        return false;
      }
    },
    [applyCustomerInfo]
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setError('');
    try {
      const info = await restoreRevenueCatPurchases();
      await applyCustomerInfo(info);
      return info.isMostPro;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się przywrócić zakupów');
      return false;
    }
  }, [applyCustomerInfo]);

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    setError('');
    const success = await presentRevenueCatPaywall();
    if (success) {
      await refreshCustomerInfo();
    }
    return success;
  }, [refreshCustomerInfo]);

  const presentCustomerCenter = useCallback(async (): Promise<boolean> => {
    const ok = await presentRevenueCatCustomerCenter();
    if (ok) await refreshCustomerInfo();
    return ok;
  }, [refreshCustomerInfo]);

  const value = useMemo(
    (): PurchasesContextValue => ({
      isNativeAvailable,
      isConfigured,
      isMostPro: customerInfo?.isMostPro === true,
      customerInfo,
      isLoading,
      error,
      refreshCustomerInfo,
      purchaseProduct,
      restorePurchases,
      presentPaywall,
      presentCustomerCenter,
    }),
    [
      isNativeAvailable,
      isConfigured,
      customerInfo,
      isLoading,
      error,
      refreshCustomerInfo,
      purchaseProduct,
      restorePurchases,
      presentPaywall,
      presentCustomerCenter,
    ]
  );

  return (
    <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>
  );
}

export function usePurchasesContext(): PurchasesContextValue {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error('usePurchasesContext must be used within PurchasesProvider');
  }
  return ctx;
}

export { hasMostProEntitlement, isRevenueCatEntitled } from '@/services/revenueCatSdk';
