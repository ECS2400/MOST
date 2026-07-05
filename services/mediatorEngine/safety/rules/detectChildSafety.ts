import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

/** L3 — child safety risk or disclosure. */
export const CHILD_SAFETY_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'child-safety-001',
    category: 'child_safety',
    level: 'L3_stop',
    confidence: 94,
    phrases: [
      'child is being abused',
      'my child is being hurt',
      'hurting my child',
      'child abuse',
      'abusing my kids',
      'krzywdzi moje dziecko',
      'przemoc wobec dziecka',
    ],
    regexSources: ['\\babus(e|ing)\\s+(my\\s+)?(child|kid|children)\\b'],
  },
];
