import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';

interface ShareCardProps {
  visible: boolean;
  onClose: () => void;
  type: 'achievement' | 'streak' | 'resolution' | 'referral';
  data: {
    title?: string;
    subtitle?: string;
    value?: string | number;
    icon?: string;
    color?: [string, string];
    referralCode?: string;
  };
}

export function ShareCard({ visible, onClose, type, data }: ShareCardProps) {
  const [sharing, setSharing] = useState(false);

  const gradientColors = data.color ?? [Colors.gradientStart, Colors.gradientEnd];

  function buildShareText(): string {
    switch (type) {
      case 'achievement':
        return `Właśnie zdobyłem/am osiągnięcie "${data.title}" w aplikacji Most! 🏆\nBuduję mosty z partnerem zamiast murów.\nhttps://most.app`;
      case 'streak':
        return `Mam już ${data.value}-dniową serię w Most! 🔥\nCodziennie pracujemy z partnerem nad naszym związkiem.\nhttps://most.app`;
      case 'resolution':
        return `Właśnie rozwiązaliśmy spór "${data.title}" w Most! 🌉\nAI mediator pomógł nam dojść do porozumienia.\nhttps://most.app`;
      case 'referral':
        return `Używam Most — aplikacji dla par do rozwiązywania konfliktów.\nDołącz i dostań 1 miesiąc Premium gratis!\nMój kod: ${data.referralCode}\nhttps://most.app`;
      default:
        return 'https://most.app';
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      await Share.share({
        message: buildShareText(),
        title: 'Most — Aplikacja dla par',
      });
    } catch {}
    setSharing(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>Udostępnij</Text>

          {/* Preview card */}
          <LinearGradient
            colors={gradientColors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            {/* Decorative circles */}
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />

            <View style={styles.cardTop}>
              <View style={styles.appLabel}>
                <Text style={styles.appLabelText}>Most</Text>
                <Text style={styles.appLabelSub}>Aplikacja dla par</Text>
              </View>
              {type === 'streak' ? (
                <Text style={styles.cardIcon}>🔥</Text>
              ) : type === 'achievement' ? (
                <Text style={styles.cardIcon}>{data.icon ?? '🏆'}</Text>
              ) : type === 'resolution' ? (
                <Text style={styles.cardIcon}>🌉</Text>
              ) : (
                <Text style={styles.cardIcon}>💌</Text>
              )}
            </View>

            <View style={styles.cardContent}>
              {type === 'streak' ? (
                <>
                  <Text style={styles.cardBigNumber}>{data.value}</Text>
                  <Text style={styles.cardBigLabel}>dni serii</Text>
                </>
              ) : null}
              <Text style={styles.cardTitle}>{data.title}</Text>
              {data.subtitle ? (
                <Text style={styles.cardSubtitle}>{data.subtitle}</Text>
              ) : null}
              {type === 'referral' && data.referralCode ? (
                <View style={styles.referralCodeBox}>
                  <Text style={styles.referralCode}>{data.referralCode}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.cardUrl}>most.app</Text>
          </LinearGradient>

          {/* Share buttons */}
          <View style={styles.shareOptions}>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareBtnGradient}
              >
                <MaterialIcons name="share" size={20} color="#fff" />
                <Text style={styles.shareBtnText}>
                  {sharing ? 'Udostępnianie...' : 'Udostępnij'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.cancelText}>Anuluj</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  previewCard: {
    borderRadius: Radius['2xl'],
    padding: Spacing.xl,
    minHeight: 200,
    overflow: 'hidden',
    gap: Spacing.md,
    ...Shadow.lg,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle1: {
    width: 160,
    height: 160,
    top: -60,
    right: -40,
  },
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appLabel: {
    gap: 2,
  },
  appLabelText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: '#fff',
  },
  appLabelSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  cardIcon: {
    fontSize: 36,
  },
  cardContent: {
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  cardBigNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 56,
    color: '#fff',
    lineHeight: 60,
  },
  cardBigLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: 'rgba(255,255,255,0.8)',
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: '#fff',
    lineHeight: 26,
  },
  cardSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: 'rgba(255,255,255,0.8)',
  },
  referralCodeBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  referralCode: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: '#fff',
    letterSpacing: 4,
  },
  cardUrl: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-end',
  },
  shareOptions: {
    gap: Spacing.sm,
  },
  shareBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  shareBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: '#fff',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },
});
