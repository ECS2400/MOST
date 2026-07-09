import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const relocationConversation: GoldenConversation = {
  id: 'relocation',
  title: 'Przeprowadzka',
  description:
    'Decyzja o przeprowadzce — za pracą, do innego miasta, bliżej rodziny. ' +
    'Prawdziwy problem: strach przed utratą stabilności, sieci znajomych i tożsamości vs nadzieja na lepszą przyszłość.',
  difficulty: 'high',
  tags: ['relocation', 'life-change', 'fear', 'future'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
    'FUTURE_PLAN',
  ],
  expectedStrategies: [
    'validate_emotions',
    'hold_space',
    'increase_mutual_understanding',
    'prepare_agreement',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba chcąca przeprowadzki (np. awans, nowa szansa)',
      typicalEmotions: ['ekscytacja', 'frustracja', 'nadzieja', 'presja czasu'],
    },
    partner: {
      role: 'Osoba bojąca się zmiany i utraty korzeni',
      typicalEmotions: ['lęk', 'smutek', 'opór', 'poczucie bycia postawionym przed faktem'],
    },
  },
  openingSituation:
    'Jedna strona dostała ofertę pracy w innym mieście. Drugie czuje, że decyzja „już zapadła” bez niego/nej. ' +
    'Para przyszła na mediację tydzień przed terminem odpowiedzi na ofertę — napięcie jest wysokie.',
  expectedMediatorBehaviour: [
    'Spowolnić presję czasu — nie wymuszać decyzji w jednej sesji.',
    'Pomóc każdej stronie opisać, czego się boi i czego pragnie.',
    'Rozpoznać, że opór może być troską, nie „sabotowaniem”.',
    'Nie lobbować za przeprowadzką ani przeciwko niej.',
    'Szukać wspólnego procesu decyzyjnego, nie głosowania „teraz”.',
  ],
  forbiddenMediatorBehaviour: [
    'Nakazywać „logicznej” decyzji ekonomicznej.',
    'Bagatelizować lęk przed zmianą jako „sentimentalizm”.',
    'Stwierdzać, że ktoś „musi się poświęcić”.',
    'Używać ultimatum związanych z terminem oferty jako presji.',
    'Ignorować wpływu na dzieci, rodzinę, karierę drugiej osoby.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„To szansa życia — nie rozumiem, czemu się opierasz.”' },
    { turn: 2, speaker: 'partner', summary: '„Bo nawet nie pytasz, czy ja chcę zostawić wszystko.”' },
    { turn: 3, speaker: 'mediator', summary: 'Oddziela ofertę od relacji; pyta o straty i zyski dla każdego.' },
    { turn: 4, speaker: 'partner', summary: 'Mówi o przyjaciołach, pracy, rodzinie — głos drży.' },
    { turn: 5, speaker: 'host', summary: 'Opisuje presję i lęk przed utratą szansy.' },
    { turn: 6, speaker: 'mediator', summary: 'Proponuje ramę wspólnej decyzji bez deadline w tej rozmowie.' },
  ],
  successCriteria: [
    'Obie strony opisały konkretne strachy i nadzieje związane z przeprowadzką.',
    'Decyzja nie została wymuszona pod presją terminu.',
    'Para ma poczucie, że to wspólna sprawa, nie jednostronny projekt.',
    'Ustalono kolejny krok (np. lista pytań do obu stron przed decyzją).',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Mam wrażenie, że decyzja o przeprowadzce już właściwie zapadła, tylko ja mam się do niej dopasować. A przecież to zmienia całe nasze życie.',
    },
    {
      speaker: 'partner',
      text: 'Nie chcę decydować za ciebie. Po prostu widzę w tej przeprowadzce szansę, której możemy drugi raz nie dostać.',
    },
    {
      speaker: 'host',
      text: 'Dla ciebie to brzmi jak szansa. Dla mnie to też strach przed zostawieniem pracy, rodziny i wszystkiego, co znam.',
    },
    {
      speaker: 'partner',
      text: 'Rozumiem, że to może być dla ciebie dużo. Ja z kolei boję się, że jeśli zostaniemy, będziemy za kilka lat żałować, że nawet nie spróbowaliśmy.',
    },
    {
      speaker: 'host',
      text: 'Nie mówię, że nigdy się nie przeprowadzę. Potrzebuję tylko czuć, że moje obawy są traktowane tak samo poważnie jak twoje plany.',
    },
    {
      speaker: 'partner',
      text: 'Masz rację. Chcę o tym rozmawiać jak o naszej decyzji, nie jak o moim pomyśle, który masz po prostu zaakceptować.',
    },
  ],
};
