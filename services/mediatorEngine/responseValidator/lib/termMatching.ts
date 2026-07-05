/** Normalizes text for multi-word phrase matching. */
export function normalizeTextForPhraseMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isMultiWordTerm(term: string): boolean {
  return term.trim().includes(' ');
}

function matchesSingleWordTerm(text: string, term: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
  return pattern.test(text);
}

function matchesPhraseTerm(text: string, term: string): boolean {
  return normalizeTextForPhraseMatch(text).includes(term.toLowerCase());
}

/**
 * Finds forbidden terms in text.
 * Multi-word phrases use normalized includes; single words use word-boundary regex.
 */
export function findForbiddenTerms(text: string, terms: readonly string[]): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];

  const found: string[] = [];
  for (const term of terms) {
    const matched = isMultiWordTerm(term)
      ? matchesPhraseTerm(text, term)
      : matchesSingleWordTerm(text, term);
    if (matched) found.push(term);
  }
  return found;
}

/**
 * Finds technical leakage markers in text.
 * CamelCase identifiers use word boundaries; `name:` patterns match key syntax.
 */
export function findTechnicalLeakageTerms(text: string, terms: readonly string[]): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];

  const found: string[] = [];
  for (const term of terms) {
    if (term.endsWith(':')) {
      const base = term.slice(0, -1);
      const pattern = new RegExp(`\\b${escapeRegex(base)}\\s*:`, 'i');
      if (pattern.test(text)) found.push(term);
      continue;
    }

    if (term.startsWith('"')) {
      if (text.toLowerCase().includes(term.toLowerCase())) found.push(term);
      continue;
    }

    if (matchesSingleWordTerm(text, term)) found.push(term);
  }
  return found;
}

export { isMultiWordTerm, matchesSingleWordTerm, matchesPhraseTerm };
