import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

/** L3 — explicit suicide ideation or intent. */
export const SUICIDE_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'suicide-explicit-001',
    category: 'suicide',
    level: 'L3_stop',
    confidence: 95,
    phrases: [
      'kill myself',
      'want to die',
      'end my life',
      'commit suicide',
      'take my own life',
      'suicidal',
      'chcę się zabić',
      'popełnię samobójstwo',
    ],
    regexSources: ['\\bkill\\s+myself\\b', '\\bsuicid(e|al)\\b'],
  },
];
