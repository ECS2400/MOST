import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const sexIntimacyConversation: GoldenConversation = {
  id: 'sex-intimacy',
  title: 'Seks i intymność',
  description:
    'Różnica w potrzebie bliskości fizycznej — jedna osoba chce więcej, druga mniej lub inaczej. ' +
    'Prawdziwy problem: wstyd, poczucie odrzucenia lub presji oraz brak bezpiecznego języka o potrzebach intymnych.',
  difficulty: 'high',
  tags: ['intimacy', 'sex', 'rejection', 'vulnerability'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
  ],
  expectedStrategies: [
    'validate_emotions',
    'hold_space',
    'deepen_emotions',
    'build_safety',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba czująca się odrzucana lub ignorowana w sferze intymnej',
      typicalEmotions: ['smutek', 'wstyd', 'złość', 'poczucie nieatrakcyjności'],
    },
    partner: {
      role: 'Osoba odczuwająca presję lub zmęczenie w sferze seksualnej',
      typicalEmotions: ['presja', 'wina', 'dyskomfort', 'obronność'],
    },
  },
  openingSituation:
    'Para nie współżyła od kilku tygodni. Ostatnia próba rozmowy skończyła się kłótną — jedna strona czuła się „używana”, ' +
    'druga „odpychana”. Oboje unikają tematu, ale napięcie wpływa na codzienne gesty.',
  expectedMediatorBehaviour: [
    'Utrzymać szacunek i dyskrecję — temat wymaga delikatności.',
    'Oddzielić potrzebę bliskości od „obowiązku seksualnego”.',
    'Nie diagnozować ani nie moralizować o „normach” w związku.',
    'Pomóc nazwać uczucia bez wulgarnych lub poniżających sformułowań.',
    'Nie forsować szczegółów — pozwolić parze określić granice rozmowy.',
  ],
  forbiddenMediatorBehaviour: [
    'Radzić konkretnych praktyk seksualnych.',
    'Stwierdzać, że „zdrowa para powinna…” z częstotliwością.',
    'Bagatelizować odrzucenie jako „przesadę”.',
    'Oskarżać jedną stronę o chłód lub drugą o natrętność.',
    'Udawać eksperta terapeuty seksualnego.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Czuję, że już ci na mnie nie zależy.”' },
    { turn: 2, speaker: 'partner', summary: '„Bo ciągle naciskasz — to mnie odpycha.”' },
    { turn: 3, speaker: 'mediator', summary: 'Normalizuje trudność tematu; pyta o bezpieczne słowo na „bliskość”.' },
    { turn: 4, speaker: 'host', summary: 'Mówi o samotności, nie tylko o seksie.' },
    { turn: 5, speaker: 'partner', summary: 'Opisuje presję i zmęczenie — ton defensywny.' },
    { turn: 6, speaker: 'mediator', summary: 'Odbija: potrzeba bliskości vs potrzeba przestrzeni.' },
  ],
  successCriteria: [
    'Para rozmawia o intymności bez wulgarnego ataku lub wstydu paraliżującego rozmowę.',
    'Odrzucenie i presja zostały nazwane jako doświadczenia, nie werdykty.',
    'Ustalono, że temat wymaga dalszej pracy — bez wymuszonego „rozwiązania” dziś.',
    'Obie strony czują, że mediator nie ocenia ich ciała ani libido.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Od dłuższego czasu mam wrażenie, że między nami zniknęła bliskość. Kiedy próbuję zrobić pierwszy krok, często się wycofujesz i zaczynam się zastanawiać, czy jeszcze ci na mnie zależy.',
    },
    {
      speaker: 'partner',
      text: 'To nie jest tak, że mi nie zależy. Kiedy czuję presję, jeszcze bardziej się zamykam i potem oboje tylko się od siebie oddalamy.',
    },
    {
      speaker: 'host',
      text: 'Najtrudniejsze jest to, że nie wiem, co się dzieje. W mojej głowie od razu pojawia się myśl, że przestałaś mnie pragnąć.',
    },
    {
      speaker: 'partner',
      text: 'Ja z kolei mam poczucie, że każda czułość kończy się oczekiwaniem czegoś więcej. Przez to zaczynam unikać nawet zwykłego przytulenia.',
    },
    {
      speaker: 'host',
      text: 'Nie chciałem, żebyś tak to odbierała. Bardziej niż samego seksu brakuje mi poczucia, że jesteśmy blisko siebie.',
    },
    {
      speaker: 'partner',
      text: 'To dobrze usłyszeć. Chciałabym, żebyśmy potrafili odbudować tę bliskość bez poczucia presji z którejkolwiek strony.',
    },
  ],
};
