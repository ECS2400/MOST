import type { SafetyPatternDefinition } from '@/services/mediatorEngine/safety/config/safetyPatterns';

export interface PatternMatchResult {
  pattern: SafetyPatternDefinition;
  detectionLayer: 'regex' | 'heuristic';
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Matches a single pattern against message content — content never leaves this function. */
export function matchSafetyPattern(
  content: string,
  pattern: SafetyPatternDefinition
): PatternMatchResult | null {
  const normalized = normalizeText(content);

  for (const source of pattern.regexSources ?? []) {
    try {
      const regex = new RegExp(source, 'i');
      if (regex.test(content)) {
        return { pattern, detectionLayer: 'regex' };
      }
    } catch {
      // skip invalid regex
    }
  }

  for (const phrase of pattern.phrases) {
    if (normalized.includes(normalizeText(phrase))) {
      return { pattern, detectionLayer: 'heuristic' };
    }
  }

  return null;
}
