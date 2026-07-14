/**
 * Mościk persona — prompt integration tests (PERSONA-1 / PERSONA-2).
 *
 *   npm run test:mediator:prompt
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import {
  buildMostMediatorCurrentState,
  buildMostMediatorPersonaSection,
  renderMostMediatorPersona,
  resolveMostMediatorPersonaVariables,
  MOST_MEDIATOR_PERSONA_MARKDOWN,
} from '@/services/mediatorEngine/promptComposer/persona/mostMediatorPersona';
import { safePromptInput } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';
import { createRichPipelineInput, createPromptComposerInput } from '@/services/mediatorEngine/__tests__/promptComposer/fixtures';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { hydrateMediationParticipantNames } from '@/services/mediatorEngine/participants/hydrateMediationParticipantNames';

describe('Mościk persona — PERSONA-1 / PERSONA-2', () => {
  it('loads canonical markdown verbatim from mostMediatorPersona.md', () => {
    assert.match(MOST_MEDIATOR_PERSONA_MARKDOWN, /^# PROFILE & IDENTITY: MOŚCIK/);
    assert.match(MOST_MEDIATOR_PERSONA_MARKDOWN, /ABSOLUTE HARD CONSTRAINTS/);
    assert.match(MOST_MEDIATOR_PERSONA_MARKDOWN, /\[STATE: START_CHAT\]/);
    assert.match(MOST_MEDIATOR_PERSONA_MARKDOWN, /ZAKAZ KORPO-EMPATII/);
  });

  it('injects verbatim persona into systemPrompt before core rules', () => {
    const output = composePrompt(createRichPipelineInput());
    assert.match(output.systemPrompt, /^# PROFILE & IDENTITY: MOŚCIK/);
    const rulesIndex = output.systemPrompt.indexOf('Core mediator rules');
    assert.ok(rulesIndex > 0);
    assert.ok(output.systemPrompt.indexOf('ZAKAZ KORPO-EMPATII') < rulesIndex);
  });

  it('injects verbatim persona into developerPrompt before safety and therapeutic sections', () => {
    const output = composePrompt(createRichPipelineInput());
    assert.match(output.developerPrompt, /^# PROFILE & IDENTITY: MOŚCIK/);
    const safetyIndex = output.developerPrompt.indexOf('Safety envelope');
    const runtimeIndex = output.developerPrompt.indexOf('Runtime state');
    assert.ok(safetyIndex > 0);
    assert.ok(runtimeIndex > safetyIndex);
  });

  it('substitutes participant display names from mediationState', () => {
    const state = hydrateMediationParticipantNames(
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

    const ctx = safePromptInput(
      createPromptComposerInput({
        ...createRichPipelineInput(),
        mediationState: state,
      })
    );
    const vars = resolveMostMediatorPersonaVariables(ctx);

    assert.equal(vars.userName, 'Daniel');
    assert.equal(vars.partnerName, 'Patrycja');

    const rendered = renderMostMediatorPersona(MOST_MEDIATOR_PERSONA_MARKDOWN, vars);
    assert.match(rendered, /Daniel/);
    assert.match(rendered, /Patrycja/);
    assert.doesNotMatch(rendered, /\{\{USER_NAME\}\}/);
    assert.doesNotMatch(rendered, /\{\{PARTNER_NAME\}\}/);
  });

  it('builds CURRENT_STATE from runtime context without hardcoded names', () => {
    const ctx = safePromptInput(createRichPipelineInput());
    const currentState = buildMostMediatorCurrentState(ctx);

    assert.match(currentState, /goal=/);
    assert.match(currentState, /turn=/);
    assert.match(currentState, /mode=/);
    assert.match(currentState, /move=/);
    assert.doesNotMatch(currentState, /Daniel|Patrycja/);
  });

  it('preserves existing safety and therapeutic constraints in developerPrompt', () => {
    const output = composePrompt(createRichPipelineInput());

    assert.match(output.developerPrompt, /Safety envelope/);
    assert.match(output.developerPrompt, /Constitution constraints/);
    assert.match(output.developerPrompt, /validate/);
  });

  it('fallback composePrompt still includes verbatim Mościk persona', () => {
    const output = composePrompt(null);
    assert.match(output.systemPrompt, /PROFILE & IDENTITY: MOŚCIK/);
    assert.match(output.developerPrompt, /PROFILE & IDENTITY: MOŚCIK/);
  });

  it('buildMostMediatorPersonaSection preserves markdown structure after substitution', () => {
    const ctx = safePromptInput(createRichPipelineInput());
    const section = buildMostMediatorPersonaSection(ctx);
    assert.match(section, /LINGUISTIC DICTIONARY/);
    assert.match(section, /CONVERSATIONAL REBELLION DETECTION/);
    assert.doesNotMatch(section, /\{\{CURRENT_STATE\}\}/);
  });
});
