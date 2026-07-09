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
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
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
  messages: [
    {
      speaker: 'host',
      text: 'Nie chodzi o to, że nie możesz mieć znajomych. Po prostu źle się czuję, kiedy widzę, jak piszesz z nim codziennie i odkładasz telefon, gdy wchodzę do pokoju.',
    },
    {
      speaker: 'partner',
      text: 'Nie ukrywam przed tobą telefonu. Mam tylko dość tego, że każda wiadomość kończy się podejrzeniami. Czuję się, jakbym musiała się cały czas tłumaczyć.',
    },
    {
      speaker: 'host',
      text: 'Bo kiedy pytam, kto napisał, odpowiadasz wymijająco. Potem zostaję z własnymi domysłami i coraz trudniej mi ci zaufać.',
    },
    {
      speaker: 'partner',
      text: 'A ja mam wrażenie, że cokolwiek zrobię, i tak uznasz, że robię coś przeciwko tobie. To jest bardzo męczące.',
    },
    {
      speaker: 'host',
      text: 'Nie chcę cię kontrolować. Chciałbym po prostu znowu czuć się spokojnie i mieć pewność, że jesteśmy po tej samej stronie.',
    },
    {
      speaker: 'partner',
      text: 'Ja też chcę, żebyśmy znowu sobie ufali. Nie chcę, żeby każda rozmowa kończyła się kłótnią o coś, czego nawet nie zrobiłam.',
    },
  ],
};
