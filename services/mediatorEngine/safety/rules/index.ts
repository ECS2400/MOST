import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';
import { ABUSE_DISCLOSURE_PATTERNS } from '@/services/mediatorEngine/safety/rules/detectAbuseDisclosure';
import { CHILD_SAFETY_PATTERNS } from '@/services/mediatorEngine/safety/rules/detectChildSafety';
import { COERCION_CONTROL_PATTERNS } from '@/services/mediatorEngine/safety/rules/detectCoercionControl';
import { IMMEDIATE_DANGER_PATTERNS } from '@/services/mediatorEngine/safety/rules/detectImmediateDanger';
import { SELF_HARM_PATTERNS } from '@/services/mediatorEngine/safety/rules/detectSelfHarm';
import { SEVERE_DISTRESS_PATTERNS } from '@/services/mediatorEngine/safety/rules/detectSevereDistress';
import { SUICIDE_PATTERNS } from '@/services/mediatorEngine/safety/rules/detectSuicide';
import { VIOLENCE_THREAT_PATTERNS } from '@/services/mediatorEngine/safety/rules/detectViolenceThreat';

/** All L1 safety patterns in evaluation order (highest severity categories first). */
export const ALL_SAFETY_PATTERNS: SafetyPatternDefinition[] = [
  ...SUICIDE_PATTERNS,
  ...IMMEDIATE_DANGER_PATTERNS,
  ...CHILD_SAFETY_PATTERNS,
  ...VIOLENCE_THREAT_PATTERNS,
  ...SELF_HARM_PATTERNS,
  ...ABUSE_DISCLOSURE_PATTERNS,
  ...COERCION_CONTROL_PATTERNS,
  ...SEVERE_DISTRESS_PATTERNS,
];

export {
  SUICIDE_PATTERNS,
  IMMEDIATE_DANGER_PATTERNS,
  CHILD_SAFETY_PATTERNS,
  VIOLENCE_THREAT_PATTERNS,
  SELF_HARM_PATTERNS,
  ABUSE_DISCLOSURE_PATTERNS,
  COERCION_CONTROL_PATTERNS,
  SEVERE_DISTRESS_PATTERNS,
};
