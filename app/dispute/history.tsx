import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import {
  fetchMediationHistory,
  mediationHistoryRoute,
  mediationHistoryTitle,
  mediationStatusColor,
  mediationStatusLabel,
  MediationHistoryItem,
  MEDIATION_ACTIVE_STATUSES,
} from '@/services/mediationStats';
import { deleteMediationPermanently } from '@/services/mediationDelete';
import { useLanguage } from '@/hooks/useLanguage';
import type { Language, TranslationType } from '@/constants/i18n';
import { fmt } from '@/utils/i18nFormat';

type FilterTab = 'all' | 'resolved' | 'active';

const LOCALE_MAP: Record<Language, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

function formatDate(iso: string, lang: Language): string {
  const d = new Date(iso);
  return d.toLocaleDateString(LOCALE_MAP[lang] ?? 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function mediationCountLabel(
  n: number,
  mh: TranslationType['mediationHistory'],
  lang: Language
): string {
  if (lang === 'pl') {
    if (n === 1) return fmt(mh.countOne, { n });
    if (n >= 2 && n < 5) return fmt(mh.countFew, { n });
    return fmt(mh.countMany, { n });
  }
  return n === 1 ? fmt(mh.countOne, { n }) : fmt(mh.countFew, { n });
}

function MediationHistoryRow({
  item,
  onPress,
  onDelete,
  isDeleting,
  language,
  mh,
}: {
  item: MediationHistoryItem;
  onPress: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  language: Language;
  mh: TranslationType['mediationHistory'];
}) {
  const isResolved = item.status === 'resolved';
  const isCancelled = item.status === 'cancelled';
  const statusColor = mediationStatusColor(item.status);
  const statusLabel = mediationStatusLabel(item.status, language, item.isSolo);

  return (
    <View style={[styles.item, isDeleting && styles.itemDeleting]}>
      <Pressable
        onPress={onPress}
        onLongPress={onDelete}
        delayLongPress={400}
        disabled={isDeleting}
        style={({ pressed }) => [
          styles.itemMain,
          pressed && !isDeleting && styles.itemMainPressed,
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

        <View style={styles.itemContent}>
          <View style={styles.itemTop}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {mediationHistoryTitle(item.combinedDescription, language)}
            </Text>
            {isResolved ? (
              <View style={styles.resolvedBadge}>
                <MaterialIcons name="check-circle" size={12} color={Colors.success} />
                <Text style={styles.resolvedBadgeText}>{mh.badgeResolved}</Text>
              </View>
            ) : isCancelled ? (
              <View style={styles.cancelledBadge}>
                <MaterialIcons name="cancel" size={12} color={Colors.textMuted} />
                <Text style={styles.cancelledBadgeText}>{mh.badgeCancelled}</Text>
              </View>
            ) : (
              <View style={[styles.activeBadge, { borderColor: statusColor + '60' }]}>
                <View style={[styles.activeDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.activeBadgeText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.itemMeta}>
            <MaterialIcons name="calendar-today" size={12} color={Colors.textMuted} />
            <Text style={styles.itemDate}>{formatDate(item.createdAt, language)}</Text>
            <Text style={styles.itemDot}>·</Text>
            <MaterialIcons name="handshake" size={12} color={Colors.textMuted} />
            <Text style={styles.itemDate}>{statusLabel}</Text>
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
      </Pressable>

      {isDeleting ? (
        <ActivityIndicator size="small" color={Colors.error} style={styles.deleteSpinner} />
      ) : (
        <Pressable
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          <MaterialIcons name="delete-outline" size={22} color={Colors.error} />
        </Pressable>
      )}
    </View>
  );
}

export default function MediationHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const mh = t.mediationHistory;

  const [filter, setFilter] = useState<FilterTab>('all');
  const [mediations, setMediations] = useState<MediationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) {
      setMediations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    try {
      const rows = await fetchMediationHistory(user.id);
      setMediations(rows);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const performDeleteMediation = useCallback(
    async (item: MediationHistoryItem) => {
      if (!user?.id) return;
      setDeletingId(item.id);
      try {
        await deleteMediationPermanently(item.id, user.id);
        setMediations((prev) => prev.filter((m) => m.id !== item.id));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : mh.deleteError;
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert(t.common.error, message);
        }
      } finally {
        setDeletingId(null);
      }
    },
    [user?.id, mh.deleteError, t.common.error]
  );

  const confirmDeleteMediation = useCallback(
    (item: MediationHistoryItem) => {
      if (Platform.OS === 'web') {
        if (window.confirm(mh.deleteBody)) {
          void performDeleteMediation(item);
        }
        return;
      }

      Alert.alert(mh.deleteTitle, mh.deleteBody, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: mh.deleteBtn,
          style: 'destructive',
          onPress: () => void performDeleteMediation(item),
        },
      ]);
    },
    [performDeleteMediation, mh, t.common.cancel]
  );

  const filtered = mediations.filter((item) => {
    if (filter === 'resolved') return item.status === 'resolved';
    if (filter === 'active') {
      return (MEDIATION_ACTIVE_STATUSES as readonly string[]).includes(item.status);
    }
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: mh.tabAll, count: mediations.length },
    {
      key: 'resolved',
      label: mh.tabResolved,
      count: mediations.filter((m) => m.status === 'resolved').length,
    },
    {
      key: 'active',
      label: mh.tabActive,
      count: mediations.filter((m) =>
        (MEDIATION_ACTIVE_STATUSES as readonly string[]).includes(m.status)
      ).length,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface, Colors.background]} style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTexts}>
          <Text style={styles.headerTitle}>{mh.title}</Text>
          <Text style={styles.headerSub}>
            {mediations.length === 0
              ? mh.emptySub
              : mediationCountLabel(mediations.length, mh, language)}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/mediation/new')}
          style={styles.newBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid]}
            style={styles.newBtnGradient}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      </LinearGradient>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setFilter(tab.key)}
            style={[styles.tab, filter === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 ? (
              <View style={[styles.tabBadge, filter === tab.key && styles.tabBadgeActive]}>
                <Text
                  style={[
                    styles.tabBadgeText,
                    filter === tab.key && styles.tabBadgeTextActive,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primaryLight} />
        </View>
      ) : loadError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{mh.loadError}</Text>
          <Pressable onPress={loadHistory} style={styles.emptyBtn}>
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientMid]}
              style={styles.emptyBtnGradient}
            >
              <Text style={styles.emptyBtnText}>{mh.retry}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🤝</Text>
          <Text style={styles.emptyTitle}>
            {mediations.length === 0 ? mh.emptyNoHistory : mh.emptyNoFilter}
          </Text>
          <Text style={styles.emptyText}>
            {mediations.length === 0 ? mh.emptyNoHistoryText : mh.emptyNoFilterText}
          </Text>
          {mediations.length === 0 ? (
            <Pressable
              onPress={() => router.push('/mediation/new')}
              style={({ pressed }) => [styles.emptyBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid]}
                style={styles.emptyBtnGradient}
              >
                <Text style={styles.emptyBtnText}>{mh.startMediation}</Text>
              </LinearGradient>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MediationHistoryRow
              item={item}
              onPress={() => router.push(mediationHistoryRoute(item.id, item.status) as any)}
              onDelete={() => confirmDeleteMediation(item)}
              isDeleting={deletingId === item.id}
              language={language}
              mh={mh}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: 20,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTexts: { flex: 1 },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  newBtn: { flexShrink: 0 },
  newBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  tabText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.semiBold,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: Colors.primary + '40' },
  tabBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.textMuted,
  },
  tabBadgeTextActive: { color: Colors.primaryLight },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  separator: { height: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    paddingRight: 8,
    paddingVertical: 14,
  },
  itemDeleting: {
    opacity: 0.6,
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: 4,
  },
  itemMainPressed: {
    opacity: 0.85,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 14,
  },
  itemContent: { flex: 1, minWidth: 0, gap: 5 },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  resolvedBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.success,
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  cancelledBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  itemDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  itemDot: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  deleteSpinner: {
    marginRight: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: { borderRadius: 24, overflow: 'hidden', marginTop: 8 },
  emptyBtnGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  emptyBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: '#fff',
  },
});
