import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'full' | 'header' | 'card' | 'subtle';
}

export function GradientBackground({ children, style, variant = 'full' }: Props) {
  const gradients = {
    full: [Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd] as const,
    header: [Colors.gradientStart, Colors.gradientMid] as const,
    card: ['#1E1338', '#241545'] as const,
    subtle: [Colors.background, Colors.surface] as const,
  };

  return (
    <LinearGradient
      colors={gradients[variant]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
