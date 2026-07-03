import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

interface NotifItem {
  key: string;
  emoji: string;
  title: string;
  desc: string;
  type: 'toggle' | 'time';
  timeValue?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const nt = t.notifications as any;

  const [settings, setSettings] = useState({
    partnerMessages: true,
    aiSuggestions: true,
    streakReminders: true,
    paymentNotifs: false,
  });

  function toggle(key: keyof typeof settings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const notifItems: NotifItem[] = [
    {
      key: 'partnerMessages',
      emoji: '💌',
      title: nt?.partnerMessages || 'Powiadomienia od partnera',
      desc: nt?.partnerMessagesDesc || 'Gdy napisze perspektywę lub dołączy do czatu',
      type: 'toggle',
    },
    {
      key: 'aiSuggestions',
      emoji: '🤖',
      title: nt?.aiSuggestions || 'Sugestie AI Mediatora',
      desc: nt?.aiSuggestionsDesc || 'Delikatne wskazówki podczas sporu',
      type: 'toggle',
    },
    {
      key: 'streakReminders',
      emoji: '🔥',
      title: nt?.streakReminders || 'Przypomnienia o serii',
      desc: nt?.streakRemindersDesc || 'Codziennie o 20:00, jeśli seria trwa',
      type: 'toggle',
    },
    {
      key: 'paymentNotifs',
      emoji: '💳',
      title: nt?.paymentNotifs || 'Płatności i subskrypcja',
      desc: nt?.paymentNotifsDesc || 'Przypomnienia o odnowieniu',
      type: 'toggle',
    },
  ];

  const quietHoursTime = nt?.quietHoursTime || '22:00 — 08:00';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{nt?.title || 'Powiadomienia'}</Text>
            <Text style={styles.subtitle}>{nt?.partnerMessagesDesc || 'Zarządzaj powiadomieniami'}</Text>
          </View>
        </View>

        {/* Hero */}
        <LinearGradient
          colors={[Colors.gradientStart + '25', Colors.gradientMid + '10']}
          style={styles.hero}
        >
          <View style={styles.heroBell}>
            <MaterialIcons name="notifications-active" size={32} color={Colors.primaryLight} />
          </View>
          <Text style={styles.heroText}>
            {nt?.enable || 'Włącz powiadomienia'}
          </Text>
          <Text style={styles.heroSub}>
            Nie przegap ważnych momentów w waszym dialogu.
          </Text>
        </LinearGradient>

        {/* Toggle list */}
        <Card style={styles.listCard}>
          {notifItems.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.notifRow,
                index < notifItems.length - 1 && styles.notifRowBorder,
              ]}
            >
              <View style={styles.notifEmoji}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <View style={styles.notifText}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={settings[item.key as keyof typeof settings]}
                onValueChange={() => toggle(item.key as keyof typeof settings)}
                trackColor={{
                  false: Colors.border,
                  true: Colors.primary + '80',
                }}
                thumbColor={
                  settings[item.key as keyof typeof settings]
                    ? Colors.primaryLight
                    : Colors.textMuted
                }
                ios_backgroundColor={Colors.border}
              />
            </View>
          ))}
        </Card>

        {/* Quiet hours */}
        <Card variant="bordered" style={styles.quietCard}>
          <View style={styles.quietHeader}>
            <View style={styles.quietIconBg}>
              <Text style={{ fontSize: 20 }}>🌙</Text>
            </View>
            <View style={styles.quietText}>
              <Text style={styles.notifTitle}>{nt?.quietHours || 'Ciche godziny'}</Text>
              <Text style={styles.notifDesc}>{nt?.quietHoursDesc || 'Bez powiadomień w nocy'}</Text>
            </View>
          </View>
          <LinearGradient
            colors={[Colors.primary + '20', Colors.gradientMid + '10']}
            style={styles.quietTimePill}
          >
            <MaterialIcons name="bedtime" size={16} color={Colors.primaryLight} />
            <Text style={styles.quietTimeText}>{quietHoursTime}</Text>
          </LinearGradient>
        </Card>

        {/* Note */}
        <Text style={styles.note}>
          Zmiana ustawień powiadomień może wymagać zgody systemowej na urządzeniu.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  heroBell: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  heroSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listCard: { padding: 0, overflow: 'hidden' },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  notifRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notifEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emoji: { fontSize: 18 },
  notifText: { flex: 1 },
  notifTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  notifDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
    flexShrink: 1,
  },
  quietCard: { gap: Spacing.md },
  quietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  quietIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietText: { flex: 1 },
  quietTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  quietTimeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: Colors.primaryLight,
  },
  note: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
});
