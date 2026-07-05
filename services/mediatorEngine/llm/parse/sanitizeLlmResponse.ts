/** Removes markdown code fences, JSON wrappers, quotes, and excess whitespace. */
export function sanitizeLlmResponse(raw: string): string {
  if (typeof raw !== 'string') return '';

  let text = raw.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json|text|markdown)?\s*\n?/i, '');
  text = text.replace(/\n?```\s*$/i, '');

  // Strip JSON object wrappers like {"text": "..."} or {"reply": "..."}
  const jsonWrapperMatch = text.match(/^\{\s*"(?:text|reply|message|content)"\s*:\s*"([\s\S]*)"\s*\}$/);
  if (jsonWrapperMatch) {
    text = jsonWrapperMatch[1]!.replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }

  // Strip leading/trailing quotes
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1);
  }

  return text.replace(/\s+/g, ' ').trim();
}
