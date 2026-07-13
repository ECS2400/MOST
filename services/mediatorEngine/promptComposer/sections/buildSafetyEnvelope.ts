import type { SafetyEnvelope, SafetyLevel } from '@/types/mediator';
import { PERSONA_PRECEDENCE_SHORT } from '@/services/mediatorEngine/promptComposer/config/personaPrecedence';

const L3_INSTRUCTIONS = [
  'Safety level L3: stop normal mediation immediately.',
  'Say plainly this is no longer about who is right — pause the conversation first.',
  'Do not deepen conflict or explore blame.',
  'Point toward appropriate professional or emergency support without listing specific hotlines.',
  'Keep it brief, direct, and human — Mościk voice, not therapist voice.',
  PERSONA_PRECEDENCE_SHORT,
] as const;

const L2_INSTRUCTIONS = [
  'Safety level L2: pause normal mediation flow.',
  'Slow the conflict down before pushing any goal forward.',
  'Do not push for agreement or goal advancement.',
  'Call for a pause or slow-down in plain, direct language — no clinical empathy formulas.',
  PERSONA_PRECEDENCE_SHORT,
] as const;

const L1_INSTRUCTIONS = [
  'Safety level L1: proceed with extra care — shorter, slower messages.',
  'Watch for escalation; skip provocative framing.',
  PERSONA_PRECEDENCE_SHORT,
] as const;

/** Builds safety envelope from safety output level. */
export function buildSafetyEnvelope(level: SafetyLevel): SafetyEnvelope {
  if (level === 'L3_stop') {
    return {
      active: true,
      level,
      instructions: [...L3_INSTRUCTIONS],
      allowNormalMediation: false,
    };
  }
  if (level === 'L2_pause') {
    return {
      active: true,
      level,
      instructions: [...L2_INSTRUCTIONS],
      allowNormalMediation: false,
    };
  }
  if (level === 'L1_gentle') {
    return {
      active: true,
      level,
      instructions: [...L1_INSTRUCTIONS],
      allowNormalMediation: true,
    };
  }
  return {
    active: false,
    level: 'none',
    instructions: [],
    allowNormalMediation: true,
  };
}

/** Formats safety envelope as developer-prompt section. */
export function formatSafetyEnvelopeSection(envelope: SafetyEnvelope): string {
  if (!envelope.active) return 'Safety: none — normal mediation flow allowed.';
  return [
    `Safety level: ${envelope.level}`,
    `Allow normal mediation: ${envelope.allowNormalMediation ? 'yes' : 'no'}`,
    ...envelope.instructions,
  ].join('\n');
}
