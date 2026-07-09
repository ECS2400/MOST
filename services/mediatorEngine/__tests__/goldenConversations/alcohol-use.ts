import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const alcoholUseConversation: GoldenConversation = {
  id: 'alcohol-use',
  title: 'Nadużywanie alkoholu (bez przemocy)',
  description:
    'Partner pije więcej niż druga osoba uznaje za akceptowalne — wieczory z winem, „odrobinka” codziennie. ' +
    'Prawdziwy problem: lęk o zdrowie i relację, wstyd i zaprzeczanie — bez incydentów przemocy fizycznej.',
  difficulty: 'high',
  tags: ['alcohol', 'habits', 'worry', 'denial'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'FUTURE_PLAN',
  ],
  expectedStrategies: [
    'validate_emotions',
    'hold_space',
    'build_safety',
    'reduce_tension',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'L1',
  participants: {
    host: {
      role: 'Osoba martwiąca się o picie partnera',
      typicalEmotions: ['lęk', 'frustracja', 'bezradność', 'smutek'],
    },
    partner: {
      role: 'Osoba pijąca regularnie, czująca się krytykowana',
      typicalEmotions: ['wstyd', 'obronność', 'złość', 'poczucie kontroli'],
    },
  },
  openingSituation:
    'Para kłóciła się po kolejnym wieczorze, gdy partner wrócił pijny lub „pół na pół”. ' +
    'Dzieci spały. Host zaproponował(a) mediację zamiast kolejnej awantury. Partner przyszedł niechętnie, zaprzecza problemowi.',
  expectedMediatorBehaviour: [
    'Nie diagnozować uzależnienia — to poza kompetencją mediacji.',
    'Pomóc opisać wpływ picia na relację i poczucie bezpieczeństwa.',
    'Nie moralizować ani nie bagatelizować.',
    'Utrzymać szacunek — wstyd jest silny.',
    'Rozpoznać, kiedy temat wymaga specjalisty — bez straszenia.',
  ],
  forbiddenMediatorBehaviour: [
    'Stwierdzać, że partner „jest alkoholikiem”.',
    'Bagatelizować obawy jako „nadopiekuńczość”.',
    'Nakazywać abstynencji w trakcie sesji.',
    'Używać dzieci jako argumentu przemocy, której nie było.',
    'Grozić rozstaniem lub interwencją bez kontekstu.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Znowu nie byłeś przytomny — ja się o ciebie boję.”' },
    { turn: 2, speaker: 'partner', summary: '„Mam prawo odpocząć — nie jestem pijany.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta o konkretne sytuacje i uczucia, nie o etykiety.' },
    { turn: 4, speaker: 'host', summary: 'Opisuje samotne wieczory i lęk o zdrowie.' },
    { turn: 5, speaker: 'partner', summary: 'Mówi o stresie w pracy — przyznaje, że „może za często”.' },
    { turn: 6, speaker: 'mediator', summary: 'Odbija obawę i potrzebę odreagowania bez werdyktu medycznego.' },
  ],
  successCriteria: [
    'Obawa została nazwana bez etykietowania partnera.',
    'Partner nie został zepchnięty w całkowite zaprzeczenie — jest przestrzeń na rozmowę.',
    'Para ma język do opisu wpływu na relację.',
    'Mediator wskazał, że głębsza praca może wymagać wsparcia — bez diagnozy.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Kiedy mówisz, że to tylko kilka piw, mam wrażenie, że pomijasz to, co dzieje się później. Zmieniasz ton, robisz się opryskliwy i ja zaczynam chodzić po mieszkaniu na palcach.',
    },
    {
      speaker: 'partner',
      text: 'Nie piję codziennie i nie uważam, że mam problem. Po prostu czasem chcę się rozluźnić, a ty od razu robisz z tego wielką sprawę.',
    },
    {
      speaker: 'host',
      text: 'Dla mnie to nie jest wielka sprawa z niczego. Ja się wtedy wycofuję, bo nie wiem, czy rozmowa skończy się normalnie, czy kolejną kłótnią.',
    },
    {
      speaker: 'partner',
      text: 'Rozumiem, że możesz się tak czuć, ale kiedy słyszę, że znowu mam uważać, od razu czuję się oceniany i atakowany.',
    },
    {
      speaker: 'host',
      text: 'Nie chcę cię zawstydzać. Chcę tylko mieć poczucie, że wieczór w domu nie zależy od tego, ile wypijesz.',
    },
    {
      speaker: 'partner',
      text: 'To brzmi inaczej, kiedy mówisz o tym w ten sposób. Mogę się przyjrzeć temu, jak się wtedy zachowuję, zamiast od razu się bronić.',
    },
  ],
};
