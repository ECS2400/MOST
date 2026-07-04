/**
 * Recovery and active-strategy state types for Mediator AI Engine v2.3.
 *
 * Role: mid-layer structs persisted in MediationState. Dictionary unions
 * live in {@link engineTypes}; engine I/O contracts in {@link strategyEngineIo}.
 */

import type { ConfidenceScore, TurnNumber } from './common';
import type { RecoveryTrigger, TherapeuticStrategy } from './engineTypes';

/**
 * Active recovery process after mediator misinterpretation.
 *
 * Role: TSE switches to recover_misinterpretation; affected checks revert to pending.
 */
export interface RecoveryState {
  active: boolean;
  trigger: RecoveryTrigger;
  triggerQuote: string;
  confidence: ConfidenceScore;
  startedAtTurn: TurnNumber;
  /** Max 2 attempts per trigger before falling back to hold_space. */
  recoveryAttempt: number;
  affectedCheckIds: string[];
  affectedFields: string[];
}

/**
 * Recovery Strategy configuration — normal part of architecture, not edge case.
 *
 * Role: documents the intended recovery flow for implementers and tests.
 */
export interface RecoveryStrategy {
  trigger: RecoveryTrigger;
  primaryStrategy: 'recover_misinterpretation';
  primaryIntent: 'correct_misunderstanding' | 'restore_trust_in_process';
  maxAttempts: number;
  fallbackStrategy: 'hold_space';
  revertCheckStatuses: Array<'likely' | 'confirmed'>;
}

/** Active strategy persisted in MediationState between turns. */
export interface ActiveStrategyState {
  primary: TherapeuticStrategy;
  secondary: TherapeuticStrategy | null;
  sinceTurn: TurnNumber;
  confidence: ConfidenceScore;
}
