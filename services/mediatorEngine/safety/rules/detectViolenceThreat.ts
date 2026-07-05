import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

/** L3 — explicit violence threat toward another person. */
export const VIOLENCE_THREAT_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'violence-threat-001',
    category: 'violence_threat',
    level: 'L3_stop',
    confidence: 92,
    phrases: [
      'will kill you',
      'going to kill you',
      'i will hurt you',
      'going to attack',
      'zabiję cię',
      'cię zabiję',
      'zrobię ci krzywdę',
    ],
    regexSources: [
      '\\b(will|going\\s+to|gonna)\\s+(kill|hurt|attack)\\s+(you|him|her|them)\\b',
    ],
  },
];
