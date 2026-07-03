/** RevenueCat dashboard configuration for MOST app. */
export const REVENUECAT_API_KEY = 'test_PrmENAIrqmjrqdKFMELoCLULntT';

/** Entitlement identifier configured in RevenueCat → Entitlements. */
export const ENTITLEMENT_ID = 'MOST Pro';

/** @deprecated Use ENTITLEMENT_ID */
export const MOST_PRO_ENTITLEMENT = ENTITLEMENT_ID;

/** App store product identifiers — must match RevenueCat Dashboard products. */
export const PRODUCT_IDS = {
  monthly: 'most_monthly',
  yearly: 'most_yearly',
  lifetime: 'most_lifetime',
  soloAnalysis: 'most_solo_analysis',
} as const;

export type CoreProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

/** Legacy weekly SKU (not in current offering). */
export type ProductId = CoreProductId | 'most_weekly';

export const SUBSCRIPTION_PRODUCT_IDS = [
  PRODUCT_IDS.monthly,
  PRODUCT_IDS.yearly,
  PRODUCT_IDS.lifetime,
] as const;

/**
 * Package identifiers in RevenueCat Offering (current offering).
 * Must match RevenueCat Dashboard → Products / Packages.
 */
export const RC_PACKAGES = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;

export type RcPackageId = (typeof RC_PACKAGES)[keyof typeof RC_PACKAGES];

/** Maps app product ID to RevenueCat package identifier. */
export const PRODUCT_TO_RC_PACKAGE: Record<string, RcPackageId> = {
  [PRODUCT_IDS.monthly]: RC_PACKAGES.monthly,
  [PRODUCT_IDS.yearly]: RC_PACKAGES.yearly,
  [PRODUCT_IDS.lifetime]: RC_PACKAGES.lifetime,
};
