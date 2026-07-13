/**
 * Resolve hook — maps `@/` imports to the MOST project root.
 * Load hook — inlines `.md` files as default string exports.
 */

import { readFileSync } from 'node:fs';
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
      `${mappedPath}.md`,
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

export async function load(url, context, nextLoad) {
  if (url.endsWith('.md')) {
    const text = readFileSync(fileURLToPath(url), 'utf8');
    return {
      format: 'module',
      source: `export default ${JSON.stringify(text)};\n`,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
