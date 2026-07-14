import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { fmt } from '@/utils/i18nFormat';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/services/supabase';
import {
  buildMediationShareLink,
  buildMediationSmsBodyShort,
  cancelMediation,
  ensureMediationInviteCode,
  sendInAppMediationInvite,
  shareViaSMS,
  startLiveMediation,
} from '@/services/mediationInvite';
import { linkPartnerToMediation } from '@/services/mediationPartner';
import { ensureFeatureAllowed } from '@/services/checkLimits';
import { FeatureLimitBlockedError, LIMIT_CHECK_ERROR, navigateToPaywall } from '@/utils/paywallReason';

interface InviteMethodProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  sub: string;
  onPress: () => void;
  disabled?: boolean;
}

function InviteMethod({ icon, label, sub, onPress, disabled }: InviteMethodProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.methodBtn,
        disabled && styles.methodBtnDisabled,
        { opacity: pressed && !disabled ? 0.88 : 1 },
      ]}
    >
      <View style={styles.methodIconWrap}>
        <MaterialIcons name={icon} size={20} color={Colors.primaryLight} />
      </View>
      <View style={styles.methodTextWrap}>
        <Text style={styles.methodLabel}>{label}</Text>
        <Text style={styles.methodSub}>{sub}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
    </Pressable>
  );
}

function WaitingDot() {
  return <View style={styles.pulseDot} />;
}

export default function MediationInviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { partner, couple, isConnected, refreshCouple } = useCouple();
  const { language } = useLanguage();
  const lm = getLiveMediationExtras(language);
  const { mediationId, role } = useLocalSearchParams<{
    mediationId?: string;
    role?: string;
  }>();
  const isPartnerView = role === 'partner';

  const [inviteCode, setInviteCode] = useState('');
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [starting, setStarting] = useState(false);

  const loadMediation = useCallback(async () => {
    if (!user || !mediationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (isPartnerView) {
        const { data } = await supabase
          .from('mediations')
          .select('partner_joined, status')
          .eq('id', mediationId)
          .eq('partner_id', user.id)
          .maybeSingle();

        if (data?.status === 'live') {
          router.replace({
            pathname: '/mediation/live',
            params: { mediationId },
          });
          return;
        }
        setPartnerJoined(true);
        setLoading(false);
        return;
      }

      const { code, savedRemotely } = await ensureMediationInviteCode(mediationId, user.id);
      setInviteCode(code);
      if (!savedRemotely) {
        setActionMsg(lm.invite.codeGeneratedLocal);
      }

      if (isConnected && partner?.id && partner.id !== user.id) {
        try {
          await linkPartnerToMediation(mediationId, user.id, partner.id, couple?.id);
        } catch {
          // Partner mógł być już powiązany — nie blokuj ekranu.
        }
      }

      const { data } = await supabase
        .from('mediations')
        .select('partner_joined, status')
        .eq('id', mediationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.partner_joined) {
        setPartnerJoined(true);
      }
    } catch (e: any) {
      setActionMsg(e.message || lm.invite.invitePrepError);
    } finally {
      setLoading(false);
    }
  }, [couple?.id, isConnected, isPartnerView, lm.invite.codeGeneratedLocal, lm.invite.invitePrepError, mediationId, partner?.id, router, user]);

  useEffect(() => {
    if (user?.id) {
      refreshCouple(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMediation();
  }, [loadMediation]);

  useEffect(() => {
    if (!mediationId) return;

    const channel = supabase
      .channel(`mediation-invite:${mediationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mediations',
          filter: `id=eq.${mediationId}`,
        },
        (payload) => {
          const row = payload.new as { partner_joined?: boolean; status?: string };
          if (row.partner_joined) {
            setPartnerJoined(true);
          }
          if (isPartnerView && row.status === 'live') {
            router.replace({
              pathname: '/mediation/live',
              params: { mediationId },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mediationId, isPartnerView, router]);

  const shareLink = inviteCode ? buildMediationShareLink(inviteCode) : '';
  const inviterName = user?.name || lm.invite.inviterFallback;
  const partnerName = partner?.name || lm.invite.partnerFallback;

  async function handleCopyLink() {
    if (!inviteCode) return;
    const link = shareLink || buildMediationShareLink(inviteCode);
    await Clipboard.setStringAsync(link);
    setActionMsg(lm.invite.linkCopied);
    setTimeout(() => setActionMsg(''), 2500);
  }

  async function handleCopySmsBody() {
    if (!inviteCode) return;
    const message = buildMediationSmsBodyShort(inviteCode, inviterName, language);
    await Clipboard.setStringAsync(message);
    setActionMsg(lm.invite.codeCopiedManual);
    setTimeout(() => setActionMsg(''), 3000);
  }

  async function handleSendSms() {
    if (!inviteCode) return;

    if (Platform.OS === 'web') {
      await handleCopySmsBody();
      return;
    }

    try {
      await shareViaSMS(inviteCode, inviterName, undefined, language);
    } catch (e: any) {
      setActionMsg(e.message || lm.invite.smsOpenError);
      setTimeout(() => setActionMsg(''), 3000);
    }
  }

  async function handleSendInApp() {
    if (!user || !isConnected || !partner || partner.id === user.id || !mediationId) {
      Alert.alert(lm.invite.noConnectionTitle, lm.invite.noConnectionBody, [{ text: 'OK' }]);
      return;
    }

    try {
      await sendInAppMediationInvite(mediationId, user.id, partner.id, couple?.id);
      setActionMsg(fmt(lm.invite.inviteSent, { name: partner.name }));
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg(lm.invite.notifyError);
    }
  }

  async function handleStartMediation() {
    if (!user || !mediationId) return;
    setStarting(true);
    setActionMsg('');
    try {
      if (!couple?.id) {
        setActionMsg(lm.invite.noConnectionBody);
        return;
      }

      await ensureFeatureAllowed('create_live_mediation', {
        userId: user.id,
        coupleId: couple.id,
      });

      await startLiveMediation(mediationId, user.id);
      router.replace({
        pathname: '/mediation/live',
        params: { mediationId },
      });
    } catch (e: unknown) {
      if (e instanceof FeatureLimitBlockedError) {
        navigateToPaywall(router, e.paywallReason);
        return;
      }
      setActionMsg(e instanceof Error ? e.message : LIMIT_CHECK_ERROR);
    } finally {
      setStarting(false);
    }
  }

  async function handleCancel() {
    if (!user || !mediationId) return;

    Alert.alert(lm.invite.cancelTitle, lm.invite.cancelBody, [
      { text: lm.invite.cancelNo, style: 'cancel' },
      {
        text: lm.invite.cancelYes,
        style: 'destructive',
          onPress: async () => {
            try {
              await cancelMediation(mediationId, user.id);
            } catch {
              // Still leave the screen even if remote cancel fails.
            }
            router.replace('/(tabs)');
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{lm.invite.title}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <LinearGradient
            colors={
              isPartnerView
                ? [Colors.primary + '18', Colors.gradientMid + '10']
                : partnerJoined
                  ? [Colors.gold + '22', Colors.accent + '14']
                  : [Colors.primary + '18', Colors.gradientMid + '10']
            }
            style={styles.statusCard}
          >
            {isPartnerView ? (
              <>
                <View style={styles.waitingRow}>
                  <WaitingDot />
                  <Text style={styles.statusTitle}>{lm.invite.partnerWaitingTitle}</Text>
                </View>
                <Text style={styles.statusSub}>{lm.invite.partnerWaitingSub}</Text>
              </>
            ) : partnerJoined ? (
              <>
                <Text style={styles.statusEmoji}>🎉</Text>
                <Text style={styles.statusTitleJoined}>{lm.invite.partnerJoinedTitle}</Text>
                <Text style={styles.statusSubJoined}>{lm.invite.partnerJoinedSub}</Text>
              </>
            ) : (
              <>
                <View style={styles.waitingRow}>
                  <WaitingDot />
                  <Text style={styles.statusTitle}>{lm.invite.waitingTitle}</Text>
                </View>
                <Text style={styles.statusSub}>{lm.invite.waitingSub}</Text>
              </>
            )}
            {!isPartnerView ? (
              <Button
                title={lm.invite.startBtn}
                onPress={handleStartMediation}
                loading={starting}
                fullWidth
                size="lg"
                style={{ marginTop: Spacing.sm }}
              />
            ) : null}
          </LinearGradient>
        </View>

        {actionMsg ? (
          <View style={styles.toast}>
            <MaterialIcons name="info-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.toastText}>{actionMsg}</Text>
          </View>
        ) : null}

        {!isPartnerView && !partnerJoined ? (
          <>
            <Text style={styles.sectionLabel}>{lm.invite.howInvite}</Text>

            {!isConnected || !partner ? (
              <View style={styles.partnerBanner}>
                <MaterialIcons name="warning-amber" size={24} color={Colors.warning} />
                <View style={styles.partnerBannerContent}>
                  <Text style={styles.partnerBannerTitle}>{lm.invite.partnerRequiredTitle}</Text>
                  <Text style={styles.partnerBannerSub}>{lm.invite.partnerRequiredSub}</Text>
                  <Pressable
                    onPress={() => router.push('/couple/connect')}
                    style={({ pressed }) => [
                      styles.partnerBannerBtn,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <MaterialIcons name="favorite" size={16} color={Colors.warning} />
                    <Text style={styles.partnerBannerBtnText}>{lm.invite.connectPartner}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Card variant="bordered" style={styles.methodsCard}>
              <InviteMethod
                icon="notifications-active"
                label={lm.invite.sendInApp}
                sub={fmt(lm.invite.sendInAppSub, { name: partnerName })}
                onPress={handleSendInApp}
                disabled={loading || !inviteCode}
              />
              <View style={styles.methodDivider} />
              <InviteMethod
                icon="link"
                label={lm.invite.copyLink}
                sub={lm.invite.copyLinkSub}
                onPress={handleCopyLink}
                disabled={!inviteCode || loading}
              />
              <View style={styles.methodDivider} />
              <InviteMethod
                icon="pin"
                label={lm.invite.showCode}
                sub={lm.invite.showCodeSub}
                onPress={() => setShowCode((v) => !v)}
                disabled={!inviteCode || loading}
              />
              <View style={styles.methodDivider} />
              {Platform.OS === 'web' ? (
                <View style={styles.webSmsBanner}>
                  <View style={styles.webSmsHeader}>
                    <MaterialIcons name="sms" size={22} color={Colors.warning} />
                    <Text style={styles.webSmsTitle}>{lm.invite.webSmsTitle}</Text>
                  </View>
                  <Text style={styles.webSmsSub}>{lm.invite.webSmsSub}</Text>
                  <Pressable
                    onPress={handleCopySmsBody}
                    disabled={!inviteCode || loading}
                    style={({ pressed }) => [
                      styles.webSmsBtn,
                      (!inviteCode || loading) && styles.webSmsBtnDisabled,
                      { opacity: pressed && inviteCode && !loading ? 0.88 : 1 },
                    ]}
                  >
                    <MaterialIcons name="content-copy" size={16} color={Colors.warning} />
                    <Text style={styles.webSmsBtnText}>{lm.invite.webSmsBtn}</Text>
                  </Pressable>
                </View>
              ) : (
                <InviteMethod
                  icon="sms"
                  label={lm.invite.sendSms}
                  sub={lm.invite.sendSmsSub}
                  onPress={handleSendSms}
                  disabled={!inviteCode || loading}
                />
              )}
            </Card>

            {showCode && inviteCode ? (
              <LinearGradient
                colors={[Colors.surfaceElevated, Colors.surface]}
                style={styles.codeCard}
              >
                <Text style={styles.codeLabel}>{lm.invite.codeLabel}</Text>
                <Text style={styles.codeValue}>{inviteCode}</Text>
                <Pressable
                  onPress={async () => {
                    await Clipboard.setStringAsync(inviteCode);
                    setActionMsg(lm.invite.linkCopied);
                    setTimeout(() => setActionMsg(''), 2000);
                  }}
                  style={styles.copyCodeBtn}
                >
                  <MaterialIcons name="content-copy" size={16} color={Colors.primaryLight} />
                  <Text style={styles.copyCodeText}>{lm.invite.copyCode}</Text>
                </Pressable>
              </LinearGradient>
            ) : null}
          </>
        ) : null}

        <Card variant="elevated" style={styles.previewCard}>
          <Text style={styles.previewTitle}>{lm.invite.whatAwaits}</Text>
          {[lm.invite.featureChat, lm.invite.featureHints, lm.invite.featureSummary].map((item) => (
            <View key={item} style={styles.previewRow}>
              <MaterialIcons name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.previewItem}>{item}</Text>
            </View>
          ))}
        </Card>

        {!isPartnerView ? (
          <Pressable onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{lm.invite.cancelYes}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  statusCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryLight,
  },
  statusTitle: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  statusSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingLeft: 18,
  },
  testModeNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  statusEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  statusTitleJoined: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.gold,
    textAlign: 'center',
  },
  statusSubJoined: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  toastText: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.warningLight + '66',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.warning + '55',
  },
  partnerBannerContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  partnerBannerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: Colors.warning,
    lineHeight: 22,
  },
  partnerBannerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  partnerBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: Spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.warning + '22',
    borderWidth: 1,
    borderColor: Colors.warning + '44',
  },
  partnerBannerBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.warning,
  },
  methodsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  methodBtnDisabled: {
    opacity: 0.45,
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTextWrap: {
    flex: 1,
    gap: 2,
  },
  methodLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  methodSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  methodDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  webSmsBanner: {
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight + '44',
  },
  webSmsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  webSmsTitle: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.warning,
  },
  webSmsSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingLeft: 30,
  },
  webSmsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.warning + '55',
    backgroundColor: Colors.surface,
  },
  webSmsBtnDisabled: {
    opacity: 0.45,
  },
  webSmsBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.warning,
  },
  codeCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  codeLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 40,
    color: Colors.primaryLight,
    letterSpacing: 8,
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
  },
  copyCodeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  previewCard: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  previewTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  previewItem: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  cancelText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
