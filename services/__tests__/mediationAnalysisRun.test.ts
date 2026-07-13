import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EdgeFunctionError } from '@/utils/edgeFunctionError';
import {
  isValidMediationAnalysis,
  toMediationAnalysisError,
} from '@/services/mediationAnalysisRun.logic';
import { MediationAnalysisError } from '@/services/mediationAnalysisRun.types';
import { MediationPersistenceError } from '@/services/mediationCreate.types';

const validAnalysis = {
  situation_summary: 'Mediator podsumowuje sytuację własnymi słowami.',
  user_emotions: ['frustracja'],
  emotions_explanation: 'To naturalna reakcja na rozjazd oczekiwań.',
};

describe('isValidMediationAnalysis', () => {
  it('accepts a valid analysis payload', () => {
    assert.equal(isValidMediationAnalysis(validAnalysis), true);
  });

  it('rejects malformed payloads', () => {
    assert.equal(isValidMediationAnalysis({ ok: true }), false);
    assert.equal(isValidMediationAnalysis(null), false);
  });
});

describe('toMediationAnalysisError', () => {
  it('maps edge 401', () => {
    const mapped = toMediationAnalysisError(
      'edge_call',
      new EdgeFunctionError(401, 'NOT_AUTHENTICATED')
    );
    assert.equal(mapped.stage, 'edge_call');
    assert.equal(mapped.status, 401);
    assert.equal(mapped.code, 'NOT_AUTHENTICATED');
  });

  it('maps edge 403', () => {
    const mapped = toMediationAnalysisError(
      'edge_call',
      new EdgeFunctionError(403, 'FORBIDDEN')
    );
    assert.equal(mapped.status, 403);
    assert.equal(mapped.code, 'FORBIDDEN');
  });

  it('maps edge 500', () => {
    const mapped = toMediationAnalysisError(
      'edge_call',
      new EdgeFunctionError(500, 'INTERNAL_ERROR')
    );
    assert.equal(mapped.status, 500);
    assert.equal(mapped.code, 'INTERNAL_ERROR');
  });

  it('maps malformed response stage', () => {
    const mapped = new MediationAnalysisError(
      'parse_response',
      'Invalid analysis response',
      { code: 'MALFORMED_RESPONSE' }
    );
    assert.equal(mapped.stage, 'parse_response');
    assert.equal(mapped.code, 'MALFORMED_RESPONSE');
  });
});

describe('MediationPersistenceError', () => {
  it('represents mediation save failures', () => {
    const error = new MediationPersistenceError(
      'create_record',
      'new row violates row-level security policy',
      '42501'
    );
    assert.equal(error.stage, 'create_record');
    assert.equal(error.code, '42501');
  });

  it('represents analysis update failures', () => {
    const error = new MediationPersistenceError(
      'update_screenshots',
      'permission denied',
      '42501'
    );
    assert.equal(error.stage, 'update_screenshots');
  });
});
