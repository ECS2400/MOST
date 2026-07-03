/**
 * Verifies solo i18n bundles and form labels for all 6 languages.
 * Run: npx tsx scripts/test-i18n-solo.ts
 */
import { getSoloExtras } from '../constants/i18n/soloExtras';
import { getSoloQuizBundle } from '../constants/i18n/soloQuiz';
import { buildOpeningCoachMessage } from '../services/soloCoachConversation';
import type { Language } from '../constants/i18n';

const LANGS: Language[] = ['pl', 'en', 'de', 'fr', 'es', 'it'];

const POLISH_MARKERS = [
  'Twoja sytuacja',
  'Streszczenie',
  'Jak możesz się czuć',
  'Porozmawiaj ze swoim',
  'Napisz, co czujesz',
  'Czy wiesz że',
  'Co się wydarzyło:',
  'Pytanie',
  'Dziennik wdzięczności',
];

const IT_EXPECTED = [
  'La tua situazione',
  'Riassunto',
  'Come potresti sentirti',
  'Parla con il tuo coach',
  'Scrivi come ti senti',
  'Lo sapevi che',
  'Cosa è successo:',
];

let failed = 0;

function fail(msg: string) {
  console.error('✗', msg);
  failed++;
}

function ok(msg: string) {
  console.log('✓', msg);
}

for (const lang of LANGS) {
  const extras = getSoloExtras(lang);
  const quiz = getSoloQuizBundle(lang);
  const combined = `${extras.formLabels.whatHappened} Test`;

  if (lang === 'pl') {
    if (!combined.includes('Co się wydarzyło:')) fail('PL form label missing');
    else ok('PL form labels');
  }

  if (lang === 'it') {
    if (!combined.includes('Cosa è successo:')) fail('IT form label missing');
    else ok('IT form labels');

    for (const key of IT_EXPECTED) {
      const haystack = JSON.stringify({
        ...extras.report,
        ...extras.chat,
        ...extras.funFact,
        ...extras.formLabels,
      });
      if (!haystack.includes(key)) {
        fail(`IT missing expected string: ${key}`);
      }
    }

    for (const marker of POLISH_MARKERS) {
      const haystack = JSON.stringify(extras);
      if (haystack.includes(marker)) {
        fail(`IT bundle still contains Polish: ${marker}`);
      }
    }

    if (quiz.progress.includes('Pytanie')) fail('IT quiz progress still Polish');
    else if (!quiz.progress.includes('Domanda')) fail('IT quiz progress not Italian');
    else ok('IT quiz progress');

    if (!quiz.questions[0]?.prompt.includes('Cosa descrive')) fail('IT quiz Q1 not Italian');
    else ok('IT quiz questions');

    const opening = buildOpeningCoachMessage(
      {
        situationSummary: 'festa con amici',
        emotionTags: [],
        emotionsExplanation: '',
        needTags: [],
        needsExplanation: '',
        keyTrigger: '',
        whatCouldImprove: '',
        doingWell: { lead: '', detail: '' },
        suggestion: null,
        partnerEmotions: [],
        partnerNeeds: [],
        perspectiveGap: { lead: '', detail: '' },
      },
      'it'
    );
    if (/kumpel|pogadać|Co teraz/i.test(opening)) fail('IT opening still Polish');
    else ok('IT opening coach message');
  }

  if (lang !== 'pl') {
    const haystack = JSON.stringify(extras.report);
    let langOk = true;
    for (const marker of ['Twoja sytuacja', 'Streszczenie', 'Druga strona']) {
      if (haystack.includes(marker)) {
        fail(`${lang} report contains Polish: ${marker}`);
        langOk = false;
      }
    }
    if (langOk) ok(`${lang} report labels`);
  }
}

if (failed === 0) {
  console.log('\nAll i18n solo checks passed.');
  process.exit(0);
} else {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
