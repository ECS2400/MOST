import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/hooks/useLanguage';
import {
  RelationshipAnniversary,
  RelationshipData,
  formatRelationshipDate,
  newAnniversaryId,
  parseDateInput,
  toIsoDate,
} from '@/services/relationshipDates';

type RelationshipSettingsPanelProps = {
  initialData: RelationshipData;
  onSave: (data: RelationshipData) => Promise<void>;
  onCancel?: () => void;
  compact?: boolean;
};

export function RelationshipSettingsPanel({
  initialData,
  onSave,
  onCancel,
  compact = false,
}: RelationshipSettingsPanelProps) {
  const { t, language } = useLanguage();
  const rs = t.relationshipSettings;
  const [startDate, setStartDate] = useState(initialData.startDate || '');
  const [anniversaries, setAnniversaries] = useState<RelationshipAnniversary[]>(
    initialData.anniversaries
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStartDate(initialData.startDate || '');
    setAnniversaries(initialData.anniversaries);
  }, [initialData.startDate, initialData.anniversaries]);

  const startDateObj = startDate ? new Date(`${startDate}T12:00:00`) : new Date();

  function handleStartPickerChange(_: unknown, date?: Date) {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (date) setStartDate(toIsoDate(date));
  }

  function addAnniversary() {
    const label = newLabel.trim();
    const date = parseDateInput(newDate);
    if (!label) {
      setError(rs.errNameRequired);
      return;
    }
    if (!date) {
      setError(rs.errDateInvalid);
      return;
    }
    setError('');
    setAnniversaries((prev) => [...prev, { id: newAnniversaryId(), label, date }]);
    setNewLabel('');
    setNewDate('');
  }

  function removeAnniversary(id: string) {
    setAnniversaries((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSave() {
    setError('');
    const parsedStart = startDate ? parseDateInput(startDate) : null;
    if (startDate && !parsedStart) {
      setError(rs.errStartInvalid);
      return;
    }
    setSaving(true);
    try {
      await onSave({ startDate: parsedStart, anniversaries });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : rs.saveError);
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>{rs.startTitle}</Text>
      <Text style={styles.sectionSub}>{rs.startSub}</Text>

      <Pressable
        onPress={() => setShowStartPicker(true)}
        style={({ pressed }) => [styles.dateBtn, { opacity: pressed ? 0.85 : 1 }]}
      >
        <MaterialIcons name="favorite" size={20} color={Colors.accent} />
        <Text style={styles.dateBtnText}>
          {startDate ? formatRelationshipDate(startDate, language) : rs.pickDate}
        </Text>
        <MaterialIcons name="calendar-today" size={18} color={Colors.textMuted} />
      </Pressable>

      {Platform.OS === 'web' ? (
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder={rs.datePlaceholder}
          placeholderTextColor={Colors.textMuted}
          style={styles.webDateInput}
          keyboardType="numbers-and-punctuation"
        />
      ) : null}

      {showStartPicker ? (
        <DateTimePicker
          value={startDateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={handleStartPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' && showStartPicker ? (
        <Pressable onPress={() => setShowStartPicker(false)} style={styles.iosPickerDone}>
          <Text style={styles.iosPickerDoneText}>{rs.done}</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>{rs.anniversariesTitle}</Text>
      <Text style={styles.sectionSub}>{rs.anniversariesSub}</Text>

      {anniversaries.map((a) => (
        <View key={a.id} style={styles.anniversaryRow}>
          <View style={styles.anniversaryInfo}>
            <Text style={styles.anniversaryLabel}>{a.label}</Text>
            <Text style={styles.anniversaryDate}>{formatRelationshipDate(a.date, language)}</Text>
          </View>
          <Pressable
            onPress={() => removeAnniversary(a.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="delete-outline" size={22} color={Colors.error} />
          </Pressable>
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder={rs.anniversaryNamePlaceholder}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, { flex: 1 }]}
        />
        <TextInput
          value={newDate}
          onChangeText={setNewDate}
          placeholder={rs.datePlaceholder}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, { width: 120 }]}
          keyboardType="numbers-and-punctuation"
        />
        <Pressable onPress={addAnniversary} style={styles.addBtn}>
          <MaterialIcons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        {onCancel ? (
          <Button title={rs.cancel} onPress={onCancel} variant="outline" style={{ flex: 1 }} />
        ) : null}
        <Button title={rs.save} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
      </View>
    </View>
  );

  if (compact) {
    return content;
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  dateBtnText: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  webDateInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  iosPickerDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
  },
  iosPickerDoneText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.primaryLight,
  },
  anniversaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  anniversaryInfo: {
    flex: 1,
    gap: 2,
  },
  anniversaryLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  anniversaryDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
