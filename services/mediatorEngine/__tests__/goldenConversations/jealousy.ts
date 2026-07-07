import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const jealousyConversation: GoldenConversation = {
  id: 'jealousy',
  title: 'Zazdrość',
  description:
    'Partner(ka) czuje niepokój wobec kontaktów drugiej osoby — współpracownik, znajomy ze studiów. ' +
    'Prawdziwy problem: brak poczucia bezpieczeństwa w związku i lęk przed porzuceniem, maskowany jako kontrola.',
  difficulty: 'medium',
  tags: ['jealousy', 'trust', 'insecurity', 'boundaries'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
  ],
  expectedStrategies: ['validate_emotions', 'build_safety', 'hold_space'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba odczuwająca zazdrość i lęk o związek',
      typicalEmotions: ['lęk', 'zazdrość', 'wstyd', 'złość'],
    },
    partner: {
      role: 'Osoba czująca się niesłusznie podejrzewana i ograniczana',
      typicalEmotions: ['frustracja', 'niesprawiedliwość', 'zmęczenie', 'oburzenie'],
    },
  },
  openingSituation:
    'Para wróciła z imprezy firmowej, na której host widział(a), jak partner długo rozmawiał z kolegą/koleżanką. ' +
    'W samochodzie wybuchła kłótnia; od tygodnia chodzą w milczeniu lub wymianie sarkastycznych uwag.',
  expectedMediatorBehaviour: [
    'Traktować zazdrość jako sygnał potrzeby, nie jako „wadę charakteru”.',
    'Nie bagatelizować uczuć ani nie potwierdzać podejrzeń bez dowodów.',
    'Pomóc rozdzielić fakty od interpretacji.',
    'Tworzyć przestrzeń na wstyd — zazdrość jest trudna do przyznania.',
    'Nie eskalować przez moralizowanie o „zaufaniu”.',
  ],
  forbiddenMediatorBehaviour: [
    'Stwierdzać, że zazdrość „znaczy, że coś jest nie tak z tobą”.',
    'Nakazywać partnerowi zerwanie kontaktów bez rozmowy o potrzebach.',
    'Oskarżać partnera o „prowokowanie” zazdrości.',
    'Wchodzić w rolę detektywa („czy coś się dzieje?”).',
    'Używać sarkazmu lub żartów o zazdrości.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Widzę, jak na nią patrzysz — nie udawaj.”' },
    { turn: 2, speaker: 'partner', summary: '„Znowu przesłuchujesz mnie jak dziecko. Nic się nie dzieje.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta hosta: czego najbardziej się boisz w tej sytuacji?' },
    { turn: 4, speaker: 'host', summary: 'Przyznaje lęk przed porzuceniem — ton się łagodzi.' },
    { turn: 5, speaker: 'partner', summary: 'Mówi o zmęczeniu ciągłym tłumaczeniem się.' },
    { turn: 6, speaker: 'mediator', summary: 'Odbija obie perspektywy; nie rozstrzyga wiarygodności.' },
  ],
  successCriteria: [
    'Zazdrość została nazwana jako uczucie, nie tylko jako oskarżenie.',
    'Partner usłyszał wpływ swojego zachowania bez poczucia procesu.',
    'Host usłyszał, że kontrola oddala — bez moralnej lekcji.',
    'Para ma wspólny obraz: bezpieczeństwo vs przestrzeń osobista.',
  ],
};
