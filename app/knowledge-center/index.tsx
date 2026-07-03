import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { getKnowledgeImage } from '@/data/knowledgeCenter';
import { useLanguage } from '@/hooks/useLanguage';

export default function KnowledgeCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const options = [
    {
      key: 'on' as const,
      label: t.knowledgeCenter.forHim,
      subtitle: t.knowledgeCenter.forHimSub,
      description: t.knowledgeCenter.forHimDesc,
      gradient: [Colors.primary, Colors.gradientMid] as [string, string],
      imageIndex: 1,
    },
    {
      key: 'ona' as const,
      label: t.knowledgeCenter.forHer,
      subtitle: t.knowledgeCenter.forHerSub,
      description: t.knowledgeCenter.forHerDesc,
      gradient: [Colors.gradientMid, Colors.gradientEnd] as [string, string],
      imageIndex: 4,
    },
  ];

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
          <Text style={styles.title}>{t.knowledgeCenter.title}</Text>
          <Text style={styles.subtitle}>{t.knowledgeCenter.subtitle}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <MaterialIcons name="menu-book" size={28} color={Colors.primaryLight} />
          <Text style={styles.introText}>{t.knowledgeCenter.intro}</Text>
        </View>

        {options.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() =>
              router.push({ pathname: '/knowledge-center/[audience]', params: { audience: opt.key } })
            }
            style={({ pressed }) => [styles.optionCard, { opacity: pressed ? 0.92 : 1 }]}
          >
            <Image source={getKnowledgeImage(opt.imageIndex)} style={styles.optionImage} contentFit="cover" />
            <LinearGradient colors={opt.gradient} style={styles.optionOverlay}>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionSub}>{opt.subtitle}</Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
                <View style={styles.optionCta}>
                  <Text style={styles.optionCtaText}>{t.knowledgeCenter.openGuide}</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
    ...(Platform.OS === 'web'
      ? { maxWidth: 560, width: '100%', alignSelf: 'center' as const }
      : null),
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  introText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  optionCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 220,
    ...Shadow.md,
  },
  optionImage: {
    ...StyleSheet.absoluteFillObject,
  },
  optionOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  optionContent: { gap: 4 },
  optionLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['3xl'],
    color: '#fff',
  },
  optionSub: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: 'rgba(255,255,255,0.9)',
  },
  optionDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 19,
    marginTop: 4,
  },
  optionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  optionCtaText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: '#fff',
  },
});
