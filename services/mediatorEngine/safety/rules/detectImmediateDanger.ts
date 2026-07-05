import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

/** L3 — immediate danger requiring urgent response. */
export const IMMEDIATE_DANGER_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'immediate-danger-001',
    category: 'immediate_danger',
    level: 'L3_stop',
    confidence: 93,
    phrases: [
      'immediate danger',
      'in danger right now',
      'happening right now',
      'help me now',
      'need help now',
      'bezpośrednie zagrożenie',
      'dzieje się teraz',
    ],
    regexSources: ['\\bemergency\\b', '\\b(help|save)\\s+me\\s+now\\b'],
  },
];
