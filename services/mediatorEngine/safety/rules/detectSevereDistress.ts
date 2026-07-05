import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

/** L2 — strong severe distress signals. */
export const SEVERE_DISTRESS_STRONG_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'severe-distress-strong-001',
    category: 'severe_distress',
    level: 'L2_pause',
    confidence: 84,
    phrases: [
      "can't go on",
      'breaking down completely',
      'falling apart completely',
      'cannot do this anymore',
      'completely overwhelmed',
      'nie dam rady',
      'całkowicie się rozpada',
    ],
    regexSources: ['\\b(can.?t|cannot)\\s+(go\\s+on|take\\s+(this|it|anymore))\\b'],
  },
];

/** L1 — mild distress / weak safety terms. */
export const SEVERE_DISTRESS_MILD_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'severe-distress-mild-001',
    category: 'severe_distress',
    level: 'L1_gentle',
    confidence: 65,
    phrases: [
      'feel overwhelmed',
      'very upset',
      'stressed out',
      'really struggling',
      'jestem przytłoczony',
      'bardzo zdenerwowany',
    ],
  },
];

export const SEVERE_DISTRESS_PATTERNS: SafetyPatternDefinition[] = [
  ...SEVERE_DISTRESS_STRONG_PATTERNS,
  ...SEVERE_DISTRESS_MILD_PATTERNS,
];
