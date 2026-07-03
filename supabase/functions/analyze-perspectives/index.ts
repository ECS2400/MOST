import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
  pl: 'polski',
  en: 'English',
  de: 'Deutsch',
  fr: 'français',
  es: 'español',
  it: 'italiano',
};

function languageDirective(lang: string): string {
  const name = LANGUAGE_NAMES[lang] || lang;
  return `\n\nCRITICAL LANGUAGE RULE: Write ALL JSON string values ONLY in ${name}. No other language. Emotion/need tags must also be in ${name}.`;
}

export const ANALYSIS_VERSION = 2;

export interface AnalysisResponse {
  analysis_version: number;
  situation_summary: string;
  user_emotions: string[];
  emotions_explanation: string;
  user_needs: string[];
  needs_explanation: string;
  key_trigger: string;
  what_could_improve: string;
  doing_well: string;
  doing_well_detail: string;
  partner_emotions: string[];
  partner_needs: string[];
  perspective_gap_title: string;
  perspective_gap_detail: string;
  suggestion_quote: string;
  suggestion_tip: string;
}

function extractLines(text: string, label: string): string {
  const re = new RegExp(`${label}:\\s*([^\\n]+(?:\\n(?!Co |Jak |Czego )[^\\n]+)*)`, 'i');
  return text.match(re)?.[1]?.trim() || '';
}

const EMOTION_KEYWORDS: [string, string][] = [
  ['zran', 'zranienie'],
  ['nieważ', 'poczucie bycia nieważnym'],
  ['olany', 'poczucie bycia pominiętym'],
  ['słuch', 'niewysłuchanie'],
  ['złość', 'złość'],
  ['frustr', 'frustracja'],
  ['samot', 'samotność w relacji'],
  ['lęk', 'lęk'],
  ['presj', 'presja'],
];

function detectEmotionTags(felt: string, anger: string): string[] {
  const text = `${felt} ${anger}`.toLowerCase();
  const tags = new Set<string>();
  for (const [keyword, label] of EMOTION_KEYWORDS) {
    if (text.includes(keyword)) tags.add(label);
  }
  if (tags.size === 0) tags.add('napięcie emocjonalne');
  return [...tags].slice(0, 4);
}

function buildEmotionsExplanation(felt: string, anger: string): string {
  const tags = detectEmotionTags(felt, anger);
  if (!felt && !anger) {
    return 'W takiej sytuacji naturalne jest poczucie zranienia lub frustracji — to sygnał, że coś w relacji wymaga uwagi.';
  }
  return `Z opisu wynika ${tags.join(', ')}. To typowe reakcje, gdy oczekiwania w relacji się rozjechały.`;
}

function buildNeedsExplanation(need: string): string {
  const tags = detectNeeds(need);
  return `Za emocjami stoją prawdopodobnie potrzeby: ${tags.join(', ')}. Gdy nie są zaspokajane, rośnie napięcie — warto nazwać je wprost w rozmowie.`;
}

function detectNeeds(need: string): string[] {
  if (!need) return ['bycie wysłuchanym', 'poczucie ważności'];
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
  if (/imprez/i.test(lower) && /syn|dzieci|opiek/i.test(lower)) {
    return 'Partner poszedł na imprezę w sytuacji, gdy Ty oczekiwał/aś wsparcia przy opiece nad dzieckiem — to wywołało poczucie, że relacja schodzi na drugi plan.';
  }
  if (/imprez/i.test(lower)) {
    return 'Partner wybrał imprezę w momencie, który dla Ciebie miał inne znaczenie — stąd poczucie niesprawiedliwości.';
  }
  if (/zbyw|ignor|nie odpow/i.test(lower)) {
    return 'Doszło do sytuacji, w której czułeś/aś się zbywany/a lub pomijany/a w rozmowie — to często boli bardziej niż samo zdarzenie.';
  }
  if (happened) {
    return 'Opisany konflikt dotyczy różnicy w oczekiwaniach i priorytetach między Wami — obie strony mogły widzieć sytuację inaczej.';
  }
  return 'Sytuacja w relacji wymaga doprecyzowania — ale już sam fakt, że tu jesteś, pokazuje gotowość do rozmowy.';
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
  return 'Warto w rozmowie wskazać jeden konkretny moment, w którym emocje były najsilniejsze.';
}

function buildWhatCouldImprove(happened: string, anger: string): string {
  const lower = `${happened} ${anger}`.toLowerCase();
  if (/ogranicz|zakaz|nie podoba/i.test(lower)) {
    return 'Być może komunikat poszedł w stronę kontroli zamiast wyrażenia uczucia — partner mógł usłyszeć ograniczenie, a nie prośbę o bliskość.';
  }
  if (/zawsze|nigdy|ty /i.test(lower)) {
    return 'W opisie widać oskarżeniowy ton — to naturalne przy złości, ale w rozmowie warto przejść na „ja czuję” zamiast „ty robisz”.';
  }
  return 'W emocjach łatwo eskalować — warto w rozmowie trzymać się jednego konkretnego zdarzenia, bez dokładania starych urazów.';
}

function buildSuggestion(need: string, felt: string): string {
  if (/przepro|zrozum/i.test(need.toLowerCase())) {
    return 'Gdy będziesz gotowy/a: „Potrzebuję, żebyś usłyszała/usłyszał, jak się czuję — to dla mnie ważne.”';
  }
  if (/szacun/i.test(need.toLowerCase())) {
    return 'Gdy będziesz gotowy/a: „Czuję, że moje uczucia nie są dla Ciebie priorytetem — potrzebuję tego inaczej.”';
  }
  if (felt) {
    return 'Gdy będziesz gotowy/a: „Chcę porozmawiać o tym spokojnie — czuję się zraniony/a i zależy mi na nas.”';
  }
  return 'Gdy będziesz gotowy/a: „Chcę, żebyśmy usiedli i porozmawiali o tym, co mnie boli — bez awantury.”';
}

function fallbackAnalysis(perspectiveA: string, perspectiveB: string): AnalysisResponse {
  const felt = extractLines(perspectiveA, 'Jak się czułem') || extractLines(perspectiveA, 'Jak się czułam');
  const anger = extractLines(perspectiveA, 'Co mnie zdenerwowało');
  const need = extractLines(perspectiveA, 'Czego potrzebuję');
  const happened = extractLines(perspectiveA, 'Co się wydarzyło');
  const hasPartner = perspectiveB.trim().length > 0;

  return {
    analysis_version: ANALYSIS_VERSION,
    situation_summary: summarizeSituation(happened, anger, felt),
    user_emotions: detectEmotionTags(felt, anger),
    emotions_explanation: buildEmotionsExplanation(felt, anger),
    user_needs: detectNeeds(need),
    needs_explanation: buildNeedsExplanation(need),
    key_trigger: buildKeyTrigger(anger, felt, happened),
    what_could_improve: buildWhatCouldImprove(happened, anger),
    doing_well: 'Szukasz dialogu zamiast eskalacji.',
    doing_well_detail: 'To dojrzały krok — formułowanie uczuć i potrzeb to podstawa mediacji.',
    partner_emotions: ['presja', 'niezrozumienie'],
    partner_needs: ['autonomia', 'brak oskarżeń'],
    perspective_gap_title: hasPartner ? 'Różne wersje tej samej sytuacji' : 'Brak perspektywy partnera',
    perspective_gap_detail: hasPartner
      ? 'Partner opisał to inaczej — to nie znaczy, że ktoś kłamie, tylko że patrzycie z innych miejsc.'
      : 'Analiza opiera się tylko na Twoim opisie — perspektywa partnera może się różnić.',
    suggestion_quote: buildSuggestion(need, felt),
    suggestion_tip: 'Powiedz to spokojnie, patrząc w oczy. Unikaj „Ty zawsze…” — mów o swoim doświadczeniu.',
  };
}

const JSON_SCHEMA = `{
  "analysis_version": 2,
  "situation_summary": "2-3 zdania: NEUTRALNE streszczenie sytuacji, własnymi słowami mediatora. NIGDY nie cytuj użytkownika.",
  "user_emotions": ["2-4 krótkie etykiety emocji, np. zranienie, frustracja"],
  "emotions_explanation": "2-3 zdania: jak użytkownik MOŻE się czuć i dlaczego — interpretacja, nie cytat",
  "user_needs": ["2-3 krótkie potrzeby zinterpretowane z opisu"],
  "needs_explanation": "1-2 zdania: co stoi za tymi potrzebami",
  "key_trigger": "1-2 zdania: co najbardziej zabolało — interpretacja, nie dosłowne zdanie usera",
  "what_could_improve": "1-2 zdania: co MOGŁO pójść inaczej w komunikacji użytkownika (delikatnie, bez oceniania)",
  "doing_well": "1 zdanie: co użytkownik robi dobrze w tej sytuacji",
  "doing_well_detail": "1 krótkie zdanie wyjaśniające",
  "partner_emotions": ["2-3 hipotezy o emocjach partnera"],
  "partner_needs": ["2-3 hipotezy o potrzebach partnera"],
  "perspective_gap_title": "krótki tytuł nieporozumienia",
  "perspective_gap_detail": "1-2 zdania wyjaśnienia luki perspektyw",
  "suggestion_quote": "1 gotowe zdanie I-message do powiedzenia partnerowi — napisane przez mediatora, NIE skopiowane z formularza",
  "suggestion_tip": "1 krótka wskazówka jak to powiedzieć"
}`;

const SYSTEM_PROMPT = `You are a couples mediator. You receive a raw conflict description from one party.
Your task: INTERPRET and DESCRIBE the situation in your own words.

CRITICAL RULES:
- NEVER copy user sentences verbatim
- NEVER paste form fragments
- Paraphrase everything — write like a mediator summarizing a session
- Use phrasing like "you may feel", "it seems that", "behind this conflict"
- what_could_improve: gently note what in the user's COMMUNICATION might have escalated (no moralizing)
- suggestion_quote: write a NEW I-message sentence, do not take from user input
- Each field = one thought, no em-dash joining two sentences
- Respond ONLY with valid JSON, no markdown`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown> = {};
    const raw = await req.text();
    if (raw.trim()) {
      body = JSON.parse(raw);
    }

    const perspectiveA = String(body.perspectiveA || body.perspective_a || '');
    const perspectiveB = String(body.perspectiveB || body.perspective_b || '');
    const language = String(body.language || 'pl');

    if (!perspectiveA.trim()) {
      return new Response(JSON.stringify({ error: 'perspectiveA is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const fallback = fallbackAnalysis(perspectiveA, perspectiveB);

    if (openaiKey) {
      const prompt = `Response language: ${LANGUAGE_NAMES[language] || language}.
Return ONLY JSON:
${JSON_SCHEMA}

User description (CONTEXT — do not quote verbatim):
${perspectiveA}

Partner perspective:
${perspectiveB || '(none)'}`;

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + languageDirective(language) },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
        }),
      });

      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const content = aiJson.choices?.[0]?.message?.content || '';
        const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(cleaned) as Partial<AnalysisResponse>;
        const result: AnalysisResponse = {
          analysis_version: ANALYSIS_VERSION,
          situation_summary: parsed.situation_summary || fallback.situation_summary,
          user_emotions: parsed.user_emotions?.length ? parsed.user_emotions : fallback.user_emotions,
          emotions_explanation: parsed.emotions_explanation || fallback.emotions_explanation,
          user_needs: parsed.user_needs?.length ? parsed.user_needs : fallback.user_needs,
          needs_explanation: parsed.needs_explanation || fallback.needs_explanation,
          key_trigger: parsed.key_trigger || fallback.key_trigger,
          what_could_improve: parsed.what_could_improve || fallback.what_could_improve,
          doing_well: parsed.doing_well || fallback.doing_well,
          doing_well_detail: parsed.doing_well_detail || fallback.doing_well_detail,
          partner_emotions: parsed.partner_emotions?.length ? parsed.partner_emotions : fallback.partner_emotions,
          partner_needs: parsed.partner_needs?.length ? parsed.partner_needs : fallback.partner_needs,
          perspective_gap_title: parsed.perspective_gap_title || fallback.perspective_gap_title,
          perspective_gap_detail: parsed.perspective_gap_detail || fallback.perspective_gap_detail,
          suggestion_quote: parsed.suggestion_quote || fallback.suggestion_quote,
          suggestion_tip: parsed.suggestion_tip || fallback.suggestion_tip,
        };
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
