import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

/** L2 — coercion or controlling behavior disclosure. */
export const COERCION_CONTROL_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'coercion-control-001',
    category: 'coercion_control',
    level: 'L2_pause',
    confidence: 86,
    phrases: [
      "won't let me leave",
      'controls everything',
      'forced me to',
      'trapped in this relationship',
      'nie pozwala mi wyjść',
      'kontroluje wszystko',
      'zmusił mnie',
    ],
    regexSources: [
      '\\b(control(s|led|ling)?\\s+everything|won.?t\\s+let\\s+me\\s+leave)\\b',
    ],
  },
];
