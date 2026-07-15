import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

type Props = {
  code: string;
  message?: string;
  canRetry?: boolean;
  onRetry?: () => void;
  busy?: boolean;
};

const MESSAGES: Record<string, string> = {
  LLM_CALL_BUDGET_EXCEEDED:
    'Limit generacji dla tej sesji został wyczerpany. Nie można wygenerować kolejnej treści.',
  GENERATION_ALREADY_RUNNING: 'Generacja już trwa. Odśwież za chwilę.',
  PARTNER_NOT_READY: 'Partner nie jest jeszcze gotowy do mediacji.',
  FAILED: 'Nie udało się wygenerować treści. Spróbuj ponownie.',
};

export function MediationV2ErrorView({
  code,
  message,
  canRetry,
  onRetry,
  busy,
}: Props) {
  const body = message || MESSAGES[code] || 'Coś poszło nie tak. Spróbuj ponownie później.';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Nie udało się kontynuować</Text>
      <Text style={styles.sub}>{body}</Text>
      {canRetry && onRetry ? (
        <Button title="Spróbuj ponownie" onPress={onRetry} loading={busy} fullWidth />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  title: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
