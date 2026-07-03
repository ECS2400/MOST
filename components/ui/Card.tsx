import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: number;
}

export function Card({ children, style, variant = 'default', padding }: CardProps) {
  const variantStyles: Record<string, ViewStyle> = {
    default: { backgroundColor: Colors.surfaceCard },
    elevated: { backgroundColor: Colors.surfaceElevated, ...Shadow.md },
    bordered: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  };

  return (
    <View
      style={[
        styles.card,
        variantStyles[variant],
        padding !== undefined && { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
});
