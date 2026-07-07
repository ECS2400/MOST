import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const futurePlanningConversation: GoldenConversation = {
  id: 'future-planning',
  title: 'Planowanie przyszłości',
  description:
    'Para ma różne wizje przyszłości — dzieci, kariera, miejsce zamieszania, małżeństwo. ' +
    'Prawdziwy problem: lęk, że cele się rozjadą i związek nie ma wspólnego kierunku.',
  difficulty: 'high',
  tags: ['future', 'life-goals', 'alignment', 'commitment'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
    'FUTURE_PLAN',
  ],
  expectedStrategies: [
    'validate_emotions',
    'hold_space',
    'increase_mutual_understanding',
    'prepare_agreement',
  ],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba chcąca ustalić wspólny plan (np. dzieci, dom)',
      typicalEmotions: ['lęk', 'tęsknota za stabilnością', 'presja czasu', 'frustracja'],
    },
    partner: {
      role: 'Osoba unikająca „wielkich rozmów” o przyszłości',
      typicalEmotions: ['przeciążenie', 'lęk przed zobowiązaniem', 'obronność', 'niepewność'],
    },
  },
  openingSituation:
    'Znajomi ogłaszają ciążę / ślub. Host chce „wiedzieć, dokąd idziemy”. Partner mówi: „Jeszcze nie teraz”. ' +
    'Para boi się, że marnuje czas — lub że zostanie do czegoś zmuszona.',
  expectedMediatorBehaviour: [
    'Nie wymuszać harmonogramu życiowego.',
    'Pomóc każdej stronie opisać wizję bez ataku.',
    'Rozpoznać różne tempo decyzji życiowych.',
    'Szukać wspólnych wartości pod konkretnymi planami.',
    'Nie straszyć rozstaniem przy braku zgody.',
  ],
  forbiddenMediatorBehaviour: [
    'Stwierdzać, że „albo plan, albo koniec”.',
    'Bagatelizować potrzebę jasności jako „pośpiech”.',
    'Nakazywać decyzji o dzieciach lub ślubie w sesji.',
    'Porównywać do innych par („wszyscy już mają”).',
    'Faworyzować osoby „bardziej dojrzałej” wizją.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Nie wiem, czy chcesz ze mną tej samej przyszłości.”' },
    { turn: 2, speaker: 'partner', summary: '„Naciskasz mnie — im bardziej pytasz, tym bardziej uciekam.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta o wartości: co każde chce od życia za 5 lat — bez planu operacyjnego.' },
    { turn: 4, speaker: 'host', summary: 'Mówi o rodzinie i poczuciu bezpieczeństwa.' },
    { turn: 5, speaker: 'partner', summary: 'Opisuje lęk przed utratą swobody i presji.' },
    { turn: 6, speaker: 'mediator', summary: 'Szuka wspólnego jądra wartości — nie jednego kalendarza.' },
  ],
  successCriteria: [
    'Obie wizje przyszłości zostały opisane bez werdyktu „kto ma rację”.',
    'Para rozumie różnicę tempa decyzji — nie tylko „chce vs nie chce”.',
    'Brak wymuszonej obietnicy ślubu/dzieci w tej sesji.',
    'Ustalono kierunek dalszej rozmowy o wartościach, nie tylko o deadline.',
  ],
};
