import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

type Props = {
  message?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function MediationV2ProcessingView({ message, onRefresh, refreshing }: Props) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={Colors.primaryLight} size="large" />
      <Text style={styles.title}>Przetwarzanie…</Text>
      <Text style={styles.sub}>
        {message === 'PROCESSING' || !message
          ? 'Mediator przygotowuje kolejny krok. To może chwilę potrwać.'
          : message}
      </Text>
      {onRefresh ? (
        <Button
          title="Odśwież"
          variant="outline"
          onPress={onRefresh}
          loading={refreshing}
          fullWidth
        />
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
    marginBottom: Spacing.md,
  },
});
