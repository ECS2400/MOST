/**
 * Forbidden JSON-field guard — unit tests (Phase 2A-fix).
 *
 *   npm run test:mediator:prompt
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertNoForbiddenPromptFields,
  containsForbiddenJsonField,
} from '@/services/mediatorEngine/promptComposer/lib/assertNoForbiddenPromptFields';

describe('assertNoForbiddenPromptFields — JSON field patterns only', () => {
  it('blokuje techniczne pola JSON jak "email": i "phone":', () => {
    assert.throws(
      () => assertNoForbiddenPromptFields('context {"email": "secret@x.com"}'),
      /Forbidden prompt field detected: email/
    );
    assert.throws(
      () => assertNoForbiddenPromptFields('{"phone": "+48123456789"}'),
      /Forbidden prompt field detected: phone/
    );
    assert.throws(
      () => assertNoForbiddenPromptFields('{"sessionId": "abc"}'),
      /Forbidden prompt field detected: sessionId/
    );
    assert.throws(
      () => assertNoForbiddenPromptFields('{"mediationId" : "xyz"}'),
      /Forbidden prompt field detected: mediationId/
    );
  });

  it('nie blokuje zwykłych słów email/phone w treści', () => {
    const prose = "I don't want to talk about my email or phone.";
    assert.doesNotThrow(() => assertNoForbiddenPromptFields(prose));
    assert.equal(containsForbiddenJsonField(prose, 'email'), false);
    assert.equal(containsForbiddenJsonField(prose, 'phone'), false);
  });
});
