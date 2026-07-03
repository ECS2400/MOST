import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import type { LegalDocumentContent } from '@/data/legal/types';

interface LegalDocumentViewProps {
  document: LegalDocumentContent;
  lastUpdatedLabel?: string;
}

export function LegalDocumentView({ document, lastUpdatedLabel }: LegalDocumentViewProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.updated}>
        {lastUpdatedLabel ?? `Ostatnia aktualizacja: ${document.lastUpdated}`}
      </Text>
      {document.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs.map((paragraph, i) => (
            <Text key={`${section.title}-${i}`} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  updated: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  paragraph: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
});
