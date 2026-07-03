// Most App — Blur Overlay for Premium Content

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';

interface BlurOverlayProps {
  /** Feature name shown in the CTA */
  featureName?: string;
  /** Show Solo option instead of Premium subscription */
  showSoloOption?: boolean;
  /** Custom action instead of navigating to premium */
  onUpgrade?: () => void;
  /** Overlay style: 'full' blurs entire area, 'bottom' fades from bottom */
  style?: 'full' | 'bottom';
}

export function BlurOverlay({
  featureName = 'ta funkcja',
  showSoloOption = false,
  onUpgrade,
  style = 'full',
}: BlurOverlayProps) {
  const router = useRouter();

  function handleUpgrade() {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/premium');
    }
  }

  return (
    <View style={[styles.container, style === 'bottom' && styles.containerBottom]}>
      {/* Frosted blur simulation */}
      <LinearGradient
        colors={
          style === 'bottom'
            ? ['transparent', Colors.background + 'CC', Colors.background + 'F5', Colors.background]
            : [Colors.background + '99', Colors.background + 'CC', Colors.background + 'EE']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: style === 'bottom' ? 0 : 0.3 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Content */}
      <View style={styles.card}>
        <LinearGradient
          colors={[Colors.gradientStart + '20', Colors.gradientMid + '15', Colors.gradientEnd + '10']}
          style={styles.cardGradient}
        >
          {/* Lock icon */}
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid]}
            style={styles.lockCircle}
          >
            <MaterialIcons name="lock" size={22} color="#fff" />
          </LinearGradient>

          <Text style={styles.title}>Funkcja Premium</Text>
          <Text style={styles.subtitle}>
            {featureName} jest dostępna tylko dla subskrybentów Most Premium.
          </Text>

          {/* Upgrade CTA */}
          <Pressable
            onPress={handleUpgrade}
            style={({ pressed }) => [styles.upgradeBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeBtnGradient}
            >
              <MaterialIcons name="star" size={16} color={Colors.gold} />
              <Text style={styles.upgradeBtnText}>Przejdź na Premium</Text>
            </LinearGradient>
          </Pressable>

          {/* Solo option */}
          {showSoloOption ? (
            <Pressable
              onPress={() => router.push('/solo-analysis')}
              style={({ pressed }) => [styles.soloBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialIcons name="person" size={14} color={Colors.primaryLight} />
              <Text style={styles.soloBtnText}>Lub kup Analizę Solo — 9,99 zł</Text>
            </Pressable>
          ) : null}

          {/* Pricing hint */}
          <Text style={styles.priceHint}>Od 14,99 zł/tydzień · Anuluj kiedy chcesz</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    padding: Spacing.xl,
  },
  containerBottom: {
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.lg,
  },
  cardGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lockCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeBtn: {
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  upgradeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  upgradeBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: '#fff',
  },
  soloBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  soloBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    textDecorationLine: 'underline',
    flexShrink: 1,
  },
  priceHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
