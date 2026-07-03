import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { savePartnerPerspective } from '@/services/mediationPartner';

export default function PartnerPerspectiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const lm = getLiveMediationExtras(language);
  const { mediationId } = useLocalSearchParams<{ mediationId: string }>();

  const [whatHappened, setWhatHappened] = useState('');
  const [whatAngered, setWhatAngered] = useState('');
  const [howFelt, setHowFelt] = useState('');
  const [whatNeeded, setWhatNeeded] = useState('');
  const [whatToSay, setWhatToSay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(
    () =>
      [whatHappened, whatAngered, howFelt, whatNeeded, whatToSay].some((v) => v.trim().length > 0),
    [whatHappened, whatAngered, howFelt, whatNeeded, whatToSay]
  );

  async function handleSubmit() {
    if (!user || !mediationId || !canSubmit || loading) return;

    setError('');
    setLoading(true);
    try {
      await savePartnerPerspective(mediationId, user.id, {
        whatHappened,
        whatAngered,
        howFelt,
        whatNeeded,
        whatToSay,
      });

      router.replace({
        pathname: '/mediation/analysis',
        params: { mediationId, role: 'partner' },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Nie udało się zapisać perspektywy.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Twoja perspektywa</Text>
        </View>

        <Text style={styles.intro}>
          Partner rozpoczął mediację. Opisz sytuację ze swojej strony — to pomoże AI poprowadzić
          rozmowę sprawiedliwie dla Was obojga.
        </Text>

        <View style={styles.section}>
          <Input
            label={lm.new.whatHappened}
            value={whatHappened}
            onChangeText={setWhatHappened}
            placeholder={lm.new.whatHappenedPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Input
            label={lm.new.whatAngered}
            value={whatAngered}
            onChangeText={setWhatAngered}
            placeholder={lm.new.whatAngeredPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Input
            label={lm.new.howFelt}
            value={howFelt}
            onChangeText={setHowFelt}
            placeholder={lm.new.howFeltPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Input
            label={lm.new.whatNeeded}
            value={whatNeeded}
            onChangeText={setWhatNeeded}
            placeholder={lm.new.whatNeededPlaceholder}
            multiline
            numberOfLines={3}
          />
          <Input
            label={lm.new.whatToSay}
            value={whatToSay}
            onChangeText={setWhatToSay}
            placeholder={lm.new.whatToSayPlaceholder}
            multiline
            numberOfLines={4}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Przejdź do analizy AI"
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  intro: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  section: { gap: Spacing.sm },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
  },
});
