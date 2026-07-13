import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectAnalysisDisplayText,
  containsForbiddenPersonaWord,
  formatAnalysisDisplaySnapshot,
  PERSONA_FORBIDDEN_RE,
  sanitizeAnalysisPersona,
  sanitizePersonaText,
  withDirectAddress,
} from '@/services/analysisPersona';
import { interpretMediationLocally } from '@/services/mediationAnalysisInterpret';

const FIXTURES = {
  partyChildcare: `Co się wydarzyło: Partner poszedł na imprezę kiedy miał zostać z synem.
Co mnie zdenerwowało: Zostawił mnie samą z dzieckiem w piątkowy wieczór.
Jak się czułam: Zignorowana i zmęczona.
Czego potrzebuję: Wsparcia i rozmowy.`,
  ignored: `Co się wydarzyło: Napisałam mu o problemie, a on nie odpowiadał przez cały dzień.
Co mnie zdenerwowało: Poczucie, że mnie zbywa.
Jak się czułam: Samotna i nieważna.
Czego potrzebuję: Zrozumienia.`,
  controlTone: `Co się wydarzyło: Powiedziałam, że nie podoba mi się jego impreza.
Co mnie zdenerwowało: On zawsze wybiera znajomych.
Jak się czułam: Frustrująca sytuacja.
Czego potrzebuję: Szacunku.`,
  minimal: `Co się wydarzyło: Mamy kłótnię o obowiązki.`,
} as const;

function assertNoForbiddenPersonaWords(text: string, label: string): void {
  PERSONA_FORBIDDEN_RE.lastIndex = 0;
  const match = text.match(PERSONA_FORBIDDEN_RE);
  assert.equal(
    match,
    null,
    `${label} contains forbidden persona word: ${match?.[0] ?? ''}\n---\n${text}`
  );
}

function assertAnalysisPersonaClean(
  analysis: ReturnType<typeof interpretMediationLocally>,
  label: string
): void {
  const snapshot = formatAnalysisDisplaySnapshot(analysis);
  assertNoForbiddenPersonaWords(snapshot, label);
}

describe('sanitizePersonaText', () => {
  it('rewrites third-person labels to direct address', () => {
    assert.equal(
      sanitizePersonaText('Użytkownik czuje się zmęczony.'),
      'Ty czuje się zmęczony.'
    );
    assert.equal(
      sanitizePersonaText('Użytkownik potrzebuje czasu dla siebie.'),
      'Ty potrzebuje czasu dla siebie.'
    );
    assert.equal(
      sanitizePersonaText('The user feels tired.'),
      'The you feels tired.'
    );
  });
});

describe('withDirectAddress', () => {
  it('prefixes first name when known', () => {
    assert.equal(
      withDirectAddress('Daniel Kowalski', 'szukasz dialogu zamiast eskalacji.'),
      'Daniel, szukasz dialogu zamiast eskalacji.'
    );
  });

  it('keeps second person when name is missing', () => {
    assert.equal(
      withDirectAddress(undefined, 'szukasz dialogu zamiast eskalacji.'),
      'szukasz dialogu zamiast eskalacji.'
    );
  });
});

describe('interpretMediationLocally persona snapshots', () => {
  for (const [name, combined] of Object.entries(FIXTURES)) {
    it(`never uses forbidden persona words — ${name}`, () => {
      const analysis = interpretMediationLocally(combined, '');
      assertAnalysisPersonaClean(analysis, name);
    });
  }

  it('uses participant name in doing_well when provided', () => {
    const analysis = interpretMediationLocally(FIXTURES.partyChildcare, '', 'Patrycja');
    assert.match(analysis.doing_well, /^Patrycja,/);
    assertAnalysisPersonaClean(analysis, 'partyChildcare named');
  });

  it('stays in second person without a name', () => {
    const analysis = interpretMediationLocally(FIXTURES.ignored, '');
    assert.match(analysis.doing_well ?? '', /szukasz/i);
    assert.match(analysis.situation_summary ?? '', /(Ty|czu|Twoim|dla Ciebie|tu jesteś)/i);
    assertAnalysisPersonaClean(analysis, 'ignored anonymous');
  });
});

describe('analysis persona snapshots', () => {
  it('partyChildcare snapshot uses second person', () => {
    const snapshot = formatAnalysisDisplaySnapshot(
      interpretMediationLocally(FIXTURES.partyChildcare, '')
    );
    assertNoForbiddenPersonaWords(snapshot, 'partyChildcare snapshot');
    assert.match(snapshot, /(Ty|czu|Twoim|dla Ciebie|liczyłeś|liczyłaś)/i);
  });

  it('ignored snapshot uses second person', () => {
    const snapshot = formatAnalysisDisplaySnapshot(
      interpretMediationLocally(FIXTURES.ignored, '')
    );
    assertNoForbiddenPersonaWords(snapshot, 'ignored snapshot');
    assert.match(snapshot, /(Ty|czu|Twoim|dla Ciebie|pomijan)/i);
  });
});

describe('sanitizeAnalysisPersona', () => {
  it('cleans all display fields on analysis objects', () => {
    const cleaned = sanitizeAnalysisPersona({
      situation_summary: 'Użytkownik czuje frustrację.',
      emotions_explanation: 'Użytkownik potrzebuje wsparcia.',
      user_emotions: ['użytkownik zestresowany'],
      user_needs: ['user needs rest'],
      suggestion_quote: 'User wants peace.',
    });

    assertAnalysisPersonaClean(cleaned, 'sanitizeAnalysisPersona');
    assert.equal(collectAnalysisDisplayText(cleaned).join(' ').includes('użytkownik'), false);
    assert.equal(collectAnalysisDisplayText(cleaned).join(' ').includes('user'), false);
  });
});
