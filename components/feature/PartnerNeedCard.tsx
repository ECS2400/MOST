import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useLanguage } from '@/hooks/useLanguage';
import { Avatar } from '@/components/ui/Avatar';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import {
  PARTNER_NEED_EMOJI,
  PARTNER_NEED_IDS,
  type PartnerNeedId,
} from '@/constants/partnerNeeds';
import { getPartnerNeedLabels } from '@/constants/i18n/partnerNeeds';
import {
  fetchMyPartnerNeed,
  fetchPartnerNeedSignal,
  saveMyPartnerNeed,
  subscribePartnerNeeds,
} from '@/services/partnerNeedSignal';

const VISIBLE_CHIPS = 4;
const CHIP_GAP = 8;

function NeedChip({
  needId,
  label,
  selected,
  onPress,
  width,
}: {
  needId: PartnerNeedId;
  label: string;
  selected: boolean;
  onPress: () => void;
  width: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { width, opacity: pressed ? 0.88 : 1 },
        selected && styles.chipSelected,
      ]}
    >
      <Text style={styles.chipEmoji}>{PARTNER_NEED_EMOJI[needId]}</Text>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function SelectedNeedPill({
  needId,
  label,
  accent,
}: {
  needId: PartnerNeedId;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.selectedPill, accent && styles.selectedPillAccent]}>
      <Text style={styles.selectedEmoji}>{PARTNER_NEED_EMOJI[needId]}</Text>
      <Text style={[styles.selectedLabel, accent && styles.selectedLabelAccent]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function PartnerNeedCard() {
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { couple, partner, isConnected } = useCouple();
  const { language } = useLanguage();
  const labels = useMemo(() => getPartnerNeedLabels(language), [language]);

  const [myNeedId, setMyNeedId] = useState<PartnerNeedId | null>(null);
  const [partnerNeedId, setPartnerNeedId] = useState<PartnerNeedId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const chipWidth = useMemo(() => {
    const horizontalPadding = Spacing.xl * 2 + Spacing.md * 2;
    const totalGap = CHIP_GAP * (VISIBLE_CHIPS - 1);
    return Math.floor((screenWidth - horizontalPadding - totalGap) / VISIBLE_CHIPS);
  }, [screenWidth]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const mine = await fetchMyPartnerNeed(user.id);
      setMyNeedId(mine?.needId ?? null);

      if (couple?.id && isConnected) {
        const partnerSignal = await fetchPartnerNeedSignal(couple.id, user.id);
        setPartnerNeedId(partnerSignal?.needId ?? null);
      } else {
        setPartnerNeedId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, couple?.id, isConnected]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!couple?.id || !isConnected) return;
    return subscribePartnerNeeds(couple.id, refresh);
  }, [couple?.id, isConnected, refresh]);

  async function handleSelect(needId: PartnerNeedId) {
    if (!user?.id || saving) return;

    setSaving(true);
    setMyNeedId(needId);

    try {
      await saveMyPartnerNeed(user.id, needId, couple?.id ?? null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={{ fontSize: 18 }}>💭</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{labels.title}</Text>
          <Text style={styles.subtitle}>{labels.subtitle}</Text>
        </View>
        {saving ? <ActivityIndicator size="small" color={Colors.primaryLight} /> : null}
      </View>

      {!isConnected ? (
        <Pressable style={styles.connectHint}>
          <MaterialIcons name="favorite-border" size={16} color={Colors.primaryLight} />
          <Text style={styles.connectHintText}>{labels.connectHint}</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <ActivityIndicator color={Colors.primaryLight} style={{ marginVertical: Spacing.sm }} />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            decelerationRate="fast"
            snapToInterval={chipWidth + CHIP_GAP}
          >
            {PARTNER_NEED_IDS.map((needId) => (
              <NeedChip
                key={needId}
                needId={needId}
                label={labels.options[needId]}
                selected={myNeedId === needId}
                onPress={() => handleSelect(needId)}
                width={chipWidth}
              />
            ))}
          </ScrollView>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryWho}>{labels.yourNeed}</Text>
              {myNeedId ? (
                <SelectedNeedPill needId={myNeedId} label={labels.options[myNeedId]} accent />
              ) : (
                <Text style={styles.summaryEmpty}>—</Text>
              )}
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCol}>
              <View style={styles.partnerWhoRow}>
                {partner ? (
                  <Avatar
                    name={partner.name}
                    color={partner.avatarColor}
                    imageUrl={partner.avatarUrl}
                    size={22}
                  />
                ) : null}
                <Text style={styles.summaryWho}>{labels.partnerNeed}</Text>
              </View>
              {isConnected && partnerNeedId ? (
                <SelectedNeedPill
                  needId={partnerNeedId}
                  label={labels.options[partnerNeedId]}
                />
              ) : (
                <Text style={styles.summaryEmpty}>
                  {isConnected ? labels.partnerEmpty : labels.connectHint}
                </Text>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  connectHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '10',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  connectHintText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  chipRow: {
    gap: CHIP_GAP,
    paddingVertical: Spacing.xs,
  },
  chip: {
    minHeight: 72,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
  },
  chipSelected: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primary + '15',
  },
  chipEmoji: { fontSize: 20 },
  chipLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  chipLabelSelected: {
    color: Colors.primaryLight,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  summaryCol: { flex: 1, minWidth: 0, gap: 6 },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  summaryWho: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partnerWhoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryEmpty: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  selectedPillAccent: {
    borderColor: Colors.primaryLight + '80',
    backgroundColor: Colors.primary + '12',
  },
  selectedEmoji: { fontSize: 16 },
  selectedLabel: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  selectedLabelAccent: {
    color: Colors.textPrimary,
  },
});
