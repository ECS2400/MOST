/**
 * Deno deploy bundle audit — static checks (Phase 2G-fix-3).
 *
 *   npm run test:mediator:edge
 *
 * Requires: npm run build:mediator:edge (or test:mediator:edge:bundle)
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = join(process.cwd());
const RUNTIME_DIR = join(ROOT, 'supabase/functions/mediator-runtime');
const EDGE_DIR = join(ROOT, 'services/mediatorEngine/edge');
const BUNDLE_PATH = join(RUNTIME_DIR, '_generated/mediatorRuntime.bundle.ts');
const INDEX_PATH = join(RUNTIME_DIR, 'index.ts');
const DENO_JSON_PATH = join(RUNTIME_DIR, 'deno.json');
const DENO_COMPAT_DOC = join(RUNTIME_DIR, 'DENO_COMPAT.md');
const MANIFEST_PATH = join(RUNTIME_DIR, 'import-compat-manifest.json');

const SOURCE_EDGE_FILES = [
  'cors.ts',
  'errors.ts',
  'types.ts',
  'request.ts',
  'response.ts',
  'createEdgeLlmProvider.ts',
  'handleMediatorRuntimeTurn.ts',
  'handleMediatorRuntimeHttp.ts',
];

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('mediator-runtime — deploy bundle audit', () => {
  it('generated bundle istnieje po build', () => {
    assert.ok(
      existsSync(BUNDLE_PATH),
      'Run npm run build:mediator:edge to generate mediatorRuntime.bundle.ts'
    );
  });

  it('index.ts importuje ./ _generated/mediatorRuntime.bundle.ts', () => {
    const indexSource = readSource(INDEX_PATH);
    assert.match(
      indexSource,
      /from ['"]\.\/_generated\/mediatorRuntime\.bundle\.ts['"]/
    );
    assert.ok(!indexSource.includes('../../../services/mediatorEngine'));
  });

  it('generated bundle nie zawiera @/ aliasów ani __tests__', () => {
    assert.ok(existsSync(BUNDLE_PATH), 'bundle missing — run build:mediator:edge');
    const bundle = readSource(BUNDLE_PATH);
    assert.ok(!bundle.includes('@/services/'));
    assert.ok(!bundle.includes('@/types/'));
    assert.ok(!bundle.includes('__tests__'));
  });

  it('generated bundle exportuje handleMediatorRuntimeHttpRequest', () => {
    assert.ok(existsSync(BUNDLE_PATH), 'bundle missing — run build:mediator:edge');
    const bundle = readSource(BUNDLE_PATH);
    assert.match(bundle, /handleMediatorRuntimeHttpRequest/);
    assert.match(bundle, /export\s*\{[^}]*handleMediatorRuntimeHttpRequest/);
  });

  it('DENO_COMPAT.md wymaga build przed deploy', () => {
    const doc = readSource(DENO_COMPAT_DOC);
    assert.match(doc, /build:mediator:edge/i);
    assert.match(doc, /prebundl/i);
    assert.ok(!doc.includes('option-c-node-tested-draft'));
    assert.ok(!/Option C — Node-tested draft/i.test(doc));
  });

  it('deno.json jest minimalny — bez fałszywego import map dla całego grafu', () => {
    const denoJson = JSON.parse(readSource(DENO_JSON_PATH)) as Record<string, unknown>;
    assert.ok(!('_denoCompatStatus' in denoJson));
    assert.ok(!('imports' in denoJson));
    assert.ok(denoJson.compilerOptions);
  });

  it('generated bundle ma @ts-nocheck dla Deno check', () => {
    assert.ok(existsSync(BUNDLE_PATH), 'bundle missing — run build:mediator:edge');
    const bundle = readSource(BUNDLE_PATH);
    assert.match(bundle, /@ts-nocheck/);
  });

  it('import-compat-manifest dokumentuje bundle deploy strategy', () => {
    const manifest = JSON.parse(readSource(MANIFEST_PATH)) as {
      deployStrategy: string;
      extensionlessAtImportCountInDeployGraph: number;
      denoCheckVerified?: boolean;
    };
    assert.equal(manifest.deployStrategy, 'esbuild-prebundle');
    assert.equal(manifest.extensionlessAtImportCountInDeployGraph, 0);
  });
});

describe('mediator-runtime — static logging guard (source + bundle)', () => {
  for (const file of SOURCE_EDGE_FILES) {
    it(`source edge/${file} bez console.log prompt/transcript`, () => {
      const source = readSource(join(EDGE_DIR, file));
      assert.ok(!source.includes('console.log'));
      assert.ok(!/console\.(log|info|debug).*prompt/i.test(source));
      assert.ok(!/console\.(log|info|debug).*transcript/i.test(source));
    });
  }

  it('index.ts bez console.log', () => {
    const source = readSource(INDEX_PATH);
    assert.ok(!source.includes('console.log'));
  });

  it('generated bundle bez console.log prompt/transcript', () => {
    assert.ok(existsSync(BUNDLE_PATH), 'bundle missing — run build:mediator:edge');
    const bundle = readSource(BUNDLE_PATH);
    assert.ok(!bundle.includes('console.log'));
    assert.ok(!/console\.(log|info|debug).*prompt/i.test(bundle));
    assert.ok(!/console\.(log|info|debug).*transcript/i.test(bundle));
  });
});

describe('mediator-runtime — source edge layer (Node tests)', () => {
  it('source edge layer nadal używa @/ aliasów (resolved at bundle time)', () => {
    let count = 0;
    for (const file of SOURCE_EDGE_FILES) {
      const source = readSource(join(EDGE_DIR, file));
      const matches = source.matchAll(/from ['"]@\/[^'"]+['"]/g);
      for (const _ of matches) count += 1;
    }
    assert.ok(count >= 15);
  });
});
