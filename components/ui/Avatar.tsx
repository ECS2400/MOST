import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Typography } from '@/constants/theme';

interface AvatarProps {
  name?: string | null;
  color?: string;
  imageUrl?: string | null;
  size?: number;
}

const DEFAULT_COLOR = Colors.primaryLight;

export function Avatar({ name, color, imageUrl, size = 40 }: AvatarProps) {
  const safeColor = color || DEFAULT_COLOR;
  const initials = (name || '?')
    .split(' ')
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const fontSize = size * 0.38;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: safeColor + '33',
          borderColor: safeColor,
        },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize, color: safeColor }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  initials: {
    fontFamily: Typography.fontFamily.bold,
    includeFontPadding: false,
  },
});
