import type { MediationState, StateAnalyzerInput, StateAnalyzerOutput } from '@/types/mediator';
import { createInitialMediationState } from '@/services/mediatorEngine/stateAnalyzer/factory/createInitialMediationState';
import { applyConfidenceDecay } from '@/services/mediatorEngine/stateAnalyzer/decay/applyConfidenceDecay';
import { buildEvidenceStore } from '@/services/mediatorEngine/stateAnalyzer/evidence/buildEvidenceStore';
import { extractTranscriptMetadata } from '@/services/mediatorEngine/stateAnalyzer/transcript/extractTranscriptMetadata';
import { updateMediationState } from '@/services/mediatorEngine/stateAnalyzer/update/updateMediationState';

function normalizeTurnNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 1;
}

function resolveBaseState(input: StateAnalyzerInput): MediationState {
  if (input.mediationState && typeof input.mediationState === 'object') {
    return input.mediationState;
  }
  return createInitialMediationState({ turnNumber: normalizeTurnNumber(input.turnNumber) });
}

/** Builds the State Analyzer output from normalized input. */
export function buildStateAnalyzerOutput(input: StateAnalyzerInput): StateAnalyzerOutput {
  const turnNumber = normalizeTurnNumber(input.turnNumber);
  const baseState = resolveBaseState(input);
  const previousTurn = baseState.meta?.currentTurnNumber ?? turnNumber;
  const turnsElapsed = Math.max(0, turnNumber - previousTurn);
  const lastUpdatedAt = new Date().toISOString();
  const metadata = extractTranscriptMetadata(input.transcriptDelta, turnNumber);

  const decayResult = applyConfidenceDecay(baseState, turnsElapsed);
  const metaUpdated = updateMediationState(decayResult.state, {
    turnNumber,
    lastUpdatedAt,
  });
  const evidenceStore = buildEvidenceStore({
    existing: metaUpdated.evidenceStore,
    metadata,
    turnNumber,
    detectedAt: lastUpdatedAt,
  });

  const updatedState: MediationState = {
    ...metaUpdated,
    evidenceStore,
  };

  return {
    updatedState,
    evidenceStore,
    dynamicsUpdated: false,
    participantFieldsUpdated: false,
    decayEventsApplied: decayResult.decayEventsApplied,
  };
}

/** Minimal safe output when analysis fails. */
export function createMinimalStateAnalyzerOutput(input: StateAnalyzerInput): StateAnalyzerOutput {
  const turnNumber = normalizeTurnNumber(input.turnNumber);
  const state = createInitialMediationState({ turnNumber });
  return {
    updatedState: state,
    evidenceStore: state.evidenceStore,
    dynamicsUpdated: false,
    participantFieldsUpdated: false,
    decayEventsApplied: 0,
  };
}
