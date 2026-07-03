/** Max chat screenshots per solo / partner mediation flow. */
export const MAX_SCREENSHOTS = 20;

/** Images per vision API request (client batches up to MAX_SCREENSHOTS). */
export const SCREENSHOT_BATCH_SIZE = 5;

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
