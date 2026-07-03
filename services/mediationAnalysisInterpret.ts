export const ANALYSIS_VERSION = 2;

export interface MediationAnalysis {
  analysis_version?: number;
  situation_summary?: string;
  emotions_explanation?: string;
  needs_explanation?: string;
  what_could_improve?: string;
  emotionsSummary?: string;
  needsSummary?: string;
  bridgeStatement?: string;
  emotions?: string;
  common_ground?: string;
  celebration?: string;
  misunderstanding?: string;
  user_emotions?: string[] | string;
  user_needs?: string[] | string;
  doing_well?: string;
  doing_well_detail?: string;
  what_went_wrong?: string;
  situation_facts?: string;
  key_trigger?: string;
  partner_emotions?: string[] | string;
  partnerEmotions?: string[] | string;
  partner_needs?: string[] | string;
  partnerNeeds?: string[] | string;
  perspective_gap?: string;
  perspective_gap_title?: string;
  perspective_gap_detail?: string;
  suggestion_quote?: string;
  suggestion_tip?: string;
  suggestions?: string[];
}

const EMOTION_KEYWORDS: [string, string][] = [
  ['zbyw', 'poczucie bycia zbywanym'],
  ['olany', 'poczucie bycia pominiętym'],
  ['nieważ', 'poczucie bycia nieważnym'],
  ['niewysłuch', 'niewysłuchanie'],
  ['zran', 'zranienie'],
  ['złość', 'złość'],
  ['frustr', 'frustracja'],
  ['samot', 'samotność'],
  ['lęk', 'lęk'],
  ['presj', 'presja'],
  ['zazdro', 'zazdrość'],
];

function extractField(combined: string, ...labels: string[]): string {
  const lines = combined.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const label of labels) {
      const prefix = `${label}:`;
      if (!lines[i].toLowerCase().startsWith(prefix.toLowerCase())) continue;
      const parts = [lines[i].slice(prefix.length).trim()];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (
          /^(Co się wydarzyło|Co mnie zdenerwowało|Jak się czuł|Czego potrzebuję|Co chcę powiedzieć):/i.test(
            next
          )
        ) {
          break;
        }
        if (next.trim()) parts.push(next.trim());
      }
      return parts.filter(Boolean).join(' ').trim();
    }
  }
  return '';
}

function detectEmotionTags(felt: string, anger: string): string[] {
  const text = `${felt} ${anger}`.toLowerCase();
  const tags = new Set<string>();
  for (const [keyword, label] of EMOTION_KEYWORDS) {
    if (text.includes(keyword)) tags.add(label);
  }
  if (tags.size === 0) tags.add('napięcie emocjonalne');
  return [...tags].slice(0, 4);
}

function detectNeeds(need: string): string[] {
  const lower = need.toLowerCase();
  const tags: string[] = [];
  if (/przepro|wybac|zrozum/i.test(lower)) tags.push('uznanie');
  if (/szacun|ważn|priorytet/i.test(lower)) tags.push('szacunek');
  if (/bezpiecz|blisko|więź/i.test(lower)) tags.push('bliskość');
  if (/słuch|wysłuch/i.test(lower)) tags.push('bycie wysłuchanym');
  if (tags.length === 0) tags.push('zrozumienie', 'poczucie ważności');
  return tags.slice(0, 3);
}

function summarizeSituation(happened: string, anger: string, felt: string): string {
  const lower = `${happened} ${anger} ${felt}`.toLowerCase();
  if (/imprez/i.test(lower) && /syn|dzieci|opiek|prac/i.test(lower)) {
    return 'Wygląda na to, że partner poszedł na imprezę w momencie, gdy liczyłeś/aś na wsparcie — stąd poczucie, że relacja schodzi na drugi plan.';
  }
  if (/imprez/i.test(lower)) {
    return 'Konflikt dotyczy różnicy w priorytetach: dla Ciebie ważny był moment w relacji, partner wybrał imprezę.';
  }
  if (/zbyw|ignor|nie odpow|ogranicz/i.test(lower)) {
    return 'W tle jest poczucie, że rozmowa nie doszła do skutku — jedna strona czuła się zbywana, druga mogła czuć presję lub kontrolę.';
  }
  if (happened) {
    return 'Opisany spór to raczej różnica w oczekiwaniach niż brak uczuć — obie strony mogły widzieć sytuację inaczej.';
  }
  return 'Sytuacja wymaga doprecyzowania w rozmowie, ale sam fakt, że tu jesteś, to krok w dobrą stronę.';
}

function buildEmotionsExplanation(felt: string, anger: string): string {
  const tags = detectEmotionTags(felt, anger);
  if (!felt && !anger) {
    return 'Przy takim konflikcie naturalne jest zranienie lub frustracja — to sygnał, że coś w relacji wymaga uwagi, a nie „przesada”.';
  }
  return `Z opisu wynika ${tags.join(', ')}. To typowe reakcje, gdy oczekiwania w relacji się rozjechały — nie oznaczają słabości.`;
}

function buildNeedsExplanation(need: string): string {
  const tags = detectNeeds(need);
  return `Za emocjami stoją prawdopodobnie potrzeby: ${tags.join(', ')}. Gdy nie są zaspokajane, rośnie napięcie — warto nazwać je wprost w rozmowie.`;
}

function buildKeyTrigger(anger: string, felt: string, happened: string): string {
  const lower = `${anger} ${felt} ${happened}`.toLowerCase();
  if (/zbyw|ignor/i.test(lower)) {
    return 'Kluczowy moment to poczucie, że partner Cię zbywał/a w rozmowie — wtedy emocje prawdopodobnie sięgnęły szczytu.';
  }
  if (/imprez/i.test(lower) && /syn|dzieci|opiek/i.test(lower)) {
    return 'Najbardziej dotknęło Cię połączenie imprezy z brakiem wsparcia przy opiece nad dzieckiem.';
  }
  if (/imprez/i.test(lower)) {
    return 'Punkt zapalny to decyzja partnera o imprezie w kontekście, który dla Ciebie był ważny.';
  }
  if (/ogranicz|kontrol/i.test(lower)) {
    return 'Mógł/mogła zaboleć wymiana, w której partner poczuł/a kontrolę zamiast Twojej prośby o bliskość.';
  }
  return 'Warto w rozmowie wskazać jeden konkretny moment, w którym emocje były najsilniejsze — bez dokładania wszystkich urazów naraz.';
}

function buildWhatCouldImprove(happened: string, anger: string, felt: string): string {
  const lower = `${happened} ${anger} ${felt}`.toLowerCase();
  if (/ogranicz|nie podoba|zakaz/i.test(lower)) {
    return 'Komunikat mógł brzmieć jak ograniczenie zamiast prośby o zrozumienie — partner mógł się bronić zamiast słuchać.';
  }
  if (/zawsze|nigdy|\bty\b/i.test(lower)) {
    return 'Przy silnych emocjach łatwo o ton oskarżeń — w rozmowie lepiej działa „czuję / potrzebuję” niż „ty zawsze”.';
  }
  if (/zbyw|ignor/i.test(lower)) {
    return 'Unikanie rozmowy w szczytowym momencie mogło pogłębić konflikt — warto wrócić do tematu, gdy emocje opadną.';
  }
  return 'Trzymaj się jednego zdarzenia i jednej emocji na raz — mniej materiału naraz ułatwia partnerowi usłyszenie Cię.';
}

function buildSuggestion(need: string, felt: string): string {
  const lower = `${need} ${felt}`.toLowerCase();
  if (/przepro|zrozum/i.test(lower)) {
    return '„Kiedy to się wydarzyło, poczułem/am się zraniony/a. Potrzebuję, żebyś usłyszała/usłyszał, jak na mnie to wpływa.”';
  }
  if (/szacun|ważn|priorytet/i.test(lower)) {
    return '„Czuję, że moje uczucia nie są teraz priorytetem. Zależy mi na nas — chcę o tym spokojnie porozmawiać.”';
  }
  if (/imprez/i.test(lower)) {
    return '„Zależy mi na Tobie i na nas. Gdy poszłaś/eś na imprezę, poczułem/am się pominięty/a — chcę, żebyśmy to razem omówili.”';
  }
  return '„Chcę porozmawiać o tym spokojnie. Czuję się zraniony/a i zależy mi, żebyś mnie wysłuchała/wysłuchał.”';
}

/** Lokalna interpretacja — nigdy nie kopiuje dosłownie pól formularza. */
export function interpretMediationLocally(
  combinedDescription: string,
  perspectiveB = ''
): MediationAnalysis {
  const felt =
    extractField(combinedDescription, 'Jak się czułem', 'Jak się czułam') || '';
  const anger = extractField(combinedDescription, 'Co mnie zdenerwowało') || '';
  const need = extractField(combinedDescription, 'Czego potrzebuję') || '';
  const happened = extractField(combinedDescription, 'Co się wydarzyło') || '';
  const hasPartner = perspectiveB.trim().length > 0;

  return {
    analysis_version: ANALYSIS_VERSION,
    situation_summary: summarizeSituation(happened, anger, felt),
    user_emotions: detectEmotionTags(felt, anger),
    emotions_explanation: buildEmotionsExplanation(felt, anger),
    user_needs: detectNeeds(need),
    needs_explanation: buildNeedsExplanation(need),
    key_trigger: buildKeyTrigger(anger, felt, happened),
    what_could_improve: buildWhatCouldImprove(happened, anger, felt),
    doing_well: 'Szukasz dialogu zamiast eskalacji.',
    doing_well_detail: 'Formułowanie uczuć i szukanie mediacji to dojrzały krok.',
    partner_emotions: ['presja', 'niezrozumienie'],
    partner_needs: ['autonomia', 'brak oskarżeń'],
    perspective_gap_title: hasPartner ? 'Różne wersje sytuacji' : 'Brak perspektywy partnera',
    perspective_gap_detail: hasPartner
      ? 'Partner opisał to inaczej — to nie musi oznaczać kłamstwa, tylko inną perspektywę.'
      : 'Analiza opiera się na Twoim opisie — partner może widzieć sytuację inaczej.',
    suggestion_quote: buildSuggestion(need, felt),
    suggestion_tip: 'Powiedz spokojnie, w pierwszej osobie. Unikaj „Ty zawsze…”.',
  };
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Wykrywa, czy analiza to echo formularza (stara / zła). */
export function isAnalysisEchoingForm(
  analysis: MediationAnalysis,
  combinedDescription: string
): boolean {
  if (analysis.analysis_version !== ANALYSIS_VERSION) return true;
  if (!analysis.emotions_explanation || !analysis.what_could_improve) return true;

  const formBlob = normalizeForCompare(combinedDescription);
  if (!formBlob) return false;

  const checkFields = [
    analysis.situation_summary,
    analysis.key_trigger,
    analysis.suggestion_quote,
    ...(Array.isArray(analysis.user_emotions) ? analysis.user_emotions : []),
    ...(Array.isArray(analysis.user_needs) ? analysis.user_needs : []),
  ].filter(Boolean) as string[];

  for (const field of checkFields) {
    const norm = normalizeForCompare(field);
    if (norm.length < 20) continue;
    if (formBlob.includes(norm.slice(0, Math.min(40, norm.length)))) return true;
    const snippet = norm.slice(0, 30);
    if (snippet.length >= 15 && formBlob.includes(snippet)) return true;
  }

  if (analysis.what_went_wrong?.includes('—')) return true;
  if (analysis.what_could_improve?.includes('—')) return true;

  for (const tag of [...(analysis.user_emotions || []), ...(analysis.user_needs || [])]) {
    if (typeof tag === 'string' && tag.length > 35) return true;
  }

  return false;
}

export function sanitizeTags(tags: string[]): string[] {
  return tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 32)
    .slice(0, 4);
}
