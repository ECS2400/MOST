import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const lackOfClosenessConversation: GoldenConversation = {
  id: 'lack-of-closeness',
  title: 'Brak bliskości',
  description:
    'Para funkcjonuje praktycznie, ale bez czułości, gestów, wspólnego czasu. ' +
    'Prawdziwy problem: stopniowa erozja więzi i poczucie bycia współlokatorami zamiast partnerami.',
  difficulty: 'medium',
  tags: ['closeness', 'emotional-distance', 'affection', 'roommates'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
  ],
  expectedStrategies: ['validate_emotions', 'hold_space', 'deepen_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba tęskniąca za czułością i wspólnym czasem',
      typicalEmotions: ['smutek', 'samotność', 'tęsknota', 'rezygnacja'],
    },
    partner: {
      role: 'Osoba skupiona na obowiązkach, która „nie ma już na to siły”',
      typicalEmotions: ['zmęczenie', 'przytłoczenie', 'wina', 'odległość'],
    },
  },
  openingSituation:
    'Para śpi w jednym łóżku, ale nie pamięta, kiedy ostatnio przytulili się bez powodu. ' +
    'Host zaproponował(a) mediację po wypowiedzeniu „chyba się już nie kochamy”. Partner odpowiedział(a): „Masz pracę i dzieci, nie mam czasu na dramaty”.',
  expectedMediatorBehaviour: [
    'Nie dramatyzować ani nie bagatelizować — obie reakcje są typowe.',
    'Pomóc opisać, czym jest „bliskość” dla każdej strony (może różnić się definicja).',
    'Rozpoznać wypalenie i codzienny chaos jako tło.',
    'Szukać małych gestów, nie wielkich romantycznych gestów.',
    'Budować most między potrzebą czułości a realiami życia.',
  ],
  forbiddenMediatorBehaviour: [
    'Porównywać do „początków związku” jako standardu.',
    'Nakazywać randki lub gesty bez zgody.',
    'Stwierdzać, że brak seksu = koniec związku.',
    'Obwiniać partnera za „zimność” lub hosta za „nachalność”.',
    'Ignorować wypalenie rodzicielskie lub zawodowe.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Czuję się jak obok ciebie, nie z tobą.”' },
    { turn: 2, speaker: 'partner', summary: '„Przetrwamy ten etap — dzieci, kredyt, co chcesz.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta: kiedy ostatnio poczuliście się blisko?' },
    { turn: 4, speaker: 'host', summary: 'Wspomina drobny gest sprzed miesięcy.' },
    { turn: 5, speaker: 'partner', summary: 'Przyznaje, że unika, bo boi się „kolejnej awantury o uczucia”.' },
    { turn: 6, speaker: 'mediator', summary: 'Nazywa różne definicje bliskości bez oceny.' },
  ],
  successCriteria: [
    'Obie strony opisały, czym jest dla nich bliskość.',
    'Wypalenie zostało uznane jako czynnik, nie wymówka.',
    'Pojawił się wspólny smutek zamiast wzajemnego oskarżania.',
    'Para widzi możliwość małego kroku (np. 5 minut rozmowy bez telefonu).',
  ],
};
