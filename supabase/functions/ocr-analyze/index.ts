/**
 * OCR chat bubble detection + speaker clustering from mobile screenshots.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_SCREENSHOTS = 20;

const OCR_PROMPT = `You are extracting chat bubbles from mobile screenshots.

Your task is OCR + visual layout detection.

Do NOT decide who is the user.
Do NOT map left/right to me/partner.
Do NOT summarize.
Do NOT translate.
Do NOT infer missing text.

For each visible chat bubble:
- extract the exact visible text,
- estimate its visual position:
  x, y, width, height as normalized values from 0 to 1,
- detect bubbleSide:
  left / right / center / unknown,
- detect colorHint if obvious,
- detect tailDirection if obvious,
- preserve reading order within each screenshot,
- mark incomplete=true if cut off or partially hidden.

Return JSON only.

Output:
{
  "bubbles": [
    {
      "screenIndex": 0,
      "order": 1,
      "text": "...",
      "x": 0.08,
      "y": 0.31,
      "width": 0.62,
      "height": 0.08,
      "bubbleSide": "left",
      "colorHint": "gray",
      "tailDirection": "left",
      "confidence": 0.88,
      "incomplete": false
    }
  ]
}

Important:
- If geometry is uncertain, still return bubbleSide.
- If bubbleSide is uncertain, use unknown.
- Never output me/partner.`;

export type BubbleSide = 'left' | 'right' | 'center' | 'unknown';
export type OcrBubbleSide = BubbleSide;
export type SpeakerClusterId = 'clusterA' | 'clusterB' | 'system' | 'unknown';
export type OcrSpeaker = 'me' | 'partner' | 'unknown';
export type OcrChatSide = 'left' | 'right';

export interface OcrBubble {
  id: string;
  screenIndex: number;
  order: number;
  text: string;
  incomplete?: boolean;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  bubbleSide: BubbleSide;
  visualGroupId?: string;
  colorHint?: string;
  tailDirection?: 'left' | 'right' | 'none' | 'unknown';
}

export interface OcrSpeakerCluster {
  id: SpeakerClusterId;
  bubbleSide: BubbleSide;
  bubbleIds: string[];
  sampleTexts: string[];
  confidence: number;
}

export interface OcrMessage {
  screenIndex: number;
  order: number;
  bubbleId: string;
  bubbleSide: BubbleSide;
  speakerClusterId: SpeakerClusterId;
  speaker: OcrSpeaker;
  text: string;
  confidence: number;
  incomplete?: boolean;
}

export interface OcrAnalyzeResult {
  combinedText: string;
  texts: string[];
  messages: OcrMessage[];
  bubbles: OcrBubble[];
  speakerClusters: OcrSpeakerCluster[];
  needsUserSpeakerChoice: boolean;
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeBubbleSide(raw: unknown): BubbleSide {
  const value = String(raw ?? '').trim().toLowerCase();
  if (value === 'left' || value === 'right' || value === 'center' || value === 'unknown') {
    return value;
  }
  return 'unknown';
}

export function normalizeNumber01(raw: unknown): number | undefined {
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}

export function resolveBubbleSide(rawSide: unknown, legacySpeaker?: unknown): BubbleSide {
  const side = normalizeBubbleSide(rawSide);
  if (side !== 'unknown') return side;

  const speaker = String(legacySpeaker ?? '').trim().toLowerCase();
  if (speaker === 'me') return 'right';
  if (speaker === 'partner') return 'left';
  return 'unknown';
}

function normalizeTailDirection(
  raw: unknown
): 'left' | 'right' | 'none' | 'unknown' | undefined {
  const value = String(raw ?? '').trim().toLowerCase();
  if (value === 'left' || value === 'right' || value === 'none' || value === 'unknown') {
    return value;
  }
  return undefined;
}

export function normalizeBubble(raw: unknown, index: number): OcrBubble | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const text = String(row.text ?? '').trim();
  if (!text) return null;

  const screenIndex = Number(row.screenIndex);
  const order = Number(row.order);
  const confidence = Number(row.confidence);
  const bubbleSide = resolveBubbleSide(row.bubbleSide, row.speaker);
  const idRaw = String(row.id ?? '').trim();

  return {
    id: idRaw || `b-${Number.isFinite(screenIndex) ? Math.floor(screenIndex) : 0}-${Number.isFinite(order) ? Math.floor(order) : index}-${index}`,
    screenIndex: Number.isFinite(screenIndex) && screenIndex >= 0 ? Math.floor(screenIndex) : 0,
    order: Number.isFinite(order) && order >= 0 ? Math.floor(order) : index,
    text,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
    bubbleSide,
    ...(row.incomplete === true ? { incomplete: true } : {}),
    ...(normalizeNumber01(row.x) !== undefined ? { x: normalizeNumber01(row.x) } : {}),
    ...(normalizeNumber01(row.y) !== undefined ? { y: normalizeNumber01(row.y) } : {}),
    ...(normalizeNumber01(row.width) !== undefined ? { width: normalizeNumber01(row.width) } : {}),
    ...(normalizeNumber01(row.height) !== undefined ? { height: normalizeNumber01(row.height) } : {}),
    ...(String(row.visualGroupId ?? '').trim()
      ? { visualGroupId: String(row.visualGroupId).trim() }
      : {}),
    ...(String(row.colorHint ?? '').trim() ? { colorHint: String(row.colorHint).trim() } : {}),
    ...(normalizeTailDirection(row.tailDirection)
      ? { tailDirection: normalizeTailDirection(row.tailDirection) }
      : {}),
  };
}

export function sortBubbles(bubbles: OcrBubble[]): OcrBubble[] {
  return [...bubbles].sort((a, b) => {
    if (a.screenIndex !== b.screenIndex) return a.screenIndex - b.screenIndex;
    if (a.order !== b.order) return a.order - b.order;
    const ay = a.y ?? 1;
    const by = b.y ?? 1;
    return ay - by;
  });
}

export function dedupeBubbles(bubbles: OcrBubble[]): OcrBubble[] {
  const bestByKey = new Map<string, OcrBubble>();

  for (const bubble of sortBubbles(bubbles)) {
    const key = `${bubble.bubbleSide}::${normalizeText(bubble.text)}`;
    const existing = bestByKey.get(key);
    if (!existing || bubble.confidence > existing.confidence) {
      bestByKey.set(key, bubble);
    }
  }

  return sortBubbles(Array.from(bestByKey.values()));
}

function bubbleSideToClusterId(bubbleSide: BubbleSide): SpeakerClusterId {
  if (bubbleSide === 'left') return 'clusterA';
  if (bubbleSide === 'right') return 'clusterB';
  if (bubbleSide === 'center') return 'system';
  return 'unknown';
}

function meaningfulTexts(texts: string[], limit = 3): string[] {
  return texts
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function clusterBubblesByVisualSide(bubbles: OcrBubble[]): OcrSpeakerCluster[] {
  const groups: Record<SpeakerClusterId, OcrBubble[]> = {
    clusterA: [],
    clusterB: [],
    system: [],
    unknown: [],
  };

  for (const bubble of bubbles) {
    groups[bubbleSideToClusterId(bubble.bubbleSide)].push(bubble);
  }

  const clusterDefs: Array<{ id: SpeakerClusterId; bubbleSide: BubbleSide }> = [
    { id: 'clusterA', bubbleSide: 'left' },
    { id: 'clusterB', bubbleSide: 'right' },
    { id: 'system', bubbleSide: 'center' },
    { id: 'unknown', bubbleSide: 'unknown' },
  ];

  return clusterDefs
    .map(({ id, bubbleSide }) => {
      const clusterBubbles = sortBubbles(groups[id]);
      if (clusterBubbles.length === 0) return null;

      const avgConfidence =
        clusterBubbles.reduce((sum, b) => sum + b.confidence, 0) / clusterBubbles.length;

      return {
        id,
        bubbleSide,
        bubbleIds: clusterBubbles.map((b) => b.id),
        sampleTexts: meaningfulTexts(clusterBubbles.map((b) => b.text)),
        confidence: avgConfidence,
      };
    })
    .filter((cluster): cluster is OcrSpeakerCluster => cluster !== null);
}

export function buildMessagesFromBubbles(
  bubbles: OcrBubble[],
  clusters: OcrSpeakerCluster[]
): OcrMessage[] {
  const clusterByBubbleId = new Map<string, SpeakerClusterId>();
  for (const cluster of clusters) {
    for (const bubbleId of cluster.bubbleIds) {
      clusterByBubbleId.set(bubbleId, cluster.id);
    }
  }

  return sortBubbles(bubbles).map((bubble) => ({
    screenIndex: bubble.screenIndex,
    order: bubble.order,
    bubbleId: bubble.id,
    bubbleSide: bubble.bubbleSide,
    speakerClusterId: clusterByBubbleId.get(bubble.id) ?? bubbleSideToClusterId(bubble.bubbleSide),
    speaker: 'unknown',
    text: bubble.text,
    confidence: bubble.confidence,
    ...(bubble.incomplete ? { incomplete: true } : {}),
  }));
}

export function buildClusterCombinedText(messages: OcrMessage[]): string {
  const order: SpeakerClusterId[] = ['clusterA', 'clusterB', 'system', 'unknown'];
  const lines: string[] = [];

  for (const clusterId of order) {
    for (const message of messages) {
      if (message.speakerClusterId === clusterId) {
        lines.push(`${clusterId}: ${message.text}`);
      }
    }
  }

  return lines.join('\n');
}

export function computeNeedsUserSpeakerChoice(clusters: OcrSpeakerCluster[]): boolean {
  const clusterA = clusters.find((c) => c.id === 'clusterA');
  const clusterB = clusters.find((c) => c.id === 'clusterB');
  return Boolean(
    clusterA &&
      clusterB &&
      clusterA.sampleTexts.length > 0 &&
      clusterB.sampleTexts.length > 0
  );
}

export function legacyMessageToBubble(raw: unknown, index: number): OcrBubble | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const text = String(row.text ?? '').trim();
  if (!text) return null;

  const screenIndex = Number(row.screenIndex);
  const order = Number(row.order);
  const confidence = Number(row.confidence);
  const bubbleSide = resolveBubbleSide(row.bubbleSide, row.speaker);

  return {
    id: `legacy-${Number.isFinite(screenIndex) ? Math.floor(screenIndex) : 0}-${Number.isFinite(order) ? Math.floor(order) : index}-${index}`,
    screenIndex: Number.isFinite(screenIndex) && screenIndex >= 0 ? Math.floor(screenIndex) : 0,
    order: Number.isFinite(order) && order >= 0 ? Math.floor(order) : index,
    text,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
    bubbleSide,
    ...(row.incomplete === true ? { incomplete: true } : {}),
  };
}

export function buildAnalyzeResultFromBubbles(bubbles: OcrBubble[]): OcrAnalyzeResult {
  const deduped = dedupeBubbles(bubbles);
  const clusters = clusterBubblesByVisualSide(deduped);
  const messages = buildMessagesFromBubbles(deduped, clusters);
  const combinedText = buildClusterCombinedText(messages);

  return {
    combinedText,
    texts: messages.map((m) => m.text),
    messages,
    bubbles: deduped,
    speakerClusters: clusters,
    needsUserSpeakerChoice: computeNeedsUserSpeakerChoice(clusters),
  };
}

export function parseOpenAiJsonContent(
  raw: string
): { bubbles?: unknown[]; messages?: unknown[] } | null {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned) as { bubbles?: unknown[]; messages?: unknown[] };
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function plainTextFallback(content: string): OcrAnalyzeResult {
  const combinedText = content.trim();
  return {
    combinedText,
    texts: combinedText ? [combinedText] : [],
    messages: [],
    bubbles: [],
    speakerClusters: [],
    needsUserSpeakerChoice: false,
  };
}

export function processOcrResponse(content: string): OcrAnalyzeResult {
  const parsed = parseOpenAiJsonContent(content);
  if (!parsed) {
    return plainTextFallback(content);
  }

  if (Array.isArray(parsed.bubbles)) {
    const normalized = parsed.bubbles
      .map((row, index) => normalizeBubble(row, index))
      .filter((row): row is OcrBubble => row !== null);

    if (normalized.length > 0) {
      return buildAnalyzeResultFromBubbles(normalized);
    }
  }

  if (Array.isArray(parsed.messages)) {
    const legacyBubbles = parsed.messages
      .map((row, index) => legacyMessageToBubble(row, index))
      .filter((row): row is OcrBubble => row !== null);

    if (legacyBubbles.length > 0) {
      return buildAnalyzeResultFromBubbles(legacyBubbles);
    }
  }

  return plainTextFallback(content);
}

export function buildVisionParts(imageUrls: string[], batchNote = ''): unknown[] {
  const parts: unknown[] = [
    {
      type: 'text',
      text: `${OCR_PROMPT}${batchNote}`,
    },
  ];

  for (const [index, url] of imageUrls.slice(0, MAX_SCREENSHOTS).entries()) {
    parts.push({
      type: 'text',
      text: `SCREEN_INDEX=${index}`,
    });
    parts.push({
      type: 'image_url',
      image_url: {
        url,
        detail: 'high',
      },
    });
  }

  return parts;
}

function languageNote(language: string): string {
  return `The request locale is "${language}". Use it only for auxiliary labels if needed. Do NOT translate extracted chat messages — copy them exactly as visible on the screenshots.`;
}

if (import.meta.main) {
  serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const raw = await req.text();
      const body = raw.trim() ? JSON.parse(raw) : {};

      if (body.ping === true) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const imageUrls = (body.imageUrls as string[]) || [];
      if (imageUrls.length === 0) {
        return new Response(
          JSON.stringify({
            combinedText: '',
            texts: [],
            messages: [],
            bubbles: [],
            speakerClusters: [],
            needsUserSpeakerChoice: false,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const batchIndex = Number(body.batchIndex ?? 0);
      const batchTotal = Number(body.batchTotal ?? 1);
      const batchNote =
        batchTotal > 1
          ? `\n\nThis is batch ${batchIndex + 1} of ${batchTotal}. Extract only messages visible in these images. Preserve order within this batch.`
          : '';

      const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const language = String(body.language || 'pl');
      const model = Deno.env.get('OCR_MODEL')?.trim() || 'gpt-4o-mini';
      const parts = buildVisionParts(imageUrls, batchNote);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: languageNote(language),
            },
            { role: 'user', content: parts },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI ${res.status}`);
      }

      const json = await res.json();
      const content = (json.choices?.[0]?.message?.content || '').trim();
      const result = processOcrResponse(content);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  });
}
