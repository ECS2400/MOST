// Most App — RevenueCat / Purchases Service
// Native: RevenueCat SDK (react-native-purchases)
// Fallback: local mock when SDK unavailable (web / Expo Go) — __DEV__ only for premium

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '@/constants/i18n';
import {
  getPrice,
  getYearlySavings,
} from '@/constants/pricing';
import {
  PRODUCT_IDS,
  SUBSCRIPTION_PRODUCT_IDS,
  type ProductId,
} from '@/constants/revenueCatConfig';
import {
  hasMostProEntitlement,
  isRevenueCatNativeAvailable,
  purchaseByProductId,
  restoreRevenueCatPurchases,
  type RcCustomerInfo,
  RcPurchaseError,
} from '@/services/revenueCatSdk';

export type { ProductId } from '@/constants/revenueCatConfig';

export interface PurchaseProduct {
  id: ProductId;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  period?: 'week' | 'month' | 'year';
  isOneTime?: boolean;
  isBestValue?: boolean;
  savings?: string;
  rcPackageId?: string;
}

export interface PurchaseResult {
  success: boolean;
  productId: ProductId;
  transactionId?: string;
  customerInfo?: RcCustomerInfo | null;
}

const BASE_PRODUCTS: Omit<PurchaseProduct, 'price' | 'priceAmount' | 'savings'>[] = [
  {
    id: PRODUCT_IDS.monthly,
    title: 'Miesięcznie',
    description: 'MOST Pro — pełny dostęp co miesiąc',
    period: 'month',
    rcPackageId: 'monthly',
  },
  {
    id: PRODUCT_IDS.yearly,
    title: 'Rocznie',
    description: 'MOST Pro — najlepsza wartość na rok',
    period: 'year',
    isBestValue: true,
    rcPackageId: 'yearly',
  },
  {
    id: PRODUCT_IDS.lifetime,
    title: 'Dożywotnio',
    description: 'MOST Pro — jednorazowo, na zawsze',
    isOneTime: true,
    rcPackageId: 'lifetime',
  },
  {
    id: 'most_weekly',
    title: 'Tygodniowo',
    description: 'Pełny dostęp przez 7 dni (legacy)',
    period: 'week',
  },
  {
    id: PRODUCT_IDS.soloAnalysis,
    title: 'Analiza Solo',
    description: 'Jednorazowa analiza konfliktu bez partnera',
    isOneTime: true,
  },
];

export function getProducts(language: Language = 'pl'): PurchaseProduct[] {
  return BASE_PRODUCTS.map((p) => {
    const priced = getPrice(p.id, language);
    return {
      ...p,
      price: priced.formatted,
      priceAmount: priced.amount,
      savings: p.id === PRODUCT_IDS.yearly ? getYearlySavings(language) : undefined,
    };
  });
}

export const PRODUCTS: PurchaseProduct[] = getProducts('pl');

const PURCHASE_KEY_PREFIX = 'most_purchases:';

export interface StoredPurchase {
  productId: ProductId;
  purchasedAt: string;
  expiresAt?: string;
  transactionId: string;
}

function isMockPurchasesEnabled(): boolean {
  return __DEV__ === true && process.env.EXPO_PUBLIC_ENABLE_MOCK_PURCHASES === 'true';
}

export function getPurchaseKey(userId?: string): string | null {
  if (!userId) return null;
  return `${PURCHASE_KEY_PREFIX}${userId}`;
}

export async function getPurchases(userId?: string): Promise<StoredPurchase[]> {
  const key = getPurchaseKey(userId);
  if (!key) return [];
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function setPurchases(userId: string, purchases: StoredPurchase[]): Promise<void> {
  const key = getPurchaseKey(userId);
  if (!key) return;
  await AsyncStorage.setItem(key, JSON.stringify(purchases));
}

export async function clearMockPurchases(userId?: string): Promise<void> {
  const key = getPurchaseKey(userId);
  if (!key) return;
  await AsyncStorage.removeItem(key);
}

function isSubscriptionProduct(productId: ProductId): boolean {
  return (SUBSCRIPTION_PRODUCT_IDS as readonly string[]).includes(productId);
}

function isPremiumGrantingProduct(productId: ProductId): boolean {
  return isSubscriptionProduct(productId) || productId === 'most_weekly';
}

function generateTransactionId(): string {
  return 'TXN_' + Math.random().toString(36).toUpperCase().substring(2) + '_' + Date.now();
}

function getExpiryDate(period: 'week' | 'month' | 'year'): string {
  const now = new Date();
  if (period === 'week') now.setDate(now.getDate() + 7);
  if (period === 'month') now.setMonth(now.getMonth() + 1);
  if (period === 'year') now.setFullYear(now.getFullYear() + 1);
  return now.toISOString();
}

async function savePurchase(userId: string, purchase: StoredPurchase): Promise<void> {
  const purchases = await getPurchases(userId);
  const existing = purchases.findIndex((p) => p.productId === purchase.productId);
  if (existing >= 0) {
    purchases[existing] = purchase;
  } else {
    purchases.push(purchase);
  }
  await setPurchases(userId, purchases);
}

/** Dev-only mock premium from AsyncStorage — never grants premium in production. */
export async function hasMockActivePremium(userId?: string): Promise<boolean> {
  if (!isMockPurchasesEnabled()) return false;
  if (!userId) return false;

  const purchases = await getPurchases(userId);
  const now = new Date();
  return purchases.some((p) => {
    if (!isPremiumGrantingProduct(p.productId)) return false;
    if (p.productId === PRODUCT_IDS.lifetime) return true;
    if (!p.expiresAt) return false;
    return new Date(p.expiresAt) > now;
  });
}

export async function hasActivePremium(userId?: string): Promise<boolean> {
  if (isRevenueCatNativeAvailable()) {
    try {
      return await hasMostProEntitlement();
    } catch {
      // fall through to dev mock
    }
  }

  return hasMockActivePremium(userId);
}

export async function hasSoloAnalysis(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const purchases = await getPurchases(userId);
  return purchases.some((p) => p.productId === PRODUCT_IDS.soloAnalysis);
}

async function mockPurchaseProduct(userId: string, productId: ProductId): Promise<PurchaseResult> {
  if (!isMockPurchasesEnabled()) {
    throw new RcPurchaseError('NOT_AVAILABLE', 'Mock purchases are disabled');
  }

  await new Promise((r) => setTimeout(r, 1200));

  const product = getProducts('pl').find((p) => p.id === productId);
  if (!product) throw new Error('Produkt nie istnieje');

  const transactionId = generateTransactionId();
  const purchase: StoredPurchase = {
    productId,
    purchasedAt: new Date().toISOString(),
    transactionId,
    expiresAt:
      product.id === PRODUCT_IDS.lifetime
        ? undefined
        : product.period
          ? getExpiryDate(product.period)
          : undefined,
  };

  await savePurchase(userId, purchase);

  return { success: true, productId, transactionId };
}

export async function purchaseProduct(
  productId: ProductId,
  userId?: string
): Promise<PurchaseResult> {
  if (isSubscriptionProduct(productId) && isRevenueCatNativeAvailable()) {
    try {
      const customerInfo = await purchaseByProductId(productId);
      return {
        success: customerInfo.isMostPro,
        productId,
        customerInfo,
        transactionId: customerInfo.activeProductIdentifier ?? undefined,
      };
    } catch (e) {
      if (e instanceof RcPurchaseError && e.code === 'USER_CANCELLED') {
        return { success: false, productId };
      }
      throw e;
    }
  }

  if (productId === PRODUCT_IDS.soloAnalysis && isRevenueCatNativeAvailable()) {
    // Solo IAP is handled via mock/dev path until a dedicated RC product is wired.
    if (!isMockPurchasesEnabled()) {
      throw new RcPurchaseError('NOT_AVAILABLE', 'Solo analysis purchase requires native billing');
    }
  }

  if (isMockPurchasesEnabled()) {
    if (!userId) {
      throw new RcPurchaseError('NOT_AVAILABLE', 'Mock purchases require a logged-in user');
    }
    return mockPurchaseProduct(userId, productId);
  }

  throw new RcPurchaseError('NOT_AVAILABLE', 'Purchases not available on this device');
}

export async function restorePurchases(userId?: string): Promise<StoredPurchase[]> {
  if (isRevenueCatNativeAvailable()) {
    try {
      await restoreRevenueCatPurchases();
    } catch {
      // continue to return local list
    }
  } else if (isMockPurchasesEnabled()) {
    await new Promise((r) => setTimeout(r, 800));
  }
  return getPurchases(userId);
}

export async function clearActiveSubscriptions(userId?: string): Promise<void> {
  if (!userId) return;
  const purchases = await getPurchases(userId);
  const kept = purchases.filter((p) => p.productId === PRODUCT_IDS.soloAnalysis);
  await setPurchases(userId, kept);
}

export function getProductById(id: ProductId, language: Language = 'pl'): PurchaseProduct | undefined {
  return getProducts(language).find((p) => p.id === id);
}

export { isRevenueCatNativeAvailable };
