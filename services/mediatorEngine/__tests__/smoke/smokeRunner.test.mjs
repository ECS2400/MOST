/**
 * Static checks for mediator-runtime smoke runner (Phase 2I).
 *
 *   npm run test:mediator:smoke-runner
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const PACKAGE_JSON = join(ROOT, 'package.json');
const SMOKE_SCRIPT = join(ROOT, 'scripts/smoke-mediator-runtime.mjs');

describe('mediator-runtime smoke runner — static audit', () => {
  it('package.json defines smoke:mediator-runtime', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    assert.equal(pkg.scripts['smoke:mediator-runtime'], 'node scripts/smoke-mediator-runtime.mjs');
    assert.equal(
      pkg.scripts['test:mediator:smoke-runner'],
      'node --test services/mediatorEngine/__tests__/smoke/*.test.mjs'
    );
  });

  it('smoke script file exists', () => {
    assert.equal(existsSync(SMOKE_SCRIPT), true);
  });

  it('smoke script does not hardcode anon key', () => {
    const source = readFileSync(SMOKE_SCRIPT, 'utf8');
    assert.ok(!source.includes('eyJhbGciOiJIUzI1NiIs'), 'Hardcoded JWT anon key detected');
    assert.ok(!/SUPABASE_ANON_KEY\s*=\s*['"][^'"]+['"]/.test(source));
    assert.ok(!/apikey:\s*['"]eyJ/.test(source));
  });

  it('smoke script does not log raw transcript content', () => {
    const source = readFileSync(SMOKE_SCRIPT, 'utf8');
    assert.ok(!source.includes('console.log(body'));
    assert.ok(!source.includes('console.log(JSON.stringify(body'));
    assert.ok(!/console\.log\([^)]*transcript/i.test(source));
    assert.ok(source.includes('redactSensitive'));
  });

  it('smoke script includes six language scenarios', () => {
    const source = readFileSync(SMOKE_SCRIPT, 'utf8');
    for (const lang of ['normal EN', 'normal PL', 'normal IT', 'normal ES', 'normal DE', 'normal FR']) {
      assert.ok(source.includes(`name: '${lang}'`), `Missing scenario: ${lang}`);
    }
  });

  it('smoke script includes privacy scenario', () => {
    const source = readFileSync(SMOKE_SCRIPT, 'utf8');
    assert.ok(source.includes("name: 'privacy EN'"));
    assert.ok(source.includes('privateMarkers'));
  });

  it('smoke script includes safety scenarios', () => {
    const source = readFileSync(SMOKE_SCRIPT, 'utf8');
    assert.ok(source.includes("name: 'L3 safety EN'"));
    assert.ok(source.includes("name: 'L2 self-harm EN'"));
    assert.ok(source.includes('expectedSafetyLevel'));
  });

  it('smoke script runs scenarios sequentially', () => {
    const source = readFileSync(SMOKE_SCRIPT, 'utf8');
    assert.ok(source.includes('for (const scenario of SCENARIOS)'));
    assert.ok(source.includes('await postScenario'));
    assert.ok(!source.includes('Promise.all'));
  });

  it('smoke script uses Authorization and apikey headers', () => {
    const source = readFileSync(SMOKE_SCRIPT, 'utf8');
    assert.ok(source.includes("Authorization: `Bearer ${config.anonKey}`"));
    assert.ok(source.includes('apikey: config.anonKey'));
  });
});
