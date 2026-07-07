import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const householdChoresConversation: GoldenConversation = {
  id: 'household-chores',
  title: 'Obowiązki domowe',
  description:
    'Kłótnia o to, kto więcej robi w domu. Na powierzchni: lista zadań. ' +
    'Prawdziwy problem: nierówność obciążenia mentalnego i poczucie niewidzialności wkładu drugiej osoby.',
  difficulty: 'low',
  tags: ['chores', 'fairness', 'invisible-labour', 'resentment'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
  ],
  expectedStrategies: [
    'validate_emotions',
    'increase_mutual_understanding',
    'prepare_agreement',
  ],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba czująca, że ogarnia „wszystko” poza pracą',
      typicalEmotions: ['wściekłość', 'zmęczenie', 'niesprawiedliwość', 'lekceważenie'],
    },
    partner: {
      role: 'Osoba przekonana, że też dużo robi, ale „nikt tego nie widzi”',
      typicalEmotions: ['obronność', 'frustracja', 'poczucie niedocenienia', 'złość'],
    },
  },
  openingSituation:
    'Poranek po kłótni o nieumyte naczynia. Host zostało(a) w domu z dzieckiem; partner wraca z pracy zmęczony. ' +
    'Oboje mają listy „kto co zrobił” w głowie i czują, że druga strona ich nie docenia.',
  expectedMediatorBehaviour: [
    'Zejść z poziomu „kto więcej myje podłogi” do poziomu potrzeb i obciążenia.',
    'Umożliwić obu stronom opisanie wkładu bez przerywania.',
    'Rozpoznać mental load — nie tylko fizyczne zadania.',
    'Nie rozstrzygać sporu faktycznego bez empatii.',
    'Szukać wspólnego języka o zmęczeniu i docenieniu.',
  ],
  forbiddenMediatorBehaviour: [
    'Tworzyć tabelę obowiązków w trakcie pierwszej rozmowy.',
    'Stwierdzać, że „to drobnostka”.',
    'Wchodzić w rolę nauczyciela wychowania do równości.',
    'Bagatelizować pracę zawodową jednej ze stron jako „wymówkę”.',
    'Faworyzować osobę, która „bardziej logicznie” liczy zadania.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Jak wracam do domu, wszystko znowu jest na mojej głowie.”' },
    {
      turn: 2,
      speaker: 'partner',
      summary: '„Bo ty poprawiasz wszystko po swojemu i potem mówisz, że nic nie robię.”',
    },
    { turn: 3, speaker: 'mediator', summary: 'Oddziela fakty od wzajemnych ocen.' },
    { turn: 4, speaker: 'host', summary: '„Ja jestem po prostu zmęczona.”' },
    {
      turn: 5,
      speaker: 'partner',
      summary: '„A ja mam wrażenie, że cokolwiek zrobię, to i tak będzie źle.”',
    },
    { turn: 6, speaker: 'mediator', summary: 'Pomaga nazwać zmęczenie i potrzebę docenienia.' },
  ],
  messages: [
    { speaker: 'host', text: 'Jak wracam do domu, wszystko znowu jest na mojej głowie.' },
    {
      speaker: 'partner',
      text: 'Bo ty poprawiasz wszystko po swojemu i potem mówisz, że nic nie robię.',
    },
    { speaker: 'mediator', text: 'Oddziela fakty od wzajemnych ocen.' },
    { speaker: 'host', text: 'Ja jestem po prostu zmęczona.' },
    { speaker: 'partner', text: 'A ja mam wrażenie, że cokolwiek zrobię, to i tak będzie źle.' },
    { speaker: 'mediator', text: 'Pomaga nazwać zmęczenie i potrzebę docenienia.' },
  ],
  successCriteria: [
    'Każda strona usłyszała opis wkładu drugiej bez natychmiastowej kontrataku.',
    'Pojęcie „niewidzialnej pracy” zostało nazwane lub zaakceptowane.',
    'Napięcie nie eskalowało do personalnych ataków.',
    'Para widzi problem jako wspólny system, nie tylko „lenistwo” partnera.',
  ],
};
