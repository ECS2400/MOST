import type { SoloQuizBundle } from './types';

export const SOLO_QUIZ_PL: SoloQuizBundle = {
  progress: 'Pytanie {current} z {total}',
  skipQuiz: 'Pomiń quiz',
  nextDescribe: 'Dalej — opisz sytuację',
  contextHeader: 'Kontekst z quizu:',
  contextLabels: {
    situationType: 'Typ sytuacji',
    when: 'Kiedy',
    intensity: 'Intensywność (1-10)',
    mainPain: 'Co najbardziej boli',
    partnerReaction: 'Typowa reakcja partnera',
    goal: 'Cel użytkownika',
  },
  questions: [
    {
      id: 'situationType',
      prompt: 'Co najlepiej opisuje tę sytuację?',
      options: [
        'Kłótnia lub awantura',
        'Poczucie zaniedbania',
        'Brak komunikacji',
        'Zdrada zaufania',
        'Różnica w priorytetach',
        'Coś innego',
      ],
    },
    {
      id: 'when',
      prompt: 'Kiedy to się wydarzyło?',
      options: ['Dziś', 'Wczoraj', 'W tym tygodniu', 'Dłużej temu'],
    },
    {
      id: 'intensity',
      prompt: 'Jak silnie to teraz czujesz? (1 = lekko, 10 = bardzo)',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    {
      id: 'mainPain',
      prompt: 'Co najbardziej boli w tej sytuacji?',
      options: [
        'Poczucie ignorowania',
        'Brak szacunku',
        'Samotność w relacji',
        'Niesprawiedliwość',
        'Strach o przyszłość',
        'Coś innego',
      ],
    },
    {
      id: 'partnerReaction',
      prompt: 'Jak partner zwykle reaguje w takich momentach?',
      options: [
        'Ucieka od rozmowy',
        'Atakuje lub oskarża',
        'Bagatelizuje problem',
        'Przeprasza i wraca do tematu',
        'Nie wiem / różnie',
      ],
    },
    {
      id: 'goal',
      prompt: 'Czego teraz najbardziej potrzebujesz?',
      options: [
        'Zrozumieć siebie i swoje emocje',
        'Przygotować się do rozmowy',
        'Odzyskać spokój',
        'Znaleźć konkretne rozwiązanie',
      ],
    },
  ],
};
