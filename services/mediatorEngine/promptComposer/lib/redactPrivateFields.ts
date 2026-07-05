/** Redacts emails and phone numbers from text destined for prompts. */
export function redactPrivateFields(text: string): string {
  if (typeof text !== 'string') return '';

  let result = text;
  result = result.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    '[REDACTED_EMAIL]'
  );
  result = result.replace(
    /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{2,4}[\s-]?\d{2,4}\b/g,
    '[REDACTED_PHONE]'
  );
  return result.replace(/\s+/g, ' ').trim();
}

/** Collapses excessive whitespace. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
