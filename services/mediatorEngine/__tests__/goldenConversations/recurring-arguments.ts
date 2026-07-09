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
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
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
  messages: [
    {
      speaker: 'host',
      text: 'Mam wrażenie, że co kilka dni wracamy dokładnie do tej samej kłótni. Zmieniamy tylko temat, ale kończy się tak samo.',
    },
    {
      speaker: 'partner',
      text: 'Bo ty od razu mówisz, że znowu robię to samo. Wtedy mam poczucie, że nie ma znaczenia, co powiem, bo już jestem winny.',
    },
    {
      speaker: 'host',
      text: 'Nie chcę cię ustawiać jako winnego. Jestem po prostu zmęczona tym, że po każdej rozmowie niby coś ustalamy, a potem wszystko wraca.',
    },
    {
      speaker: 'partner',
      text: 'Ja też jestem zmęczony. Czasem już nawet nie słucham do końca, bo mam wrażenie, że znam finał tej rozmowy.',
    },
    {
      speaker: 'host',
      text: 'Właśnie tego się boję. Że przestaniemy próbować, bo uznamy, że i tak nic się nie zmieni.',
    },
    {
      speaker: 'partner',
      text: 'Nie chcę, żeby tak było. Może zamiast kolejny raz udowadniać, kto ma rację, spróbujmy zobaczyć, gdzie ta rozmowa zawsze się psuje.',
    },
  ],
};
