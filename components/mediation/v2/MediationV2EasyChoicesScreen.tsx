import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MediationV2ActionBar } from '@/components/mediation/v2/MediationV2ActionBar';
import type { EnvelopeActionV2, PartnerStatusV2 } from '@/services/mediationTurnV2.types';

type Props = {
  content: Record<string, unknown>;
  actions: EnvelopeActionV2[];
  busy?: boolean;
  onAction: (action: EnvelopeActionV2) => void;
};

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readPartnerStatus(value: unknown): PartnerStatusV2 | null {
  if (value === 'waiting' || value === 'answered' || value === 'both_done') return value;
  return null;
}

export function MediationV2EasyChoicesScreen({
  content,
  actions,
  busy,
  onAction,
}: Props) {
  const roundIndex = typeof content.roundIndex === 'number' ? content.roundIndex : null;
  const totalRounds = typeof content.totalRounds === 'number' ? content.totalRounds : 5;
  const question = readString(content.question);
  const partnerStatus = readPartnerStatus(content.partnerStatus);
  const answered = actions.length > 0 && actions.every((a) => a.disabled === true);

  return (
    <View style={styles.wrap}>
      {roundIndex != null ? (
        <Text style={styles.round}>
          Runda {roundIndex} / {totalRounds}
        </Text>
      ) : null}
      <Text style={styles.question}>{question || '—'}</Text>
      <MediationV2ActionBar actions={actions} busy={busy} onAction={onAction} />
      {answered && partnerStatus === 'waiting' ? (
        <Text style={styles.wait}>Oczekiwanie na odpowiedź partnera…</Text>
      ) : null}
      {partnerStatus === 'answered' && !answered ? (
        <Text style={styles.wait}>Partner już odpowiedział — Twój ruch.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  round: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  question: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  wait: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
