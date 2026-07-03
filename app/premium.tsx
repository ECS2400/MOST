import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { usePurchases } from '@/hooks/usePurchases';
import { useLanguage } from '@/hooks/useLanguage';
import { getProducts, type ProductId } from '@/services/revenueCat';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { openSupportEmail } from '@/services/supportEmail';
import { getPublicPrivacyPolicyUrl, type LegalLanguage } from '@/constants/legal';
import { fmt } from '@/utils/i18nFormat';
import {
  getYearlyAnnualCompare,
  getYearlyMonthlyEquiv,
} from '@/constants/pricing';
import {
  getPaywallReasonMessage,
  type PaywallReason,
} from '@/utils/paywallReason';

const SURFACE = Colors.surfaceCard;
const SURFACE_SELECTED = Colors.primary + '22';

type BillingPlan = 'most_yearly' | 'most_monthly' | 'most_lifetime';
type ProductTab = 'premium' | 'solo';

function formatLocaleDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const LOCALE_MAP: Record<string, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return <Text style={styles.cellText}>{value}</Text>;
  }
  if (value) {
    return <MaterialIcons name="check" size={18} color={Colors.primaryLight} />;
  }
  return <Text style={styles.cellDash}>—</Text>;
}

function PlanCard({
  label,
  price,
  subPrice,
  perks,
  badge,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  subPrice: string;
  perks?: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.planCard, selected && styles.planCardSelected]}
    >
      {selected ? (
        <View style={styles.planCheck}>
          <MaterialIcons name="check" size={14} color={Colors.textOnPrimary} />
        </View>
      ) : null}
      <View style={styles.planCardHeader}>
        <Text style={styles.planCardLabel}>{label}</Text>
        {badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.planCardPrice}>{price}</Text>
      <Text style={styles.planCardSub}>{subPrice}</Text>
      {perks ? <Text style={styles.planCardPerks}>{perks}</Text> : null}
    </Pressable>
  );
}

export default function Premium() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: PaywallReason }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isPremium: isUserPremium, loading: premiumStatusLoading } = usePremiumStatus();
  const { isPurchasing, error, purchase, restore, revokePremium, purchases, presentPaywall, presentCustomerCenter, isRevenueCatAvailable } =
    usePurchases();
  const { t, language } = useLanguage();

  const [billingPlan, setBillingPlan] = useState<BillingPlan>('most_yearly');
  const [productTab, setProductTab] = useState<ProductTab>('premium');
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [downgradeError, setDowngradeError] = useState('');

  const pt = t.premium;
  const limitBannerMessage =
    reason && typeof reason === 'string'
      ? getPaywallReasonMessage(reason as PaywallReason)
      : null;
  const locale = LOCALE_MAP[language] ?? 'en-US';
  const products = useMemo(() => getProducts(language), [language]);
  const yearlyProduct = products.find((p) => p.id === 'most_yearly')!;
  const monthlyProduct = products.find((p) => p.id === 'most_monthly')!;
  const lifetimeProduct = products.find((p) => p.id === 'most_lifetime')!;
  const soloProduct = products.find((p) => p.id === 'most_solo_analysis')!;

  const comparisonRows = useMemo(
    () => [
      { label: pt.compareMediations, free: '3', premium: true },
      { label: pt.compareHistory, free: false, premium: true },
      { label: pt.compareStats, free: false, premium: true },
      { label: pt.compareAiUnlimited, free: false, premium: true },
      { label: pt.compareAdvancedAi, free: false, premium: true },
      { label: pt.compareSoloIncluded, free: false, premium: true },
      { label: pt.comparePdf, free: false, premium: true },
      { label: pt.compareOcr, free: false, premium: true },
    ],
    [pt],
  );

  const highlights = useMemo(
    () => [
      { icon: 'forum' as const, label: pt.highlightMediations },
      { icon: 'psychology' as const, label: pt.highlightAi },
      { icon: 'bar-chart' as const, label: pt.highlightStats },
      { icon: 'picture-as-pdf' as const, label: pt.highlightPdf },
      { icon: 'document-scanner' as const, label: pt.highlightOcr },
    ],
    [pt],
  );

  const activeSubscription = useMemo(() => {
    const now = new Date();
    return purchases.find(
      (p) =>
        p.productId !== 'most_solo_analysis' &&
        p.expiresAt &&
        new Date(p.expiresAt) > now,
    );
  }, [purchases]);

  const expiryDate = activeSubscription?.expiresAt || user?.planExpiresAt;
  const showActivePremium = !premiumStatusLoading && isUserPremium;

  async function handleSubscribe() {
    const productId: ProductId =
      productTab === 'solo' ? 'most_solo_analysis' : billingPlan;
    const result = await purchase(productId);
    if (result?.success) {
      setPurchaseSuccess(true);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    await restore();
    setRestoring(false);
  }

  async function handlePresentPaywall() {
    const ok = await presentPaywall();
    if (ok) setPurchaseSuccess(true);
  }

  async function handleCustomerCenter() {
    await presentCustomerCenter();
  }

  async function runDowngrade() {
    setShowDowngradeConfirm(false);
    setDowngrading(true);
    try {
      await revokePremium();
      setPurchaseSuccess(false);
      setDowngradeError('');
    } catch {
      setDowngradeError(pt.downgradeError);
    } finally {
      setDowngrading(false);
    }
  }

  if (purchaseSuccess) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.successWrap}>
          <MaterialIcons name="check-circle" size={56} color={Colors.primaryLight} />
          <Text style={styles.successTitle}>{pt.activeTitle}</Text>
          <Text style={styles.successSub}>{pt.activeSub}</Text>
          <Pressable style={styles.ctaBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.ctaBtnText}>{pt.backBtn}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const ctaLabel =
    productTab === 'solo'
      ? fmt(pt.ctaSolo, { price: soloProduct.price })
      : showActivePremium
        ? pt.ctaHasPremium
        : isPurchasing
          ? pt.ctaProcessing
          : pt.ctaGetPremium;

  return (
    <View style={styles.flex}>
      <Modal
        visible={showDowngradeConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDowngradeConfirm(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDowngradeConfirm(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{pt.modalDowngradeTitle}</Text>
            <Text style={styles.modalBody}>{pt.modalDowngradeBody}</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowDowngradeConfirm(false)}
              >
                <Text style={styles.modalBtnCancelText}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={runDowngrade}
                disabled={downgrading}
              >
                {downgrading ? (
                  <ActivityIndicator color={Colors.textOnPrimary} size="small" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>{t.common.confirm}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.sm, paddingBottom: Spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Pressable onPress={handleRestore} hitSlop={12} disabled={restoring}>
            {restoring ? (
              <ActivityIndicator size="small" color={Colors.textMuted} />
            ) : (
              <Text style={styles.restoreLink}>{pt.restore}</Text>
            )}
          </Pressable>
        </View>

        {showActivePremium ? (
          <View style={styles.activeBanner}>
            <View style={styles.activeBannerRow}>
              <MaterialIcons name="verified" size={22} color={Colors.primaryLight} />
              <View style={styles.activeBannerText}>
                <Text style={styles.activeBannerTitle}>{pt.activePlanTitle}</Text>
                <Text style={styles.activeBannerSub}>
                  {expiryDate
                    ? fmt(pt.activeUntil, {
                        date: formatLocaleDate(expiryDate, locale),
                      })
                    : pt.activeFullAccess}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.activeBannerBtn}
              onPress={handleCustomerCenter}
            >
              <Text style={styles.activeBannerBtnText}>{pt.customerCenterBtn}</Text>
            </Pressable>
            <Pressable
              style={styles.activeBannerBtn}
              onPress={() => setShowDowngradeConfirm(true)}
              disabled={downgrading}
            >
              <Text style={styles.activeBannerBtnText}>{pt.downgradeToFree}</Text>
            </Pressable>
            {downgradeError ? (
              <Text style={styles.activeBannerError}>{downgradeError}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Headline */}
        {limitBannerMessage ? (
          <View style={styles.limitBanner}>
            <MaterialIcons name="lock" size={18} color={Colors.primaryLight} />
            <Text style={styles.limitBannerText}>{limitBannerMessage}</Text>
          </View>
        ) : null}
        <Text style={styles.heroTitle}>{pt.unlockPower}</Text>
        <Text style={styles.heroSub}>{pt.unlockSub}</Text>
        <Text style={styles.coupleCoversBoth}>{pt.coupleCoversBoth}</Text>

        {isRevenueCatAvailable ? (
          <Pressable
            style={styles.paywallBtn}
            onPress={handlePresentPaywall}
            disabled={isPurchasing}
          >
            <MaterialIcons name="storefront" size={18} color={Colors.primaryLight} />
            <Text style={styles.paywallBtnText}>{pt.paywallBtn}</Text>
          </Pressable>
        ) : null}

        {/* Highlight chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {highlights.map((h) => (
            <View key={h.label} style={styles.chip}>
              <MaterialIcons name={h.icon} size={14} color={Colors.textMuted} />
              <Text style={styles.chipText}>{h.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Product tab */}
        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentBtn, productTab === 'premium' && styles.segmentBtnActive]}
            onPress={() => setProductTab('premium')}
          >
            <Text
              style={[
                styles.segmentText,
                productTab === 'premium' && styles.segmentTextActive,
              ]}
            >
              {pt.tabPremium}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, productTab === 'solo' && styles.segmentBtnActive]}
            onPress={() => setProductTab('solo')}
          >
            <Text
              style={[styles.segmentText, productTab === 'solo' && styles.segmentTextActive]}
            >
              {pt.tabSolo}
            </Text>
          </Pressable>
        </View>

        {productTab === 'premium' ? (
          <>
            {/* Comparison table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.tableFeatureCol]}>{pt.compareFeatures}</Text>
                <Text style={styles.tableHeaderCell}>{pt.compareFreeColumn}</Text>
                <Text style={[styles.tableHeaderCell, styles.tablePremiumCol]}>{pt.premium}</Text>
              </View>
              {comparisonRows.map((row) => (
                <View key={row.label} style={styles.tableRow}>
                  <Text style={[styles.tableFeature, styles.tableFeatureCol]}>{row.label}</Text>
                  <View style={styles.tableCell}>
                    <CellValue value={row.free} />
                  </View>
                  <View style={[styles.tableCell, styles.tablePremiumCol]}>
                    <CellValue value={row.premium} />
                  </View>
                </View>
              ))}
            </View>

            {/* Billing cards */}
            <View style={styles.planRow}>
              <PlanCard
                label={pt.planYearly}
                price={`${yearlyProduct.price}${pt.periodYear}`}
                subPrice={fmt(pt.perMonthEquiv, { price: getYearlyMonthlyEquiv(language) })}
                perks={pt.subscriptionPerks}
                badge="-33%"
                selected={billingPlan === 'most_yearly'}
                onPress={() => setBillingPlan('most_yearly')}
              />
              <PlanCard
                label={pt.planMonthly}
                price={`${monthlyProduct.price}${pt.periodMonth}`}
                subPrice={getYearlyAnnualCompare(language)}
                perks={pt.subscriptionPerks}
                selected={billingPlan === 'most_monthly'}
                onPress={() => setBillingPlan('most_monthly')}
              />
            </View>

            <Pressable
              style={[
                styles.weeklyOption,
                billingPlan === 'most_lifetime' && styles.weeklyOptionSelected,
              ]}
              onPress={() => setBillingPlan('most_lifetime')}
            >
              <Text style={styles.weeklyOptionLabel}>{pt.planLifetime}</Text>
              <Text style={styles.weeklyOptionPrice}>
                {lifetimeProduct.price}{pt.periodLifetime}
              </Text>
              {billingPlan === 'most_lifetime' ? (
                <MaterialIcons name="check-circle" size={18} color={Colors.primaryLight} />
              ) : null}
            </Pressable>
          </>
        ) : (
          <View style={styles.soloBox}>
            <MaterialIcons name="psychology" size={32} color={Colors.primaryLight} />
            <Text style={styles.soloBoxTitle}>{pt.soloTitle}</Text>
            <Text style={styles.soloBoxSub}>{pt.soloDesc}</Text>
            <View style={styles.soloPriceRow}>
              <Text style={styles.soloPrice}>{soloProduct.price}</Text>
              <Text style={styles.soloPriceNote}>{pt.soloOnce}</Text>
            </View>
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={14} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.legalText}>{pt.legalAutoRenew}</Text>
        <View style={styles.legalLinks}>
          <Pressable
            onPress={() => {
              const lang = (
                ['pl', 'en', 'it', 'es', 'de', 'fr'].includes(language) ? language : 'pl'
              ) as LegalLanguage;
              Linking.openURL(getPublicPrivacyPolicyUrl(lang));
            }}
          >
            <Text style={styles.legalLink}>{pt.privacyPolicyLink}</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => router.push('/legal/subscriptions')}>
            <Text style={styles.legalLink}>{pt.subscriptionTermsLink}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          style={[
            styles.ctaBtn,
            (isPurchasing || (showActivePremium && productTab === 'premium')) && styles.ctaBtnDisabled,
          ]}
          onPress={handleSubscribe}
          disabled={isPurchasing || (showActivePremium && productTab === 'premium')}
        >
          {isPurchasing ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
          )}
        </Pressable>
        <View style={styles.paymentRow}>
          <MaterialIcons name="lock" size={11} color={Colors.textMuted} />
          <Text style={styles.paymentText}>{pt.paymentMethods}</Text>
        </View>
        <Pressable
          onPress={() => openSupportEmail()}
          style={({ pressed }) => [styles.reportLink, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name="mail-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.reportLinkText}>{pt.reportProblem}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreLink: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  heroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: Spacing.sm,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  limitBannerText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  heroSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  coupleCoversBoth: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  paywallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  paywallBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SURFACE,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.textOnPrimary,
  },
  table: {
    backgroundColor: SURFACE,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  tableFeatureCol: { flex: 2, textAlign: 'left' },
  tablePremiumCol: { flex: 1 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tableFeature: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  tableCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cellDash: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 16,
    color: Colors.textMuted,
  },
  planRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  planCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: SURFACE_SELECTED,
  },
  planCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  planCardLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  planBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.textOnPrimary,
  },
  planCardPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  planCardSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  planCardPerks: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.primaryLight,
    lineHeight: 15,
    marginTop: 6,
  },
  weeklyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.md,
  },
  weeklyOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: SURFACE_SELECTED,
  },
  weeklyOptionLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  weeklyOptionPrice: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    flex: 1,
    marginLeft: Spacing.md,
  },
  soloBox: {
    backgroundColor: SURFACE,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  soloBoxTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  soloBoxSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  soloPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: Spacing.sm,
  },
  soloPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.primaryLight,
  },
  soloPriceNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error + '15',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
    flex: 1,
  },
  legalText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  legalLink: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.primaryLight,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: Colors.textOnPrimary,
  },
  ctaBtnTextOutline: {
    color: Colors.textSecondary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  paymentText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  reportLinkText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  successTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  successSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  activeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  activeBanner: {
    backgroundColor: SURFACE_SELECTED,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '66',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  activeBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  activeBannerText: {
    flex: 1,
    gap: 4,
  },
  activeBannerTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  activeBannerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  activeBannerBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  activeBannerBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    textDecorationLine: 'underline',
  },
  activeBannerError: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.error,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: SURFACE,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  modalBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalBtnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.primary,
  },
  modalBtnCancelText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  modalBtnConfirmText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.sm,
    color: Colors.textOnPrimary,
  },
  backLink: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  backLinkText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
