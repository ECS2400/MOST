import type { EvidenceStore, TurnNumber } from '@/types/mediator';
import { createEmptyEvidenceStore } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import {
  STATE_ANALYZER_LIMITS,
  TRANSCRIPT_METADATA_ANALYSIS_PREFIX,
  TRANSCRIPT_METADATA_CONCLUSION_VALUE,
  TRANSCRIPT_METADATA_REDACTED_CONTENT,
} from '@/services/mediatorEngine/stateAnalyzer/config/stateAnalyzerLimits';
import { toEvidenceItemMetadata } from '@/services/mediatorEngine/stateAnalyzer/transcript/extractTranscriptMetadata';
import type { TranscriptTurnMetadata } from '@/services/mediatorEngine/stateAnalyzer/transcript/extractTranscriptMetadata';

export interface BuildEvidenceStoreInput {
  existing: EvidenceStore | null | undefined;
  metadata: TranscriptTurnMetadata;
  turnNumber: TurnNumber;
  detectedAt: string;
}

function normalizeStore(existing: EvidenceStore | null | undefined): EvidenceStore {
  if (!existing || typeof existing !== 'object') {
    return createEmptyEvidenceStore();
  }
  return {
    conclusions: existing.conclusions ?? {},
    indexByTurn: existing.indexByTurn ?? {},
    maxConclusions:
      typeof existing.maxConclusions === 'number'
        ? existing.maxConclusions
        : STATE_ANALYZER_LIMITS.maxConclusions,
  };
}

function trimConclusions(store: EvidenceStore): EvidenceStore {
  const ids = Object.keys(store.conclusions);
  if (ids.length <= store.maxConclusions) return store;

  const sorted = ids.sort((a, b) => {
    const turnA = store.conclusions[a]?.assessedAtTurn ?? 0;
    const turnB = store.conclusions[b]?.assessedAtTurn ?? 0;
    return turnA - turnB;
  });
  const removeCount = ids.length - store.maxConclusions;
  const toRemove = new Set(sorted.slice(0, removeCount));
  const conclusions = Object.fromEntries(
    Object.entries(store.conclusions).filter(([id]) => !toRemove.has(id))
  );
  return { ...store, conclusions };
}

/** Builds or extends the evidence store with transcript metadata evidence. */
export function buildEvidenceStore(input: BuildEvidenceStoreInput): EvidenceStore {
  const base = normalizeStore(input.existing);
  const analysisId = `${TRANSCRIPT_METADATA_ANALYSIS_PREFIX}${input.turnNumber}`;
  const structuredMetadata = toEvidenceItemMetadata(input.metadata);
  const evidenceItem = {
    id: `evidence-transcript-meta-${input.turnNumber}`,
    source: 'transcript_metadata' as const,
    content: TRANSCRIPT_METADATA_REDACTED_CONTENT,
    metadata: structuredMetadata,
    messageIds: input.metadata.messageIds,
    turnNumber: input.turnNumber,
    weight: 1,
    polarity: 'neutral' as const,
    detectedAt: input.detectedAt,
    stale: false,
  };

  const conclusion = {
    analysisId,
    value: TRANSCRIPT_METADATA_CONCLUSION_VALUE,
    confidence: 100,
    confidenceMethod: 'weighted_sum' as const,
    evidence: [evidenceItem],
    derivedFrom: [],
    assessedAt: input.detectedAt,
    assessedAtTurn: input.turnNumber,
    stale: false,
    decayFactor: 1,
    requiresReconfirmation: false,
  };

  const conclusions = {
    ...base.conclusions,
    [analysisId]: conclusion,
  };
  const indexByTurn = {
    ...base.indexByTurn,
    [input.turnNumber]: [...(base.indexByTurn[input.turnNumber] ?? []), analysisId].filter(
      (id, index, list) => list.indexOf(id) === index
    ),
  };

  return trimConclusions({
    ...base,
    conclusions,
    indexByTurn,
  });
}
