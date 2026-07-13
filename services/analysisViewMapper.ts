import {
  sanitizeAnalysisPersona,
  sanitizePersonaText,
} from '@/services/analysisPersona';
import {
  sanitizeTags,
  type MediationAnalysis,
} from '@/services/mediationAnalysisInterpret';
import type { Language } from '@/constants/i18n';
import { getSoloExtras } from '@/constants/i18n/soloExtras';

export interface TextPair {
  lead: string;
  detail?: string;
}

export interface SuggestionView {
  quote: string;
  tip?: string;
}

export interface MappedAnalysisView {
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

const DEFAULT_SAY_TIP_PL =
  'Powiedz spokojnie, w pierwszej osobie — unikaj „Ty zawsze…”.';

function getDefaults(lang: Language) {
  return getSoloExtras(lang).mapperDefaults;
}

function stringTags(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map((s) => s.trim()).filter(Boolean).slice(0, 5);
}

function stripQuotes(text: string): string {
  return text.replace(/^[„""]\s*/, '').replace(/\s*["""]$/, '').trim();
}

function cleanQuote(text: string): string {
  let quote = stripQuotes(text.trim());
  quote = quote.split(/\s*[—–]\s*/)[0]?.trim() || quote;
  return stripQuotes(quote);
}

function normalizeTip(tip?: string, defaultTip = DEFAULT_SAY_TIP_PL): string | undefined {
  const trimmed = tip?.trim();
  if (!trimmed) return undefined;
  if (/w pierwszej osobie|first person|prima persona|Ich-Form|première personne|primera persona/i.test(trimmed)) {
    return defaultTip;
  }
  return trimmed;
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

function mapSuggestion(raw: MediationAnalysis, defaultTip: string): SuggestionView | null {
  if (raw.suggestion_quote?.trim()) {
    const quote = cleanQuote(raw.suggestion_quote);
    const tip = normalizeTip(
      raw.suggestion_tip?.trim() || splitLegacyPair(raw.suggestion_quote).detail,
      defaultTip
    );
    return { quote, tip: tip !== quote ? tip : defaultTip };
  }

  const legacy = raw.suggestions?.[0]?.trim();
  if (!legacy) return null;

  const quoteMatch = legacy.match(/„([^"]+)”/);
  if (quoteMatch) {
    return {
      quote: cleanQuote(quoteMatch[1]),
      tip: normalizeTip(legacy.match(/[—–]\s*(.+)$/)?.[1]?.trim(), defaultTip) || defaultTip,
    };
  }

  const split = splitLegacyPair(legacy);
  return split.detail
    ? { quote: cleanQuote(split.lead), tip: normalizeTip(split.detail, defaultTip) }
    : { quote: cleanQuote(legacy), tip: defaultTip };
}

export function mapAnalysisToView(
  raw: MediationAnalysis | null,
  lang: Language = 'pl'
): MappedAnalysisView | null {
  if (!raw) return null;
  const sanitized = sanitizeAnalysisPersona(raw);
  const d = getDefaults(lang);
  const defaultTip = d.sayTip;

  const situationSummary = sanitizePersonaText(
    sanitized.situation_summary?.trim() ||
      sanitized.situation_facts?.trim() ||
      d.situationSummary
  );

  const emotionTags = sanitizeTags(stringTags(sanitized.user_emotions || sanitized.emotions));
  const emotionsExplanation = sanitizePersonaText(
    sanitized.emotions_explanation?.trim() || d.emotionsExplanation
  );

  const needTags = sanitizeTags(stringTags(sanitized.user_needs || sanitized.common_ground));
  const needsExplanation = sanitizePersonaText(
    sanitized.needs_explanation?.trim() || d.needsExplanation
  );

  const keyTrigger = cleanInsightPrefix(
    sanitizePersonaText(sanitized.key_trigger?.trim() || '')
  );

  const whatCouldImprove = sanitized.what_could_improve?.trim()?.includes('—')
    ? ''
    : sanitizePersonaText(sanitized.what_could_improve?.trim() || '');

  const doingWell = mapTextPair(
    sanitized.doing_well,
    sanitized.doing_well_detail,
    sanitized.celebration || sanitized.bridgeStatement,
    d.doingWellLead,
    d.doingWellDetail
  );

  const perspectiveGap = mapTextPair(
    sanitized.perspective_gap_title,
    sanitized.perspective_gap_detail,
    sanitized.perspective_gap || sanitized.misunderstanding,
    d.perspectiveGapLead,
    d.perspectiveGapDetail
  );

  const partnerEmotions = sanitizeTags(
    stringTags(sanitized.partner_emotions || sanitized.partnerEmotions)
  );
  const partnerNeeds = sanitizeTags(
    stringTags(sanitized.partner_needs || sanitized.partnerNeeds)
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
    suggestion: mapSuggestion(sanitized, defaultTip),
    partnerEmotions:
      partnerEmotions.length > 0 ? partnerEmotions : d.partnerEmotions,
    partnerNeeds: partnerNeeds.length > 0 ? partnerNeeds : d.partnerNeeds,
    perspectiveGap,
  };
}

/** @deprecated Use getSoloExtras(lang).conversationTips */
export const SOLO_CONVERSATION_TIPS = getSoloExtras('pl').conversationTips;
