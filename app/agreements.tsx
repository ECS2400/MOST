import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { Language } from '@/constants/i18n';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fmt } from '@/utils/i18nFormat';
import { getResponsibleLabel } from '@/services/mediationSummary';
import {
  AgreementArchiveStatus,
  ArchivedAgreement,
  createManualAgreement,
  fetchArchivedAgreements,
  updateAgreementArchiveStatus,
} from '@/services/agreementArchive';

type FilterTab = 'all' | 'active' | 'needs_refresh';

const DATE_LOCALE: Record<Language, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

function formatDate(iso: string, lang: Language): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[lang] || 'pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function AgreementRow({
  item,
  onStatusChange,
  updating,
  language,
  labels,
}: {
  item: ArchivedAgreement;
  onStatusChange: (status: AgreementArchiveStatus) => void;
  updating: boolean;
  language: Language;
  labels: {
    statusActive: string;
    statusRefresh: string;
    soloBadge: string;
    manualTitle: string;
    defaultMediationTitle: string;
  };
}) {
  const sourceTitle = item.isManual
    ? labels.manualTitle
    : item.mediationTitle || labels.defaultMediationTitle;

  return (
    <Card variant="bordered" style={styles.card}>
      <Text style={styles.agreementText}>{item.text}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {getResponsibleLabel(item.responsible, language)}
          {item.isSolo ? ` · ${labels.soloBadge}` : ''}
        </Text>
        <Text style={styles.metaText}>{formatDate(item.mediationDate, language)}</Text>
      </View>
      <Text style={styles.sourceTitle} numberOfLines={1}>
        {sourceTitle}
      </Text>

      <View style={styles.statusRow}>
        <Pressable
          disabled={updating}
          onPress={() => onStatusChange('active')}
          style={({ pressed }) => [
            styles.statusBtn,
            item.archiveStatus === 'active' && styles.statusBtnActive,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons
            name="check-circle"
            size={16}
            color={item.archiveStatus === 'active' ? Colors.success : Colors.textMuted}
          />
          <Text
            style={[
              styles.statusBtnText,
              item.archiveStatus === 'active' && styles.statusBtnTextActive,
            ]}
          >
            {labels.statusActive}
          </Text>
        </Pressable>

        <Pressable
          disabled={updating}
          onPress={() => onStatusChange('needs_refresh')}
          style={({ pressed }) => [
            styles.statusBtn,
            item.archiveStatus === 'needs_refresh' && styles.statusBtnRefresh,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons
            name="refresh"
            size={16}
            color={
              item.archiveStatus === 'needs_refresh' ? Colors.warning : Colors.textMuted
            }
          />
          <Text
            style={[
              styles.statusBtnText,
              item.archiveStatus === 'needs_refresh' && styles.statusBtnTextRefresh,
            ]}
          >
            {labels.statusRefresh}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function AgreementsArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { couple } = useCouple();
  const { t, language } = useLanguage();
  const aa = t.agreementsArchive;
  const [items, setItems] = useState<ArchivedAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchArchivedAgreements(user.id, couple?.id, language);
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [user?.id, couple?.id, language]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleStatusChange(item: ArchivedAgreement, status: AgreementArchiveStatus) {
    if (!user?.id || item.archiveStatus === status) return;
    setUpdatingId(item.id);
    try {
      await updateAgreementArchiveStatus(
        user.id,
        {
          id: item.id,
          mediationId: item.mediationId,
          sourceAgreementId: item.sourceAgreementId,
        },
        status
      );
      setItems((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, archiveStatus: status } : a))
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAddAgreement() {
    if (!user?.id) return;
    const trimmed = newText.trim();
    if (!trimmed) {
      setAddError(aa.addErrorEmpty);
      return;
    }
    setAddError('');
    setAdding(true);
    try {
      const created = await createManualAgreement(user.id, couple?.id ?? null, trimmed);
      setItems((prev) => [created, ...prev]);
      setNewText('');
    } catch {
      setAddError(aa.addErrorSave);
    } finally {
      setAdding(false);
    }
  }

  const filtered = items.filter((a) => {
    if (filter === 'active') return a.archiveStatus === 'active';
    if (filter === 'needs_refresh') return a.archiveStatus === 'needs_refresh';
    return true;
  });

  const activeCount = items.filter((a) => a.archiveStatus === 'active').length;
  const refreshCount = items.filter((a) => a.archiveStatus === 'needs_refresh').length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: fmt(aa.tabAll, { n: items.length }) },
    { key: 'active', label: fmt(aa.tabActive, { n: activeCount }) },
    { key: 'needs_refresh', label: fmt(aa.tabRefresh, { n: refreshCount }) },
  ];

  const rowLabels = {
    statusActive: aa.statusActive,
    statusRefresh: aa.statusRefresh,
    soloBadge: aa.soloBadge,
    manualTitle: aa.manualTitle,
    defaultMediationTitle: aa.defaultMediationTitle,
  };

  const listHeader = (
    <View style={styles.addSection}>
      <Text style={styles.addSectionTitle}>{aa.addSectionTitle}</Text>
      {!couple?.id ? (
        <Text style={styles.connectHint}>{aa.connectPartnerHint}</Text>
      ) : null}
      <View style={styles.addRow}>
        <TextInput
          value={newText}
          onChangeText={(v) => {
            setNewText(v);
            if (addError) setAddError('');
          }}
          placeholder={aa.addPlaceholder}
          placeholderTextColor={Colors.textMuted}
          style={styles.addInput}
          multiline
        />
      </View>
      {addError ? <Text style={styles.addErrorText}>{addError}</Text> : null}
      <Button title={aa.addBtn} onPress={handleAddAgreement} loading={adding} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t.profile.ourAgreements}</Text>
          <Text style={styles.subtitle}>{aa.subtitle}</Text>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setFilter(tab.key)}
            style={[styles.tab, filter === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            filtered.length === 0 && styles.listEmpty,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>{aa.emptyTitle}</Text>
              <Text style={styles.emptyText}>{aa.emptyText}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <AgreementRow
              item={item}
              updating={updatingId === item.id}
              language={language}
              labels={rowLabels}
              onStatusChange={(status) => handleStatusChange(item, status)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
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
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary + '35',
  },
  tabText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.semiBold,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  addSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addSectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  connectHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    color: Colors.warning,
    lineHeight: 18,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addInput: {
    flex: 1,
    minHeight: 72,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  addErrorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
  },
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  agreementText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  metaText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  sourceTitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  statusBtnActive: {
    borderColor: Colors.success + '60',
    backgroundColor: Colors.success + '15',
  },
  statusBtnRefresh: {
    borderColor: Colors.warning + '60',
    backgroundColor: Colors.warning + '15',
  },
  statusBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusBtnTextActive: {
    color: Colors.success,
  },
  statusBtnTextRefresh: {
    color: Colors.warning,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
