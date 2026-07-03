import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { openSupportEmail, SUPPORT_EMAIL } from '@/services/supportEmail';

interface FaqItem {
  question: string;
  answer: string;
}

interface TopicItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subject: string;
  body: string;
}

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const ht = t.help;

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const faqs: FaqItem[] = [
    { question: ht.faqWhatIsTitle, answer: ht.faqWhatIsBody },
    { question: ht.faqMediationTitle, answer: ht.faqMediationBody },
    { question: ht.faqPartnerTitle, answer: ht.faqPartnerBody },
    { question: ht.faqPremiumTitle, answer: ht.faqPremiumBody },
    { question: ht.faqCancelTitle, answer: ht.faqCancelBody },
    { question: ht.faqPrivacyTitle, answer: ht.faqPrivacyBody },
    { question: ht.faqAiTitle, answer: ht.faqAiBody },
    { question: ht.faqTechnicalTitle, answer: ht.faqTechnicalBody },
  ];

  const topics: TopicItem[] = [
    {
      icon: 'bug-report',
      label: ht.topicTechnical,
      subject: 'Most — problem techniczny',
      body: 'Opisz problem:\n\n- Co się stało:\n- Kiedy:\n- Urządzenie / system:\n\n',
    },
    {
      icon: 'credit-card',
      label: ht.topicSubscription,
      subject: 'Most — subskrypcja i płatności',
      body: 'Opisz problem z subskrypcją:\n\n- Plan:\n- Data zakupu:\n- Opis problemu:\n\n',
    },
    {
      icon: 'person',
      label: ht.topicAccount,
      subject: 'Most — konto i logowanie',
      body: 'Opisz problem z kontem:\n\n- Adres e-mail konta:\n- Opis problemu:\n\n',
    },
    {
      icon: 'forum',
      label: ht.topicMediation,
      subject: 'Most — mediacje i AI',
      body: 'Opisz pytanie lub problem:\n\n',
    },
    {
      icon: 'help-outline',
      label: ht.topicOther,
      subject: 'Most — pytanie',
      body: 'Twoje pytanie:\n\n',
    },
  ];

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
          <View style={styles.headerText}>
            <Text style={styles.title}>{ht.title}</Text>
            <Text style={styles.subtitle}>{ht.subtitle}</Text>
          </View>
        </View>

        <LinearGradient
          colors={[Colors.gradientStart + '25', Colors.gradientMid + '10']}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <MaterialIcons name="support-agent" size={32} color={Colors.primaryLight} />
          </View>
          <Text style={styles.heroTitle}>{ht.contactTitle}</Text>
          <Text style={styles.heroSub}>{ht.contactDesc}</Text>
          <Text style={styles.heroEmail}>{SUPPORT_EMAIL}</Text>
          <Button
            title={ht.contactBtn}
            onPress={() => openSupportEmail()}
            fullWidth
            style={styles.contactBtn}
          />
          <Text style={styles.responseTime}>{ht.responseTime}</Text>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{ht.topicsTitle}</Text>
          <Text style={styles.sectionSub}>{ht.topicsDesc}</Text>
        </View>

        <Card style={styles.listCard}>
          {topics.map((topic, index) => (
            <Pressable
              key={topic.label}
              onPress={() => openSupportEmail({ subject: topic.subject, body: topic.body })}
              style={({ pressed }) => [
                styles.topicRow,
                index < topics.length - 1 && styles.topicRowBorder,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.topicIconWrap}>
                <MaterialIcons name={topic.icon} size={20} color={Colors.primaryLight} />
              </View>
              <Text style={styles.topicLabel}>{topic.label}</Text>
              <MaterialIcons name="mail-outline" size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{ht.faqTitle}</Text>
        </View>

        <Card style={styles.listCard}>
          {faqs.map((faq, index) => {
            const isOpen = expandedFaq === index;
            return (
              <View
                key={faq.question}
                style={[index < faqs.length - 1 && styles.faqRowBorder]}
              >
                <Pressable
                  onPress={() => setExpandedFaq(isOpen ? null : index)}
                  style={({ pressed }) => [
                    styles.faqHeader,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <MaterialIcons
                    name={isOpen ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={Colors.textMuted}
                  />
                </Pressable>
                {isOpen ? (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                ) : null}
              </View>
            );
          })}
        </Card>

        <Card variant="bordered" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="info-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.disclaimer}>{ht.disclaimer}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{ht.versionLabel}</Text>
            <Text style={styles.versionValue}>{appVersion}</Text>
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
    paddingBottom: Spacing.xl,
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
    marginBottom: 4,
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
  heroEmail: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.primaryLight,
  },
  contactBtn: { marginTop: Spacing.xs },
  responseTime: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
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
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  topicRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topicIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicLabel: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  faqRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  faqAnswer: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  infoCard: { gap: Spacing.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  disclaimer: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  versionLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  versionValue: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
});
