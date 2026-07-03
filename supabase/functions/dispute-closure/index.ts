/**
 * Date idea after dispute closure — AI, heartfelt, budget-friendly.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
  pl: 'Polish',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
};

const SYSTEM = `You are a creative relationship advisor. After a fight/dispute, a couple needs a heartfelt date idea WITHOUT expensive things.

RULES:
- No premium restaurants, no expensive gifts, no "buy a trip for thousands"
- Yes: home, walk, cooking together, memory list, phone-free evening, park picnic, board game, letter to partner
- DETAILED description: step by step what to do, what to say, what mood
- Warm, human tone. 4–8 sentences in description.
- Match the dispute context and survey answers (e.g. after a hard talk → something calm and close)

JSON:
{
  "title": string,
  "description": string,
  "whyItFits": string,
  "estimatedCost": string
}`;

function languageDirective(language: string): string {
  const name = LANGUAGE_NAMES[language] || language;
  return `\n\nCRITICAL: Write ALL fields (title, description, whyItFits, estimatedCost) in ${name}. Use local currency format when mentioning cost.`;
}

const FALLBACK_BY_LANG: Record<string, Record<string, string>> = {
  pl: {
    title: 'Spacer z jednym pytaniem',
    description:
      'Wyjdźcie na 30–40 minut spaceru. Zasada: jedno pytanie na raz, bez przerywania. Pierwsze: „Co dziś było dla Ciebie najważniejsze w naszej rozmowie?” Drugie: „Czego od nas teraz potrzebujesz?” Trzecie (opcjonalnie): „Co moglibyśmy zrobić inaczej jutro?”. Po spacerze obejmijcie się albo chwytcie za ręce.',
    whyItFits: 'Ruch i brak patrzenia sobie w oczy często ułatwia szczerą rozmowę po kłótni.',
    estimatedCost: '0 zł',
  },
  it: {
    title: 'Passeggiata con una domanda',
    description:
      'Uscite per una passeggiata di 30–40 minuti. Regola: una domanda alla volta. Prima: «Cosa è stato più importante per te oggi?» Seconda: «Di cosa hai bisogno adesso?» Dopo abbracciatevi o tenetevi per mano.',
    whyItFits: 'Il movimento facilita un dialogo sincero dopo un litigio.',
    estimatedCost: '0 €',
  },
  en: {
    title: 'Walk with one question',
    description:
      'Go for a 30–40 minute walk. One question at a time, no interrupting. First: what mattered most today? Second: what do you need right now? Then hug or hold hands.',
    whyItFits: 'Movement often makes honest talk easier after a fight.',
    estimatedCost: '$0',
  },
  de: {
    title: 'Spaziergang mit einer Frage',
    description:
      'Geht 30–40 Minuten spazieren. Eine Frage nach der anderen. Erste: Was war heute am wichtigsten? Zweite: Was brauchst du jetzt? Danach umarmt euch.',
    whyItFits: 'Bewegung erleichtert oft ein ehrliches Gespräch nach einem Streit.',
    estimatedCost: '0 €',
  },
  fr: {
    title: 'Balade avec une question',
    description:
      'Marchez 30–40 minutes. Une question à la fois. Première : qu\'est-ce qui comptait le plus aujourd\'hui ? Deuxième : de quoi as-tu besoin maintenant ? Puis faites un câlin.',
    whyItFits: 'Le mouvement facilite souvent une conversation sincère après une dispute.',
    estimatedCost: '0 €',
  },
  es: {
    title: 'Paseo con una pregunta',
    description:
      'Pasead 30–40 minutos. Una pregunta cada vez. Primera: ¿qué fue lo más importante hoy? Segunda: ¿qué necesitas ahora? Luego abrazaos.',
    whyItFits: 'El movimiento suele facilitar una conversación sincera tras una discusión.',
    estimatedCost: '0 €',
  },
};

function fallbackDateIdea(language: string): Record<string, string> {
  return FALLBACK_BY_LANG[language] || FALLBACK_BY_LANG.pl;
}

async function callOpenAI(body: Record<string, unknown>, apiKey: string, language: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM + languageDirective(language) },
        {
          role: 'user',
          content: JSON.stringify(body),
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response');
  return JSON.parse(content) as Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode = String(body.mode || 'live');
    const language = String(body.language || 'pl');
    const surveyAnswers = body.surveyAnswers || {};
    const situationSummary = String(body.situationSummary || '').slice(0, 400);
    const chatSnippet = String(body.chatSnippet || '').slice(0, 600);
    const keyTrigger = String(body.keyTrigger || '').slice(0, 200);

    const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();

    let dateIdea: Record<string, string>;
    let source = 'fallback';

    if (apiKey) {
      try {
        dateIdea = await callOpenAI(
          {
            mode,
            language,
            situationSummary,
            keyTrigger,
            surveyAnswers,
            chatSnippet,
          },
          apiKey,
          language
        );
        source = 'openai';
      } catch (e) {
        console.error('[dispute-closure]', e);
        dateIdea = fallbackDateIdea(language);
      }
    } else {
      dateIdea = fallbackDateIdea(language);
    }

    if (!dateIdea.title || !dateIdea.description) {
      dateIdea = fallbackDateIdea(language);
      source = 'fallback';
    }

    return new Response(JSON.stringify({ dateIdea, source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
