// Most App — Purchases Hook

import { useState, useEffect, useCallback } from 'react';
import {
  purchaseProduct as purchaseProductService,
  restorePurchases as restorePurchasesService,
  hasActivePremium,
  hasSoloAnalysis,
  getPurchases,
  clearActiveSubscriptions,
  getProducts,
  isRevenueCatNativeAvailable,
  ProductId,
  PurchaseResult,
  StoredPurchase,
} from '@/services/revenueCat';
import { PRODUCT_IDS, SUBSCRIPTION_PRODUCT_IDS } from '@/constants/revenueCatConfig';
import { syncCouplePremiumSubscription } from '@/services/couplePremium';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { usePurchasesContext } from '@/contexts/PurchasesContext';

interface UsePurchasesReturn {
  isPremium: boolean;
  hasSolo: boolean;
  purchases: StoredPurchase[];
  isLoading: boolean;
  isPurchasing: boolean;
  error: string;
  isRevenueCatAvailable: boolean;
  purchase: (productId: ProductId) => Promise<PurchaseResult | null>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  revokePremium: () => Promise<void>;
  presentPaywall: () => Promise<boolean>;
  presentCustomerCenter: () => Promise<boolean>;
}

export function usePurchases(): UsePurchasesReturn {
  const { user, upgradeToPremium, downgradeToFree } = useAuth();
  const { refreshCouple } = useCouple();
  const { language } = useLanguage();
  const rc = usePurchasesContext();

  const [isPremium, setIsPremium] = useState(false);
  const [hasSolo, setHasSolo] = useState(false);
  const [purchases, setPurchases] = useState<StoredPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) {
      setIsPremium(false);
      setHasSolo(false);
      setPurchases([]);
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setIsPremium(false);
      setHasSolo(false);
      setPurchases([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      await rc.refreshCustomerInfo();
      const [premium, solo, all] = await Promise.all([
        hasActivePremium(user.id),
        hasSoloAnalysis(user.id),
        getPurchases(user.id),
      ]);
      setIsPremium(premium || rc.isMostPro || user.plan === 'premium');
      setHasSolo(solo);
      setPurchases(all);
      if (rc.error) setError(rc.error);
      await refreshCouple(user.id);
    } catch {
      // keep previous state
    }
    setIsLoading(false);
  }, [user?.id, user?.plan, rc.isMostPro, rc.refreshCustomerInfo, rc.error, refreshCouple]);

  useEffect(() => {
    refresh();
  }, [refresh, rc.isMostPro]);

  async function purchase(productId: ProductId): Promise<PurchaseResult | null> {
    if (!user?.id) {
      setError('Zaloguj się, aby dokonać zakupu');
      return null;
    }

    setError('');
    setIsPurchasing(true);
    try {
      const isSub = (SUBSCRIPTION_PRODUCT_IDS as readonly string[]).includes(productId);

      if (isSub && rc.isNativeAvailable && rc.isConfigured) {
        const ok = await rc.purchaseProduct(productId);
        if (ok) {
          await refresh();
          return {
            success: true,
            productId,
            customerInfo: rc.customerInfo,
          };
        }
        if (rc.error) setError(rc.error);
        return { success: false, productId };
      }

      const result = await purchaseProductService(productId, user.id);
      if (result.success) {
        if (productId !== PRODUCT_IDS.soloAnalysis) {
          const purchaseRow = (await getPurchases(user.id)).find((p) => p.productId === productId);
          const expiresAt = purchaseRow?.expiresAt;
          await upgradeToPremium(expiresAt);
          if (user.coupleId) {
            try {
              await syncCouplePremiumSubscription({
                coupleId: user.coupleId,
                paidByUserId: user.id,
                expiresAt: expiresAt ?? null,
              });
            } catch (syncError) {
              console.warn('[usePurchases] couple premium sync failed', syncError);
            }
          }
        }
        await refresh();
      }
      return result;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Zakup nie powiódł się');
      return null;
    } finally {
      setIsPurchasing(false);
    }
  }

  async function restore(): Promise<void> {
    if (!user?.id) return;

    setError('');
    setIsPurchasing(true);
    try {
      if (rc.isNativeAvailable && rc.isConfigured) {
        const ok = await rc.restorePurchases();
        if (ok) {
          const expiresAt = rc.customerInfo?.expirationDate ?? undefined;
          await upgradeToPremium(expiresAt);
          if (user.coupleId) {
            try {
              await syncCouplePremiumSubscription({
                coupleId: user.coupleId,
                paidByUserId: user.id,
                expiresAt: expiresAt ?? null,
              });
            } catch (syncError) {
              console.warn('[usePurchases] couple premium sync failed', syncError);
            }
          }
        }
      } else {
        const restored = await restorePurchasesService(user.id);
        if (restored.length > 0) {
          const hasPremiumPurchase = await hasActivePremium(user.id);
          if (hasPremiumPurchase) {
            await upgradeToPremium();
            if (user.coupleId) {
              try {
                await syncCouplePremiumSubscription({
                  coupleId: user.coupleId,
                  paidByUserId: user.id,
                  expiresAt: null,
                });
              } catch (syncError) {
                console.warn('[usePurchases] couple premium sync failed', syncError);
              }
            }
          }
        }
      }
      await refresh();
    } catch {
      setError('Nie udało się przywrócić zakupów');
    } finally {
      setIsPurchasing(false);
    }
  }

  async function revokePremium(): Promise<void> {
    if (!user?.id) return;
    await clearActiveSubscriptions(user.id);
    await downgradeToFree();
    setIsPremium(false);
    const all = await getPurchases(user.id);
    setPurchases(all);
  }

  async function presentPaywall(): Promise<boolean> {
    setError('');
    setIsPurchasing(true);
    try {
      const ok = await rc.presentPaywall();
      if (ok) await refresh();
      return ok;
    } finally {
      setIsPurchasing(false);
    }
  }

  async function presentCustomerCenter(): Promise<boolean> {
    return rc.presentCustomerCenter();
  }

  return {
    isPremium,
    hasSolo,
    purchases,
    isLoading,
    isPurchasing,
    error: error || rc.error,
    isRevenueCatAvailable: isRevenueCatNativeAvailable(),
    purchase,
    restore,
    refresh,
    revokePremium,
    presentPaywall,
    presentCustomerCenter,
  };
}
