import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const familyBoundariesConversation: GoldenConversation = {
  id: 'family-boundaries',
  title: 'Granice wobec rodziny',
  description:
    'Para ustala, jak często widują rodzinę, jak reagują na nieproszone rady, wizyty bez zapowiedzi. ' +
    'Prawdziwy problem: różne normy „rodzinności” i poczucie, że granice jednej osoby są lekceważone.',
  difficulty: 'medium',
  tags: ['boundaries', 'family', 'autonomy', 'couple-identity'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
  ],
  expectedStrategies: [
    'validate_emotions',
    'increase_mutual_understanding',
    'prepare_agreement',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba potrzebująca więcej prywatności i przestrzeni dla pary',
      typicalEmotions: ['przeciążenie', 'irytacja', 'poczucie inwazji', 'samotność w parze'],
    },
    partner: {
      role: 'Osoba silnie związana z rodziną pochodzenia',
      typicalEmotions: ['wina', 'lojalność', 'konflikt wewnętrzny', 'obronność'],
    },
  },
  openingSituation:
    'Teściowie przyjechali bez zapowiedzi w sobotę. Host był(a) w piżamie, partner uznał to za „miłe niespodzianki”. ' +
    'Po ich wyjeździe para nie rozmawiała przez dwa dni.',
  expectedMediatorBehaviour: [
    'Rozdzielić miłość do rodziny od braku granic.',
    'Pomóc opisać konkretne zachowania, które przekraczają komfort.',
    'Uznać, że granice nie oznaczają braku szacunku do rodziny.',
    'Szukać wspólnej polityki „nasz dom” vs „rodzina”.',
    'Nie wymuszać zerwania kontaktów.',
  ],
  forbiddenMediatorBehaviour: [
    'Stwierdzać, że „rodzina zawsze ma pierwszeństwo”.',
    'Oskarżać hosta o nietolerancję.',
    'Radzić kłótni z teściami w trakcie mediacji.',
    'Bagatelizować potrzebę prywatności.',
    'Wybierać stronę bez zrozumienia lojalności partnera.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Znowu wchodzą jak do swojego — a ty nic nie mówisz.”' },
    { turn: 2, speaker: 'partner', summary: '„To moja rodzina — nie mogę ich wyprosić.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta: co oznacza dla was „nasz dom”?' },
    { turn: 4, speaker: 'host', summary: 'Opisuje potrzebę przewidywalności i odpoczynku.' },
    { turn: 5, speaker: 'partner', summary: 'Mówi o wstydzie i obowiązku gościnności.' },
    { turn: 6, speaker: 'mediator', summary: 'Łączy granice z troską o relację, nie o wygraną.' },
  ],
  successCriteria: [
    'Para ma wspólny język o granicach bez etykiet „egoista” / „bambocło”.',
    'Partner usłyszał potrzebę prywatności; host usłyszał lojalność.',
    'Ustalono kierunek rozmowy o zasadach wizyt — bez gotowego regulaminu.',
    'Napięcie nie eskalowało do groźb rozstania.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Mam wrażenie, że twoja rodzina może wejść w nasze życie w każdej chwili, a ja nie mam prawa powiedzieć, że to dla mnie za dużo.',
    },
    {
      speaker: 'partner',
      text: 'Oni po prostu chcą być blisko. Nie widzę w tym nic złego, ale rozumiem, że czasem może to być męczące.',
    },
    {
      speaker: 'host',
      text: 'Problem w tym, że kiedy mówię, że potrzebuję granic, od razu brzmię jak osoba, która odrzuca twoją rodzinę.',
    },
    {
      speaker: 'partner',
      text: 'Bo czasem tak to odbieram. Mam poczucie, że jeśli postawię im granicę, to ich zranię albo wyjdę na niewdzięcznego.',
    },
    {
      speaker: 'host',
      text: 'Ja nie chcę cię od nich odcinać. Chcę tylko, żeby nasz dom był miejscem, w którym oboje czujemy się bezpiecznie.',
    },
    {
      speaker: 'partner',
      text: 'Rozumiem. Możemy ustalić jasne zasady odwiedzin i rozmów z rodziną, żeby to nie było za każdym razem przeciwko komuś.',
    },
  ],
};
