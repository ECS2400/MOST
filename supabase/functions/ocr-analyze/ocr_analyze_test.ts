import {
  buildAnalyzeResultFromBubbles,
  buildClusterCombinedText,
  buildMessagesFromBubbles,
  buildVisionParts,
  clusterBubblesByVisualSide,
  dedupeBubbles,
  legacyMessageToBubble,
  normalizeBubble,
  normalizeBubbleSide,
  normalizeNumber01,
  parseOpenAiJsonContent,
  processOcrResponse,
  resolveBubbleSide,
  sortBubbles,
  type OcrBubble,
} from './index.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

function sampleBubble(overrides: Partial<OcrBubble> = {}): OcrBubble {
  return {
    id: 'b-0-1-0',
    screenIndex: 0,
    order: 1,
    text: 'Hello',
    confidence: 0.9,
    bubbleSide: 'left',
    ...overrides,
  };
}

Deno.test('OpenAI bubbles response is normalized', () => {
  const raw = JSON.stringify({
    bubbles: [
      {
        screenIndex: 0,
        order: 1,
        text: 'Hej',
        x: 0.08,
        y: 0.31,
        width: 0.62,
        height: 0.08,
        bubbleSide: 'left',
        colorHint: 'gray',
        tailDirection: 'left',
        confidence: 0.88,
        incomplete: false,
      },
      {
        screenIndex: 0,
        order: 2,
        text: 'Cześć',
        bubbleSide: 'right',
        confidence: 0.9,
      },
    ],
  });

  const result = processOcrResponse(raw);
  assertEquals(result.bubbles.length, 2);
  assertEquals(result.bubbles[0].bubbleSide, 'left');
  assertEquals(result.bubbles[0].x, 0.08);
  assertEquals(result.messages.length, 2);
  assertEquals(result.messages[0].speaker, 'unknown');
  assertEquals(result.messages[0].speakerClusterId, 'clusterA');
});

Deno.test('bubbles sorted by screenIndex, order, y', () => {
  const sorted = sortBubbles([
    sampleBubble({ id: 'b', screenIndex: 1, order: 1, y: 0.2, text: 'B' }),
    sampleBubble({ id: 'a', screenIndex: 0, order: 2, y: 0.5, text: 'A2' }),
    sampleBubble({ id: 'c', screenIndex: 0, order: 1, y: 0.1, text: 'A1' }),
  ]);

  assertEquals(sorted.map((b) => b.text), ['A1', 'A2', 'B']);
});

Deno.test('duplicate bubble removed by side + normalized text keeping higher confidence', () => {
  const deduped = dedupeBubbles([
    sampleBubble({ id: 'a', screenIndex: 0, order: 1, text: 'OK', confidence: 0.7 }),
    sampleBubble({ id: 'b', screenIndex: 1, order: 1, text: 'ok', confidence: 0.95, bubbleSide: 'left' }),
    sampleBubble({ id: 'c', screenIndex: 1, order: 2, text: 'Dzięki', bubbleSide: 'right' }),
  ]);

  assertEquals(deduped.length, 2);
  assertEquals(deduped.find((b) => b.text.toLowerCase() === 'ok')?.confidence, 0.95);
});

Deno.test('left bubbles map to clusterA', () => {
  const clusters = clusterBubblesByVisualSide([
    sampleBubble({ bubbleSide: 'left', text: 'Left msg' }),
  ]);
  assertEquals(clusters[0].id, 'clusterA');
  assertEquals(clusters[0].sampleTexts, ['Left msg']);
});

Deno.test('right bubbles map to clusterB', () => {
  const clusters = clusterBubblesByVisualSide([
    sampleBubble({ bubbleSide: 'right', text: 'Right msg' }),
  ]);
  assertEquals(clusters[0].id, 'clusterB');
});

Deno.test('combinedText uses clusterA and clusterB labels', () => {
  const result = buildAnalyzeResultFromBubbles([
    sampleBubble({ id: 'a', bubbleSide: 'left', order: 1, text: 'Hej' }),
    sampleBubble({ id: 'b', bubbleSide: 'right', order: 2, text: 'Cześć' }),
  ]);

  assertEquals(result.combinedText, 'clusterA: Hej\nclusterB: Cześć');
  assertEquals(result.needsUserSpeakerChoice, true);
});

Deno.test('messages always have speaker unknown', () => {
  const bubbles = [
    sampleBubble({ id: 'a', bubbleSide: 'left' }),
    sampleBubble({ id: 'b', bubbleSide: 'right', order: 2 }),
  ];
  const clusters = clusterBubblesByVisualSide(bubbles);
  const messages = buildMessagesFromBubbles(bubbles, clusters);
  assertEquals(messages.every((m) => m.speaker === 'unknown'), true);
});

Deno.test('twenty screenshots do not crash and are capped at twenty', () => {
  const urls = Array.from({ length: 25 }, (_, i) => `https://example.com/${i}.jpg`);
  const parts = buildVisionParts(urls);
  const images = parts.filter(
    (p) => typeof p === 'object' && p !== null && (p as { type?: string }).type === 'image_url'
  );
  assertEquals(images.length, 20);
});

Deno.test('malformed JSON fallback does not crash', () => {
  const result = processOcrResponse('clusterA: Hej\nclusterB: Cześć');
  assertEquals(result.messages.length, 0);
  assertEquals(result.combinedText, 'clusterA: Hej\nclusterB: Cześć');
});

Deno.test('legacy messages response builds clusters without crashing', () => {
  const raw = JSON.stringify({
    messages: [
      {
        screenIndex: 0,
        order: 1,
        bubbleSide: 'left',
        speaker: 'unknown',
        text: 'Legacy left',
        confidence: 0.8,
      },
      {
        screenIndex: 0,
        order: 2,
        speaker: 'me',
        text: 'Legacy me',
        confidence: 0.75,
      },
    ],
  });

  const result = processOcrResponse(raw);
  assertEquals(result.bubbles.length, 2);
  assertEquals(result.messages[1].bubbleSide, 'right');
  assertEquals(result.combinedText.includes('clusterA:'), true);
  assertEquals(result.combinedText.includes('clusterB:'), true);
});

Deno.test('normalizeBubbleSide maps valid sides and defaults to unknown', () => {
  assertEquals(normalizeBubbleSide('left'), 'left');
  assertEquals(normalizeBubbleSide('me'), 'unknown');
});

Deno.test('normalizeNumber01 clamps to 0-1 range', () => {
  assertEquals(normalizeNumber01(0.5), 0.5);
  assertEquals(normalizeNumber01(1.5), 1);
  assertEquals(normalizeNumber01('bad'), undefined);
});

Deno.test('parseOpenAiJsonContent strips markdown fences for bubbles', () => {
  const parsed = parseOpenAiJsonContent('```json\n{"bubbles":[]}\n```');
  assertExists(parsed);
  assertEquals(Array.isArray(parsed.bubbles), true);
});

Deno.test('resolveBubbleSide prefers explicit bubbleSide over legacy speaker', () => {
  assertEquals(resolveBubbleSide('left', 'me'), 'left');
  assertEquals(resolveBubbleSide(undefined, 'partner'), 'left');
});

Deno.test('legacyMessageToBubble preserves incomplete flag', () => {
  const bubble = legacyMessageToBubble(
    {
      screenIndex: 0,
      order: 1,
      bubbleSide: 'right',
      text: 'Cut off',
      confidence: 0.6,
      incomplete: true,
    },
    0
  );
  assertEquals(bubble?.incomplete, true);
});

Deno.test('buildClusterCombinedText includes system and unknown clusters', () => {
  const bubbles = [
    sampleBubble({ id: 'a', bubbleSide: 'center', order: 1, text: 'Today' }),
    sampleBubble({ id: 'b', bubbleSide: 'unknown', order: 2, text: 'Maybe' }),
  ];
  const clusters = clusterBubblesByVisualSide(bubbles);
  const messages = buildMessagesFromBubbles(bubbles, clusters);
  assertEquals(buildClusterCombinedText(messages), 'system: Today\nunknown: Maybe');
});

Deno.test('normalizeBubble assigns stable id when missing', () => {
  const bubble = normalizeBubble(
    {
      screenIndex: 2,
      order: 3,
      text: 'Test',
      bubbleSide: 'left',
      confidence: 0.8,
    },
    4
  );
  assertExists(bubble);
  assertEquals(bubble.id, 'b-2-3-4');
});
