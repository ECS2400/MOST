export type BubbleSide = 'left' | 'right' | 'center' | 'unknown';
export type OcrBubbleSide = BubbleSide;
export type SpeakerClusterId = 'clusterA' | 'clusterB' | 'system' | 'unknown';
export type OcrChatSide = 'left' | 'right';
export type OcrSpeaker = 'me' | 'partner' | 'unknown';

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

export interface OcrExtractionResult {
  combinedText: string;
  texts: string[];
  messages: OcrMessage[];
  bubbles: OcrBubble[];
  speakerClusters: OcrSpeakerCluster[];
  needsUserSpeakerChoice: boolean;
}

const HUMAN_CLUSTER_IDS: SpeakerClusterId[] = ['clusterA', 'clusterB'];
const LOW_CLUSTER_CONFIDENCE = 0.55;

export function normalizeOcrText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function bubbleSideToClusterId(bubbleSide: BubbleSide): SpeakerClusterId {
  if (bubbleSide === 'left') return 'clusterA';
  if (bubbleSide === 'right') return 'clusterB';
  if (bubbleSide === 'center') return 'system';
  return 'unknown';
}

function resolveBubbleSide(rawSide: unknown, legacySpeaker?: unknown): BubbleSide {
  const side = String(rawSide ?? '').trim().toLowerCase();
  if (side === 'left' || side === 'right' || side === 'center' || side === 'unknown') {
    return side;
  }

  const speaker = String(legacySpeaker ?? '').trim().toLowerCase();
  if (speaker === 'me') return 'right';
  if (speaker === 'partner') return 'left';
  return 'unknown';
}

function sortMessages(messages: OcrMessage[]): OcrMessage[] {
  return [...messages].sort((a, b) => {
    if (a.screenIndex !== b.screenIndex) return a.screenIndex - b.screenIndex;
    return a.order - b.order;
  });
}

function meaningfulTexts(texts: string[], limit = 3): string[] {
  return texts
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function buildLegacyBubblesFromMessages(messages: OcrMessage[]): OcrBubble[] {
  return messages.map((message, index) => ({
    id: message.bubbleId || `legacy-${message.screenIndex}-${message.order}-${index}`,
    screenIndex: message.screenIndex,
    order: message.order,
    text: message.text,
    confidence: message.confidence,
    bubbleSide: message.bubbleSide,
    ...(message.incomplete ? { incomplete: true } : {}),
  }));
}

export function buildLegacyClustersFromMessages(messages: OcrMessage[]): OcrSpeakerCluster[] {
  const bubbles = buildLegacyBubblesFromMessages(messages);
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
      const clusterBubbles = groups[id];
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

export function dedupeOcrMessages(messages: OcrMessage[]): OcrMessage[] {
  const seen = new Set<string>();
  const result: OcrMessage[] = [];

  for (const message of sortMessages(messages)) {
    const key = `${message.speakerClusterId}::${normalizeOcrText(message.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(message);
  }

  return result;
}

function normalizeMessage(raw: unknown, index: number): OcrMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const text = String(row.text ?? '').trim();
  if (!text) return null;

  const screenIndex = Number(row.screenIndex);
  const order = Number(row.order);
  const confidence = Number(row.confidence);
  const bubbleSide = resolveBubbleSide(row.bubbleSide, row.speaker);
  const rawClusterId = String(row.speakerClusterId ?? '').trim() as SpeakerClusterId;
  const speakerClusterId = (
    ['clusterA', 'clusterB', 'system', 'unknown'] as SpeakerClusterId[]
  ).includes(rawClusterId)
    ? rawClusterId
    : bubbleSideToClusterId(bubbleSide);
  const bubbleId =
    String(row.bubbleId ?? '').trim() ||
    `legacy-${Number.isFinite(screenIndex) ? Math.floor(screenIndex) : 0}-${Number.isFinite(order) ? Math.floor(order) : index}-${index}`;

  return {
    screenIndex: Number.isFinite(screenIndex) && screenIndex >= 0 ? Math.floor(screenIndex) : 0,
    order: Number.isFinite(order) && order >= 0 ? Math.floor(order) : index,
    bubbleId,
    bubbleSide,
    speakerClusterId,
    speaker: 'unknown',
    text,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
    ...(row.incomplete === true ? { incomplete: true } : {}),
  };
}

export function enrichOcrExtractionResult(
  partial: Omit<Partial<OcrExtractionResult>, 'messages'> & {
    combinedText?: string;
    texts?: string[];
    messages?: unknown[];
  }
): OcrExtractionResult | null {
  const rawMessages = Array.isArray(partial.messages) ? partial.messages : [];
  const messages = dedupeOcrMessages(
    rawMessages
      .map((row, index) => normalizeMessage(row, index))
      .filter((row): row is OcrMessage => row !== null)
  );

  const bubbles =
    Array.isArray(partial.bubbles) && partial.bubbles.length > 0
      ? partial.bubbles
      : buildLegacyBubblesFromMessages(messages);

  const speakerClusters =
    Array.isArray(partial.speakerClusters) && partial.speakerClusters.length > 0
      ? partial.speakerClusters
      : buildLegacyClustersFromMessages(messages);

  let combinedText = partial.combinedText?.trim() || '';
  if (!combinedText && messages.length > 0) {
    combinedText = buildClusterCombinedText(messages);
  }

  if (!combinedText && messages.length === 0) {
    const fallbackTexts = (partial.texts || []).map((t) => t.trim()).filter(Boolean);
    if (fallbackTexts.length === 0) return null;
    combinedText = fallbackTexts.join('\n');
  }

  const needsUserSpeakerChoice =
    typeof partial.needsUserSpeakerChoice === 'boolean'
      ? partial.needsUserSpeakerChoice
      : clusterIdsNeedingChoice({ speakerClusters }).length === 2;

  return {
    combinedText,
    texts: messages.length > 0 ? messages.map((m) => m.text) : (partial.texts || []).filter(Boolean),
    messages,
    bubbles,
    speakerClusters,
    needsUserSpeakerChoice,
  };
}

export function buildClusterCombinedText(messages: OcrMessage[]): string {
  const order: SpeakerClusterId[] = ['clusterA', 'clusterB', 'system', 'unknown'];
  const lines: string[] = [];

  for (const clusterId of order) {
    for (const message of sortMessages(messages)) {
      if (message.speakerClusterId === clusterId) {
        lines.push(`${clusterId}: ${message.text}`);
      }
    }
  }

  return lines.join('\n');
}

export function sampleTextsForCluster(
  result: Pick<OcrExtractionResult, 'speakerClusters'>,
  clusterId: SpeakerClusterId,
  limit = 3
): string[] {
  const cluster = result.speakerClusters.find((c) => c.id === clusterId);
  if (!cluster) return [];
  return meaningfulTexts(cluster.sampleTexts, limit);
}

export function clusterIdsNeedingChoice(
  result: Pick<OcrExtractionResult, 'speakerClusters'>
): SpeakerClusterId[] {
  const humanClusters = HUMAN_CLUSTER_IDS.filter((clusterId) => {
    const cluster = result.speakerClusters.find((c) => c.id === clusterId);
    return Boolean(cluster && cluster.sampleTexts.length > 0);
  });

  return humanClusters.length === 2 ? humanClusters : [];
}

export function humanClustersWithSamples(
  result: Pick<OcrExtractionResult, 'speakerClusters'>
): OcrSpeakerCluster[] {
  return result.speakerClusters.filter(
    (cluster) => HUMAN_CLUSTER_IDS.includes(cluster.id) && cluster.sampleTexts.length > 0
  );
}

export function hasSingleHumanCluster(
  result: Pick<OcrExtractionResult, 'speakerClusters'>
): boolean {
  return humanClustersWithSamples(result).length === 1;
}

export function hasLowClusterConfidence(
  result: Pick<OcrExtractionResult, 'speakerClusters'>,
  threshold = LOW_CLUSTER_CONFIDENCE
): boolean {
  return humanClustersWithSamples(result).some((cluster) => cluster.confidence < threshold);
}

export function mapClusterToSpeaker(
  clusterId: SpeakerClusterId,
  myClusterId: SpeakerClusterId
): OcrSpeaker {
  if (clusterId === 'system') return 'unknown';
  if (clusterId === 'unknown') return 'unknown';
  if (clusterId === myClusterId) return 'me';
  if (HUMAN_CLUSTER_IDS.includes(clusterId)) return 'partner';
  return 'unknown';
}

export function buildTranscriptFromClusterChoice(
  result: Pick<OcrExtractionResult, 'messages'>,
  myClusterId: SpeakerClusterId
): string {
  return sortMessages(result.messages)
    .map((message) => {
      const speaker = mapClusterToSpeaker(message.speakerClusterId, myClusterId);
      return `${speaker}: ${message.text}`;
    })
    .join('\n');
}

/** @deprecated Use cluster-based helpers instead */
export function mapBubbleSideToSpeaker(
  bubbleSide: BubbleSide,
  mySide: OcrChatSide
): OcrSpeaker {
  if (bubbleSide === mySide) return 'me';
  if (bubbleSide === 'left' || bubbleSide === 'right') return 'partner';
  return 'unknown';
}

/** @deprecated Use buildTranscriptFromClusterChoice instead */
export function buildConflictAnalysisTranscript(
  messages: OcrMessage[],
  mySide: OcrChatSide
): string {
  return messages
    .map((m) => {
      const speaker = mapBubbleSideToSpeaker(m.bubbleSide, mySide);
      return `${speaker}: ${m.text}`;
    })
    .join('\n');
}

/** @deprecated Use sampleTextsForCluster instead */
export function sampleTextsForBubbleSide(
  messages: OcrMessage[],
  side: BubbleSide,
  limit = 3
): string[] {
  return messages
    .filter((m) => m.bubbleSide === side && m.text?.trim())
    .map((m) => m.text.trim())
    .slice(0, limit);
}

/** @deprecated Use clusterIdsNeedingChoice instead */
export function bubbleSidesNeedingChoice(messages: OcrMessage[]): OcrChatSide[] {
  const sides = new Set(
    messages
      .map((m) => m.bubbleSide)
      .filter((s): s is OcrChatSide => s === 'left' || s === 'right')
  );
  return Array.from(sides);
}

/** @deprecated Use buildClusterCombinedText instead */
export function buildBubbleSideCombinedText(messages: OcrMessage[]): string {
  return messages.map((m) => `${m.bubbleSide}: ${m.text}`).join('\n');
}
