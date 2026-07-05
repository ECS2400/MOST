/**
 * Resolve hook — maps `@/` imports to the MOST project root.
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hookDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(hookDir, '../../..');

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const mappedPath = path.join(projectRoot, specifier.slice(2));
    const candidates = [
      mappedPath,
      `${mappedPath}.ts`,
      `${mappedPath}.tsx`,
      path.join(mappedPath, 'index.ts'),
    ];
    for (const candidate of candidates) {
      try {
        return await nextResolve(pathToFileURL(candidate).href, context);
      } catch {
        // try next candidate
      }
    }
    return nextResolve(pathToFileURL(mappedPath).href, context);
  }
  return nextResolve(specifier, context);
}
