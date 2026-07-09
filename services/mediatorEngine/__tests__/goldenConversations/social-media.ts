import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const socialMediaConversation: GoldenConversation = {
  id: 'social-media',
  title: 'Media społecznościowe',
  description:
    'Spór o czas przed ekranem, „lajki”, prywatność, publikowanie zdjęć dziecka lub pary. ' +
    'Prawdziwy problem: różne potrzeby widoczności, autonomii i obecności w relacji offline.',
  difficulty: 'low',
  tags: ['social-media', 'privacy', 'attention', 'boundaries'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
  ],
  expectedStrategies: ['validate_emotions', 'hold_space', 'increase_mutual_understanding'],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba czująca się mniej ważna niż telefon partnera',
      typicalEmotions: ['porzucenie', 'irytacja', 'smutek', 'poczucie niższości'],
    },
    partner: {
      role: 'Osoba używająca social mediów do relaksu i kontaktu ze znajomymi',
      typicalEmotions: ['obronność', 'poczucie kontroli', 'zmęczenie', 'frustracja'],
    },
  },
  openingSituation:
    'Podczas kolacji partner scrollował feed przez cały posiłek. Host zrobił(a) zdjęcie i opublikował bez pytania partnera. ' +
    'Kłótnia o „szacunek” i „prywatność” trwa od trzech dni.',
  expectedMediatorBehaviour: [
    'Nie moralizować o „uzależnieniu od telefonu” w pierwszej kolejności.',
    'Zbadać, co każda strona chroni: bliskość vs odpoczynek vs prywatność.',
    'Pomóc nazwać konkretne zachowania zamiast „jesteś uzależniony”.',
    'Uwzględnić generacyjne i kulturowe różnice w podejściu do mediów.',
    'Szukać ustaleń, nie zakazów.',
  ],
  forbiddenMediatorBehaviour: [
    'Nakazywać usunięcie kont w trakcie mediacji.',
    'Bagatelizować potrzebę prywatności jako „paranoję”.',
    'Publicznie upokarzać „scrollowanie” jako dowód braku miłości.',
    'Stawiać ultimatum „telefon albo ja”.',
    'Ignorować kwestię zgody na publikację zdjęć dziecka.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Wolisz Instagram niż rozmowę ze mną.”' },
    { turn: 2, speaker: 'partner', summary: '„To mój jedyny sposób na oddech po pracy.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta: co każde scrollowanie / publikacja oznacza dla drugiej strony?' },
    { turn: 4, speaker: 'host', summary: 'Mówi o poczuciu bycia niewidzialnym.' },
    { turn: 5, speaker: 'partner', summary: 'Tłumaczy, że nie chodzi o unikanie — chodzi o reset.' },
    { turn: 6, speaker: 'mediator', summary: 'Oddziela czas razem od zasad prywatności online.' },
  ],
  successCriteria: [
    'Obie strony opisały, czego potrzebują od czasu offline i online.',
    'Kwestia publikacji zdjęć została nazwana jako osobny temat zgody.',
    'Brak eskalacji do personalnych ataków o „głupię” social media.',
    'Para widzi możliwość małych ustaleń (np. telefon poza stołem).',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Nie chodzi o samo zdjęcie. Chodzi o to, że wrzucasz nasze prywatne rzeczy do internetu, zanim w ogóle zapytasz mnie, czy ja się z tym dobrze czuję.',
    },
    {
      speaker: 'partner',
      text: 'Dla mnie to nie były prywatne rzeczy, tylko normalny moment z naszego życia. Nie pomyślałam, że możesz to odebrać jak przekroczenie granicy.',
    },
    {
      speaker: 'host',
      text: 'Ale kiedy proszę, żebyś coś usunęła, słyszę, że przesadzam. Wtedy mam wrażenie, że bardziej liczy się reakcja ludzi niż to, co ja czuję.',
    },
    {
      speaker: 'partner',
      text: 'Nie chodzi mi o ludzi bardziej niż o ciebie. Tylko czasem mam poczucie, że kontrolujesz każdy mój post i potem odechciewa mi się w ogóle czymkolwiek dzielić.',
    },
    {
      speaker: 'host',
      text: 'Ja nie chcę ci mówić, co masz publikować. Chcę tylko mieć wpływ na rzeczy, które dotyczą też mnie.',
    },
    {
      speaker: 'partner',
      text: 'Rozumiem. Mogę następnym razem zapytać, zanim wrzucę coś wspólnego. Ale chciałabym też, żebyś nie zakładał od razu, że robię to przeciwko tobie.',
    },
  ],
};
