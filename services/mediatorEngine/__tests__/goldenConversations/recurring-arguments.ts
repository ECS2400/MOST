import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const recurringArgumentsConversation: GoldenConversation = {
  id: 'recurring-arguments',
  title: 'Powtarzające się kłótnie',
  description:
    'Para walczy o te same tematy w kółko — pieniądze, obowiązki, czas — bez rozwiązania. ' +
    'Prawdziwy problem: utknięcie w pętli blame i zmęczenie walką; brak poczucia postępu.',
  difficulty: 'medium',
  tags: ['blame-loop', 'repetition', 'exhaustion', 'stuck'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'PERSPECTIVE_SHARING',
  ],
  expectedStrategies: [
    'validate_emotions',
    'stop_escalation',
    'reduce_tension',
    'hold_space',
  ],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba czująca, że „nic się nie zmienia”',
      typicalEmotions: ['rezygnacja', 'złość', 'zmęczenie', 'bezradność'],
    },
    partner: {
      role: 'Osoba czująca się atakowana tymi samymi zarzutami',
      typicalEmotions: ['obronność', 'irytacja', 'poczucie niesprawiedliwości', 'wycofanie'],
    },
  },
  openingSituation:
    'Para ma za sobą dziesiątki podobnych kłótni. Tym razem przerwali świadomie i umówili się na mediację. ' +
    'Oboje są sceptyczni: „i tak nic z tego nie będzie”.',
  expectedMediatorBehaviour: [
    'Rozpoznać pętlę i nazwać ją bez oskarżania.',
    'Przerwać automatyczne „zawsze/nigdy”.',
    'Pomóc opisać jeden konkretny cykl kłótni, nie całą historię.',
    'Nie obiecywać magicznego rozwiązania.',
    'Budować nadzieję przez mały, realistyczny krok.',
  ],
  forbiddenMediatorBehaviour: [
    'Powtarzać znane argumenty pary bez reframingu.',
    'Stwierdzać, że „po prostu muszą przestać kłócić”.',
    'Wybierać, kto ma rację w starej sprawie.',
    'Ignorować wypalenia i cynizmu wobec mediacji.',
    'Przechodzić do rozwiązań bez zrozumienia cyklu.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Zawsze kończymy tak samo — krzyczysz i wychodzisz.”' },
    { turn: 2, speaker: 'partner', summary: '„Bo zawsze zaczynasz od ataku.”' },
    { turn: 3, speaker: 'mediator', summary: 'Prosi o opis jednej ostatniej kłótni — krok po kroku.' },
    { turn: 4, speaker: 'host', summary: 'Opisuje trigger — ton nadal ostry.' },
    { turn: 5, speaker: 'partner', summary: 'Opisuje moment wycofania / wyjścia.' },
    { turn: 6, speaker: 'mediator', summary: 'Nazywa wzorzec: trigger → eskalacja → wycofanie.' },
  ],
  successCriteria: [
    'Para zobaczyła wzorzec kłótni jako wspólny cykl, nie tylko wina drugiej strony.',
    'Zmniejszyła się liczba „zawsze/nigdy” w wypowiedziach.',
    'Pojawił się jeden konkretny moment do obserwacji w przyszłości.',
    'Cynizm wobec mediacji nie został ignorowany — para została przy stole.',
  ],
};
