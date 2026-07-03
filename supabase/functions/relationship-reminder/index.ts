/**
 * Daily relationship gesture reminders — short, actionable, warm.
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

const FALLBACK_TIPS: Record<string, string[]> = {
  pl: [
    'Napisz jej teraz krótką wiadomość: „Kocham Cię i cieszę się, że jesteś”.',
    'Zerwij jeden kwiatek albo kup mały bukiet — bez okazji, po prostu tak.',
    'Przygotuj jej ulubioną herbatę lub kawę i podaj z uśmiechem.',
    'Wyślij głosówkę: powiedz jedną konkretną rzecz, za którą jesteś wdzięczny.',
    'Zaproponuj 15 minut bez telefonów — tylko rozmowa albo przytulenie.',
    'Zostaw karteczkę na lustrze: „Dziś myślę o Tobie”.',
    'Zrób coś, co ona zwykle robi — np. zmywarka albo śniadanie.',
    'Wyjdźcie na krótki spacer trzymając się za ręce.',
    'Przypomnij jej o jednym pięknym wspomnieniu z waszej relacji.',
    'Zapytaj: „Czego dziś potrzebujesz ode mnie?” — i posłuchaj bez rad.',
    'Przytul ją na minutę dłużej niż zwykle, bez pośpiechu.',
    'Wyślij zdjęcie z waszego wspólnego momentu i napisz, dlaczego je kochasz.',
    'Zaproponuj wieczór z jej ulubionym serialem — Ty wybierasz przekąski.',
    'Napisz list w trzech zdaniach — co czujesz, co doceniasz, czego pragniesz razem.',
    'Kup drobny upominek: czekolada, świeca, coś co lubi.',
  ],
  it: [
    'Scrivile ora un messaggio: «Ti amo e sono felice che ci sia tu».',
    'Regalale un fiore — anche uno solo raccolto per strada.',
    'Preparale il tè o il caffè preferito e portaglielo con un sorriso.',
    'Mandale un vocale: una cosa concreta per cui sei grato/a.',
    'Proponi 15 minuti senza telefoni — solo chiacchierata o abbraccio.',
    'Lascia un biglietto sullo specchio: «Oggi penso a te».',
    'Fai qualcosa che di solito fa lei — colazione o lavastoviglie.',
    'Fate una breve passeggiata mano nella mano.',
    'Ricordale un bel ricordo della vostra storia.',
    'Chiedi: «Di cosa hai bisogno da me oggi?» e ascolta senza consigli.',
    'Abbracciala un minuto in più del solito, senza fretta.',
    'Invia una foto di un vostro momento e scrivi perché ti sta a cuore.',
    'Proponi una serata con la sua serie preferita — tu porti gli snack.',
    'Scrivi tre frasi: cosa senti, cosa apprezzi, cosa volete insieme.',
    'Un piccolo pensiero: cioccolato, candela, qualcosa che le piace.',
  ],
  en: [
    'Text her now: “I love you and I’m glad you’re in my life.”',
    'Pick or buy a small flower — no occasion, just because.',
    'Make her favorite tea or coffee and bring it with a smile.',
    'Send a voice note with one specific thing you’re grateful for.',
    'Suggest 15 phone-free minutes — talk or hug, nothing else.',
    'Leave a note on the mirror: “Thinking of you today.”',
    'Do something she usually does — dishes or breakfast.',
    'Take a short walk holding hands.',
    'Remind her of one beautiful memory from your relationship.',
    'Ask: “What do you need from me today?” and listen without fixing.',
    'Hug her a minute longer than usual, without rushing.',
    'Send a photo from a shared moment and say why it matters.',
    'Offer an evening with her favorite show — you bring snacks.',
    'Write three sentences: what you feel, what you appreciate, what you want together.',
    'A small gift: chocolate, a candle, something she likes.',
  ],
  de: [
    'Schreib ihr jetzt: „Ich liebe dich und bin froh, dass du da bist.“',
    'Pflück oder kauf eine Blume — einfach so, ohne Anlass.',
    'Mach ihren Lieblingstee oder -kaffee und bring ihn mit einem Lächeln.',
    'Schick eine Sprachnachricht mit einer konkreten Dankbarkeit.',
    'Schlag 15 handyfreie Minuten vor — reden oder kuscheln.',
    'Hinterlass einen Zettel am Spiegel: „Ich denk heute an dich.“',
    'Übernimm etwas, was sie meist macht — Geschirr oder Frühstück.',
    'Geht kurz spazieren und haltet Händchen.',
    'Erinnere sie an eine schöne Erinnerung aus eurer Zeit.',
    'Frag: „Was brauchst du heute von mir?“ und hör zu ohne Ratschläge.',
    'Umarm sie eine Minute länger als sonst.',
    'Schick ein Foto von einem gemeinsamen Moment und sag warum es zählt.',
    'Biete einen Abend mit ihrer Lieblingsserie an — du bringst Snacks.',
    'Schreib drei Sätze: Gefühl, Wertschätzung, gemeinsamer Wunsch.',
    'Ein kleines Geschenk: Schokolade, Kerze, etwas das sie mag.',
  ],
  fr: [
    'Écris-lui maintenant : « Je t’aime et je suis heureux/se que tu sois là. »',
    'Offre une fleur — même une seule cueillie sur le chemin.',
    'Prépare son thé ou café préféré et apporte-le avec un sourire.',
    'Envoie un vocal avec une chose précise pour laquelle tu es reconnaissant.',
    'Propose 15 minutes sans téléphone — discuter ou se faire un câlin.',
    'Laisse un mot sur le miroir : « Je pense à toi aujourd’hui. »',
    'Fais quelque chose qu’elle fait d’habitude — vaisselle ou petit-déjeuner.',
    'Faites une petite marche main dans la main.',
    'Rappelle-lui un beau souvenir de votre histoire.',
    'Demande : « De quoi as-tu besoin de moi aujourd’hui ? » et écoute sans conseiller.',
    'Fais-lui un câlin une minute de plus que d’habitude.',
    'Envoie une photo d’un moment partagé et dis pourquoi il compte.',
    'Propose une soirée avec sa série préférée — tu apportes les snacks.',
    'Écris trois phrases : ce que tu ressens, ce que tu apprécies, ce que vous voulez.',
    'Un petit cadeau : chocolat, bougie, quelque chose qu’elle aime.',
  ],
  es: [
    'Escríbele ahora: «Te quiero y me alegra que estés en mi vida».',
    'Regálale una flor — incluso una recogida al paso.',
    'Prepárale su té o café favorito y llévaselo con una sonrisa.',
    'Manda un audio con algo concreto por lo que estás agradecido.',
    'Propón 15 minutos sin móviles — charlar o abrazarse.',
    'Deja una nota en el espejo: «Hoy pienso en ti».',
    'Haz algo que ella suele hacer — platos o desayuno.',
    'Salid a un paseo corto de la mano.',
    'Recuérdale un bonito recuerdo de vuestra relación.',
    'Pregunta: «¿Qué necesitas de mí hoy?» y escucha sin aconsejar.',
    'Abrazadla un minuto más de lo habitual.',
    'Envía una foto de un momento juntos y di por qué importa.',
    'Ofrece una noche con su serie favorita — tú traes los snacks.',
    'Escribe tres frases: lo que sientes, lo que valoras, lo que queréis juntos.',
    'Un detalle: chocolate, vela, algo que le guste.',
  ],
};

function normalizeTip(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function pickFallback(language: string, avoid: string[]): string {
  const pool = FALLBACK_TIPS[language] || FALLBACK_TIPS.pl;
  const avoidNorm = new Set(avoid.map(normalizeTip));
  const candidates = pool.filter((t) => !avoidNorm.has(normalizeTip(t)));
  const list = candidates.length > 0 ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}

function resolveOpenAiKey(): string | undefined {
  return Deno.env.get('OPENAI_API_KEY')?.trim() || undefined;
}

async function callOpenAI(
  body: Record<string, unknown>,
  apiKey: string,
  language: string
): Promise<string> {
  const langName = LANGUAGE_NAMES[language] || language;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: `You suggest ONE small, concrete romantic gesture for today to keep emotional closeness alive in a couple.
Rules:
- 1-2 short sentences, imperative or warm suggestion
- Specific actions: message, flowers, hug, small gift, voice note, walk, help at home
- Warm, human, not corporate — like a caring friend
- No guilt, no therapy language
- Write in ${langName} only
- Return JSON: { "tip": "..." }`,
        },
        {
          role: 'user',
          content: JSON.stringify(body),
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response');
  const parsed = JSON.parse(content) as { tip?: string };
  const tip = parsed.tip?.trim();
  if (!tip || tip.length < 12) throw new Error('Invalid tip');
  return tip.slice(0, 280);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const language = String(body.language || 'pl');
    const partnerName = String(body.partnerName || '').trim().slice(0, 40);
    const avoidTips: string[] = Array.isArray(body.avoidTips)
      ? body.avoidTips.map((t: unknown) => String(t).slice(0, 280)).slice(0, 30)
      : [];

    const apiKey = resolveOpenAiKey();
    let tip: string;
    let source = 'fallback';

    if (apiKey) {
      try {
        tip = await callOpenAI(
          {
            partnerName: partnerName || undefined,
            avoidTips,
            instruction:
              'Generate a fresh tip different in wording and action from avoidTips. Same theme OK only if clearly different words.',
          },
          apiKey,
          language
        );
        const avoidNorm = new Set(avoidTips.map(normalizeTip));
        if (!avoidNorm.has(normalizeTip(tip))) {
          source = 'openai';
        } else {
          tip = pickFallback(language, avoidTips);
        }
      } catch (e) {
        console.error('[relationship-reminder]', e);
        tip = pickFallback(language, avoidTips);
      }
    } else {
      tip = pickFallback(language, avoidTips);
    }

    return new Response(JSON.stringify({ tip, source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
