import React from 'react';
import { Modal, View, StyleSheet, Pressable, Text, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { RelationshipSettingsPanel } from '@/components/feature/RelationshipSettingsPanel';
import { RelationshipData } from '@/services/relationshipDates';
import { useLanguage } from '@/hooks/useLanguage';

type RelationshipSettingsModalProps = {
  visible: boolean;
  initialData: RelationshipData;
  onClose: () => void;
  onSave: (data: RelationshipData) => Promise<void>;
};

export function RelationshipSettingsModal({
  visible,
  initialData,
  onClose,
  onSave,
}: RelationshipSettingsModalProps) {
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t.profile.relationshipDays}</Text>
            <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <RelationshipSettingsPanel
              initialData={initialData}
              onSave={async (data) => {
                await onSave(data);
                onClose();
              }}
              onCancel={onClose}
              compact
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
});
