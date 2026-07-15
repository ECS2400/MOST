import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MediationV2ActionBar } from '@/components/mediation/v2/MediationV2ActionBar';
import type { EnvelopeActionV2 } from '@/services/mediationTurnV2.types';

type Props = {
  content: Record<string, unknown>;
  actions: EnvelopeActionV2[];
  busy?: boolean;
  waitingForPartner?: boolean;
  onAction: (action: EnvelopeActionV2) => void;
};

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function MediationV2DateScreen({
  content,
  actions,
  busy,
  waitingForPartner,
  onAction,
}: Props) {
  const dateIdea = readString(content.dateIdea);
  const scenario = Array.isArray(content.scenario)
    ? content.scenario.filter((s): s is string => typeof s === 'string')
    : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.body}>{dateIdea || '—'}</Text>
      {scenario.length > 0 ? (
        <View style={styles.list}>
          {scenario.map((step, i) => (
            <Text key={`${i}-${step.slice(0, 12)}`} style={styles.step}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      ) : null}
      {waitingForPartner ? (
        <Text style={styles.wait}>Oczekiwanie na partnera…</Text>
      ) : null}
      <MediationV2ActionBar actions={actions} busy={busy} onAction={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  body: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  list: { gap: Spacing.xs },
  step: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  wait: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
