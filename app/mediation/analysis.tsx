import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { getSoloExtras } from '@/constants/i18n/soloExtras';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/services/supabase';
import {
  fetchMediationForAnalysis,
  MediationAnalysisError,
  resolveMediationAnalysis,
  saveHostMediationAnalysis,
  type MediationAnalysisRow,
} from '@/services/mediationAnalysisRun';
import {
  isAnalysisEchoingForm,
  sanitizeTags,
  type MediationAnalysis,
} from '@/services/mediationAnalysisInterpret';
import { markPartnerJoined } from '@/services/mediationPartner';

export type { MediationAnalysis };

interface TextPair {
  lead: string;
  detail?: string;
}

interface SuggestionView {
  quote: string;
  tip?: string;
}

interface MappedAnalysis {
  situationSummary: string;
  emotionTags: string[];
  emotionsExplanation: string;
  needTags: string[];
  needsExplanation: string;
  keyTrigger: string;
  whatCouldImprove: string;
  doingWell: TextPair;
  suggestion: SuggestionView | null;
  partnerEmotions: string[];
  partnerNeeds: string[];
  perspectiveGap: TextPair;
}

const DEFAULT_SAY_TIP =
  'Powiedz spokojnie, w pierwszej osobie — unikaj „Ty zawsze…”.';

function stringTags(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map((s) => s.trim()).filter(Boolean).slice(0, 5);
}

function cleanQuote(text: string): string {
  let quote = stripQuotes(text.trim());
  quote = quote.split(/\s*[—–]\s*/)[0]?.trim() || quote;
  return stripQuotes(quote);
}

function normalizeTip(tip?: string): string | undefined {
  const trimmed = tip?.trim();
  if (!trimmed) return undefined;
  if (/w pierwszej osobie/i.test(trimmed)) return DEFAULT_SAY_TIP;
  return trimmed;
}

function stripQuotes(text: string): string {
  return text.replace(/^[„""]\s*/, '').replace(/\s*["""]$/, '').trim();
}

function cleanInsightPrefix(text: string): string {
  return text
    .replace(/^z\s+twojej\s+perspektywy\s+kluczowe\s+było:\s*/i, '')
    .trim();
}

function splitLegacyPair(text: string): TextPair {
  const match = text.match(/^(.+?)\s*[—–]\s*(.+)$/s);
  if (!match) return { lead: text.trim() };
  return { lead: match[1].trim(), detail: match[2].trim() };
}

function normalizePair(lead?: string, detail?: string): TextPair | null {
  const leadTrim = lead?.trim();
  const detailTrim = detail?.trim();
  if (!leadTrim && !detailTrim) return null;

  if (leadTrim && detailTrim) {
    return { lead: leadTrim, detail: cleanInsightPrefix(detailTrim) };
  }

  if (leadTrim) {
    const parsed = splitLegacyPair(leadTrim);
    if (parsed.detail) {
      return {
        lead: parsed.lead,
        detail: cleanInsightPrefix(parsed.detail),
      };
    }
    return { lead: leadTrim };
  }

  return { lead: detailTrim! };
}

function parseLegacyWhatWentWrong(text: string): TextPair {
  const keyMatch = text.match(
    /^(.+?)\s*[—–]\s*z\s+twojej\s+perspektywy\s+kluczowe\s+było:\s*(.+)$/is
  );
  if (keyMatch) {
    return {
      lead: keyMatch[1].trim(),
      detail: keyMatch[2].trim(),
    };
  }
  const parsed = splitLegacyPair(text);
  if (parsed.detail) {
    return {
      lead: parsed.lead,
      detail: cleanInsightPrefix(parsed.detail),
    };
  }
  return { lead: text.trim() };
}

function mapTextPair(
  lead?: string,
  detail?: string,
  legacy?: string,
  fallbackLead?: string,
  fallbackDetail?: string
): TextPair {
  const normalized = normalizePair(lead, detail);
  if (normalized) return normalized;

  if (legacy) return parseLegacyWhatWentWrong(legacy);

  return {
    lead: fallbackLead || '',
    detail: fallbackDetail,
  };
}

function mapSuggestion(raw: MediationAnalysis): SuggestionView | null {
  if (raw.suggestion_quote?.trim()) {
    const quote = cleanQuote(raw.suggestion_quote);
    const tip = normalizeTip(
      raw.suggestion_tip?.trim() || splitLegacyPair(raw.suggestion_quote).detail
    );
    return { quote, tip: tip !== quote ? tip : DEFAULT_SAY_TIP };
  }

  const legacy = raw.suggestions?.[0]?.trim();
  if (!legacy) return null;

  const quoteMatch = legacy.match(/„([^"]+)”/);
  if (quoteMatch) {
    return {
      quote: cleanQuote(quoteMatch[1]),
      tip: normalizeTip(legacy.match(/[—–]\s*(.+)$/)?.[1]?.trim()) || DEFAULT_SAY_TIP,
    };
  }

  const split = splitLegacyPair(legacy);
  return split.detail
    ? { quote: cleanQuote(split.lead), tip: normalizeTip(split.detail) }
    : { quote: cleanQuote(legacy), tip: DEFAULT_SAY_TIP };
}

function mapAnalysis(raw: MediationAnalysis | null): MappedAnalysis | null {
  if (!raw) return null;

  const situationSummary =
    raw.situation_summary?.trim() ||
    raw.situation_facts?.trim() ||
    'Sytuacja wymaga doprecyzowania w rozmowie.';

  const emotionTags = sanitizeTags(stringTags(raw.user_emotions || raw.emotions));
  const emotionsExplanation =
    raw.emotions_explanation?.trim() ||
    'Przy takim konflikcie naturalne są silne emocje — to sygnał, że coś w relacji wymaga uwagi.';

  const needTags = sanitizeTags(stringTags(raw.user_needs || raw.common_ground));
  const needsExplanation =
    raw.needs_explanation?.trim() ||
    'Za konfliktem stoją niespełnione potrzeby emocjonalne — warto nazwać je wprost.';

  const keyTrigger = cleanInsightPrefix(raw.key_trigger?.trim() || '');

  const whatCouldImprove =
    raw.what_could_improve?.trim()?.includes('—')
      ? ''
      : raw.what_could_improve?.trim() || '';

  const doingWell = mapTextPair(
    raw.doing_well,
    raw.doing_well_detail,
    raw.celebration || raw.bridgeStatement,
    'Szukasz dialogu zamiast eskalacji.',
    'To dojrzały krok w stronę rozwiązania.'
  );

  const perspectiveGap = mapTextPair(
    raw.perspective_gap_title,
    raw.perspective_gap_detail,
    raw.perspective_gap || raw.misunderstanding,
    'Różnica perspektyw',
    'Wasze interpretacje mogły się rozejść.'
  );

  const partnerEmotions = sanitizeTags(
    stringTags(raw.partner_emotions || raw.partnerEmotions)
  );
  const partnerNeeds = sanitizeTags(
    stringTags(raw.partner_needs || raw.partnerNeeds)
  );

  return {
    situationSummary,
    emotionTags,
    emotionsExplanation,
    needTags,
    needsExplanation,
    keyTrigger,
    whatCouldImprove,
    doingWell,
    suggestion: mapSuggestion(raw),
    partnerEmotions:
      partnerEmotions.length > 0
        ? partnerEmotions
        : ['presja', 'niezrozumienie'],
    partnerNeeds:
      partnerNeeds.length > 0
        ? partnerNeeds
        : ['autonomia', 'brak oskarżeń'],
    perspectiveGap,
  };
}

function LoadingView() {
  return (
    <View style={styles.loadingWrap}>
      <View style={styles.spinnerOuter}>
        <View style={styles.spinnerRing}>
          <View style={styles.spinnerDot} />
        </View>
        <MaterialIcons name="favorite" size={28} color={Colors.primaryLight} />
      </View>
      <Text style={styles.loadingTitle}>Przygotowujemy podsumowanie...</Text>
      <Text style={styles.loadingSub}>To może potrwać do 30 sekund</Text>
    </View>
  );
}

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

export default function MediationAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const lm = getLiveMediationExtras(language);
  const report = getSoloExtras(language).report;
  const { mediationId, role } = useLocalSearchParams<{ mediationId: string; role?: string }>();
  const isPartner = role === 'partner';

  const [phase, setPhase] = useState<'loading' | 'pending' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<ReturnType<typeof mapAnalysis>>(null);
  const [rowId, setRowId] = useState<string | null>(null);

  const loadAndAnalyze = useCallback(async () => {
    if (!user || !mediationId) {
      setPhase('error');
      setError(lm.analysis.noMediationId);
      return;
    }

    setPhase('loading');
    setError('');

    try {
      const row = await fetchMediationForAnalysis(
        mediationId,
        user.id,
        Boolean(isPartner)
      );

      setRowId(row.id);

      const combined = isPartner
        ? row.partner_combined_description || ''
        : row.combined_description || '';
      const storedAnalysis = (
        isPartner ? row.partner_analysis : row.analysis
      ) as MediationAnalysis | null;

      const analysisRow: MediationRow = isPartner
        ? { ...row, combined_description: combined, analysis: storedAnalysis }
        : row;

      if (storedAnalysis && !isAnalysisEchoingForm(storedAnalysis, combined)) {
        setAnalysis(mapAnalysis(storedAnalysis));
        setPhase('ready');
        return;
      }

      const result = await resolveMediationAnalysis(analysisRow, language || 'pl', {
        participantName: user?.name,
      });

      try {
        if (isPartner) {
          await supabase
            .from('mediations')
            .update({
              partner_analysis: result,
              partner_joined: true,
              partner_joined_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id);
        } else {
          await saveHostMediationAnalysis(row.id, result);
        }
      } catch (saveError) {
        if (saveError instanceof MediationAnalysisError) {
          // Show analysis even when persistence fails.
        }
      }

      setAnalysis(mapAnalysis(result));
      setPhase('ready');
    } catch (e: unknown) {
      setPhase('error');
      if (e instanceof MediationAnalysisError) {
        setError(lm.analysis.loadError);
        return;
      }
      setError(e instanceof Error ? e.message : lm.analysis.loadError);
    }
  }, [isPartner, language, lm.analysis.loadError, lm.analysis.noMediationId, lm.analysis.notFound, mediationId, user]);

  useEffect(() => {
    loadAndAnalyze();
  }, [loadAndAnalyze]);

  async function handleSaveDraft() {
    if (rowId) {
      await supabase
        .from('mediations')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rowId);
    }
    router.replace('/(tabs)');
  }

  async function handleTalk() {
    if (isPartner) {
      if (rowId && user) {
        await markPartnerJoined(rowId, user.id).catch(() => {});
      }

      const { data } = await supabase
        .from('mediations')
        .select('status')
        .eq('id', rowId || mediationId || '')
        .maybeSingle();

      if (data?.status === 'live') {
        router.replace({
          pathname: '/mediation/session',
          params: { mediationId: rowId || mediationId || '' },
        });
        return;
      }

      router.replace({
        pathname: '/mediation/invite',
        params: { mediationId: rowId || mediationId || '', role: 'partner' },
      });
      return;
    }

    router.push({
      pathname: '/mediation/invite',
      params: { mediationId: rowId || mediationId || '' },
    });
  }

  const showLoading = phase === 'loading';
  const showPending = phase === 'pending';

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{lm.analysis.title}</Text>
      </View>

      {showLoading ? (
        <LoadingView />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {phase === 'error' ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button title={lm.analysis.retry} onPress={loadAndAnalyze} variant="outline" />
            </View>
          ) : null}

          {showPending ? (
            <Card variant="bordered" style={styles.pendingCard}>
              <MaterialIcons name="hourglass-top" size={22} color={Colors.primaryLight} />
              <Text style={styles.pendingTitle}>{lm.analysis.pendingTitle}</Text>
              <Text style={styles.pendingSub}>{lm.analysis.pendingSub}</Text>
              <Button title={lm.analysis.refresh} onPress={loadAndAnalyze} variant="outline" />
            </Card>
          ) : null}

          {phase === 'ready' && analysis ? (
            <>
              <Card variant="elevated" style={styles.mainCard}>
                <Text style={styles.cardTitle}>{report.yourSituation}</Text>
                <Text style={styles.aiNote}>{report.aiNote}</Text>

                <Text style={styles.sectionLabel}>{report.summary}</Text>
                <Text style={styles.bodyText}>{analysis.situationSummary}</Text>

                <View style={styles.sectionDivider} />

                <Text style={styles.sectionLabel}>{report.howYouMightFeel}</Text>
                <TagList tags={analysis.emotionTags} />
                <Text style={styles.bodyText}>{analysis.emotionsExplanation}</Text>

                <View style={styles.sectionDivider} />

                <Text style={styles.sectionLabel}>{report.yourNeeds}</Text>
                <TagList tags={analysis.needTags} />
                <Text style={styles.bodyText}>{analysis.needsExplanation}</Text>

                {analysis.keyTrigger ? (
                  <>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionLabel}>{report.whatHurtMost}</Text>
                    <Text style={styles.bodyText}>{analysis.keyTrigger}</Text>
                  </>
                ) : null}

                {analysis.whatCouldImprove ? (
                  <>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionLabel}>{report.whatCouldImprove}</Text>
                    <Text style={styles.bodyMuted}>{analysis.whatCouldImprove}</Text>
                  </>
                ) : null}

                <View style={styles.sectionDivider} />

                <Text style={styles.sectionLabel}>{report.doingWell}</Text>
                <DoingWellBlock
                  lead={analysis.doingWell.lead}
                  detail={analysis.doingWell.detail}
                />

                {analysis.suggestion ? (
                  <>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionLabel}>{report.suggestedPhrase}</Text>
                    <SayBlock
                      quote={analysis.suggestion.quote}
                      tip={analysis.suggestion.tip}
                    />
                  </>
                ) : null}
              </Card>

              <Card variant="bordered" style={styles.partnerCard}>
                <Text style={styles.cardTitle}>{report.otherSide}</Text>
                <Text style={styles.partnerNote}>{report.partnerHypothesis}</Text>

                <Text style={styles.sectionLabel}>{report.possibleEmotions}</Text>
                <PartnerList items={analysis.partnerEmotions} />

                <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
                  {report.possibleNeeds}
                </Text>
                <PartnerList items={analysis.partnerNeeds} />

                <View style={styles.sectionDivider} />

                <Text style={styles.sectionLabel}>{analysis.perspectiveGap.lead}</Text>
                {analysis.perspectiveGap.detail ? (
                  <Text style={styles.partnerGapDetail}>{analysis.perspectiveGap.detail}</Text>
                ) : null}
              </Card>

              <View style={styles.actions}>
                <Button
                  title={isPartner ? lm.analysis.partnerReadyBtn : lm.analysis.talkBtn}
                  onPress={handleTalk}
                  fullWidth
                  size="lg"
                />
                {!isPartner ? (
                  <Button
                    title={lm.analysis.saveLaterBtn}
                    onPress={handleSaveDraft}
                    variant="outline"
                    fullWidth
                    size="lg"
                  />
                ) : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const SPINNER_SIZE = 88;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
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
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  spinnerOuter: {
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  spinnerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SPINNER_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.primary + '35',
    borderTopColor: Colors.primaryLight,
  },
  spinnerDot: {
    position: 'absolute',
    top: -2,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
  },
  loadingTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  loadingSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
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
  },
  tagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  partnerNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  textField: {
    gap: 4,
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
  },
  fieldBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 24,
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
  sayBlock: {
    gap: Spacing.sm,
  },
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
  partnerList: {
    gap: Spacing.sm,
  },
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
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  errorBox: {
    gap: Spacing.md,
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.error + '12',
    borderRadius: Radius.lg,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  pendingCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  pendingTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  pendingSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
});
