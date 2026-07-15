import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { EnvelopeActionV2 } from '@/services/mediationTurnV2.types';

type Props = {
  actions: EnvelopeActionV2[];
  busy?: boolean;
  onAction: (action: EnvelopeActionV2) => void;
};

export function MediationV2ActionBar({ actions, busy, onAction }: Props) {
  const visible = actions.filter((a) => a.visible !== false);
  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {visible.map((action) => {
        const disabled = busy || action.disabled === true || action.loading === true;
        if (action.type === 'VOTE') {
          return (
            <Pressable
              key={action.id}
              onPress={() => onAction(action)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.tile,
                disabled && styles.tileDisabled,
                pressed && !disabled && styles.tilePressed,
              ]}
            >
              <Text style={styles.tileLabel}>{action.label}</Text>
            </Pressable>
          );
        }

        return (
          <Button
            key={action.id}
            title={action.label}
            onPress={() => onAction(action)}
            disabled={disabled}
            loading={busy || action.loading === true}
            fullWidth
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  tile: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tilePressed: {
    opacity: 0.88,
    borderColor: Colors.primaryLight,
  },
  tileDisabled: {
    opacity: 0.45,
  },
  tileLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
