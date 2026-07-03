import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { LEGAL_DOCUMENTS, type LegalDocumentId } from '@/constants/legal';
import { getLegalDocument } from '@/data/legal';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';

const VALID_DOCS = new Set<string>(['privacy', 'terms', 'subscriptions']);

export default function LegalDocumentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { document } = useLocalSearchParams<{ document: string }>();
  const { language, t } = useLanguage();

  const docId = VALID_DOCS.has(document) ? (document as LegalDocumentId) : 'privacy';
  const content = getLegalDocument(docId, language);
  const meta = LEGAL_DOCUMENTS[docId];
  const pt = t.privacy;

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
        <Text style={styles.title} numberOfLines={2}>
          {language === 'pl' ? meta.titlePl : meta.titleEn}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <LegalDocumentView
          document={content}
          lastUpdatedLabel={`${pt.lastUpdated}: ${content.lastUpdated}`}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
