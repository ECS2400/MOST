import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const brokenPromisesConversation: GoldenConversation = {
  id: 'broken-promises',
  title: 'Niezrealizowane obietnice',
  description:
    'Jedna osoba nie dotrzymała obietnic — zmiana pracy, rzadsze picie, więcej czasu dla rodziny. ' +
    'Prawdziwy problem: erozja zaufania i poczucie, że słowa nie mają wartości.',
  difficulty: 'medium',
  tags: ['trust', 'promises', 'disappointment', 'follow-through'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'AGREEMENT',
  ],
  expectedStrategies: [
    'validate_emotions',
    'hold_space',
    'recover_misinterpretation',
    'prepare_agreement',
  ],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba rozczarowana kolejnym niespełnionym zobowiązaniem',
      typicalEmotions: ['rozczarowanie', 'złość', 'brak zaufania', 'smutek'],
    },
    partner: {
      role: 'Osoba, która obiecała więcej niż realnie mogła dotrzymać',
      typicalEmotions: ['wstyd', 'obronność', 'przytłoczenie', 'poczucie porażki'],
    },
  },
  openingSituation:
    'Po „ostatniej szansie” i obietnicy zmiany nic się nie zmieniło — lub zmiana trwała tydzień. ' +
    'Host przestał(a) wierzyć w słowa. Partner czuje się „ustawiony na porażkę” zanim zacznie.',
  expectedMediatorBehaviour: [
    'Traktować obietnice jako temat zaufania, nie tylko listy zadań.',
    'Pomóc opisać konkretne złamanie bez katalogu win z lat.',
    'Nie wymuszać nowych obietnic w trakcie sesji.',
    'Rozpoznać cykl: obietnica → nadzieja → rozczarowanie.',
    'Szukać realistycznych zobowiązań, nie deklaracji pod presją.',
  ],
  forbiddenMediatorBehaviour: [
    'Nakazywać „po prostu dotrzymaj słowa”.',
    'Bagatelizować rozczarowanie jako „nadwrażliwość”.',
    'Wymuszać kolejnej „ostatniej szansy”.',
    'Stwierdzać, że rozczarowany „musi puścić przeszłość”.',
    'Tworzyć nowego kontraktu bez zgody obu stron.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Obiecałeś — znowu to samo. Po co w ogóle rozmawiamy?”' },
    { turn: 2, speaker: 'partner', summary: '„Wiem, że zawiodłem — ale ciągle jestem zły materiał.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta o jedną konkretną obietnicę i co się stało.' },
    { turn: 4, speaker: 'host', summary: 'Opisuje moment, kiedy przestał(a) wierzyć.' },
    { turn: 5, speaker: 'partner', summary: 'Przyznaje, że obiecywał pod presją, żeby skończyć kłótnię.' },
    { turn: 6, speaker: 'mediator', summary: 'Nazywa cykl obietnica–rozczarowanie bez nowych obietnic.' },
  ],
  successCriteria: [
    'Cykl zaufania został nazwany — nie tylko lista niespełnionych zadań.',
    'Para nie wyszła z kolejną pustą obietnicą wymuszoną przez mediatora.',
    'Rozczarowanie i wstyd zostały usłyszane po obu stronach.',
    'Możliwy mały, weryfikowalny krok zamiast wielkiej deklaracji.',
  ],
};
