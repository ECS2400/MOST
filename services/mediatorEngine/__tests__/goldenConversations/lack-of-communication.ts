import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const lackOfCommunicationConversation: GoldenConversation = {
  id: 'lack-of-communication',
  title: 'Brak komunikacji',
  description:
    'Para żyje obok siebie — rozmowy sprowadzają się do logistyki. ' +
    'Prawdziwy problem: narastająca samotność w związku i brak poczucia, że druga osoba jest naprawdę obecna.',
  difficulty: 'medium',
  tags: ['communication', 'distance', 'loneliness', 'withdrawal'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING'],
  expectedStrategies: ['validate_emotions', 'hold_space', 'deepen_emotions'],
  expectedReplayStrategies: ['validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba starająca się inicjować rozmowy i czująca się odrzucana',
      typicalEmotions: ['samotność', 'smutek', 'frustracja', 'rezygnacja'],
    },
    partner: {
      role: 'Osoba wycofująca się po pracy i unikająca „głębokich” rozmów',
      typicalEmotions: ['zmęczenie', 'przeciążenie', 'bezradność', 'irytacja'],
    },
  },
  openingSituation:
    'Para nie rozmawiała „o nas” od miesięcy. Wieczory mijają przy telefonach i serialu. ' +
    'Host zaproponował(a) mediację po kolejnym wieczorze, gdy partner odpowiedział jednym słowem i wyszedł z pokoju.',
  expectedMediatorBehaviour: [
    'Nie moralizować („musicie rozmawiać więcej”).',
    'Zbadać, co każda strona potrzebuje od rozmowy — nie tylko co robi źle.',
    'Uznać, że wycofanie może być strategią ochronną, nie „lenistwem”.',
    'Zadawać konkretne, łatwe pytania zamiast abstrakcyjnych.',
    'Budować most między potrzebą bliskości a potrzebą odpoczynku.',
  ],
  forbiddenMediatorBehaviour: [
    'Porównywać parę do „zdrowych” związków z poradników.',
    'Wymuszać natychmiastową szczerość lub wyznanie uczuć.',
    'Obwiniać jedną stronę za „zimność” lub drugą za „nachalność”.',
    'Proponować gotowe schematy komunikacji bez zrozumienia kontekstu.',
    'Ignorować sygnały wyczerpania lub przeciążenia.',
  ],
  conversationOutline: [
    {
      turn: 1,
      speaker: 'host',
      summary: '„Kiedy próbuję z tobą rozmawiać, mam wrażenie, że rozmawiam ze ścianą.”',
    },
    { turn: 2, speaker: 'partner', summary: '„Bo każda taka rozmowa kończy się awanturą.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta, co sprawia, że rozmowa tak szybko się zamyka.' },
    { turn: 4, speaker: 'host', summary: '„Ja chcę tylko wiedzieć, co czujesz.”' },
    { turn: 5, speaker: 'partner', summary: '„A ja czasem sam tego nie umiem nazwać.”' },
    {
      turn: 6,
      speaker: 'mediator',
      summary:
        'Pokazuje, że milczenie i nacisk są próbami poradzenia sobie z trudnymi emocjami.',
    },
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Kiedy próbuję z tobą rozmawiać, mam wrażenie, że rozmawiam ze ścianą.',
    },
    { speaker: 'partner', text: 'Bo każda taka rozmowa kończy się awanturą.' },
    { speaker: 'mediator', text: 'Pyta, co sprawia, że rozmowa tak szybko się zamyka.' },
    { speaker: 'host', text: 'Ja chcę tylko wiedzieć, co czujesz.' },
    { speaker: 'partner', text: 'A ja czasem sam tego nie umiem nazwać.' },
    {
      speaker: 'mediator',
      text: 'Pokazuje, że milczenie i nacisk są próbami poradzenia sobie z trudnymi emocjami.',
    },
  ],
  successCriteria: [
    'Obie strony opisały, czego brakuje im w komunikacji — własnymi słowami.',
    'Pojawiło się zrozumienie, że milczenie i nacisk mają swoją logikę.',
    'Para nie wyszła z poczuciem winy, tylko z lepszym obrazem problemu.',
    'Ustalono chociaż jeden mały, realistyczny krok (np. 10 minut bez telefonu).',
  ],
};
