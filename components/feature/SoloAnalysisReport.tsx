import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  MappedAnalysisView,
  TextPair,
  SuggestionView,
} from '@/services/analysisViewMapper';
import type { SoloExtrasBundle } from '@/constants/i18n/soloExtras';

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <View style={styles.tagRow}>
      {tags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

function DoingWellBlock({ lead, detail }: TextPair) {
  return (
    <View style={styles.doingWellBox}>
      <Text style={styles.doingWellLead}>{lead}</Text>
      {detail ? <Text style={styles.doingWellDetail}>{detail}</Text> : null}
    </View>
  );
}

function SayBlock({ quote, tip }: SuggestionView) {
  return (
    <View style={styles.sayBlock}>
      <Text style={styles.sayQuote}>{quote}</Text>
      {tip ? <Text style={styles.sayTip}>{tip}</Text> : null}
    </View>
  );
}

function PartnerList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.partnerList}>
      {items.map((text) => (
        <View key={text} style={styles.partnerRow}>
          <View style={styles.partnerDot} />
          <Text style={styles.partnerText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

interface SoloAnalysisReportProps {
  analysis: MappedAnalysisView;
  labels: SoloExtrasBundle['report'];
  conversationTips: string[];
  readyLabel: string;
  suggestionsTitle: string;
  inviteLabel: string;
  newAnalysisLabel: string;
  coachLabel: string;
  onInvitePartner: () => void;
  onNewAnalysis: () => void;
  onStartCoach?: () => void;
}

export function SoloAnalysisReport({
  analysis,
  labels,
  conversationTips,
  readyLabel,
  suggestionsTitle,
  inviteLabel,
  newAnalysisLabel,
  coachLabel,
  onInvitePartner,
  onNewAnalysis,
  onStartCoach,
}: SoloAnalysisReportProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[Colors.success + '20', Colors.success + '08']}
        style={styles.resultHero}
      >
        <MaterialIcons name="check-circle" size={40} color={Colors.success} />
        <Text style={styles.resultHeroTitle}>{readyLabel}</Text>
        <Text style={styles.resultHeroSub}>{labels.resultHeroSub}</Text>
      </LinearGradient>

      <Card variant="elevated" style={styles.mainCard}>
        <Text style={styles.cardTitle}>{labels.yourSituation}</Text>
        <Text style={styles.aiNote}>{labels.aiNote}</Text>

        <Text style={styles.sectionLabel}>{labels.summary}</Text>
        <Text style={styles.bodyText}>{analysis.situationSummary}</Text>

        <View style={styles.sectionDivider} />

        <Text style={styles.sectionLabel}>{labels.howYouMightFeel}</Text>
        <TagList tags={analysis.emotionTags} />
        <Text style={styles.bodyText}>{analysis.emotionsExplanation}</Text>

        <View style={styles.sectionDivider} />

        <Text style={styles.sectionLabel}>{labels.yourNeeds}</Text>
        <TagList tags={analysis.needTags} />
        <Text style={styles.bodyText}>{analysis.needsExplanation}</Text>

        {analysis.keyTrigger ? (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionLabel}>{labels.whatHurtMost}</Text>
            <Text style={styles.bodyText}>{analysis.keyTrigger}</Text>
          </>
        ) : null}

        {analysis.whatCouldImprove ? (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionLabel}>{labels.whatCouldImprove}</Text>
            <Text style={styles.bodyMuted}>{analysis.whatCouldImprove}</Text>
          </>
        ) : null}

        <View style={styles.sectionDivider} />

        <Text style={styles.sectionLabel}>{labels.doingWell}</Text>
        <DoingWellBlock lead={analysis.doingWell.lead} detail={analysis.doingWell.detail} />

        {analysis.suggestion ? (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionLabel}>{labels.suggestedPhrase}</Text>
            <SayBlock quote={analysis.suggestion.quote} tip={analysis.suggestion.tip} />
          </>
        ) : null}
      </Card>

      <Card variant="bordered" style={styles.partnerCard}>
        <Text style={styles.cardTitle}>{labels.otherSide}</Text>
        <Text style={styles.partnerNote}>{labels.partnerHypothesis}</Text>

        <Text style={styles.sectionLabel}>{labels.possibleEmotions}</Text>
        <PartnerList items={analysis.partnerEmotions} />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{labels.possibleNeeds}</Text>
        <PartnerList items={analysis.partnerNeeds} />

        <View style={styles.sectionDivider} />

        <Text style={styles.sectionLabel}>{analysis.perspectiveGap.lead}</Text>
        {analysis.perspectiveGap.detail ? (
          <Text style={styles.partnerGapDetail}>{analysis.perspectiveGap.detail}</Text>
        ) : null}
      </Card>

      <View style={styles.suggestionsSection}>
        <Text style={styles.suggestionsSectionTitle}>{suggestionsTitle}</Text>
        {conversationTips.map((s, i) => (
          <View key={i} style={styles.suggestionItem}>
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientMid]}
              style={styles.suggestionNumber}
            >
              <Text style={styles.suggestionNumberText}>{i + 1}</Text>
            </LinearGradient>
            <Text style={styles.suggestionText}>{s}</Text>
          </View>
        ))}
      </View>

      {onStartCoach ? (
        <Button title={coachLabel} onPress={onStartCoach} fullWidth size="lg" />
      ) : null}
      <Button title={inviteLabel} onPress={onInvitePartner} fullWidth size="lg" variant={onStartCoach ? 'outline' : undefined} />
      <Button title={newAnalysisLabel} onPress={onNewAnalysis} variant="outline" fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  resultHero: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  resultHeroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.success,
  },
  resultHeroSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  mainCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  partnerCard: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    opacity: 0.92,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  aiNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  bodyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  bodyMuted: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  tagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    flexShrink: 1,
  },
  partnerNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionLabelSpaced: {
    marginTop: Spacing.md,
  },
  doingWellBox: {
    paddingLeft: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
    gap: 4,
  },
  doingWellLead: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  doingWellDetail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sayBlock: { gap: Spacing.sm },
  sayQuote: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  sayTip: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  partnerList: { gap: Spacing.sm },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  partnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
    marginTop: 8,
  },
  partnerText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  partnerGapDetail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  suggestionsSection: { gap: Spacing.md },
  suggestionsSectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  suggestionItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  suggestionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  suggestionNumberText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#fff',
  },
  suggestionText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    flex: 1,
    flexShrink: 1,
    lineHeight: 22,
  },
});
