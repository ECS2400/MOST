import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MediationV2ActionBar } from '@/components/mediation/v2/MediationV2ActionBar';
import type { EnvelopeActionV2 } from '@/services/mediationTurnV2.types';

type Props = {
  content: Record<string, unknown>;
  actions: EnvelopeActionV2[];
  busy?: boolean;
  onAction: (action: EnvelopeActionV2) => void;
};

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readAgreementText(content: Record<string, unknown>): string {
  const agreement = content.agreement;
  if (!agreement || typeof agreement !== 'object' || Array.isArray(agreement)) {
    return '';
  }
  const text = (agreement as Record<string, unknown>).text;
  return typeof text === 'string' ? text : '';
}

export function MediationV2EndScreen({ content, actions, busy, onAction }: Props) {
  const agreementText = readAgreementText(content);
  const closingMessage = readString(content.closingMessage);

  return (
    <View style={styles.wrap}>
      {agreementText ? (
        <View style={styles.agreementBlock}>
          <Text style={styles.agreementLabel}>Wasze ustalenie</Text>
          <Text style={styles.agreementText}>{agreementText}</Text>
        </View>
      ) : null}
      <Text style={styles.body}>{closingMessage || '—'}</Text>
      <MediationV2ActionBar actions={actions} busy={busy} onAction={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  agreementBlock: { gap: Spacing.sm },
  agreementLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    textAlign: 'center',
  },
  agreementText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 24,
    textAlign: 'center',
  },
  body: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
});
