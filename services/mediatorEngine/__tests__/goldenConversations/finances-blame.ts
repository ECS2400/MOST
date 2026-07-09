import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const financesBlameConversation: GoldenConversation = {
  id: 'finances-blame',
  title: 'Finanse — wzajemne obwinianie',
  description:
    'Para kłóci się o wydatki i kontrolę budżetu. Na powierzchni: „kto więcej wydaje”. ' +
    'Prawdziwy problem: poczucie braku wpływu, lęk przed przyszłością i brak zaufania do wspólnych decyzji finansowych.',
  difficulty: 'medium',
  tags: ['finances', 'blame-loop', 'trust', 'control'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING'],
  expectedStrategies: [
    'validate_emotions',
    'reduce_tension',
    'hold_space',
    'increase_mutual_understanding',
  ],
  expectedReplayStrategies: ['validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba czująca się ignorowana w decyzjach finansowych',
      typicalEmotions: ['frustracja', 'bezsilność', 'złość', 'lęk o stabilność'],
    },
    partner: {
      role: 'Osoba czująca się krytykowana za każdy wydatek',
      typicalEmotions: ['obronność', 'wstyd', 'irytacja', 'poczucie niesprawiedliwości'],
    },
  },
  openingSituation:
    'Para przyszła po kolejnej kłótnie przy stole — tym razem po rachunku z supermarketu. ' +
    'Przez ostatnie tygodnie unikają rozmów o pieniądzach; każde zdanie o budżecie kończy się podniesionym głosem. ' +
    'Oboje są zmęczeni i sceptyczni wobec mediacji.',
  expectedMediatorBehaviour: [
    'Spowolnić tempo i nie eskalować emocji.',
    'Pomóc obu stronom nazwać emocje zamiast powtarzać zarzuty.',
    'Oddzielić fakty od interpretacji („kto więcej wydaje” vs „czuję, że nie mam głosu”).',
    'Zadawać pytania otwarte, które zapraszają do opisu doświadczenia, nie do obrony.',
    'Utrzymać obie strony w rozmowie — nie pozwolić, by jedna dominowała.',
    'Nie przechodzić od razu do rozwiązań ani podziału budżetu.',
  ],
  forbiddenMediatorBehaviour: [
    'Stawać po stronie osoby „bardziej racjonalnej” finansowo.',
    'Oceniać, kto faktycznie więcej wydaje, zanim emocje zostaną zrozumiane.',
    'Proponować konkretny podział kont lub zasady bez zgody obu stron.',
    'Używać języka oskarżeń („Ty zawsze…”, „Wy oboje musicie…”).',
    'Bagatelizować lęk o pieniądze jako „przesadę”.',
    'Przechodzić do tematu rozwiązań, zanim obie strony poczują się wysłuchane.',
  ],
  conversationOutline: [
    {
      turn: 1,
      speaker: 'host',
      summary:
        '„Ja już nie wiem, jak mam z tobą rozmawiać o pieniądzach. Za każdym razem kończy się tak samo.”',
    },
    {
      turn: 2,
      speaker: 'partner',
      summary:
        '„Bo mam wrażenie, że cokolwiek zrobię, to i tak usłyszę, że źle wydaję.”',
    },
    {
      turn: 3,
      speaker: 'mediator',
      summary:
        'Zaprasza obie strony do opisania, co najbardziej boli je w tych rozmowach, zamiast przechodzenia do liczb.',
    },
    {
      turn: 4,
      speaker: 'host',
      summary:
        '„Mnie nie chodzi o każdą złotówkę. Ja się boję, że kiedyś zabraknie nam pieniędzy.”',
    },
    {
      turn: 5,
      speaker: 'partner',
      summary:
        '„A ja mam dosyć życia w ciągłym stresie. Czuję, jakbym za wszystko musiał się tłumaczyć.”',
    },
    {
      turn: 6,
      speaker: 'mediator',
      summary:
        'Podsumowuje, że pod konfliktem o pieniądze kryją się bezpieczeństwo i poczucie zaufania.',
    },
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Ja już nie wiem, jak mam z tobą rozmawiać o pieniądzach. Za każdym razem kończy się tak samo.',
    },
    {
      speaker: 'partner',
      text: 'Bo mam wrażenie, że cokolwiek zrobię, to i tak usłyszę, że źle wydaję.',
    },
    {
      speaker: 'mediator',
      text: 'Zaprasza obie strony do opisania, co najbardziej boli je w tych rozmowach, zamiast przechodzenia do liczb.',
    },
    {
      speaker: 'host',
      text: 'Mnie nie chodzi o każdą złotówkę. Ja się boję, że kiedyś zabraknie nam pieniędzy.',
    },
    {
      speaker: 'partner',
      text: 'A ja mam dosyć życia w ciągłym stresie. Czuję, jakbym za wszystko musiał się tłumaczyć.',
    },
    {
      speaker: 'mediator',
      text: 'Podsumowuje, że pod konfliktem o pieniądze kryją się bezpieczeństwo i poczucie zaufania.',
    },
  ],
  successCriteria: [
    'Obie strony przynajmniej raz nazwały własną emocję (nie tylko zarzut wobec drugiej).',
    'Tempo rozmowy spadło — brak narastającej eskalacji przez kilka tur.',
    'Pojawiło się wspólne zrozumienie, że chodzi o coś więcej niż ostatni rachunek.',
    'Żadna ze stron nie wyszła z poczuciem, że mediator jest „sędzią finansowym”.',
    'Para jest gotowa na kolejny krok (np. opisanie potrzeb), ale nie została do niego zmuszona.',
  ],
};
