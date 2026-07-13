/**
 * Prompt Composer L1 — unit tests (Phase 2A).
 *
 *   npm run test:mediator:prompt
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import { sanitizeTranscriptWindow } from '@/services/mediatorEngine/promptComposer/transcript/sanitizeTranscriptWindow';
import {
  createL3SafetyInput,
  createLongMessage,
  createPromptComposerInput,
  createRichPipelineInput,
  createTranscriptMessages,
  PRIVATE_MEDIATION_ID,
  PRIVATE_SESSION_ID,
  PROMPT_LIMITS,
} from '@/services/mediatorEngine/__tests__/promptComposer/fixtures';
import { buildContinuityContext } from '@/services/mediatorEngine/memory/continuity';
import { createBaselineSessionMemory } from '@/services/mediatorEngine/__tests__/memory/fixtures';
import type { PromptComposerOutput } from '@/types/mediator';

const REQUIRED_FIELDS: Array<keyof PromptComposerOutput> = [
  'systemPrompt',
  'developerPrompt',
  'userPrompt',
  'contextSummary',
  'promptMetadata',
  'safetyEnvelope',
  'tokenEstimate',
  'modelHints',
];

function fullPromptText(output: PromptComposerOutput): string {
  return JSON.stringify(output);
}

describe('composePrompt — L1 prompt assembly', () => {
  it('composePrompt zwraca wszystkie wymagane pola', () => {
    const result = composePrompt(createRichPipelineInput());

    for (const field of REQUIRED_FIELDS) {
      assert.ok(field in result, `missing field: ${field}`);
    }
    assert.ok(result.promptMetadata);
    assert.ok(result.modelHints);
  });

  it('systemPrompt zawiera zasady mediatora', () => {
    const result = composePrompt(createRichPipelineInput('en'));

    assert.match(result.systemPrompt, /mediator/i);
    assert.match(result.systemPrompt, /diagnos/i);
    assert.match(result.systemPrompt, /blame/i);
  });

  it('developerPrompt zawiera strategy/decision/intervention constraints', () => {
    const result = composePrompt(createRichPipelineInput());

    assert.match(result.developerPrompt, /reveal_pattern/);
    assert.match(result.developerPrompt, /compare_perspectives/);
    assert.match(result.developerPrompt, /effect-validate-001/);
    assert.match(result.developerPrompt, /Mościk voice precedence/i);
  });

  it('userPrompt zawiera transcriptWindow', () => {
    const result = composePrompt(createRichPipelineInput());

    assert.match(result.userPrompt, /Host:/);
    assert.match(result.userPrompt, /Partner:/);
    assert.match(result.userPrompt, /Dialogue/);
  });

  it('transcriptWindow przycina do max 8 wiadomości', () => {
    const input = createPromptComposerInput({
      transcriptWindow: createTranscriptMessages(12),
    });
    const sanitized = sanitizeTranscriptWindow(input.transcriptWindow);

    assert.equal(sanitized.length, PROMPT_LIMITS.maxTranscriptMessages);
    assert.equal(
      composePrompt(input).promptMetadata.transcriptMessageCount,
      PROMPT_LIMITS.maxTranscriptMessages
    );
  });

  it('transcript message przycina do max 700 znaków', () => {
    const sanitized = sanitizeTranscriptWindow(createLongMessage(900));

    assert.equal(sanitized.length, 1);
    assert.ok(sanitized[0]!.content.length <= PROMPT_LIMITS.maxMessageChars);
    assert.ok(sanitized[0]!.content.endsWith('...'));
  });

  it('userPrompt nie zawiera message ids', () => {
    const result = composePrompt(
      createPromptComposerInput({
        transcriptWindow: createTranscriptMessages(3),
      })
    );

    assert.ok(!result.userPrompt.includes('msg-id-'));
  });

  it('userPrompt nie zawiera sessionId / mediationId', () => {
    const result = composePrompt(createRichPipelineInput());

    const combined = fullPromptText(result);
    assert.ok(!combined.includes(PRIVATE_SESSION_ID));
    assert.ok(!combined.includes(PRIVATE_MEDIATION_ID));
  });

  it('Prompt nie zawiera EvidenceStore', () => {
    const state = createPromptComposerInput().mediationState;
    state.evidenceStore = {
      conclusions: { 'c-1': { analysisId: 'c-1' } as never },
      indexByTurn: {},
      maxConclusions: 80,
    };

    const result = composePrompt(createPromptComposerInput({ mediationState: state }));
    assert.ok(!fullPromptText(result).includes('evidenceStore'));
  });

  it('Prompt nie zawiera pełnego SessionMemory JSON', () => {
    const result = composePrompt(createRichPipelineInput());

    assert.ok(!fullPromptText(result).includes('"breakthroughs"'));
    assert.ok(!fullPromptText(result).includes('sessionMemory'));
  });

  it('Safety L3 tworzy safetyEnvelope i safety-safe instrukcję', () => {
    const result = composePrompt(
      createPromptComposerInput(createL3SafetyInput())
    );

    assert.equal(result.safetyEnvelope.level, 'L3_stop');
    assert.equal(result.safetyEnvelope.active, true);
    assert.match(result.developerPrompt, /L3/);
    assert.match(result.developerPrompt, /stop normal mediation/i);
  });

  it('L2/L3 nie pozwala na normalną mediację', () => {
    const l3 = composePrompt(createPromptComposerInput(createL3SafetyInput()));
    assert.equal(l3.safetyEnvelope.allowNormalMediation, false);
    assert.match(l3.userPrompt, /Do NOT continue normal mediation/);

    const l2 = composePrompt(
      createPromptComposerInput({
        safetyOutput: {
          ...createL3SafetyInput().safetyOutput!,
          level: 'L2_pause',
        },
      })
    );
    assert.equal(l2.safetyEnvelope.allowNormalMediation, false);
  });

  it('Token estimate > 0', () => {
    const result = composePrompt(createRichPipelineInput());
    assert.ok(result.tokenEstimate > 0);
  });

  it('Model hints zawierają temperature/maxOutputTokens', () => {
    const result = composePrompt(createRichPipelineInput());

    assert.ok(typeof result.modelHints.temperature === 'number');
    assert.ok(typeof result.modelHints.maxOutputTokens === 'number');
    assert.equal(result.modelHints.responseFormat, 'plain_text');
  });

  it('Malformed input no throw', () => {
    assert.doesNotThrow(() => composePrompt(null as unknown as ReturnType<typeof createPromptComposerInput>));
    assert.doesNotThrow(() => composePrompt({} as ReturnType<typeof createPromptComposerInput>));
  });

  it('Zakazy techniczne są obecne: nie wspominaj o pipeline/confidence/JSON', () => {
    const result = composePrompt(createRichPipelineInput());

    assert.match(result.userPrompt, /Do not mention pipeline/i);
    assert.match(result.userPrompt, /confidence/i);
    assert.match(result.userPrompt, /Do not output JSON/i);
  });

  it('Brak raw compliance matchedText w promptach', () => {
    const result = composePrompt(createRichPipelineInput());

    assert.ok(!fullPromptText(result).includes('SECRET_VIOLATION_TEXT'));
    assert.ok(!fullPromptText(result).includes('matchedText'));
  });

  it('Language PL ustawia instrukcję pisania po polsku', () => {
    const result = composePrompt(createRichPipelineInput('pl'));

    assert.match(result.systemPrompt, /polsku|mediator/i);
    assert.match(result.systemPrompt, /Jesteś Mościkiem/);
    assert.equal(result.promptMetadata.language, 'pl');
  });

  it('Language EN ustawia instrukcję pisania po angielsku', () => {
    const result = composePrompt(createRichPipelineInput('en'));

    assert.match(result.systemPrompt, /Write the mediator response in English/);
    assert.equal(result.promptMetadata.language, 'en');
  });

  it('Redakcja email/phone działa w transcript content', () => {
    const result = composePrompt(
      createPromptComposerInput({
        transcriptWindow: [
          {
            id: 'm1',
            authorRole: 'partner',
            content: 'Contact me at user@example.com or 555-123-4567 please',
            turnNumber: 3,
            createdAt: '2026-07-05T00:00:00.000Z',
          },
        ],
      })
    );

    assert.ok(!result.userPrompt.includes('user@example.com'));
    assert.ok(!result.userPrompt.includes('555-123-4567'));
    assert.match(result.userPrompt, /REDACTED_EMAIL/);
    assert.match(result.userPrompt, /REDACTED_PHONE/);
  });

  it('Transcript ze słowami email/phone nie powoduje fallbacku', () => {
    const result = composePrompt(
      createPromptComposerInput({
        transcriptWindow: [
          {
            id: 'm1',
            authorRole: 'partner',
            content: "I don't want to talk about my email or phone.",
            turnNumber: 3,
            createdAt: '2026-07-05T00:00:00.000Z',
          },
        ],
      })
    );

    assert.ok(!result.contextSummary.includes('Fallback context'));
    assert.match(result.userPrompt, /email/);
    assert.match(result.userPrompt, /phone/);
    assert.equal(result.promptMetadata.transcriptMessageCount, 1);
  });

  it('Fallback przy błędzie composingu zachowuje safety L3', () => {
    const input = createPromptComposerInput(createL3SafetyInput());
    input.mediationState = {
      get currentGoal() {
        throw new Error('forced compose failure');
      },
    } as never;

    const result = composePrompt(input);

    assert.equal(result.safetyEnvelope.level, 'L3_stop');
    assert.equal(result.safetyEnvelope.active, true);
    assert.equal(result.safetyEnvelope.allowNormalMediation, false);
    assert.match(result.userPrompt, /Do NOT continue normal mediation/);
    assert.match(result.developerPrompt, /Safety fallback/i);
    assert.equal(result.modelHints.temperature, PROMPT_LIMITS.safetyTemperature);
    assert.equal(result.modelHints.maxOutputTokens, PROMPT_LIMITS.safetyMaxOutputTokens);
  });
});

describe('composePrompt — continuity hints (Phase 3A)', () => {
  it('contains continuity hint in contextSummary when repeated moves detected', () => {
    const sessionMemory = createBaselineSessionMemory({
      recentInterventionTypes: ['reflect', 'reflect', 'reflect'],
      ineffectivePatterns: ['reflect'],
      interventionHistory: [
        {
          interventionId: 'int-r1',
          turnNumber: 2,
          type: 'reflect',
          goal: 'SAFE_OPENING',
          intent: 'increase_emotional_safety',
          strategy: 'validate_emotions',
          expectedEffectId: 'effect-r1',
          signature: 'reflect:SAFE_OPENING:both',
          compliance: {
            compliant: true,
            violationCount: 0,
            blockingViolationCount: 0,
            fallbackUsed: false,
            attemptNumber: 1,
          },
          effective: false,
          confidence: 80,
        },
      ],
    });
    const continuityContext = buildContinuityContext({ sessionMemory });

    const result = composePrompt(
      createPromptComposerInput({
        sessionMemory,
        continuityContext,
      })
    );

    assert.match(result.contextSummary, /Continuity:/);
    assert.match(
      result.contextSummary,
      /investigation|different entry|Do not repeat|circular argument/i
    );
  });

  it('does not contain raw session memory payload', () => {
    const sessionMemory = createBaselineSessionMemory({
      recentInterventionTypes: ['reflect', 'reflect', 'reflect'],
      ineffectivePatterns: ['reflect'],
    });
    const continuityContext = buildContinuityContext({ sessionMemory });

    const result = composePrompt(
      createPromptComposerInput({
        sessionMemory,
        continuityContext,
      })
    );

    const text = fullPromptText(result);
    assert.ok(!text.includes('"interventionHistory"'));
    assert.ok(!text.includes('"recentInterventionTypes"'));
    assert.ok(!text.includes('"continuityContext"'));
    assert.ok(!text.includes('sessionMemory'));
  });
});
