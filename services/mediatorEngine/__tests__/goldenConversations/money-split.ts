import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const moneySplitConversation: GoldenConversation = {
  id: 'money-split',
  title: 'Podział pieniędzy',
  description:
    'Para nie ma wspólnego konta lub spiera się o proporcję wkładów — jedna osoba zarabia więcej. ' +
    'Prawdziwy problem: poczucie nierówności, wstydu i strachu przed uzależnieniem finansowym od partnera.',
  difficulty: 'medium',
  tags: ['finances', 'income-gap', 'fairness', 'autonomy'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
  ],
  expectedStrategies: [
    'validate_emotions',
    'hold_space',
    'increase_mutual_understanding',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba z niższym dochodem, czująca się zależna',
      typicalEmotions: ['wstyd', 'niesprawiedliwość', 'lęk', 'uraza'],
    },
    partner: {
      role: 'Osoba z wyższym dochodem, czująca presję „płacenia za wszystko”',
      typicalEmotions: ['zmęczenie', 'frustracja', 'poczucie niewdzięczności', 'obronność'],
    },
  },
  openingSituation:
    'Para mieszka razem od roku. Wyższe zarobki jednej strony pokrywają większość kosztów. ' +
    'Niższe zarobki czują się „w długu” — ostatnia kłótnia przy podziale rachunków za wakacje.',
  expectedMediatorBehaviour: [
    'Nie oceniać modelu „kto ile zarabia” jako moralny werdykt.',
    'Pomóc nazwać wstyd i urazę związane z nierównością.',
    'Oddzielić praktyczny podział od poczucia wartości w związku.',
    'Nie proponować konkretnych sum bez zgody obu stron.',
    'Szukać poczucia sprawiedliwości, nie tylko matematyki.',
  ],
  forbiddenMediatorBehaviour: [
    'Stwierdzać, że „kto zarabia, ten decyduje”.',
    'Bagatelizować wstyd osoby z niższym dochodem.',
    'Oskarżać bogatszą stronę o arogancję bez słuchania.',
    'Wymuszać wspólne konto w pierwszej sesji.',
    'Porównywać do innych par finansowo.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Czuję się jak lokator z twoim portfelem.”' },
    { turn: 2, speaker: 'partner', summary: '„Próbuję być fair — a ty i tak jesteś niezadowolony.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta: co znaczy dla was „sprawiedliwy” podział?' },
    { turn: 4, speaker: 'host', summary: 'Mówi o wstydzie i braku autonomii.' },
    { turn: 5, speaker: 'partner', summary: 'Opisuje zmęczenie byciem „bankomatem”.' },
    { turn: 6, speaker: 'mediator', summary: 'Odbija oba doświadczenia bez werdyktu ekonomicznego.' },
  ],
  successCriteria: [
    'Wstyd i uraza zostały nazwane po obu stronach.',
    'Para rozumie, że chodzi o relację, nie tylko o procenty.',
    'Brak moralnego wygrania przez bogatszą stronę.',
    'Możliwa dalsza rozmowa o zasadach — bez wymuszonej decyzji dziś.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Mam poczucie, że podział pieniędzy jest u nas niby równy, ale w praktyce ja częściej dopłacam do rzeczy, których potem nawet nie liczymy.',
    },
    {
      speaker: 'partner',
      text: 'Nie robię tego specjalnie. Po prostu nie zawsze widzę te małe wydatki tak jak ty, a potem wychodzi, że znowu coś mi wypominasz.',
    },
    {
      speaker: 'host',
      text: 'Bo ja nie chcę ciągle być księgowym w naszym związku. Męczy mnie pilnowanie, czy wszystko jest sprawiedliwe.',
    },
    {
      speaker: 'partner',
      text: 'A mnie męczy poczucie, że każda rozmowa o pieniądzach kończy się tym, że jestem nieodpowiedzialna albo mniej się staram.',
    },
    {
      speaker: 'host',
      text: 'Nie chodzi mi o oskarżanie. Chcę tylko czuć, że ciężar wspólnego życia naprawdę jest po obu stronach.',
    },
    {
      speaker: 'partner',
      text: 'Rozumiem. Możemy usiąść i ustalić jasny sposób dzielenia wydatków, żeby to nie wracało przy każdej kłótni.',
    },
  ],
};
