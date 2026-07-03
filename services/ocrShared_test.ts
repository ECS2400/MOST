import {
  buildLegacyClustersFromMessages,
  buildTranscriptFromClusterChoice,
  clusterIdsNeedingChoice,
  enrichOcrExtractionResult,
  hasSingleHumanCluster,
  sampleTextsForCluster,
  type OcrExtractionResult,
} from './ocrShared.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

function sampleResult(overrides: Partial<OcrExtractionResult> = {}): OcrExtractionResult {
  return {
    combinedText: 'clusterA: Hej\nclusterB: Cześć',
    texts: ['Hej', 'Cześć'],
    messages: [
      {
        screenIndex: 0,
        order: 1,
        bubbleId: 'a',
        bubbleSide: 'left',
        speakerClusterId: 'clusterA',
        speaker: 'unknown',
        text: 'Hej',
        confidence: 0.9,
      },
      {
        screenIndex: 0,
        order: 2,
        bubbleId: 'b',
        bubbleSide: 'right',
        speakerClusterId: 'clusterB',
        speaker: 'unknown',
        text: 'Cześć',
        confidence: 0.85,
      },
    ],
    bubbles: [],
    speakerClusters: [
      {
        id: 'clusterA',
        bubbleSide: 'left',
        bubbleIds: ['a'],
        sampleTexts: ['Hej', 'Hej again'],
        confidence: 0.9,
      },
      {
        id: 'clusterB',
        bubbleSide: 'right',
        bubbleIds: ['b'],
        sampleTexts: ['Cześć'],
        confidence: 0.85,
      },
    ],
    needsUserSpeakerChoice: true,
    ...overrides,
  };
}

Deno.test('sampleTextsForCluster returns examples only from clusterA', () => {
  const result = sampleResult();
  assertEquals(sampleTextsForCluster(result, 'clusterA'), ['Hej', 'Hej again']);
  assertEquals(sampleTextsForCluster(result, 'clusterB'), ['Cześć']);
});

Deno.test('buildTranscriptFromClusterChoice maps clusterA to me', () => {
  const result = sampleResult();
  assertEquals(
    buildTranscriptFromClusterChoice(result, 'clusterA'),
    'me: Hej\npartner: Cześć'
  );
});

Deno.test('buildTranscriptFromClusterChoice maps clusterB to me', () => {
  const result = sampleResult();
  assertEquals(
    buildTranscriptFromClusterChoice(result, 'clusterB'),
    'partner: Hej\nme: Cześć'
  );
});

Deno.test('one human cluster only triggers warning state without auto-map', () => {
  const enriched = enrichOcrExtractionResult({
    combinedText: 'clusterA: Only side',
    texts: ['Only side'],
    messages: [
      {
        screenIndex: 0,
        order: 1,
        bubbleSide: 'left',
        speaker: 'unknown',
        text: 'Only side',
        confidence: 0.8,
      },
    ],
  });

  assertExists(enriched);
  assertEquals(hasSingleHumanCluster(enriched), true);
  assertEquals(clusterIdsNeedingChoice(enriched).length, 0);
  assertEquals(enriched.needsUserSpeakerChoice, false);
});

Deno.test('legacy bubbleSide response builds clusters', () => {
  const enriched = enrichOcrExtractionResult({
    combinedText: '',
    texts: [],
    messages: [
      {
        screenIndex: 0,
        order: 1,
        bubbleSide: 'left',
        speaker: 'unknown',
        text: 'Left only',
        confidence: 0.7,
      },
      {
        screenIndex: 0,
        order: 2,
        bubbleSide: 'right',
        speaker: 'unknown',
        text: 'Right msg',
        confidence: 0.75,
      },
    ],
  });

  assertExists(enriched);
  const clusters = buildLegacyClustersFromMessages(enriched.messages);
  assertEquals(clusters.some((c) => c.id === 'clusterA'), true);
  assertEquals(clusters.some((c) => c.id === 'clusterB'), true);
  assertEquals(clusterIdsNeedingChoice(enriched).length, 2);
});

Deno.test('legacy speaker me/partner without bubbleSide does not crash', () => {
  const enriched = enrichOcrExtractionResult({
    combinedText: '',
    texts: [],
    messages: [
      {
        screenIndex: 0,
        order: 1,
        speaker: 'me',
        text: 'My message',
        confidence: 0.8,
      },
      {
        screenIndex: 0,
        order: 2,
        speaker: 'partner',
        text: 'Their message',
        confidence: 0.85,
      },
    ],
  });

  assertExists(enriched);
  assertEquals(enriched.messages[0].bubbleSide, 'right');
  assertEquals(enriched.messages[1].bubbleSide, 'left');
  assertEquals(enriched.messages.every((m) => m.speaker === 'unknown'), true);
});
