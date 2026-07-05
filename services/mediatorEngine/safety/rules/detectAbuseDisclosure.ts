import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

/** L2 — abuse disclosure. */
export const ABUSE_DISCLOSURE_PATTERNS: SafetyPatternDefinition[] = [
  {
    id: 'abuse-disclosure-001',
    category: 'abuse_disclosure',
    level: 'L2_pause',
    confidence: 87,
    phrases: [
      'abuses me',
      'he hits me',
      'she hits me',
      'domestic violence',
      'being abused',
      'bije mnie',
      'jestem bite',
      'przemoc domowa',
    ],
    regexSources: ['\\b(abus(e|es|ed|ing)|hit(s|ting)?)\\s+me\\b'],
  },
];
