import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import CoupleConnectScreen from '@/components/feature/CoupleConnectScreen';

function formatConnectedSince(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PartnerTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { couple, partner, inviteCode, isConnected, disconnect, refreshCouple } = useCouple();
  const { t } = useLanguage();

  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (user) refreshCouple(user.id);
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        refreshCouple(user.id);
      }
    }, [user?.id])
  );

  async function handleCopy() {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `${t.couple.connectSub} ${inviteCode}`,
        title: 'Most',
      });
    } catch {}
  }

  function handleDisconnect() {
    if (Platform.OS === 'web') {
      disconnect();
    } else {
      Alert.alert(t.profile.disconnectCouple, t.profile.disconnectConfirm, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.yes, style: 'destructive', onPress: disconnect },
      ]);
    }
  }

  if (!isConnected || !partner) {
    return <CoupleConnectScreen />;
  }

  const connectedSince = formatConnectedSince(couple?.connectedAt);

  return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.pageTitle}>{t.couple.partner}</Text>

        {/* Partner card */}
        <Card variant="elevated" style={styles.partnerCard}>
          <LinearGradient
            colors={[Colors.gradientStart + '30', Colors.gradientEnd + '10']}
            style={styles.partnerGradient}
          >
            <Avatar
              name={partner.name || 'Partner'}
              color={partner.avatarColor}
              imageUrl={partner.avatarUrl}
              size={72}
            />
            <Text style={styles.partnerName}>{partner.name || 'Partner'}</Text>
            <View style={styles.connectedBadge}>
              <MaterialIcons name="favorite" size={12} color={Colors.accent} />
              <Text style={styles.connectedText}>{t.couple.connected}</Text>
            </View>
            {connectedSince ? (
              <Text style={styles.connectedSince}>
                {t.couple.connectedSince} {connectedSince}
              </Text>
            ) : null}
          </LinearGradient>
        </Card>

        {/* My code */}
        <Card style={styles.codeCard}>
          <Text style={styles.codeLabel}>Twój kod:</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeValue}>{inviteCode}</Text>
            <View style={styles.codeActions}>
              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name={copied ? 'check' : 'content-copy'}
                  size={20}
                  color={copied ? Colors.success : Colors.primaryLight}
                />
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="share" size={20} color={Colors.primaryLight} />
              </Pressable>
            </View>
          </View>
        </Card>

        <Button
          title={t.profile.disconnectCouple}
          onPress={handleDisconnect}
          variant="outline"
          fullWidth
          style={{ marginTop: Spacing.md, borderColor: Colors.error + '60' }}
          textStyle={{ color: Colors.error }}
        />
      </ScrollView>
    );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
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
  partnerCard: {
    overflow: 'hidden',
    padding: 0,
  },
  partnerGradient: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    borderRadius: Radius.xl,
  },
  partnerName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  connectedText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.accent,
  },
  connectedSince: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
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
});
