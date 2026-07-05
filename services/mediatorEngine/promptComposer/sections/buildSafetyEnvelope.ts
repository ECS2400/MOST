import type { SafetyEnvelope, SafetyLevel } from '@/types/mediator';

const L3_INSTRUCTIONS = [
  'Safety level L3: stop normal mediation immediately.',
  'Respond with a safety-first message — acknowledge distress, suggest pause.',
  'Do not deepen conflict or explore blame.',
  'Encourage reaching appropriate professional or emergency support without listing specific hotlines.',
  'Keep the message calm, brief, and non-judgmental.',
] as const;

const L2_INSTRUCTIONS = [
  'Safety level L2: pause normal mediation flow.',
  'Prioritize de-escalation and emotional safety over goal progress.',
  'Do not push for agreement or goal advancement.',
  'Suggest a pause or slow-down; validate distress without diagnosing.',
] as const;

const L1_INSTRUCTIONS = [
  'Safety level L1: proceed gently with extra care.',
  'Use slower pace and shorter messages.',
  'Monitor for escalation; avoid provocative framing.',
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
