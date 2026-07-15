import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { joinMediationByCode } from '@/services/mediationPartner';

export default function MediationJoinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { mediationId, code } = useLocalSearchParams<{
    mediationId?: string;
    code?: string;
  }>();

  const [inviteCode, setInviteCode] = useState(code || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mediationId && user?.id) {
      router.replace({
        pathname: '/mediation/partner-perspective',
        params: { mediationId },
      });
    }
  }, [mediationId, user?.id]);

  useEffect(() => {
    if (code && user?.id && !mediationId) {
      handleJoin(code);
    }
  }, [code, user?.id]);

  async function handleJoin(forcedCode?: string) {
    const upper = (forcedCode || inviteCode).trim();
    if (!upper || !user) return;

    setLoading(true);
    setError('');
    try {
      const result = await joinMediationByCode(upper);

      if (result.status === 'live' && result.partnerJoined) {
        router.replace({
          pathname: '/mediation/session',
          params: { mediationId: result.mediationId },
        });
        return;
      }

      if (result.partnerJoined) {
        router.replace({
          pathname: '/mediation/analysis',
          params: { mediationId: result.mediationId, role: 'partner' },
        });
        return;
      }

      router.replace({
        pathname: '/mediation/partner-perspective',
        params: { mediationId: result.mediationId },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Nie udało się dołączyć.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
      </Pressable>

      <Text style={styles.title}>Dołącz do mediacji</Text>
      <Text style={styles.sub}>
        Wpisz 6-cyfrowy kod od partnera albo otwórz zaproszenie z ekranu głównego.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.primaryLight} style={{ marginVertical: Spacing.lg }} />
      ) : (
        <>
          <Input
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="np. 482910"
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Dołącz"
            onPress={() => handleJoin()}
            disabled={inviteCode.trim().length < 4}
            fullWidth
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
  },
  sub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  error: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
  },
});
