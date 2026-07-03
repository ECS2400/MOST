import { interpretMediationLocally } from '../services/mediationAnalysisInterpret';
import { mapAnalysisToView } from '../services/analysisViewMapper';

function stripChipLabel(chip: string): string {
  return chip.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim();
}

function buildSoloCombinedDescription(input: {
  situation: string;
  emotions: string[];
  needs: string[];
}): string {
  const situation = input.situation.trim();
  const felt = input.emotions.map(stripChipLabel).filter(Boolean).join(', ');
  const needs = input.needs.map(stripChipLabel).filter(Boolean).join(', ');
  const lines = [`Co się wydarzyło: ${situation}`];
  if (felt) lines.push(`Jak się czułem/am: ${felt}`);
  if (needs) lines.push(`Czego potrzebuję: ${needs}`);
  return lines.join('\n');
}

const input = {
  situation:
    'Partner poszedł na imprezę kiedy miał/a zostać z synem. Czułam się zignorowana.',
  emotions: ['😤 Złość', '😔 Rozczarowanie'],
  needs: ['❤️ Bliskości', '🗣️ Rozmowy'],
};

const combined = buildSoloCombinedDescription(input);
const raw = interpretMediationLocally(combined, '');
const view = mapAnalysisToView(raw);

const checks: [string, boolean][] = [
  ['analysis_version === 2', raw.analysis_version === 2],
  ['situation_summary', !!view?.situationSummary && view.situationSummary.length > 30],
  ['emotion_tags', (view?.emotionTags.length || 0) > 0],
  ['key_trigger', !!view?.keyTrigger],
  ['suggestion_quote', !!view?.suggestion?.quote],
  [
    'interpretacja nie kopiuje 1:1',
    !view?.situationSummary?.includes('Partner poszedł na imprezę kiedy miał/a zostać z synem'),
  ],
];

console.log('combined:\n', combined, '\n');
console.log('summary:', view?.situationSummary);
console.log('suggestion:', view?.suggestion?.quote);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(ok ? '✓' : '✗', name);
  if (!ok) failed++;
}

if (failed > 0) process.exit(1);
console.log('\nPR-S1 lokalny test OK');

// PR-S2 gramatyka szkicu
import {
  buildSoloMessageDraft,
  emotionToFeelingPhrase,
  needToGenitive,
} from '../services/soloMessageDraft';

const grammarChecks: [string, boolean][] = [
  ['złość → Czuję złość', buildSoloMessageDraft(['😤 Złość'], []).includes('Czuję złość')],
  ['nie: Czuję się złość', !buildSoloMessageDraft(['😤 Złość'], []).includes('Czuję się złość')],
  ['bliskości genitive', needToGenitive('❤️ Bliskości') === 'bliskości'],
  ['draft z potrzebą', buildSoloMessageDraft(['😤 Złość'], ['❤️ Bliskości']).includes('potrzebuję bliskości')],
  ['emotion phrase', emotionToFeelingPhrase('😔 Rozczarowanie') === 'rozczarowanie'],
];

console.log('\n--- PR-S2 gramatyka ---');
let gFailed = 0;
for (const [name, ok] of grammarChecks) {
  console.log(ok ? '✓' : '✗', name);
  if (!ok) gFailed++;
}
console.log('draft:', buildSoloMessageDraft(['😤 Złość'], ['❤️ Bliskości']));
if (gFailed > 0) process.exit(1);
console.log('\nPR-S2 gramatyka OK');

// PR-S3 quiz context
import { formatQuizContext } from '../constants/soloQuiz';

const quizBlock = formatQuizContext({
  situationType: 'Poczucie zaniedbania',
  intensity: '8',
  goal: 'Zrozumieć siebie i swoje emocje',
});
const quizOk =
  quizBlock.includes('Typ sytuacji') &&
  quizBlock.includes('Intensywność') &&
  quizBlock.includes('Cel użytkownika');
console.log('\n--- PR-S3 quiz ---');
console.log(quizOk ? '✓ formatQuizContext' : '✗ formatQuizContext');
if (!quizOk) process.exit(1);
console.log('PR-S3 quiz OK');

// PR-S4 + coach conversation
import {
  buildCoachReply,
  buildOpeningCoachMessage,
  isRoboticCoachReply,
} from '../services/soloCoachConversation';
import type { MappedAnalysisView } from '../services/analysisViewMapper';

const mockView: MappedAnalysisView = {
  situationSummary: 'Partner poszedł na imprezę gdy liczyłeś na wsparcie.',
  emotionTags: ['zranienie', 'frustracja'],
  emotionsExplanation: 'test',
  needTags: ['bliskość'],
  needsExplanation: 'test',
  keyTrigger: 'Najbardziej dotknęło Cię połączenie imprezy z brakiem wsparcia.',
  whatCouldImprove: '',
  doingWell: { lead: 'ok' },
  suggestion: { quote: 'Czuję się zraniony i potrzebuję rozmowy.' },
  partnerEmotions: ['presja'],
  partnerNeeds: ['autonomia'],
  perspectiveGap: { lead: 'luka' },
};

const open = buildOpeningCoachMessage(mockView);
const openOk = /imprez|klasyk|kumpel/i.test(open) && !open.includes('—');

const hist1 = [{ role: 'coach' as const, content: open }];
const r1 = buildCoachReply(
  'Chciałbym być zrozumiany, ona bagatelizuje problem',
  [...hist1, { role: 'user', content: 'Chciałbym być zrozumiany, ona bagatelizuje problem' }],
  mockView
);
const r2 = buildCoachReply(
  'poczułem sie zraniony niezrozumiany',
  [
    ...hist1,
    { role: 'user', content: 'Chciałbym być zrozumiany' },
    { role: 'coach', content: r1 },
    { role: 'user', content: 'poczułem sie zraniony niezrozumiany' },
  ],
  mockView
);
const r3 = buildCoachReply(
  'juz to napisalem',
  [
    ...hist1,
    { role: 'user', content: 'poczułem zraniony' },
    { role: 'coach', content: r2 },
    { role: 'user', content: 'juz to napisalem' },
  ],
  mockView
);

const histScreen = [...hist1];
const s1 = buildCoachReply(
  'chciałbym być zrozumiany, ona bagatelizuje i mówi że ograniczam',
  [...histScreen, { role: 'user', content: 'chciałbym być zrozumiany, ona bagatelizuje i mówi że ograniczam' }],
  mockView
);
const s2 = buildCoachReply(
  'chciałbym żeby zrozumiał to co napisałem wcześniej',
  [
    ...histScreen,
    { role: 'user', content: 'chciałbym być zrozumiany' },
    { role: 'coach', content: s1 },
    { role: 'user', content: 'chciałbym żeby zrozumiał to co napisałem wcześniej' },
  ],
  mockView
);
const s3 = buildCoachReply(
  'Przeproszenia ode mnie',
  [
    ...histScreen,
    { role: 'user', content: 'chciałbym być zrozumiany' },
    { role: 'coach', content: s1 },
    { role: 'user', content: 'chciałbym żeby zrozumiał' },
    { role: 'coach', content: s2 },
    { role: 'user', content: 'Przeproszenia ode mnie' },
  ],
  mockView
);
const s4 = buildCoachReply(
  'chciałbym żeby to było autentyczne bo brzmi jak robot',
  [
    ...histScreen,
    { role: 'user', content: 'Przeproszenia' },
    { role: 'coach', content: s3 },
    { role: 'user', content: 'chciałbym żeby to było autentyczne bo brzmi jak robot' },
  ],
  mockView
);

const sRozpisz = buildCoachReply(
  'rozpisz i przygotuj gotowa wiadomosc',
  [
    ...histScreen,
    { role: 'user', content: 'chce zeby zrozumiala' },
    { role: 'coach', content: s1 },
    { role: 'user', content: 'rozpisz i przygotuj gotowa wiadomosc' },
  ],
  mockView
);

const noDash = (s: string) => !s.includes('—');
const noTherapy = (s: string) =>
  !/uzasadnione|To musi frustrować|To musi boleć/i.test(s);

const pogadaj = buildCoachReply(
  'no to pogadajmy najpierw, nie chce sms',
  [...hist1, { role: 'user', content: 'no to pogadajmy najpierw, nie chce sms' }],
  mockView
);

const coSadzisz = buildCoachReply(
  'co o tym sądzisz?',
  [
    ...hist1,
    { role: 'user', content: 'ona bagatelizuje problem' },
    { role: 'coach', content: s1 },
    { role: 'user', content: 'co o tym sądzisz?' },
  ],
  mockView
);

const screenLoop = (() => {
  const h = [...hist1];
  const m1 = buildCoachReply('chce zeby zrozumiala co czuje', [...h, { role: 'user', content: 'chce zeby zrozumiala co czuje' }], mockView);
  h.push({ role: 'user', content: 'chce zeby zrozumiala co czuje' }, { role: 'coach', content: m1 });
  const m2 = buildCoachReply(
    'no na przykład fakt ze dla mnie to oczywiste ze nie powinno sie chodzic na imprezy i przekladac rodzine nad impreza, wkurza mnie ze wybrala picie',
    [...h, { role: 'user', content: 'no na przykład fakt ze dla mnie to oczywiste ze nie powinno sie chodzic na imprezy i przekladac rodzine nad impreza, wkurza mnie ze wybrala picie' }],
    mockView
  );
  const ventMsg =
    'no na przykład fakt ze dla mnie to oczywiste ze nie powinno sie chodzic na imprezy i przekladac rodzine nad impreza, wkurza mnie ze wybrala picie';
  h.push({ role: 'user', content: ventMsg }, { role: 'coach', content: m2 });
  const m3 = buildCoachReply('ale ja ci napisalem juz', [...h, { role: 'user', content: 'ale ja ci napisalem juz' }], mockView);
  h.push({ role: 'user', content: 'ale ja ci napisalem juz' }, { role: 'coach', content: m3 });
  const m4 = buildCoachReply('czemu nie dzilasz', [...h, { role: 'user', content: 'czemu nie dzilasz' }], mockView);
  return { m1, m2, m3, m4 };
})();

const coachChecks: [string, boolean][] = [
  ['opening luzny', openOk],
  ['r1 nie robot', !isRoboticCoachReply(r1)],
  ['r1 bez myślnika', noDash(r1)],
  ['r1 bez terapii', noTherapy(r1)],
  ['r1 bez push SMS', !/daj gotow[aą]|gotowca/i.test(r1)],
  ['pogadaj = rozmowa', /słucham|opowiedz|wkurza|pogad|spoko/i.test(pogadaj) && !/gotowca/i.test(pogadaj)],
  ['co sądzisz = opinia', /moim zdaniem|rację|bagateliz/i.test(coSadzisz) && !/brzmiałem jak bot/i.test(coSadzisz)],
  ['rozpisz = gotowce', /łagodna|stanowcza|gotowca/i.test(sRozpisz) && /[„"]/.test(sRozpisz)],
  ['s2 rozmowa nie SMS', !/gotowca|Łagodna:/i.test(s2)],
  ['s3 przeprosiny w tekście', /przeprosz|Przepraszam/i.test(s3) && /[„"]/.test(s3)],
  ['screen m2 impreza', /imprez|rodzin|picie|dojrz|kompromis/i.test(screenLoop.m2)],
  ['screen m2 != m1', screenLoop.m2 !== screenLoop.m1],
  ['screen m3 nie loop', screenLoop.m3 !== screenLoop.m2 && /sorki|masz rację|rozumiem/i.test(screenLoop.m3)],
  ['screen m4 nie loop', screenLoop.m4 !== screenLoop.m3 && /sorki|zawiesi|ogarniam/i.test(screenLoop.m4)],
  ['screen s4 nie duplikat', s4 !== s3],
  ['screen s4 bez myślnika', noDash(s4)],
];

console.log('\n--- coach conversation ---');
let cFail = 0;
for (const [name, ok] of coachChecks) {
  console.log(ok ? '✓' : '✗', name, ok ? '' : `\n   r=${name.startsWith('r1') ? r1 : name.startsWith('r2') ? r2 : r3}`);
  if (!ok) cFail++;
}
if (cFail > 0) process.exit(1);
console.log('coach conversation OK');
