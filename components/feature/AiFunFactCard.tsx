import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import type { SoloExtrasBundle } from '@/constants/i18n/soloExtras';
import { useLanguage } from '@/hooks/useLanguage';
import { getSoloExtras } from '@/constants/i18n/soloExtras';

interface AiFunFactCardProps {
  text: string;
  onDismiss: () => void;
  labels?: SoloExtrasBundle['funFact'];
}

export function AiFunFactCard({ text, onDismiss, labels }: AiFunFactCardProps) {
  const { language } = useLanguage();
  const ff = labels ?? getSoloExtras(language).funFact;
  const [minimized, setMinimized] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.header}>
          <MaterialIcons name="lightbulb-outline" size={16} color={Colors.warning} />
          <Text style={styles.label}>{ff.label}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => setMinimized((v) => !v)}
              hitSlop={8}
              accessibilityLabel={minimized ? ff.expand : ff.minimize}
            >
              <MaterialIcons
                name={minimized ? 'expand-more' : 'expand-less'}
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>
            <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel={ff.close}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>
        {!minimized ? <Text style={styles.text}>{text}</Text> : null}
        <Text style={styles.tooltip}>{ff.onlyYouSee}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6, marginBottom: 4 },
  card: {
    backgroundColor: Colors.warning + '12',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.warning + '44',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.warning,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  tooltip: {
    marginTop: 6,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
});
