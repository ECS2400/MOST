import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

type CoupleConnectScreenProps = {
  showBack?: boolean;
};

export default function CoupleConnectScreen({ showBack = false }: CoupleConnectScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    inviteCode,
    isConnected,
    isLoading: coupleLoading,
    generateMyCode,
    regenerateMyCode,
    connectWithCode,
  } = useCouple();
  const { t } = useLanguage();

  const [connectCode, setConnectCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id || isConnected) return;
    generateMyCode(user.id).catch(() => {
      // refreshCouple on partner tab may have already loaded the code
    });
  }, [user?.id, isConnected]);

  async function handleCopy() {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `${t.couple.connectSub} ${inviteCode}`,
        title: 'Most',
      });
    } catch {
      // User cancelled share sheet
    }
  }

  async function handleRegenerate() {
    if (!user?.id || regenerating) return;

    const runRegenerate = async () => {
      setRegenerating(true);
      setError('');
      try {
        await regenerateMyCode(user.id);
      } catch (e: any) {
        setError(e.message || 'Nie udało się wygenerować nowego kodu.');
      } finally {
        setRegenerating(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Wygenerować nowy kod? Stary kod przestanie działać.')) {
        await runRegenerate();
      }
      return;
    }

    Alert.alert(
      'Wygenerować nowy kod?',
      'Stary kod przestanie działać. Partner będzie musiał użyć nowego kodu.',
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: 'Wygeneruj', style: 'destructive', onPress: runRegenerate },
      ]
    );
  }

  async function handleConnect() {
    if (!connectCode.trim() || !user) return;
    setError('');
    setLoading(true);
    try {
      await connectWithCode(connectCode.trim(), user);
      setConnectCode('');
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Nie udało się połączyć. Spróbuj ponownie.';
      setError(message || 'Nie udało się połączyć. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
      ) : null}

      <Text style={styles.pageTitle}>{t.couple.connectTitle}</Text>
      <Text style={styles.pageSub}>{t.couple.connectSub}</Text>

      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>Twój kod:</Text>
        {coupleLoading && !inviteCode ? (
          <ActivityIndicator color={Colors.primaryLight} style={{ alignSelf: 'flex-start' }} />
        ) : (
          <>
            <View style={styles.codeRow}>
              <Text style={styles.codeValue}>{inviteCode || '—'}</Text>
              <View style={styles.codeActions}>
                <Pressable
                  onPress={handleCopy}
                  disabled={!inviteCode}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    !inviteCode && styles.iconBtnDisabled,
                    { opacity: pressed && inviteCode ? 0.7 : 1 },
                  ]}
                >
                  <MaterialIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={20}
                    color={copied ? Colors.success : Colors.primaryLight}
                  />
                </Pressable>
                <Pressable
                  onPress={handleShare}
                  disabled={!inviteCode}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    !inviteCode && styles.iconBtnDisabled,
                    { opacity: pressed && inviteCode ? 0.7 : 1 },
                  ]}
                >
                  <MaterialIcons name="share" size={20} color={Colors.primaryLight} />
                </Pressable>
              </View>
            </View>
            <Pressable
              onPress={handleRegenerate}
              disabled={regenerating || !user}
              style={({ pressed }) => [
                styles.regenerateBtn,
                { opacity: pressed && !regenerating ? 0.85 : 1 },
              ]}
            >
              {regenerating ? (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={16} color={Colors.textMuted} />
                  <Text style={styles.regenerateText}>Wygeneruj nowy kod</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </Card>

      <Card style={styles.connectCard}>
        <Text style={styles.connectCardTitle}>{t.couple.enterCode}</Text>
        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={14} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Input
          value={connectCode}
          onChangeText={setConnectCode}
          placeholder="np. ZD2XEX"
          autoCapitalize="characters"
          maxLength={6}
        />
        <Button title={t.couple.connect} onPress={handleConnect} loading={loading} fullWidth />
      </Card>

      <Pressable
        onPress={() => router.push('/solo-analysis')}
        style={({ pressed }) => [styles.soloNudge, { opacity: pressed ? 0.85 : 1 }]}
      >
        <MaterialIcons name="psychology" size={16} color={Colors.primaryLight} />
        <Text style={styles.soloNudgeText}>
          {t.solo.subtitle?.split('—')[0]?.trim() || 'Analiza Solo dostępna bez partnera'}
        </Text>
        <MaterialIcons name="chevron-right" size={16} color={Colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pageTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
  },
  pageSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    flexShrink: 1,
  },
  codeCard: {
    gap: Spacing.sm,
  },
  codeLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.primaryLight,
    letterSpacing: 4,
  },
  codeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBtnDisabled: {
    opacity: 0.45,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: Spacing.xs,
    paddingVertical: 6,
  },
  regenerateText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  connectCard: {
    gap: Spacing.sm,
  },
  connectCardTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error + '15',
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
    flex: 1,
    flexShrink: 1,
  },
  soloNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginTop: Spacing.sm,
  },
  soloNudgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    flex: 1,
    flexShrink: 1,
  },
});
