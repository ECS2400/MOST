import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/hooks/useLanguage';
import { Language, LANGUAGES } from '@/constants/i18n';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';

export default function LanguageSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();

  async function handleSelect(lang: Language) {
    await setLanguage(lang);
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.title}>{t.settings.languageTitle}</Text>
            <Text style={styles.subtitle}>{t.settings.languageSub}</Text>
          </View>
        </View>

        <View style={styles.langList}>
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                style={({ pressed }) => [
                  styles.langRow,
                  isSelected && styles.langRowActive,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={[Colors.primary + '25', Colors.gradientMid + '10']}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={styles.langText}>
                  <Text style={[styles.langNative, isSelected && styles.langNativeActive]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={styles.langEnglish}>{lang.label}</Text>
                </View>
                {isSelected ? (
                  <MaterialIcons name="check-circle" size={22} color={Colors.primaryLight} />
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={22} color={Colors.border} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.note}>{t.settings.languageNote}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  langList: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  langRowActive: {
    borderColor: Colors.primary + '40',
  },
  flag: {
    fontSize: 28,
  },
  langText: { flex: 1, gap: 2 },
  langNative: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  langNativeActive: {
    color: Colors.primaryLight,
  },
  langEnglish: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  note: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
});
