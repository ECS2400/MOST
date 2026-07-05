import type { Intervention, SessionPersonality, SessionPersonalityProfile } from '@/types/mediator';
import { L1_LIMITS } from '@/services/mediatorEngine/constitution/config/l1Limits';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const TIMESTAMP = '2026-07-05T00:00:00.000Z';

/** Builds a minimal compliant intervention for L1 tests. */
export function createValidIntervention(
  overrides: Partial<Intervention> = {}
): Intervention {
  return {
    id: 'intervention-1',
    type: 'validate',
    target: 'host',
    visibility: 'public',
    content: { primaryMessage: 'Słyszę, że to było trudne.' },
    goal: 'EMOTION_NAMING',
    intent: 'help_name_emotion',
    strategy: 'validate_emotions',
    rationale: 'Support emotion naming.',
    expectedEffect: {
      id: 'effect-1',
      description: 'Partner names an emotion.',
      observableSignals: ['emotion label in reply'],
      targetParticipant: 'host',
      verificationMethod: 'next_message',
      successCriteria: { type: 'check_confirmed', threshold: 1, confidenceRequired: 70 },
      timeHorizon: 1,
    },
    libraryPatternId: 'validate-v1',
    signature: 'validate|EMOTION_NAMING|host',
    generatedAt: TIMESTAMP,
    ...overrides,
  };
}

/** Builds L1 validation context for isolated rule tests. */
export function createL1Context(
  intervention: Intervention,
  overrides: Partial<ConstitutionL1Context> = {}
): ConstitutionL1Context {
  return {
    intervention,
    turnNumber: 5,
    attemptNumber: 1,
    sessionPersonality: null,
    recentInterventionSignatures: [],
    limits: L1_LIMITS,
    ...overrides,
  };
}

/** Builds session personality for profile-limit tests. */
export function createSessionPersonality(
  profile: SessionPersonalityProfile
): SessionPersonality {
  return {
    core: {
      calm: 50,
      warm: 50,
      structured: 50,
      neutral: 50,
      empathetic: 50,
      confident: 50,
    },
    profile,
    adaptiveModifiers: { warmthBoost: 0, structureBoost: 0, lastAdjustedTurn: 0 },
    immutableRuleRefs: [],
  };
}

/** Creates a string longer than the L1 max message length. */
export function createOverlongMessage(): string {
  return 'a'.repeat(L1_LIMITS.maxMessageLength + 1);
}
