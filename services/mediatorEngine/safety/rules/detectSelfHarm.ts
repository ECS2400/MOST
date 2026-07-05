import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

/** L2 — self-harm statements without explicit suicide intent. */
export const SELF_HARM_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'self-harm-001',
    category: 'self_harm',
    level: 'L2_pause',
    confidence: 88,
    phrases: [
      'cut myself',
      'hurt myself',
      'self harm',
      'self-harm',
      'harm myself',
      'ranię się',
      'skrzywdzić siebie',
    ],
    regexSources: ['\\b(cut|hurt|harm)\\s+myself\\b'],
  },
];
