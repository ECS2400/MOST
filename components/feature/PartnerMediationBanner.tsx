import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { Colors, Spacing, Typography } from '@/constants/theme';
import {
  fetchActivePartnerInvite,
  subscribePartnerMediationInvites,
  partnerInviteRoute,
  type PartnerMediationInvite,
} from '@/services/mediationPartner';

type PartnerMediationBannerProps = {
  className?: never;
};

function bannerCopy(invite: PartnerMediationInvite): { title: string; sub: string; cta: string } {
  if (invite.status === 'live' && !invite.hasPartnerAnalysis) {
    return {
      title: 'Partner rozpoczął mediację',
      sub: 'Najpierw opisz swoją perspektywę, potem dołączysz do rozmowy na żywo.',
      cta: 'Opisz swoją stronę',
    };
  }

  if (invite.status === 'live') {
    return {
      title: 'Mediacja na żywo',
      sub: `${invite.hostName} czeka na Ciebie w czacie.`,
      cta: 'Dołącz do rozmowy',
    };
  }

  if (!invite.hasPartnerAnalysis) {
    return {
      title: `${invite.hostName} zaprasza Cię do mediacji`,
      sub: 'Opisz swoją perspektywę — AI pomoże Wam zrozumieć obie strony przed rozmową.',
      cta: 'Rozpocznij swoją analizę',
    };
  }

  return {
    title: 'Analiza gotowa — czekamy na start',
    sub: `${invite.hostName} rozpocznie wspólną rozmowę, gdy oboje będziecie gotowi.`,
    cta: 'Zobacz swoją analizę',
  };
}

export function PartnerMediationBanner(_props: PartnerMediationBannerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected } = useCouple();
  const [invite, setInvite] = useState<PartnerMediationInvite | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id || !isConnected) {
      setInvite(null);
      return;
    }

    setLoading(true);
    try {
      const active = await fetchActivePartnerInvite(user.id);
      setInvite(active);
    } catch {
      setInvite(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isConnected]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!user?.id || !isConnected) return;
    return subscribePartnerMediationInvites(user.id, refresh);
  }, [user?.id, isConnected, refresh]);

  if (!isConnected || loading || !invite) {
    return null;
  }

  const copy = bannerCopy(invite);

  return (
    <Pressable
      onPress={() => {
        const route = partnerInviteRoute(invite);
        router.push(route as never);
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      <View style={styles.iconWrap}>
        <MaterialIcons name="forum" size={22} color={Colors.primaryLight} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
        <Text style={styles.cta}>{copy.cta} →</Text>
      </View>
      {invite.status === 'live' ? (
        <View style={styles.liveDot} />
      ) : (
        <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
      )}
    </Pressable>
  );
}

export function PartnerMediationBannerLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="small" color={Colors.primaryLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary + '18',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    padding: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 4 },
  title: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  sub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cta: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    marginTop: 2,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  loader: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
});
