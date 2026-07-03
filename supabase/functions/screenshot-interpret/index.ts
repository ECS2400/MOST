/**
 * Read chat screenshots → extract transcript & speakers → structure mediation form.
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

function languageDirective(language: string): string {
  const name = LANGUAGE_NAMES[language] || language;
  return `Write ALL user-visible string values in ${name}.`;
}

const MAX_IMAGES_PER_REQUEST = 5;

function batchDirective(batchIndex: number, batchTotal: number): string {
  if (batchTotal <= 1) return '';
  return `\n\nScreenshot batch ${batchIndex + 1} of ${batchTotal}. Extract ONLY messages visible in THIS batch's image(s). Keep chronological order; do not repeat messages from other batches.`;
}

type ImageInput = { base64: string; mimeType?: string };

const EXTRACT_SCHEMA = `Return ONLY valid JSON:
{
  "chat_transcript": "full conversation text with speaker labels like [Name]: message",
  "speakers": [
    {
      "id": "speaker_1",
      "label": "display name or Ty/Partner if unknown",
      "sample_messages": ["2-3 short example lines from this person"],
      "position_hint": "left|right|unknown"
    }
  ],
  "needs_user_choice": true
}
Rules:
- Read ALL visible messages from the screenshot(s) in order.
- Identify distinct speakers (names, phone labels, or left/right bubbles).
- needs_user_choice=true when 2+ speakers and it is unclear which is the app user.
- If only one speaker visible, needs_user_choice=false.`;

const STRUCTURE_SCHEMA = `Return ONLY valid JSON:
{
  "what_happened": "neutral summary of the conflict from USER perspective",
  "what_angered": "what upset the user most",
  "how_felt": "user emotions",
  "what_needed": "what the user needed",
  "what_to_say": "what the user wants to express to partner (I-message style idea)",
  "pasted_text": "clean formatted transcript with [Speaker]: lines"
}
Rules:
- Base everything on the chat transcript only.
- USER speaker is identified by user_speaker_id / user_display_name in the prompt.
- Do NOT invent facts not in the chat.
- Paraphrase for form fields; pasted_text should keep dialogue structure.`;

async function callOpenAi(
  apiKey: string,
  messages: unknown[],
  model = 'gpt-4o-mini'
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  return (json.choices?.[0]?.message?.content || '').trim();
}

function parseJsonContent(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function buildVisionContent(images: ImageInput[], text: string): unknown[] {
  const parts: unknown[] = [{ type: 'text', text }];
  for (const img of images.slice(0, MAX_IMAGES_PER_REQUEST)) {
    const mime = img.mimeType?.startsWith('image/') ? img.mimeType : 'image/jpeg';
    parts.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${img.base64}`, detail: 'low' },
    });
  }
  return parts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown> = {};
    const raw = await req.text();
    if (raw.trim()) body = JSON.parse(raw);

    if (body.ping === true) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mode = String(body.mode || 'extract');
    const language = String(body.language || 'pl');
    const batchIndex = Number(body.batchIndex ?? 0);
    const batchTotal = Number(body.batchTotal ?? 1);
    const batchNote = batchDirective(batchIndex, batchTotal);
    const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'structure') {
      const chatTranscript = String(body.chatTranscript || body.chat_transcript || '');
      const userSpeakerId = String(body.userSpeakerId || body.user_speaker_id || '');
      const userDisplayName = String(body.userDisplayName || body.user_display_name || '');

      if (!chatTranscript.trim()) {
        return new Response(JSON.stringify({ error: 'chatTranscript required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const prompt = `${languageDirective(language)}

${STRUCTURE_SCHEMA}

chat_transcript:
${chatTranscript}

user_speaker_id: ${userSpeakerId || '(not set)'}
user_display_name: ${userDisplayName || '(not set)'}

The USER is the person who will use this mediation app (not their partner).`;

      const content = await callOpenAi(apiKey, [
        { role: 'system', content: 'You structure couple chat transcripts for mediation intake forms.' },
        { role: 'user', content: prompt },
      ]);

      const parsed = parseJsonContent(content);
      return new Response(
        JSON.stringify({
          whatHappened: String(parsed.what_happened || ''),
          whatAngered: String(parsed.what_angered || ''),
          howFelt: String(parsed.how_felt || ''),
          whatNeeded: String(parsed.what_needed || ''),
          whatToSay: String(parsed.what_to_say || ''),
          pastedText: String(parsed.pasted_text || chatTranscript),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // extract mode (default)
    const images = (body.images as ImageInput[]) || [];
    const imageUrls = (body.imageUrls as string[]) || [];
    const existingTranscript = String(body.chatTranscript || '');

    if (!existingTranscript.trim() && images.length === 0 && imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'images or chatTranscript required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingTranscript.trim()) {
      const speakers = Array.isArray(body.speakers) ? body.speakers : [];
      return new Response(
        JSON.stringify({
          chatTranscript: existingTranscript,
          speakers,
          needsUserChoice: speakers.length > 1,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userParts: unknown[] = [];

    if (imageUrls.length > 0) {
      userParts.push({
        type: 'text',
        text: `${languageDirective(language)}${batchNote}\n\n${EXTRACT_SCHEMA}\n\nRead these chat screenshot URLs and extract the conversation.`,
      });
      for (const url of imageUrls.slice(0, MAX_IMAGES_PER_REQUEST)) {
        userParts.push({ type: 'image_url', image_url: { url, detail: 'low' } });
      }
    } else {
      userParts.push({
        type: 'text',
        text: `${languageDirective(language)}${batchNote}\n\n${EXTRACT_SCHEMA}`,
      });
      for (const img of images.slice(0, MAX_IMAGES_PER_REQUEST)) {
        const mime = img.mimeType?.startsWith('image/') ? img.mimeType : 'image/jpeg';
        userParts.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${img.base64}`, detail: 'low' },
        });
      }
    }

    const content = await callOpenAi(apiKey, [
      {
        role: 'system',
        content: 'You extract text and speakers from messenger chat screenshots accurately.',
      },
      { role: 'user', content: userParts },
    ]);

    const parsed = parseJsonContent(content);
    const speakersRaw = Array.isArray(parsed.speakers) ? parsed.speakers : [];
    const speakers = speakersRaw.map((s: Record<string, unknown>, i: number) => ({
      id: String(s.id || `speaker_${i + 1}`),
      label: String(s.label || `Speaker ${i + 1}`),
      sampleMessages: Array.isArray(s.sample_messages)
        ? (s.sample_messages as string[]).map(String).slice(0, 4)
        : [],
      positionHint: String(s.position_hint || 'unknown'),
    }));

    return new Response(
      JSON.stringify({
        chatTranscript: String(parsed.chat_transcript || ''),
        speakers,
        needsUserChoice:
          parsed.needs_user_choice !== false && speakers.length > 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
