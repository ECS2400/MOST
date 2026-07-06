/**
 * Prebundles mediator-runtime Edge handler for Deno / Supabase deploy.
 *
 *   npm run build:mediator:edge
 *
 * Resolves @/ path aliases at build time — no extensionless imports in deploy graph.
 */

import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'services/mediatorEngine/edge/handleMediatorRuntimeHttp.ts');
const OUT_DIR = path.join(ROOT, 'supabase/functions/mediator-runtime/_generated');
const OUTFILE = path.join(OUT_DIR, 'mediatorRuntime.bundle.ts');

function resolveAliasPath(specifierPath) {
  const candidates = [
    `${specifierPath}.ts`,
    `${specifierPath}.tsx`,
    path.join(specifierPath, 'index.ts'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return `${specifierPath}.ts`;
}

const aliasPlugin = {
  name: 'at-alias',
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => ({
      path: resolveAliasPath(path.join(ROOT, args.path.slice(2))),
    }));

    build.onResolve({ filter: /\/__tests__\// }, () => ({
      errors: [{ text: 'Test modules must not be bundled into mediator-runtime' }],
    }));
  },
};

mkdirSync(OUT_DIR, { recursive: true });

const result = await esbuild.build({
  entryPoints: [ENTRY],
  outfile: OUTFILE,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  sourcemap: false,
  minify: false,
  plugins: [aliasPlugin],
  banner: { js: '// @ts-nocheck — generated bundle; types checked at source via Node tests.\n' },
  logLevel: 'info',
});

if (result.errors.length > 0) {
  process.exit(1);
}

console.log(`mediator-runtime bundle written: ${path.relative(ROOT, OUTFILE)}`);
