import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { RelationshipSettingsPanel } from '@/components/feature/RelationshipSettingsPanel';
import { useRelationship } from '@/hooks/useRelationship';
import { useLanguage } from '@/hooks/useLanguage';

export default function RelationshipSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, save } = useRelationship();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t.profile.relationshipDays}</Text>
          <Text style={styles.subtitle}>{t.relationshipSettings.subtitle}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <RelationshipSettingsPanel
          initialData={data}
          onSave={async (next) => {
            await save(next);
            router.back();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
});
