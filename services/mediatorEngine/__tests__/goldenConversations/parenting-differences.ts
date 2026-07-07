import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const parentingDifferencesConversation: GoldenConversation = {
  id: 'parenting-differences',
  title: 'Różnice w wychowaniu dzieci',
  description:
    'Para spiera o kary, granice, ekrany, sen dziecka — często przy drugim rodzicu. ' +
    'Prawdziwy problem: różne modele wychowania z własnych domów i lęk, że druga osoba „psuje” dziecko lub „jest za ostra”.',
  difficulty: 'high',
  tags: ['parenting', 'children', 'discipline', 'values'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
    'FUTURE_PLAN',
  ],
  expectedStrategies: [
    'validate_emotions',
    'increase_mutual_understanding',
    'prepare_agreement',
    'hold_space',
  ],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba preferująca konsekwencję i wyraźne granice',
      typicalEmotions: ['frustracja', 'lęk o dziecko', 'złość', 'niesprawiedliwość'],
    },
    partner: {
      role: 'Osoba preferująca łagodność i unikanie konfliktu z dzieckiem',
      typicalEmotions: ['wina', 'obronność', 'tęsknota za spokojem', 'irytacja'],
    },
  },
  openingSituation:
    'Po kłótni przed dzieckiem (słyszanym przez nie) para przestała rozmawiać o wychowaniu. ' +
    'Każde „nie” jednego rodzica jest podważane przez drugiego. Dziecko zaczyna grać rodziców przeciwko sobie.',
  expectedMediatorBehaviour: [
    'Skupić się na parze jako zespole rodzicielski — nie na ocenie dziecka.',
    'Pomóc nazwać wartości stojące za stylami wychowania.',
    'Nie pozwolić, by rozmowa stała się procesem przeciwko jednemu rodzicowi.',
    'Rozpoznać własne dzieciństwo jako źródło różnic.',
    'Szukać wspólnych minimum, nie jednolitej metody.',
  ],
  forbiddenMediatorBehaviour: [
    'Radzić konkretnych kar lub nagród w trakcie mediacji.',
    'Stwierdzać, że jeden styl jest „szkodliwy” bez kontekstu.',
    'Włączać dziecko do rozmowy bez przygotowania.',
    'Używać dziecka jako argumentu („widzisz, co robisz”).',
    'Moralizować o „jednolitej linii” bez zrozumienia emocji.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Zawsze go/ją ratujesz — nigdy nie ma konsekwencji.”' },
    { turn: 2, speaker: 'partner', summary: '„Bo ty krzyczysz — ja nie chcę, żeby się bał.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta: czego każde z was boi się w wychowaniu?' },
    { turn: 4, speaker: 'host', summary: 'Mówi o własnym surowym dzieciństwie i lęku o chaos.' },
    { turn: 5, speaker: 'partner', summary: 'Opisuje wstyd po krzyku własnego ojca.' },
    { turn: 6, speaker: 'mediator', summary: 'Łączy obie historie — bez wybierania metody.' },
  ],
  successCriteria: [
    'Rodzice opisali wartości (bezpieczeństwo, dyscyplina), nie tylko błędy drugiej strony.',
    'Dziecko nie zostało użyte jako broń w trakcie mediacji.',
    'Para widzi wspólny cel: dobro dziecka i spójność — nawet bez pełej zgody co do metod.',
    'Napięcie spadło — możliwa rozmowa o „minimum zasad”.',
  ],
};
