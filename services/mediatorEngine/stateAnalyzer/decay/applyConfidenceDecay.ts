import type {
  EvidencedConclusion,
  EvidenceStore,
  MediationState,
} from '@/types/mediator';
import { STATE_ANALYZER_LIMITS } from '@/services/mediatorEngine/stateAnalyzer/config/stateAnalyzerLimits';
import { decayConfidenceValue } from '@/services/mediatorEngine/stateAnalyzer/decay/decayConfidenceValue';

function decayConclusion(
  conclusion: EvidencedConclusion,
  turnsElapsed: number
): { next: EvidencedConclusion; decayApplied: boolean } {
  if (conclusion.stale || turnsElapsed <= 0) {
    return { next: conclusion, decayApplied: false };
  }

  const applicableTurns = Math.max(
    0,
    turnsElapsed - (STATE_ANALYZER_LIMITS.decayStartAfterTurns - 1)
  );
  if (applicableTurns <= 0) {
    return { next: conclusion, decayApplied: false };
  }

  const reduction = applicableTurns * STATE_ANALYZER_LIMITS.decayPercentPerTurn;
  const nextConfidence = Math.max(0, conclusion.confidence - reduction);
  const nextDecayFactor = Math.max(
    0,
    conclusion.decayFactor - applicableTurns * STATE_ANALYZER_LIMITS.conclusionDecayFactorStep
  );
  const stale = nextConfidence < STATE_ANALYZER_LIMITS.staleConfidenceThreshold;

  return {
    next: {
      ...conclusion,
      confidence: nextConfidence,
      decayFactor: nextDecayFactor,
      stale,
      requiresReconfirmation: stale || conclusion.requiresReconfirmation,
    },
    decayApplied: reduction > 0,
  };
}

export interface ApplyConfidenceDecayResult {
  state: MediationState;
  decayEventsApplied: number;
}

/** Applies L1 confidence decay to load fields and evidence conclusions. */
export function applyConfidenceDecay(
  state: MediationState,
  turnsElapsed: number
): ApplyConfidenceDecayResult {
  let decayEventsApplied = 0;

  const host = decayConfidenceValue(state.load.host, turnsElapsed);
  const partner = decayConfidenceValue(state.load.partner, turnsElapsed);
  const exhaustion = decayConfidenceValue(state.load.exhaustionDetected, turnsElapsed);
  const disengagement = decayConfidenceValue(state.load.disengagementRisk, turnsElapsed);

  decayEventsApplied += Number(host.decayApplied);
  decayEventsApplied += Number(partner.decayApplied);
  decayEventsApplied += Number(exhaustion.decayApplied);
  decayEventsApplied += Number(disengagement.decayApplied);

  const conclusions: EvidenceStore['conclusions'] = {};
  for (const [analysisId, conclusion] of Object.entries(state.evidenceStore?.conclusions ?? {})) {
    const decayed = decayConclusion(conclusion, turnsElapsed);
    conclusions[analysisId] = decayed.next;
    decayEventsApplied += Number(decayed.decayApplied);
  }

  return {
    state: {
      ...state,
      load: {
        ...state.load,
        host: host.next,
        partner: partner.next,
        exhaustionDetected: exhaustion.next,
        disengagementRisk: disengagement.next,
      },
      evidenceStore: {
        ...state.evidenceStore,
        conclusions,
      },
    },
    decayEventsApplied,
  };
}
