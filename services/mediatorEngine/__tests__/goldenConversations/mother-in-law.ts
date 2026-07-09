import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const motherInLawConversation: GoldenConversation = {
  id: 'mother-in-law',
  title: 'Teściowa',
  description:
    'Konflikt o zaangażowanie rodziny po stronie partnera — wizyty, rady, granice. ' +
    'Prawdziwy problem: poczucie sojuszu („Ty zawsze po swojej matce”) i brak wspólnej definicji „naszego domu”.',
  difficulty: 'high',
  tags: ['in-laws', 'boundaries', 'loyalty', 'family'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
  ],
  expectedStrategies: [
    'validate_emotions',
    'increase_mutual_understanding',
    'hold_space',
    'reduce_tension',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba czująca się drugorzędna wobec rodziny partnera',
      typicalEmotions: ['żal', 'zazdrość', 'poczucie odrzucenia', 'złość'],
    },
    partner: {
      role: 'Osoba między matką a partnerem, czująca się w rozterce',
      typicalEmotions: ['wina', 'stres', 'obronność', 'zmęczenie konfliktem'],
    },
  },
  openingSituation:
    'Po weekendowej wizycie teściów para nie rozmawiała dwa dni. Host czuje, że partner nie stanął w jego/jej obronie, ' +
    'gdy teściowa skomentowała sposób wychowania dziecka. Partner twierdzi, że „matka tylko chciała pomóc”.',
  expectedMediatorBehaviour: [
    'Nie demonizować teściów ani idealizować „rodziny”.',
    'Rozdzielić lojalność wobec rodziny pochodzenia od lojalności wobec partnera.',
    'Pomóc opisać konkretne zachowania, które bolą — nie tylko etykietę „teściowa”.',
    'Utrzymać bezpieczeństwo emocjonalne — temat jest głęboko osobisty.',
    'Szukać wspólnej definicji granic, nie „kto ma rację wobec matki”.',
  ],
  forbiddenMediatorBehaviour: [
    'Radzić „po prostu się oddal od teściów”.',
    'Stwierdzać, że host „przesadza z wrażliwością”.',
    'Sugerować, że partner musi „wybrać stronę” w sposób ultimatum.',
    'Wchodzić w ocenę charakteru teściowej.',
    'Porównywać do stereotypów kulturowych („u nas tak się robi”).',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Znowu stanąłeś po jej stronie, nie po mojej.”' },
    { turn: 2, speaker: 'partner', summary: '„Nie mogę być wrogiem własnej matki przez ciebie.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta: co było najbardziej bolesne w tamtym momencie?' },
    { turn: 4, speaker: 'host', summary: 'Opisuje komentarz o dziecku i milczenie partnera.' },
    { turn: 5, speaker: 'partner', summary: 'Mówi o presji i wstydzie wobec matki.' },
    { turn: 6, speaker: 'mediator', summary: 'Nazywa dylemat lojalności bez rozstrzygania go.' },
  ],
  successCriteria: [
    'Obie strony opisały swoją pozycję bez etykiet „egoista” / „baba zawsze ma rację”.',
    'Pojawiło się wspólne zrozumienie, że chodzi o granice w „naszym domu”.',
    'Partner nie musiał zrzec się rodziny — ale usłyszał potrzebę wsparcia.',
    'Para ma język do rozmowy o następnej wizycie (nawet jeśli bez gotowego planu).',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Najbardziej zabolało mnie nie to, co powiedziała twoja mama. Zabolało mnie to, że stałeś obok i ani razu mnie nie obroniłeś.',
    },
    {
      speaker: 'partner',
      text: 'Nie chciałem wybierać między tobą a moją mamą. Wiedziałem, że jeśli się odezwę, wszystko tylko bardziej się rozkręci.',
    },
    {
      speaker: 'host',
      text: 'Ale milczenie też było wyborem. W tamtym momencie poczułam, że zostałam z tym sama.',
    },
    {
      speaker: 'partner',
      text: 'Nie pomyślałem o tym w ten sposób. Byłem bardziej skupiony na tym, żeby zakończyć kłótnię niż na tym, jak ty się czujesz.',
    },
    {
      speaker: 'host',
      text: 'Nie oczekuję, że przestaniesz kochać swoją rodzinę. Chcę tylko wiedzieć, że kiedy ktoś mnie rani, jesteśmy po tej samej stronie.',
    },
    {
      speaker: 'partner',
      text: 'Rozumiem. Chciałbym następnym razem najpierw pokazać ci, że jesteś dla mnie ważna, a dopiero później próbować uspokoić całą sytuację.',
    },
  ],
};
