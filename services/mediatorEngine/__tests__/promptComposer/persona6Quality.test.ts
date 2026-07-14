/**
 * PERSONA-6 quality fixture — names, repair_voice prompt.
 *
 *   npm run test:mediator:prompt
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import { hydrateMediationParticipantNames } from '@/services/mediatorEngine/participants/hydrateMediationParticipantNames';
import { detectMediatorCriticism } from '@/services/mediatorEngine/priority/lib/detectMediatorCriticism';
import { resolvePriority } from '@/services/mediatorEngine/priority/resolvePriority';
import { collectPrioritySignals } from '@/services/mediatorEngine/priority/signals/index';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createRichPipelineInput, createPromptComposerInput } from '@/services/mediatorEngine/__tests__/promptComposer/fixtures';

const HOST_LINE = 'czuję się jak mebel';
const PARTNER_LINE = 'nie możesz mi zakazywać wychodzić';
const CRITICISM = 'po co się powtarzasz';
const CRITICISM_2 = 'mam dość tej aplikacji';

function persona6State() {
  return hydrateMediationParticipantNames(
    createBaselineMediationState({
      participants: {
        ...createBaselineMediationState().participants,
        host: {
          ...createBaselineMediationState().participants.host,
          profile: {
            ...createBaselineMediationState().participants.host.profile,
            displayName: 'Host',
          },
        },
        partner: {
          ...createBaselineMediationState().participants.partner,
          profile: {
            ...createBaselineMediationState().participants.partner.profile,
            displayName: 'Partner',
          },
        },
      },
    }),
    { hostName: 'Daniel', partnerName: 'Patrycja' },
    'pl'
  );
}

describe('PERSONA-6 prompt quality', () => {
  it('Daniel + Patrycja appear in Polish production prompt — no Host/Partner labels', () => {
    const state = persona6State();
    const output = composePrompt(
      createPromptComposerInput({
        ...createRichPipelineInput('pl'),
        mediationState: state,
        language: 'pl',
        transcriptWindow: [
          { id: 'h1', authorRole: 'host', content: HOST_LINE, turnNumber: 2, createdAt: 't1' },
          { id: 'p1', authorRole: 'partner', content: PARTNER_LINE, turnNumber: 2, createdAt: 't2' },
          { id: 'h2', authorRole: 'host', content: CRITICISM, turnNumber: 3, createdAt: 't3' },
          { id: 'h3', authorRole: 'host', content: CRITICISM_2, turnNumber: 3, createdAt: 't4' },
        ],
      })
    );

    const combined = `${output.systemPrompt}\n${output.developerPrompt}\n${output.userPrompt}`;
    assert.match(combined, /Daniel/);
    assert.match(combined, /Patrycja/);
    assert.doesNotMatch(combined, /\bHost\b/);
    assert.doesNotMatch(combined, /\bPartner\b/);
    assert.match(output.userPrompt, /Daniel: czuję się jak mebel/);
    assert.match(output.userPrompt, /Patrycja: nie możesz mi zakazywać wychodzić/);
  });

  it('"powtarzasz się" activates repair_voice via priority engine', () => {
    const state = persona6State();
    const input = {
      state,
      reflection: {} as never,
      safety: { level: 'none' } as never,
      strategy: { primaryStrategy: 'build_safety' } as never,
      turnNumber: 4 as const,
      transcriptDelta: [
        { id: 'c1', authorRole: 'host' as const, content: CRITICISM, turnNumber: 4, createdAt: 't' },
      ],
    };

    const signals = collectPrioritySignals({ input });
    assert.ok(signals.some((s) => s.type === 'repair_voice'));

    const priority = resolvePriority(input);
    assert.equal(priority.conversationMode, 'REPAIR_VOICE');
  });

  it('repair_voice developer prompt admits repetition and overrides stage constraints', () => {
    const state = persona6State();
    const rich = createRichPipelineInput('pl');
    const output = composePrompt(
      createPromptComposerInput({
        ...rich,
        mediationState: state,
        language: 'pl',
        priorityOutput: {
          ...rich.priorityOutput,
          conversationMode: 'REPAIR_VOICE',
        },
        transcriptWindow: [
          { id: 'c1', authorRole: 'host', content: CRITICISM, turnNumber: 4, createdAt: 't' },
        ],
      })
    );

    assert.match(output.developerPrompt, /Repair voice/i);
    assert.match(output.developerPrompt, /repair_voice/i);
    assert.match(output.developerPrompt, /powtarzalne|repetitive/i);
  });

  it('criticism phrases are detected', () => {
    assert.equal(detectMediatorCriticism('po co się powtarzasz'), true);
    assert.equal(detectMediatorCriticism('mam dość tej aplikacji'), true);
    assert.equal(detectMediatorCriticism('bez sensu ten czat'), true);
    assert.equal(detectMediatorCriticism('czuję się jak mebel'), false);
  });
});
