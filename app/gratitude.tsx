import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import {
  calculateGratitudeStreak,
  fetchMyGratitudeEntries,
  fetchPartnerGratitudeEntries,
  formatGratitudeDate,
  getTodayGratitudeEntry,
  GratitudeEntry,
  saveGratitudeEntry,
} from '@/services/gratitudeJournal';
import {
  requestNotificationPermissions,
  scheduleGratitudeReminder,
} from '@/services/notificationService';
import { useLanguage } from '@/hooks/useLanguage';
import type { Language, TranslationType } from '@/constants/i18n';
import { fmt } from '@/utils/i18nFormat';

function streakDayUnit(n: number, lang: Language, g: TranslationType['gratitude']): string {
  if (lang === 'pl') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (n === 1) return g.dayOne;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return g.daysFew;
    return g.daysMany;
  }
  return n === 1 ? g.dayOne : g.daysFew;
}

function EntryCard({
  entry,
  authorLabel,
  language,
}: {
  entry: GratitudeEntry;
  authorLabel?: string;
  language: Language;
}) {
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatGratitudeDate(entry.entryDate, language)}</Text>
        {authorLabel ? <Text style={styles.entryAuthor}>{authorLabel}</Text> : null}
      </View>
      {entry.items.map((item, i) => (
        <View key={`${entry.id}-${i}`} style={styles.entryItem}>
          <Text style={styles.entryBullet}>💜</Text>
          <Text style={styles.entryText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function GratitudeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { couple, partner, isConnected } = useCouple();
  const { language, t } = useLanguage();
  const g = t.gratitude;

  const [items, setItems] = useState(['', '', '']);
  const [shareWithPartner, setShareWithPartner] = useState(true);
  const [myEntries, setMyEntries] = useState<GratitudeEntry[]>([]);
  const [partnerEntries, setPartnerEntries] = useState<GratitudeEntry[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todaySaved, setTodaySaved] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [mine, today] = await Promise.all([
        fetchMyGratitudeEntries(user.id),
        getTodayGratitudeEntry(user.id),
      ]);
      setMyEntries(mine);
      setStreak(calculateGratitudeStreak(mine));

      if (today) {
        setItems([
          today.items[0] || '',
          today.items[1] || '',
          today.items[2] || '',
        ]);
        setShareWithPartner(today.shareWithPartner);
        setTodaySaved(true);
      }

      if (couple?.id && isConnected) {
        const partnerRows = await fetchPartnerGratitudeEntries(couple.id, user.id);
        setPartnerEntries(partnerRows);
      } else {
        setPartnerEntries([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, couple?.id, isConnected]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    requestNotificationPermissions().then((ok) => {
      if (ok) scheduleGratitudeReminder();
    });
  }, []);

  async function handleSave() {
    if (!user?.id || saving) return;
    setSaving(true);
    try {
      await saveGratitudeEntry(user.id, items, {
        coupleId: couple?.id || null,
        shareWithPartner: isConnected ? shareWithPartner : false,
      });
      setTodaySaved(true);
      await loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : g.saveError;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(g.errorTitle, msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{g.title}</Text>
          <Text style={styles.headerSub}>{g.subtitle}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primaryLight} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['#F97316' + '35', Colors.gradientMid + '18']}
            style={styles.streakCard}
          >
            <Text style={styles.streakEmoji}>🔥</Text>
            <View style={styles.streakTexts}>
              <Text style={styles.streakValue}>{fmt(g.streakDays, { n: streak.current })}</Text>
              <Text style={styles.streakSub}>
                {fmt(g.record, {
                  n: streak.longest,
                  unit: streakDayUnit(streak.longest, language, g),
                })}
              </Text>
            </View>
            {todaySaved ? (
              <View style={styles.doneBadge}>
                <MaterialIcons name="check" size={14} color={Colors.success} />
                <Text style={styles.doneBadgeText}>{g.todayDone}</Text>
              </View>
            ) : null}
          </LinearGradient>

          <Text style={styles.sectionLabel}>{g.todayEntry}</Text>
          <View style={styles.formCard}>
            {g.prompts.map((prompt, i) => (
              <View key={prompt} style={styles.inputBlock}>
                <Text style={styles.inputLabel}>{i + 1}. {prompt}</Text>
                <TextInput
                  value={items[i]}
                  onChangeText={(text) => {
                    const next = [...items];
                    next[i] = text;
                    setItems(next);
                  }}
                  placeholder={g.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  style={styles.input}
                />
              </View>
            ))}

            {isConnected ? (
              <View style={styles.shareRow}>
                <View style={styles.shareTexts}>
                  <Text style={styles.shareTitle}>{g.shareTitle}</Text>
                  <Text style={styles.shareSub}>
                    {fmt(g.shareSub, { name: partner?.name || g.partnerFallback })}
                  </Text>
                </View>
                <Switch
                  value={shareWithPartner}
                  onValueChange={setShareWithPartner}
                  trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
                  thumbColor={shareWithPartner ? Colors.primaryLight : Colors.textMuted}
                />
              </View>
            ) : null}

            <Button
              title={todaySaved ? g.updateEntry : g.saveToday}
              onPress={handleSave}
              loading={saving}
              fullWidth
              size="lg"
            />
          </View>

          {isConnected && partnerEntries.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>
                {fmt(g.partnerEntries, {
                  name: partner?.name?.split(' ')[0] || g.partnerNameFallback,
                })}
              </Text>
              {partnerEntries.slice(0, 10).map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  authorLabel={partner?.name?.split(' ')[0]}
                  language={language}
                />
              ))}
            </>
          ) : null}

          {myEntries.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>{g.yourHistory}</Text>
              {myEntries.slice(0, 20).map((entry) => (
                <EntryCard key={entry.id} entry={entry} language={language} />
              ))}
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💜</Text>
              <Text style={styles.emptyTitle}>{g.emptyTitle}</Text>
              <Text style={styles.emptyText}>{g.emptyText}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginTop: Spacing.sm,
  },
  streakEmoji: { fontSize: 36 },
  streakTexts: { flex: 1 },
  streakValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: '#F97316',
  },
  streakSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success + '22',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  doneBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.success,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  formCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputBlock: { gap: Spacing.xs },
  inputLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  input: {
    minHeight: 56,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  shareTexts: { flex: 1 },
  shareTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  shareSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.primaryLight,
  },
  entryAuthor: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  entryItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  entryBullet: { fontSize: 14, marginTop: 1 },
  entryText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  emptyBox: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
