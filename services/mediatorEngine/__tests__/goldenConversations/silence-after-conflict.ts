import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const silenceAfterConflictConversation: GoldenConversation = {
  id: 'silence-after-conflict',
  title: 'Milczenie po konflikcie',
  description:
    'Po ostrej kłótni para nie rozmawia — dni lub tygodnie ciszy, omijanie się, komunikacja przez dzieci lub SMS. ' +
    'Prawdziwy problem: lęk przed kolejną raną, wstyd i brak umiejętności naprawy po konflikcie.',
  difficulty: 'medium',
  tags: ['silence', 'stonewalling', 'repair', 'aftermath'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'PERSPECTIVE_SHARING',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedStrategies: [
    'validate_emotions',
    'hold_space',
    'build_safety',
    'recover_misinterpretation',
  ],
  expectedReplayStrategies: ['validate_emotions', 'hold_space'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba czekająca na przeprosiny lub pierwszy krok',
      typicalEmotions: ['smutek', 'złość', 'samotność', 'tęsknota'],
    },
    partner: {
      role: 'Osoba milcząca — potrzebuje czasu lub boi się eskalacji',
      typicalEmotions: ['przeciążenie', 'lęk', 'wycofanie', 'wina'],
    },
  },
  openingSituation:
    'Tydzień po kłótnie, podczas której padły ostre słowa, para mieszka w ciszy. Jedzenie w osobnych pokojach. ' +
    'Ktoś zaproponował mediację — druga osoba przyszła niechętnie, „bo i tak nic nie powie”.',
  expectedMediatorBehaviour: [
    'Nie wymuszać natychmiastowej rozmowy ani przeprosin.',
    'Pomóc opisać, co cisza oznacza dla każdej strony.',
    'Rozpoznać stonewalling jako strategię ochronną, nie „karę”.',
    'Budować bezpieczny pierwszy krok powrotu do kontaktu.',
    'Nie bagatelizować bólu osoby ignorowanej.',
  ],
  forbiddenMediatorBehaviour: [
    'Nakazywać „przebacz i pogadaj”.',
    'Stwierdzać, że milczący „jest dzieckiem”.',
    'Wymuszać kontakt fizyczny lub przeprosiny.',
    'Ignorować, że cisza może być reakcją na przeciążenie.',
    'Otwierać starą kłótnię od początku bez ram.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Po każdej kłótni znikasz na dwa dni.”' },
    {
      turn: 2,
      speaker: 'partner',
      summary: '„Bo jak zostaję, to mówimy rzeczy, których później żałujemy.”',
    },
    {
      turn: 3,
      speaker: 'mediator',
      summary: 'Wyjaśnia różnicę między chwilowym wyciszeniem a karaniem ciszą.',
    },
    { turn: 4, speaker: 'host', summary: '„Dla mnie ta cisza wygląda jak kara.”' },
    { turn: 5, speaker: 'partner', summary: '„A dla mnie to jedyny sposób, żeby się uspokoić.”' },
    {
      turn: 6,
      speaker: 'mediator',
      summary:
        'Pomaga zobaczyć, że oboje próbują chronić siebie, ale odbierają to zupełnie inaczej.',
    },
  ],
  messages: [
    { speaker: 'host', text: 'Po każdej kłótni znikasz na dwa dni.' },
    { speaker: 'partner', text: 'Bo jak zostaję, to mówimy rzeczy, których później żałujemy.' },
    {
      speaker: 'mediator',
      text: 'Wyjaśnia różnicę między chwilowym wyciszeniem a karaniem ciszą.',
    },
    { speaker: 'host', text: 'Dla mnie ta cisza wygląda jak kara.' },
    { speaker: 'partner', text: 'A dla mnie to jedyny sposób, żeby się uspokoić.' },
    {
      speaker: 'mediator',
      text: 'Pomaga zobaczyć, że oboje próbują chronić siebie, ale odbierają to zupełnie inaczej.',
    },
  ],
  successCriteria: [
    'Obie strony opisały funkcję ciszy — kara vs ochrona.',
    'Pojawił się pierwszy sygnał gotowości do kontaktu (nawet werbalny).',
    'Stara kłótnia nie została ponownie rozegrana w całości.',
    'Para ma realistyczny mikro-krok naprawy.',
  ],
};
