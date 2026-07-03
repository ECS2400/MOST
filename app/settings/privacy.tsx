import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useLanguage } from '@/hooks/useLanguage';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  DATA_CONTROLLER,
  getPublicLegalUrl,
  LEGAL_DOCUMENTS,
  LEGAL_LAST_UPDATED,
  type LegalDocumentId,
  type LegalLanguage,
} from '@/constants/legal';
import { openSupportEmail, SUPPORT_EMAIL } from '@/services/supportEmail';

interface DataCategory {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  items: string[];
}

interface ThirdParty {
  name: string;
  purpose: string;
  policyUrl?: string;
}

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
  const pt = t.privacy;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const documents: { id: LegalDocumentId; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { id: 'privacy', icon: 'policy' },
    { id: 'terms', icon: 'gavel' },
    { id: 'subscriptions', icon: 'card-membership' },
  ];

  const dataCategories: DataCategory[] = [
    {
      icon: 'person',
      title: pt.dataAccountTitle,
      items: pt.dataAccountItems,
    },
    {
      icon: 'forum',
      title: pt.dataContentTitle,
      items: pt.dataContentItems,
    },
    {
      icon: 'payment',
      title: pt.dataPaymentTitle,
      items: pt.dataPaymentItems,
    },
    {
      icon: 'devices',
      title: pt.dataTechnicalTitle,
      items: pt.dataTechnicalItems,
    },
  ];

  const thirdParties: ThirdParty[] = [
    { name: 'Supabase', purpose: pt.thirdSupabase, policyUrl: 'https://supabase.com/privacy' },
    { name: 'OpenAI', purpose: pt.thirdOpenAi, policyUrl: 'https://openai.com/policies/privacy-policy' },
    { name: 'Google Play', purpose: pt.thirdGooglePlay, policyUrl: 'https://policies.google.com/privacy' },
    { name: 'RevenueCat', purpose: pt.thirdRevenueCat, policyUrl: 'https://www.revenuecat.com/privacy' },
  ];

  const rights = pt.rightsItems.map((label, i) => ({ id: i, label }));

  const legalLang: LegalLanguage = (
    ['pl', 'en', 'it', 'es', 'de', 'fr'].includes(language) ? language : 'pl'
  ) as LegalLanguage;

  function openDocument(id: LegalDocumentId) {
    if (id === 'privacy') {
      openPublicUrl('privacy');
      return;
    }
    router.push(`/legal/${id}`);
  }

  async function openPublicUrl(id: LegalDocumentId) {
    const url = getPublicLegalUrl(id, legalLang);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Alert.alert(pt.publicUrlTitle, url);
    }
  }

  function requestAccountDeletion() {
    openSupportEmail({
      subject: 'Most — żądanie usunięcia konta (RODO)',
      body:
        'Proszę o usunięcie mojego konta i danych osobowych zgodnie z RODO.\n\n' +
        'Adres e-mail konta:\n\n' +
        'Powód (opcjonalnie):\n\n',
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{pt.title}</Text>
            <Text style={styles.subtitle}>{pt.subtitle}</Text>
          </View>
        </View>

        <LinearGradient
          colors={[Colors.gradientStart + '25', Colors.gradientMid + '10']}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <MaterialIcons name="privacy-tip" size={32} color={Colors.primaryLight} />
          </View>
          <Text style={styles.heroTitle}>{pt.heroTitle}</Text>
          <Text style={styles.heroSub}>{pt.heroSub}</Text>
          <Text style={styles.controller}>
            {pt.controllerLabel}: {DATA_CONTROLLER.name}
          </Text>
          <Text style={styles.controllerEmail}>{SUPPORT_EMAIL}</Text>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{pt.documentsTitle}</Text>
          <Text style={styles.sectionSub}>{pt.documentsSub}</Text>
        </View>

        <Card style={styles.listCard}>
          {documents.map((doc, index) => {
            const meta = LEGAL_DOCUMENTS[doc.id];
            return (
              <Pressable
                key={doc.id}
                onPress={() => openDocument(doc.id)}
                style={({ pressed }) => [
                  styles.docRow,
                  index < documents.length - 1 && styles.rowBorder,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.docIconWrap}>
                  <MaterialIcons name={doc.icon} size={20} color={Colors.primaryLight} />
                </View>
                <View style={styles.docText}>
                  <Text style={styles.docTitle}>
                    {language === 'pl' ? meta.titlePl : meta.titleEn}
                  </Text>
                  <Text style={styles.docSub}>
                    {doc.id === 'privacy' ? pt.publicPolicyLink : pt.tapToRead}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
              </Pressable>
            );
          })}
        </Card>

        <Pressable
          onPress={() => openPublicUrl('privacy')}
          style={({ pressed }) => [styles.urlPill, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name="language" size={14} color={Colors.primaryLight} />
          <Text style={styles.urlText} numberOfLines={2}>
            {pt.publicPolicyLink}
          </Text>
          <MaterialIcons name="open-in-new" size={16} color={Colors.textMuted} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{pt.dataCollectedTitle}</Text>
          <Text style={styles.sectionSub}>{pt.dataCollectedSub}</Text>
        </View>

        {dataCategories.map((cat) => (
          <Card key={cat.title} variant="bordered" style={styles.dataCard}>
            <View style={styles.dataCardHeader}>
              <MaterialIcons name={cat.icon} size={20} color={Colors.primaryLight} />
              <Text style={styles.dataCardTitle}>{cat.title}</Text>
            </View>
            {cat.items.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </Card>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{pt.thirdPartiesTitle}</Text>
        </View>

        <Card style={styles.listCard}>
          {thirdParties.map((party, index) => (
            <View
              key={party.name}
              style={[styles.thirdRow, index < thirdParties.length - 1 && styles.rowBorder]}
            >
              <View style={styles.thirdText}>
                <Text style={styles.thirdName}>{party.name}</Text>
                <Text style={styles.thirdPurpose}>{party.purpose}</Text>
              </View>
              {party.policyUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(party.policyUrl!)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <MaterialIcons name="open-in-new" size={18} color={Colors.primaryLight} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{pt.rightsTitle}</Text>
          <Text style={styles.sectionSub}>{pt.rightsSub}</Text>
        </View>

        <Card style={styles.listCard}>
          {rights.map((right, index) => (
            <View
              key={right.id}
              style={[styles.rightRow, index < rights.length - 1 && styles.rowBorder]}
            >
              <MaterialIcons name="verified-user" size={18} color={Colors.primaryLight} />
              <Text style={styles.rightLabel}>{right.label}</Text>
            </View>
          ))}
        </Card>
        <Text style={styles.rightsDetail}>{pt.rightsDetail}</Text>

        <Card variant="bordered" style={styles.deleteCard}>
          <MaterialIcons name="delete-forever" size={24} color={Colors.error} />
          <View style={styles.deleteText}>
            <Text style={styles.deleteTitle}>{pt.deleteAccountTitle}</Text>
            <Text style={styles.deleteSub}>{pt.deleteAccountSub}</Text>
          </View>
          <Button
            title={pt.deleteAccountBtn}
            onPress={requestAccountDeletion}
            variant="outline"
            fullWidth
            style={{ borderColor: Colors.error + '60' }}
            textStyle={{ color: Colors.error }}
          />
        </Card>

        <Card variant="bordered" style={styles.infoCard}>
          <Text style={styles.disclaimer}>{pt.disclaimer}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{pt.versionLabel}</Text>
            <Text style={styles.metaValue}>{appVersion}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{pt.lastUpdated}</Text>
            <Text style={styles.metaValue}>{LEGAL_LAST_UPDATED}</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
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
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  heroSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  controller: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  controllerEmail: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  sectionHeader: { gap: 4 },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  listCard: { padding: 0, overflow: 'hidden' },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docText: { flex: 1 },
  docTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  docSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  playNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: -Spacing.xs,
  },
  urlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginTop: -Spacing.xs,
  },
  urlText: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    lineHeight: 18,
  },
  dataCard: { gap: Spacing.sm },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dataCardTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 4,
  },
  bullet: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  thirdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  thirdText: { flex: 1 },
  thirdName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  thirdPurpose: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  rightLabel: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  rightDetail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingLeft: Spacing.md + 18 + Spacing.sm,
  },
  rightsDetail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: -Spacing.xs,
  },
  deleteCard: {
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  deleteText: { gap: 4 },
  deleteTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  deleteSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoCard: { gap: Spacing.sm },
  disclaimer: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  metaValue: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
});
