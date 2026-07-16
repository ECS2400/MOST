#!/usr/bin/env node
/**
 * Runs isolated TypeScript checks for Expo app and Supabase Edge.
 */

import { spawnSync } from 'node:child_process';

const checks = [
  { name: 'app', config: 'tsconfig.app.json' },
  { name: 'edge', config: 'tsconfig.edge.json' },
];

let failed = false;
const results = [];

for (const check of checks) {
  const result = spawnSync('npx', ['tsc', '-p', check.config, '--noEmit'], {
    stdio: 'inherit',
    shell: false,
  });

  const ok = result.status === 0;
  results.push({ name: check.name, ok });
  if (!ok) {
    failed = true;
    console.error(`\n[typecheck:${check.name}] failed (exit ${result.status ?? 1})\n`);
  } else {
    console.log(`\n[typecheck:${check.name}] passed\n`);
  }
}

console.log('Typecheck summary:');
for (const { name, ok } of results) {
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
}

process.exit(failed ? 1 : 0);
