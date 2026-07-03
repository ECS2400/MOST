import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Dispute } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';
import { PhaseIndicator } from '@/components/ui/PhaseIndicator';
import { Card } from '@/components/ui/Card';

interface DisputeCardProps {
  dispute: Dispute;
  currentUserId: string;
}

const phaseColors = [Colors.phase1, Colors.phase2, Colors.phase3, Colors.phase4];

const LOCALE_MAP: Record<string, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

export function DisputeCard({ dispute, currentUserId }: DisputeCardProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const dt = t.dispute;
  const isMyTurn = (dispute.user1Id === currentUserId && !dispute.user1Ready) ||
    (dispute.user2Id === currentUserId && !dispute.user2Ready);
  const isResolved = dispute.status === 'resolved';

  const formattedDate = new Date(dispute.createdAt).toLocaleDateString(
    LOCALE_MAP[language] ?? 'en-US',
    { day: 'numeric', month: 'short' },
  );

  return (
    <Pressable
      onPress={() => router.push(`/dispute/${dispute.id}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.phaseDot, { backgroundColor: isResolved ? Colors.success : phaseColors[dispute.phase - 1] }]} />
            <Text style={styles.title} numberOfLines={1}>
              {dispute.title}
            </Text>
          </View>
          {!isResolved && isMyTurn ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{dt.yourTurn}</Text>
            </View>
          ) : null}
          {isResolved ? (
            <View style={[styles.badge, styles.badgeResolved]}>
              <MaterialIcons name="check-circle" size={12} color={Colors.success} />
              <Text style={[styles.badgeText, { color: Colors.success }]}>{dt.resolved}</Text>
            </View>
          ) : null}
        </View>

        {dispute.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {dispute.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {!isResolved ? (
            <PhaseIndicator currentPhase={dispute.phase} compact />
          ) : null}
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  description: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary + '25',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  badgeResolved: {
    backgroundColor: Colors.success + '20',
    borderColor: Colors.success + '40',
  },
  badgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.primaryLight,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  date: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
});
