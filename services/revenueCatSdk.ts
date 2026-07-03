/**
 * RevenueCat SDK wrapper — safe on web / Expo Go (falls back when native module missing).
 */
import { Platform } from 'react-native';
import {
  ENTITLEMENT_ID,
  PRODUCT_TO_RC_PACKAGE,
  REVENUECAT_API_KEY,
  type RcPackageId,
} from '@/constants/revenueCatConfig';

export type RcCustomerInfo = {
  isMostPro: boolean;
  expirationDate: string | null;
  activeProductIdentifier: string | null;
  originalAppUserId: string | null;
};

export type RcPurchaseErrorCode =
  | 'USER_CANCELLED'
  | 'NOT_AVAILABLE'
  | 'STORE_ERROR'
  | 'UNKNOWN';

export class RcPurchaseError extends Error {
  code: RcPurchaseErrorCode;

  constructor(code: RcPurchaseErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'RcPurchaseError';
  }
}

type PurchasesModule = typeof import('react-native-purchases').default;
type PurchasesUiModule = typeof import('react-native-purchases-ui');

let purchasesModule: PurchasesModule | null | undefined;
let purchasesUiModule: PurchasesUiModule | null | undefined;
let configured = false;
let configurePromise: Promise<boolean> | null = null;

function loadPurchasesModule(): PurchasesModule | null {
  if (purchasesModule !== undefined) return purchasesModule;
  if (Platform.OS === 'web') {
    purchasesModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchasesModule = require('react-native-purchases').default as PurchasesModule;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

function loadPurchasesUiModule(): PurchasesUiModule | null {
  if (purchasesUiModule !== undefined) return purchasesUiModule;
  if (Platform.OS === 'web') {
    purchasesUiModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchasesUiModule = require('react-native-purchases-ui') as PurchasesUiModule;
  } catch {
    purchasesUiModule = null;
  }
  return purchasesUiModule;
}

export function isRevenueCatNativeAvailable(): boolean {
  return loadPurchasesModule() !== null;
}

type NativeCustomerInfo = import('react-native-purchases').CustomerInfo;

export function isRevenueCatEntitled(
  customerInfo: RcCustomerInfo | NativeCustomerInfo | null | undefined
): boolean {
  if (!customerInfo) return false;
  if ('isMostPro' in customerInfo) {
    return customerInfo.isMostPro === true;
  }
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

function parseCustomerInfo(customerInfo: NativeCustomerInfo): RcCustomerInfo {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const isMostPro = isRevenueCatEntitled(customerInfo);

  return {
    isMostPro,
    expirationDate: entitlement?.expirationDate ?? null,
    activeProductIdentifier: entitlement?.productIdentifier ?? null,
    originalAppUserId: customerInfo.originalAppUserId ?? null,
  };
}

export async function configureRevenueCat(appUserId?: string): Promise<boolean> {
  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    const Purchases = loadPurchasesModule();
    if (!Purchases) return false;

    try {
      const { LOG_LEVEL } = await import('react-native-purchases');
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.WARN);

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
          appUserID: appUserId,
        });
        configured = true;
        return true;
      }
    } catch (e) {
      console.warn('[RevenueCat] configure failed', e);
      configured = false;
    }

    return false;
  })();

  return configurePromise;
}

export async function loginRevenueCat(appUserId: string): Promise<boolean> {
  const ok = await configureRevenueCat(appUserId);
  const Purchases = loadPurchasesModule();
  if (!ok || !Purchases) return false;

  try {
    await Purchases.logIn(appUserId);
    return true;
  } catch (e) {
    console.warn('[RevenueCat] logIn failed', e);
    return false;
  }
}

export async function logoutRevenueCat(): Promise<void> {
  const Purchases = loadPurchasesModule();
  if (!Purchases || !configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // ignore
  }
}

export function addCustomerInfoListener(
  listener: (info: RcCustomerInfo) => void
): () => void {
  const Purchases = loadPurchasesModule();
  if (!Purchases || !configured) return () => {};

  const remove = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    listener(parseCustomerInfo(customerInfo));
  });

  return () => {
    remove.remove();
  };
}

export async function getRevenueCatCustomerInfo(): Promise<RcCustomerInfo | null> {
  const Purchases = loadPurchasesModule();
  if (!Purchases || !configured) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return parseCustomerInfo(customerInfo);
  } catch (e) {
    console.warn('[RevenueCat] getCustomerInfo failed', e);
    return null;
  }
}

export async function hasMostProEntitlement(): Promise<boolean> {
  const info = await getRevenueCatCustomerInfo();
  return isRevenueCatEntitled(info);
}

function mapPurchaseError(e: unknown): RcPurchaseError {
  const err = e as { userCancelled?: boolean; code?: string; message?: string };
  if (err?.userCancelled) {
    return new RcPurchaseError('USER_CANCELLED', 'Purchase cancelled');
  }
  if (String(err?.code).includes('PurchaseNotAllowedError')) {
    return new RcPurchaseError('NOT_AVAILABLE', 'Purchases not available on this device');
  }
  return new RcPurchaseError('STORE_ERROR', err?.message || 'Purchase failed');
}

export async function purchaseRcPackage(packageId: RcPackageId): Promise<RcCustomerInfo> {
  const Purchases = loadPurchasesModule();
  if (!Purchases || !configured) {
    throw new RcPurchaseError('NOT_AVAILABLE', 'RevenueCat native SDK not available');
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      throw new RcPurchaseError('STORE_ERROR', 'No offering configured in RevenueCat');
    }

    const pkg =
      current.availablePackages.find((p) => p.identifier === packageId) ||
      current.availablePackages.find(
        (p) => p.product.identifier.toLowerCase().includes(packageId)
      );

    if (!pkg) {
      throw new RcPurchaseError(
        'STORE_ERROR',
        `Package "${packageId}" not found in current offering`
      );
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return parseCustomerInfo(customerInfo);
  } catch (e) {
    if (e instanceof RcPurchaseError) throw e;
    throw mapPurchaseError(e);
  }
}

export async function purchaseByProductId(productId: string): Promise<RcCustomerInfo> {
  const packageId = PRODUCT_TO_RC_PACKAGE[productId];
  if (!packageId) {
    throw new RcPurchaseError('STORE_ERROR', `No RevenueCat package for ${productId}`);
  }
  return purchaseRcPackage(packageId);
}

export async function restoreRevenueCatPurchases(): Promise<RcCustomerInfo> {
  const Purchases = loadPurchasesModule();
  if (!Purchases || !configured) {
    throw new RcPurchaseError('NOT_AVAILABLE', 'RevenueCat native SDK not available');
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return parseCustomerInfo(customerInfo);
  } catch (e) {
    if (e instanceof RcPurchaseError) throw e;
    throw mapPurchaseError(e);
  }
}

export async function presentRevenueCatPaywall(): Promise<boolean> {
  const ui = loadPurchasesUiModule();
  if (!ui || !configured) return false;

  try {
    const paywallResult = await ui.default.presentPaywall();
    switch (paywallResult) {
      case ui.PAYWALL_RESULT.PURCHASED:
      case ui.PAYWALL_RESULT.RESTORED:
        return true;
      case ui.PAYWALL_RESULT.NOT_PRESENTED:
      case ui.PAYWALL_RESULT.ERROR:
      case ui.PAYWALL_RESULT.CANCELLED:
      default:
        return false;
    }
  } catch (e) {
    console.warn('[RevenueCat] presentPaywall failed', e);
    return false;
  }
}

export async function presentRevenueCatCustomerCenter(): Promise<boolean> {
  const ui = loadPurchasesUiModule();
  if (!ui || !configured) return false;

  try {
    if (typeof ui.default.presentCustomerCenter === 'function') {
      await ui.default.presentCustomerCenter();
      return true;
    }
  } catch (e) {
    console.warn('[RevenueCat] presentCustomerCenter failed', e);
  }
  return false;
}
