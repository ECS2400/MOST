/**
 * Mediator AI Engine v2.3 — architecture validation tests (Phase 0C).
 *
 * Runner: Node built-in test (`node --test`). No extra packages required.
 *
 *   npm run test:mediator:architecture:static
 *   npm run test:mediator:architecture
 *
 * Runtime response-shape test (TypeScript, Node 22+):
 *
 *   npm run test:mediator:architecture:runtime
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineRoot = path.resolve(__dirname, '..');
const orchestratorPath = path.join(engineRoot, 'orchestrator/orchestrateTurn.ts');
const pipelineOrderPath = path.join(engineRoot, 'orchestrator/pipelineOrder.ts');

const EXPECTED_STEP_ORDER = [
  'stateAnalyzer',
  'safety',
  'reflection',
  'strategy',
  'priority',
  'decision',
  'intervention',
  'constitution',
  'sessionMemory',
  'metrics',
];

const STEP_FUNCTIONS = {
  stateAnalyzer: 'analyzeState',
  safety: 'evaluateSafety',
  reflection: 'runReflection',
  strategy: 'selectStrategy',
  priority: 'resolvePriority',
  decision: 'makeDecision',
  intervention: 'generateIntervention',
  constitution: 'validateConstitution',
  sessionMemory: 'updateSessionMemory',
  metrics: 'recordMetrics',
};

/** Pipeline module files — orchestrator and index.ts are excluded from import-isolation checks. */
const PIPELINE_MODULE_FILES = [
  'stateAnalyzer/analyzeState.ts',
  'safety/evaluateSafety.ts',
  'reflection/runReflection.ts',
  'strategy/selectStrategy.ts',
  'priority/resolvePriority.ts',
  'decision/makeDecision.ts',
  'intervention/generateIntervention.ts',
  'constitution/validateConstitution.ts',
  'memory/updateSessionMemory.ts',
  'metrics/recordMetrics.ts',
];

const IMPORT_EXCEPTIONS = new Set([
  path.join(engineRoot, 'orchestrator/orchestrateTurn.ts'),
  path.join(engineRoot, 'index.ts'),
]);

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(engineRoot, relativePath), 'utf8');
}

/** Extract ordered pipeline function invocations from orchestrator source. */
function extractOrchestratorCallOrder(source) {
  const bodyStart = source.indexOf('export function orchestrateTurn');
  assert.ok(bodyStart >= 0, 'orchestrateTurn not found');
  const body = source.slice(bodyStart);
  const order = [];
  for (const fn of Object.values(STEP_FUNCTIONS)) {
    const pattern = new RegExp(`\\b${fn}\\(`);
    const match = pattern.exec(body);
    assert.ok(match, `expected orchestrator to call ${fn}()`);
    order.push({ fn, index: match.index });
  }
  order.sort((a, b) => a.index - b.index);
  return order.map((entry) => entry.fn);
}

/** Collect import specifiers from a TypeScript source file. */
function extractImportSpecifiers(source) {
  const specifiers = [];
  const importPattern = /import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match = importPattern.exec(source);
  while (match) {
    specifiers.push(match[1]);
    match = importPattern.exec(source);
  }
  return specifiers;
}

describe('Mediator AI Engine v2.3 — architecture validation', () => {
  it('declares canonical pipeline step order in pipelineOrder.ts', () => {
    const source = fs.readFileSync(pipelineOrderPath, 'utf8');
    for (const step of EXPECTED_STEP_ORDER) {
      assert.match(source, new RegExp(`'${step}'`), `pipelineOrder.ts must list step "${step}"`);
    }
    const declaredFns = EXPECTED_STEP_ORDER.map((step) => STEP_FUNCTIONS[step]);
    for (const fn of declaredFns) {
      assert.match(source, new RegExp(`${fn}`), `pipelineOrder.ts must map function "${fn}"`);
    }
  });

  it('orchestrator invokes pipeline modules in architecture order', () => {
    const source = fs.readFileSync(orchestratorPath, 'utf8');
    const callOrder = extractOrchestratorCallOrder(source);
    const expectedFns = EXPECTED_STEP_ORDER.map((step) => STEP_FUNCTIONS[step]);
    assert.deepEqual(
      callOrder,
      expectedFns,
      'orchestrator must call pipeline modules in architecture order'
    );
  });

  it('no pipeline module imports another pipeline module (orchestrator/index exempt)', () => {
    const violations = [];
    for (const relativePath of PIPELINE_MODULE_FILES) {
      const absolutePath = path.join(engineRoot, relativePath);
      if (IMPORT_EXCEPTIONS.has(absolutePath)) continue;
      const source = fs.readFileSync(absolutePath, 'utf8');
      const imports = extractImportSpecifiers(source);
      for (const specifier of imports) {
        const isMediatorEngineImport =
          specifier.startsWith('@/services/mediatorEngine/') ||
          specifier.includes('/services/mediatorEngine/');
        if (!isMediatorEngineImport) continue;
        const isInternal = specifier.includes('/mediatorEngine/_internal/');
        if (isInternal) continue;
        violations.push({ file: relativePath, specifier });
      }
    }
    assert.deepEqual(
      violations,
      [],
      `pipeline modules must not import other pipeline modules:\n${violations
        .map((v) => `  ${v.file} -> ${v.specifier}`)
        .join('\n')}`
    );
  });

  it('Constitution Validator runs after Intervention Engine', () => {
    const source = fs.readFileSync(orchestratorPath, 'utf8');
    const body = source.slice(source.indexOf('export function orchestrateTurn'));
    const interventionIdx = body.indexOf(`${STEP_FUNCTIONS.intervention}(`);
    const constitutionIdx = body.indexOf(`${STEP_FUNCTIONS.constitution}(`);
    assert.ok(interventionIdx >= 0 && constitutionIdx >= 0);
    assert.ok(
      constitutionIdx > interventionIdx,
      'validateConstitution must be called after generateIntervention'
    );
  });

  it('Strategy Engine runs before Priority Engine', () => {
    const source = fs.readFileSync(orchestratorPath, 'utf8');
    const body = source.slice(source.indexOf('export function orchestrateTurn'));
    const strategyIdx = body.indexOf(`${STEP_FUNCTIONS.strategy}(`);
    const priorityIdx = body.indexOf(`${STEP_FUNCTIONS.priority}(`);
    assert.ok(strategyIdx >= 0 && priorityIdx >= 0);
    assert.ok(
      priorityIdx > strategyIdx,
      'resolvePriority must be called after selectStrategy'
    );
  });

  it('StrategyEngineInput does not depend on PriorityOutput', () => {
    const source = readUtf8('../../types/mediator/strategyEngineIo.ts');
    const inputBlock = source.slice(
      source.indexOf('export interface StrategyEngineInput'),
      source.indexOf('export interface StrategyEngineOutput')
    );
    assert.doesNotMatch(inputBlock, /\bpriority\b/);
    assert.match(inputBlock, /\bturnNumber\b/);
  });

  it('PriorityInput receives StrategyEngineOutput', () => {
    const source = readUtf8('../../types/mediator/priority.ts');
    const inputBlock = source.slice(
      source.indexOf('export interface PriorityInput'),
      source.indexOf('export interface PriorityOutput')
    );
    assert.match(inputBlock, /\bstrategy:\s*StrategyEngineOutput\b/);
  });
});
