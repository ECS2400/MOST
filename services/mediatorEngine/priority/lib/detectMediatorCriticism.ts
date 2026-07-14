/** Detects participant criticism directed at Mościk or the mediation app. */
export function detectMediatorCriticism(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length === 0) return false;

  const patterns = [
    /powtarzasz sie/,
    /po co sie powtarzasz/,
    /to samo pytanie/,
    /nic nie rozumiesz/,
    /mam dosc tej aplikacji/,
    /bez sensu ten czat/,
    /brzmisz jak bot/,
    /co ty chrzanisz/,
    /przestan psychologizowac/,
    /nie sluchasz/,
    /nie pomagasz/,
    /po co to pytanie/,
    /znowu to samo/,
    /you keep repeating/,
    /same question again/,
    /sounds like a bot/,
    /this app is useless/,
    /this chat makes no sense/,
    /stop therapizing/,
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}

/** Scans recent participant messages for Mościk/app criticism. */
export function hasRecentMediatorCriticism(
  messages: Array<{ authorRole?: string | null; content?: string | null }>
): boolean {
  const participantMessages = messages
    .filter((m) => m.authorRole === 'host' || m.authorRole === 'partner')
    .slice(-4);

  return participantMessages.some((m) =>
    detectMediatorCriticism(typeof m.content === 'string' ? m.content : '')
  );
}
