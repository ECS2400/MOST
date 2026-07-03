/**
 * v3.9 — proposal acceptance flow (client logic smoke tests).
 * Run: node scripts/test-proposal-acceptance-flow.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const liveMediation = readFileSync(join(__dirname, '../services/liveMediation.ts'), 'utf8');
const liveTsx = readFileSync(join(__dirname, '../app/mediation/live.tsx'), 'utf8');

const checks = [
  ['PROPOSAL_DECISION_ACTION defined', liveMediation.includes("export const PROPOSAL_DECISION_ACTION = 'proposal_decision'")],
  ['awaiting_proposal_decision stage', liveMediation.includes("'awaiting_proposal_decision'")],
  ['getProposalDecisionState exported', liveMediation.includes('export function getProposalDecisionState')],
  ['signalProposalDecision exported', liveMediation.includes('export async function signalProposalDecision')],
  ['buildAlternativeProposalMessage', liveMediation.includes('export function buildAlternativeProposalMessage')],
  ['proposal accept UI button', liveTsx.includes('liveUi.proposalAcceptYes')],
  ['proposal reject UI button', liveTsx.includes('liveUi.proposalAcceptNo')],
  ['input hidden when awaiting proposal', liveTsx.includes('!awaitingProposalDecision')],
  ['both accept closure effect', liveTsx.includes('proposalState.bothAccepted')],
  ['reject inserts alternative', liveTsx.includes('ALTERNATIVE_SOLUTION_KIND')],
  ['no second vote after alternative', liveMediation.includes("stage: 'unresolved_but_closed'")],
  ['truncateSafeSentence in backend', readFileSync(join(__dirname, '../supabase/functions/live-mediator/index.ts'), 'utf8').includes('function truncateSafeSentence')],
  ['commitment header em dash', readFileSync(join(__dirname, '../supabase/functions/live-mediator/index.ts'), 'utf8').includes('Konkretne zobowiązanie —')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(ok ? '✓' : '✗', name);
  if (!ok) failed++;
}

// Inline proposal decision state simulation
const PROPOSAL_DECISION_ACTION = 'proposal_decision';
function getProposalAcceptedBy(messages, afterId, hostId, partnerIds) {
  const startIdx = messages.findIndex((m) => m.id === afterId) + 1;
  const accepted = [];
  for (const m of messages.slice(startIdx)) {
    if (m.metadata?.action !== PROPOSAL_DECISION_ACTION) continue;
    if (m.metadata?.decision === 'accepted') accepted.push(m.metadata.userId);
  }
  const hostOk = accepted.includes(hostId);
  const partnerOk = partnerIds.some((id) => accepted.includes(id));
  return { accepted, bothAccepted: hostOk && partnerOk };
}

const host = 'host';
const partner = 'partner';
const proposed = { id: 'prop-1' };
const base = [
  { id: 'prop-1', metadata: { summaryKind: 'proposed_solution' } },
];
const oneAccept = [
  ...base,
  { metadata: { action: PROPOSAL_DECISION_ACTION, decision: 'accepted', userId: host, summaryKind: 'proposed_solution' } },
];
const bothAccept = [
  ...oneAccept,
  { metadata: { action: PROPOSAL_DECISION_ACTION, decision: 'accepted', userId: partner, summaryKind: 'proposed_solution' } },
];

const afterOne = getProposalAcceptedBy(oneAccept, proposed.id, host, [partner]);
const afterBoth = getProposalAcceptedBy(bothAccept, proposed.id, host, [partner]);

if (afterOne.accepted.length !== 1 || afterOne.bothAccepted) {
  console.log('✗ single acceptance recorded');
  failed++;
} else {
  console.log('✓ single acceptance recorded');
}

if (!afterBoth.bothAccepted) {
  console.log('✗ both acceptances complete session');
  failed++;
} else {
  console.log('✓ both acceptances complete session');
}

if (failed > 0) process.exit(1);
console.log('\nPASS: proposal acceptance flow checks');
