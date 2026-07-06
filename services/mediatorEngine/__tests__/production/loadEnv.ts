import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Loads OPENAI_API_KEY from process.env or .env.local (repo root). */
export function loadOpenAiApiKey(): string | undefined {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  for (const filename of ['.env.local', '.env']) {
    const envPath = join(process.cwd(), filename);
    if (!existsSync(envPath)) continue;

    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^OPENAI_API_KEY=(.*)$/);
      if (match) {
        const value = parseEnvValue(match[1] ?? '');
        if (value) return value;
      }
    }
  }

  return undefined;
}

export function loadOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
}

export function loadOpenAiTimeoutMs(): number {
  const raw = process.env.OPENAI_TIMEOUT_MS ?? process.env.OPENAI_TIMEOUT;
  const parsed = raw ? Number.parseInt(String(raw), 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

export const PRODUCTION_API_KEY = loadOpenAiApiKey();
export const PRODUCTION_READY = Boolean(PRODUCTION_API_KEY);
