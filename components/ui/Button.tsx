import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const heights = { sm: 40, md: 48, lg: 56 };
  const fontSizes = { sm: 14, md: 16, lg: 16 };

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.wrapper,
          fullWidth && styles.fullWidth,
          { height: heights[size] },
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {({ pressed }) => (
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradient, { opacity: pressed ? 0.85 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.text, { fontSize: fontSizes[size] }, textStyle]}>{title}</Text>
            )}
          </LinearGradient>
        )}
      </Pressable>
    );
  }

  const variantStyles: Record<string, ViewStyle> = {
    secondary: { backgroundColor: Colors.surfaceElevated, borderWidth: 0 },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
    danger: { backgroundColor: Colors.error, borderWidth: 0 },
  };

  const variantTextColors: Record<string, string> = {
    secondary: Colors.textPrimary,
    outline: Colors.primaryLight,
    ghost: Colors.primaryLight,
    danger: '#fff',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        { height: heights[size], opacity: pressed ? 0.75 : 1 },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantTextColors[variant]} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: fontSizes[size], color: variantTextColors[variant] },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  base: {
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  text: {
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textOnPrimary,
    letterSpacing: 0.3,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
});
