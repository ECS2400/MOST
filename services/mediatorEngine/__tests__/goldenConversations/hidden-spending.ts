import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const hiddenSpendingConversation: GoldenConversation = {
  id: 'hidden-spending',
  title: 'Ukrywanie wydatków',
  description:
    'Jedna osoba odkryła zakupy, konto oszczędnościowe lub długi, o których nie wiedziała. ' +
    'Prawdziwy problem: złamane zaufanie, wstyd finansowy i lęk przed kontrolą — nie tylko kwota.',
  difficulty: 'high',
  tags: ['finances', 'trust', 'secrecy', 'betrayal'],
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
    'build_safety',
    'hold_space',
    'recover_misinterpretation',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba odkrywająca ukryte wydatki lub długi',
      typicalEmotions: ['zdrada', 'złość', 'lęk', 'brak zaufania'],
    },
    partner: {
      role: 'Osoba ukrywająca wydatki ze wstydu lub lęku przed reakcją',
      typicalEmotions: ['wstyd', 'lęk', 'obronność', 'poczucie bycia ściganym'],
    },
  },
  openingSituation:
    'Partner znalazł(a) wyciąg z karty kredytowej lub paczkę z zakupami. Ukrywający wydatki przyznaje się pod presją. ' +
    'Para jest w szoku — rozmowa o rozwodzie wisiała w powietrzu, zanim zgodzili się na mediację.',
  expectedMediatorBehaviour: [
    'Utrzymać bezpieczeństwo — zaufanie jest naruszone.',
    'Nie bagatelizować odkrycia („to tylko pieniądze”).',
    'Pomóc opisać wstyd i lęk bez usprawiedliwiania kłamstwa.',
    'Nie wchodzić w rolę detektywa ani sędziego.',
    'Spowolnić — para może być w traumie zaufania.',
  ],
  forbiddenMediatorBehaviour: [
    'Stwierdzać, że „każdy tak robi” i minimalizować zdradę zaufania.',
    'Nakazywać natychmiastowego ujawnienia wszystkich kont bez ram.',
    'Oskarżać odkrywającego o „nadgorliwość”.',
    'Wymuszać przebaczenia w jednej sesji.',
    'Proponować rozwiązania prawne lub rozwodowe.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Kłamałeś mi przez pół roku — jak mam ci ufać?”' },
    { turn: 2, speaker: 'partner', summary: '„Bałem się twojej reakcji — wiedziałem, że wybuchniesz.”' },
    { turn: 3, speaker: 'mediator', summary: 'Spowalnia; oddziela fakt ukrycia od emocji obu stron.' },
    { turn: 4, speaker: 'host', summary: 'Opisuje poczucie zdrady — ton ostry, ale zostaje przy stole.' },
    { turn: 5, speaker: 'partner', summary: 'Przyznaje wstyd — nie usprawiedliwia w pełni.' },
    { turn: 6, speaker: 'mediator', summary: 'Nazywa potrzebę przejrzystości i bezpieczeństwa emocjonalnego.' },
  ],
  successCriteria: [
    'Ukrywanie zostało uznane jako problem zaufania, nie tylko budżetu.',
    'Obie strony mogły mówić bez fizycznej eskalacji lub walki o słowa.',
    'Para nie została zmuszona do „przebaczenia” — ale ma ramę dalszej rozmowy.',
    'Mediator nie wziął strony jako „sędzia finansowy”.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Najbardziej boli mnie nie sama kwota. Boli mnie to, że dowiedziałem się przypadkiem, a nie od ciebie.',
    },
    {
      speaker: 'partner',
      text: 'Wiedziałam, że jak powiem, od razu będzie awantura. Nie chciałam znowu słyszeć, że jestem nieodpowiedzialna.',
    },
    {
      speaker: 'host',
      text: 'Ale przez ukrywanie tego mam poczucie, że nie wiem, co jeszcze przede mną chowasz. To podcina mi zaufanie.',
    },
    {
      speaker: 'partner',
      text: 'Rozumiem, tylko ja też czuję się czasem jak dziecko, które musi prosić o zgodę na każdą rzecz dla siebie.',
    },
    {
      speaker: 'host',
      text: 'Nie chcę cię kontrolować. Chcę mieć pewność, że decyzje, które wpływają na nasz budżet, podejmujemy uczciwie.',
    },
    {
      speaker: 'partner',
      text: 'Masz rację. Powinnam była powiedzieć wcześniej. Chciałabym ustalić taki sposób rozmowy o wydatkach, żeby nie kończyło się to ukrywaniem albo oskarżeniami.',
    },
  ],
};
