/**
 * Coach solo — AI-first, luźna rozmowa jak z kumplem (multi-turn).
 */
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
  return `\n\nLANGUAGE: App language is ${name}. Write "reply" and "funFact" ONLY in ${name}. If the user writes in another language, match their language.`;
}

const SYSTEM_PROMPT = `Jesteś luźnym, dowcipnym kumplem/kumpelą na WhatsAppie. Pomagasz ogarnąć kłótnię w związku. NIE jesteś terapeutą ani korpo-coachem.

MASZ PAKIET KONTEKSTU z analizy sytuacji użytkownika (analysisContext, quizContext). UŻYWAJ GO — nawiązuj do emocji, triggerów i luki perspektyw. Nie ignoruj tego co user już powiedział.

TON:
- Jak rozmowa z ziomkiem: "no widzę", "aaa klasyk", "każdy się kłóci", "wkurzające ale ogarniemy"
- 4–8 zdań gdy user chce pogadać. Konkretna opinia, perspektywa, pomysły co zrobić dalej.
- Lekki humor OK. Nie wyśmiewaj usera.
- ZERO myślników (—). Kropki i przecinki.
- ZERO ukośników płci (poszłaś/eś). Jedna forma albo neutralnie.
- ZAKAZANE: "Twoje uczucia są uzasadnione", "To musi frustrować", "Dzięki za szczerość", "Słyszę: «...»", "W kontekście analizy", "bez oceniania", "Jestem po Twojej stronie"

TRYB ROZMOWY (chatMode=true — domyślnie):
- Słuchaj, odpowiadaj na pytania ("co o tym sądzisz?", "co myślisz?") — daj PRAWDZIWĄ opinię kumpla.
- Pomagaj szukać rozwiązania: co powiedzieć, kiedy, jak podejść do rozmowy.
- NIE oferuj SMS-a ani "gotowej wiadomości" dopóki user wyraźnie nie poprosi.
- Nie pytaj w kółko "chcesz SMS?".

TRYB SMS (chatMode=false LUB user prosi o gotową wiadomość / rozpisz / tekst do wysłania):
- Daj 2 wersje w „cudzysłowie": łagodna i stanowcza.
- Krótko powiedz którą byś wybrał i dlaczego.

NIGDY nie powtarzaj dosłownie swojej poprzedniej odpowiedzi.

CIEKAWOSTKA (funFact):
- Gdy user wyraża emocje lub o relacji, czasem dodaj funFact: jedno krótkie zdanie (max 140 znaków) z ciekawostką o relacjach/komunikacji. Luźny ton: "Czy wiesz że...", "Badania pokazują że...", "Nie tylko ty..."
- Nie w każdej turze. null gdy nie pasuje albo user prosi o SMS.
- Nie wymyślaj konkretnych lat jeśli nie jesteś pewny.

Odpowiedź WYŁĄCZNIE jako JSON: { "reply": string, "funFact": string | null }`;

interface ChatMsg {
  role?: string;
  content?: string;
  sender_id?: string;
}

function stringFrom(obj: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!obj) return '';
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function tagsFrom(obj: Record<string, unknown> | undefined, ...keys: string[]): string[] {
  if (!obj) return [];
  for (const key of keys) {
    const v = obj[key];
    if (Array.isArray(v)) {
      return v.filter((x) => typeof x === 'string').slice(0, 6) as string[];
    }
  }
  return [];
}

function buildContextPack(analysis: Record<string, unknown>): Record<string, unknown> {
  return {
    situation_summary: stringFrom(analysis, 'situation_summary', 'situation_facts'),
    key_trigger: stringFrom(analysis, 'key_trigger'),
    emotions_explanation: stringFrom(analysis, 'emotions_explanation'),
    user_emotions: tagsFrom(analysis, 'user_emotions'),
    needs_explanation: stringFrom(analysis, 'needs_explanation'),
    user_needs: tagsFrom(analysis, 'user_needs'),
    what_could_improve: stringFrom(analysis, 'what_could_improve'),
    perspective_gap: stringFrom(analysis, 'perspective_gap_detail', 'perspective_gap_title'),
    suggestion_quote: stringFrom(analysis, 'suggestion_quote'),
    partner_emotions: tagsFrom(analysis, 'partner_emotions'),
    partner_needs: tagsFrom(analysis, 'partner_needs'),
  };
}

function resolveOpenAiKey(): { key?: string; hint: string } {
  const key = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (key) return { key, hint: 'ok' };

  // Vault / zła nazwa — edge functions widzą tylko Edge Function Secrets
  const envKeys = [...Deno.env.toObject().keys()].filter(
    (k) => !k.startsWith('SUPABASE_') && !k.startsWith('SB_') && !k.startsWith('DENO_')
  );
  return {
    hint: envKeys.length
      ? `OPENAI_API_KEY missing; other custom env: ${envKeys.join(', ')}`
      : 'OPENAI_API_KEY missing; brak custom env — ustaw w Edge Functions → Secrets (NIE Vault)',
  };
}

function polishReply(text: string): string {
  return text
    .replace(/\s*—\s*/g, '. ')
    .replace(/\s*–\s*/g, ', ')
    .replace(/\*\*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeFunFact(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = polishReply(raw);
  if (!t || t.length < 12) return undefined;
  return t.slice(0, 180);
}

function isTherapyCliche(text: string): boolean {
  return /Twoje uczucia są uzasadnione|To musi frustrować|To musi boleć|Słyszę:\s*«|W kontekście wcześniejszej analizy/i.test(
    text
  );
}

function toOpenAiRole(role: string): 'user' | 'assistant' {
  return role === 'coach' || role === 'assistant' ? 'assistant' : 'user';
}

function buildOpenAiMessages(
  history: Array<{ role: string; content: string }>,
  contextBlock: string,
  chatMode: boolean,
  language: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const system =
    SYSTEM_PROMPT +
    languageDirective(language) +
    `\n\nchatMode: ${chatMode}\n\nPAKIET KONTEKSTU (używaj w odpowiedziach):\n${contextBlock}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: system },
  ];

  for (const m of history.slice(-20)) {
    const content = (m.content || '').trim();
    if (!content) continue;
    messages.push({ role: toOpenAiRole(m.role), content });
  }

  return messages;
}

function userBlob(history: Array<{ role: string; content: string }>): string {
  return history
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();
}

function lastCoachContent(history: Array<{ role: string; content: string }>): string {
  const coaches = history.filter((m) => m.role === 'coach');
  return coaches[coaches.length - 1]?.content || '';
}

function substantiveVent(history: Array<{ role: string; content: string }>): string {
  const vents = history
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter((c) => c.length > 40);
  return vents[vents.length - 1] || '';
}

function truncateAtWord(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length <= maxLen) return trimmed;
  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.5) return slice.slice(0, lastSpace).trim() + '…';
  return slice.trim() + '…';
}

function offlineFallback(
  userMessage: string,
  chatMode: boolean,
  context: Record<string, unknown>,
  history: Array<{ role: string; content: string }>
): string {
  const t = userMessage.toLowerCase();
  const blob = userBlob(history);
  const vent = substantiveVent(history);
  const trigger = stringFrom(context, 'key_trigger');
  const summary = stringFrom(context, 'situation_summary');
  const lastCoach = lastCoachContent(history);

  const pick = (reply: string): string => {
    const r = polishReply(reply);
    if (r === polishReply(lastCoach)) {
      return polishReply(
        `Sorki, powtarzam się. ${vent ? `Rozumiem: ${vent.slice(0, 120)}... ` : ''}Co byś chciał żeby zrozumiała jako pierwsze?`
      );
    }
    return r;
  };

  if (/rozpisz|gotow[aą] wiadomo|przygotuj.*(wiadomo|sms|tekst)|daj (mi )?(tekst|sms)/i.test(t)) {
    return pick(
      'Dobra, masz gotowca:\n\nŁagodna: „Hej. Poczułem się pominięty i zależy mi na nas. Porozmawiajmy o tym spokojnie."\n\nStanowcza: „Zależy mi na nas, ale poczułem się zraniony. Potrzebuję rozmowy, nie bagatelizowania."'
    );
  }

  if (/co (o tym )?sądzisz|co myślisz|twoja opinia|jak byś/i.test(t)) {
    const hook = summary ? `Patrząc na to co opisałeś, ` : '';
    return pick(
      `${hook}moim zdaniem masz rację że to ważne. Nie chodzi o samą imprezę, tylko że czujesz się sam z problemem. Ja bym zaczął od jednej konkretnej prośby bez oskarżeń.`
    );
  }

  if (/napisalem|napisałem|powtarzasz|czemu nie dzia|nie słuchasz|nie dzila/i.test(t)) {
    if (/imprez|picie|dojrz|rodzin/i.test(blob)) {
      return pick(
        'Sorki, masz rację. Rozumiem: dla ciebie rodzina > impreza, a ona poszła pić i to cię wkurza. Tu nie chodzi o zakaz, tylko że zostałłeś sam z odpowiedzialnością. Jak byś to powiedział jej jednym zdaniem?'
      );
    }
    return pick(
      `Masz rację, powtarzam się. ${trigger ? `${truncateAtWord(trigger, 90)} ` : ''}Powiedz jednym zdaniem czego od niej teraz potrzebujesz.`
    );
  }

  if (/imprez|picie|pić|alkohol|dojrz|rodzin.*imprez|przekład/i.test(t) || /imprez|picie|dojrz/.test(blob)) {
    return pick(
      'No widzę. Dla ciebie rodzina przed imprezą, a ona poszła pić i to wygląda niedojrzałe. Z jej strony pewnie brzmi jak kontrola. Tu chodzi o to że zostałłeś sam z domem. Jaki kompromis by ci pasował?'
    );
  }

  if (/bagateliz|ogranicz/i.test(t) || /bagateliz|ogranicz/.test(blob)) {
    return pick(
      'No i masz. Mówisz o ważnym, a ona to zrzuca na "ograniczasz mnie". Ty mówisz o relacji, ona o wolności. Co byś chciał żeby zrozumiała jako pierwsze?'
    );
  }

  if (/zrozum|usłysz|co czuje|nie rozumie/.test(t) || /zrozum|co czuje/.test(blob)) {
    return pick(
      'Jasne, chodzi o to żeby usłyszała co czujesz. Spróbuj jednym zdaniem: "kiedy poszłaś a ja zostałem z synem, poczułem się pominięty". Bez "zawsze" i "nigdy". Co myślisz?'
    );
  }

  if (/pogadaj|porozmawia|najpierw/i.test(t)) {
    return pick(
      `Spoko, pogadajmy. ${trigger ? `${truncateAtWord(trigger, 100)} ` : ''}Co cię teraz najbardziej dobija?`
    );
  }

  if (vent) {
    return pick(
      `OK, słyszę cię. ${vent.slice(0, 150)}${vent.length > 150 ? '...' : ''} Moim zdaniem tu chodzi o to że czujesz się niedoceniony. Co byś chciał od niej usłyszeć?`
    );
  }

  return pick(
    chatMode
      ? `Spoko. ${trigger ? `${truncateAtWord(trigger, 80)} ` : ''}Opowiedz co cię wkurza w jej reakcji, albo napisz "co o tym sądzisz".`
      : 'Opowiedz co się dzieje. Jak chcesz gotowy tekst, napisz "rozpisz wiadomość".'
  );
}

async function callOpenAI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  apiKey: string
): Promise<{ reply: string; funFact?: string }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');

  const parsed = JSON.parse(content) as { reply?: string; funFact?: string | null };
  const reply = parsed.reply?.trim();
  if (!reply) throw new Error('OpenAI JSON missing reply');
  return { reply: polishReply(reply), funFact: normalizeFunFact(parsed.funFact) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let source = 'fallback';

  try {
    const body = await req.json();
    const analysis = (body.analysisSummary || {}) as Record<string, unknown>;
    const recentMessages = (body.recentMessages || []) as ChatMsg[];
    const language = String(body.language || 'pl');
    const combinedDescription = String(body.combinedDescription || '').slice(0, 500);
    const quizContext = String(body.quizContext || '').slice(0, 400);
    const isOpening = body.isOpening === true;
    const chatMode = body.chatMode !== false;
    const diagnostics = body.diagnostics === true;

    if (diagnostics) {
      const { key, hint } = resolveOpenAiKey();
      return new Response(
        JSON.stringify({
          openaiConfigured: !!key,
          keyPrefix: key ? key.slice(0, 8) + '…' : null,
          hint,
          docs: 'https://supabase.com/dashboard/project/ilqdxdjnabmbmmstvczh/settings/functions',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedRecent = recentMessages
      .map((m) => ({
        role: m.role || (m.sender_id === 'user' ? 'user' : 'coach'),
        content: String(m.content || '').trim(),
      }))
      .filter((m) => m.content);

    const lastUser = isOpening
      ? ''
      : [...normalizedRecent].reverse().find((m) => m.role === 'user')?.content || '';

    const contextPack = buildContextPack(analysis);
    const contextBlock = JSON.stringify(
      {
        language,
        analysisContext: contextPack,
        quizContext: quizContext || undefined,
        combinedDescription: combinedDescription || undefined,
      },
      null,
      0
    );

    const { key: openAiKey, hint: keyHint } = resolveOpenAiKey();
    let reply: string | undefined;
    let funFact: string | undefined;

    if (openAiKey && isOpening) {
      try {
        const langName = LANGUAGE_NAMES[language] || language;
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          {
            role: 'system',
            content:
              SYSTEM_PROMPT +
              languageDirective(language) +
              `\n\nchatMode: true\n\nPAKIET KONTEKSTU:\n${contextBlock}`,
          },
          {
            role: 'user',
            content: `User just opened solo coach chat after analysis. Read combinedDescription and analysisContext carefully — reference ONLY what they actually wrote. Do NOT invent topics (no children, parties, cheating, etc. unless explicitly in their text). Write a warm opening (4-6 sentences) as a buddy. Ask what they need now. Language: ${langName}. JSON only: { "reply": "...", "funFact": null }`,
          },
        ];
        const ai = await callOpenAI(messages, openAiKey);
        if (!isTherapyCliche(ai.reply)) {
          reply = ai.reply;
          funFact = ai.funFact;
          source = 'openai';
        }
      } catch (err) {
        console.error('[solo-coach] opening OpenAI error:', String(err));
      }
    } else if (openAiKey && lastUser) {
      try {
        const messages = buildOpenAiMessages(normalizedRecent, contextBlock, chatMode, language);
        const ai = await callOpenAI(messages, openAiKey);
        if (isTherapyCliche(ai.reply)) {
          console.log('[solo-coach] rejected therapy cliche, using fallback');
        } else {
          reply = ai.reply;
          funFact = ai.funFact;
          source = 'openai';
        }
      } catch (err) {
        console.error('[solo-coach] OpenAI error:', String(err));
      }
    } else if (!openAiKey) {
      console.warn(`[solo-coach] ${keyHint}`);
    }

    if (!reply) {
      if (isOpening) {
        const openingFallback: Record<string, string> = {
          pl: 'Hej. Widzę że coś cię urządziło w relacji. Jestem tu jak kumpel — możemy pogadać albo skleić co napisać do partnera. Co teraz?',
          en: "Hey. I see something bothered you in the relationship. I'm here like a friend — we can talk or draft what to write to your partner. What now?",
          it: 'Ehi. Vedo che qualcosa ti ha disturbato nella relazione. Sono qui come un amico — possiamo parlare o preparare cosa scrivere al partner. E adesso?',
          de: 'Hey. Ich sehe, dass dich etwas in der Beziehung beschäftigt. Ich bin hier wie ein Freund — wir können reden oder eine Nachricht formulieren. Was jetzt?',
          fr: 'Salut. Je vois que quelque chose t\'a dérangé dans la relation. Je suis là comme un ami — on peut discuter ou rédiger quoi écrire au partenaire. Et maintenant ?',
          es: 'Hola. Veo que algo te molestó en la relación. Estoy aquí como un amigo — podemos hablar o redactar qué escribir a tu pareja. ¿Y ahora?',
        };
        reply = polishReply(openingFallback[language] || openingFallback.en);
      } else {
        reply = offlineFallback(lastUser, chatMode, contextPack, normalizedRecent);
      }
      source = 'fallback';
    }

    console.log(`[solo-coach] source=${source} chatMode=${chatMode} msgs=${normalizedRecent.length} funFact=${!!funFact}`);

    return new Response(JSON.stringify({ reply, funFact, source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[solo-coach] fatal:', String(error));
    return new Response(JSON.stringify({ error: String(error), source: 'error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
