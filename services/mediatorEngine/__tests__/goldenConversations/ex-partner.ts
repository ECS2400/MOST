import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const exPartnerConversation: GoldenConversation = {
  id: 'ex-partner',
  title: 'Były partner',
  description:
    'Kontakt z byłym/byłą partnerem — wspólne dziecko, sprawy formalne lub pozostająca przyjaźń. ' +
    'Prawdziwy problem: granice między przeszłością a teraźniejszością oraz lęk obecnego partnera o stabilność związku.',
  difficulty: 'medium',
  tags: ['ex-partner', 'trust', 'co-parenting', 'boundaries'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
  ],
  expectedStrategies: [
    'validate_emotions',
    'build_safety',
    'increase_mutual_understanding',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba w kontakcie z byłym partnerem (np. wspólne dziecko)',
      typicalEmotions: ['obowiązek', 'frustracja', 'wina', 'zmęczenie'],
    },
    partner: {
      role: 'Osoba obecna w związku, czująca się zagrożona kontaktem',
      typicalEmotions: ['lęk', 'zazdrość', 'niesprawiedliwość', 'brak zaufania'],
    },
  },
  openingSituation:
    'Były partner napisał o zmianie terminu odbioru dziecka. Obecny partner zobaczył powiadomienie i oskarżył o „za częsty kontakt”. ' +
    'Para unika tematu, ale napięcie rośnie przy każdym dzwonku lub wiadomości.',
  expectedMediatorBehaviour: [
    'Rozróżnić kontakt logistyczny od emocjonalnego bez zakładania intencji.',
    'Pomóc obecnemu partnerowi nazwać lęk bez oskarżeń.',
    'Uznać prawo do współrodzicielstwa / spraw formalnych.',
    'Szukać przejrzystości i ustaleń, nie zakazu kontaktu.',
    'Nie brać strony „dziecko vs związek”.',
  ],
  forbiddenMediatorBehaviour: [
    'Sugerować całkowite zerwanie kontaktu z byłym partnerem bez kontekstu prawnego.',
    'Bagatelizować obawy obecnego partnera jako „infantylne”.',
    'Wchodzić w szczegóły przeszłego związku.',
    'Oskarżać hosta o „podtrzymywanie płomienia”.',
    'Wymuszać natychmiastowe „zaufanie” bez rozmowy o granicach.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'partner', summary: '„Znowu pisze — wiem, że coś knujecie.”' },
    { turn: 2, speaker: 'host', summary: '„To tylko o odbiór syna w piątek, nic więcej.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta partnera: co najbardziej niepokoi w tych kontaktach?' },
    { turn: 4, speaker: 'partner', summary: 'Przyznaje lęk przed powrotem przeszłości.' },
    { turn: 5, speaker: 'host', summary: 'Mówi o zmęczeniu byciem między dwoma frontami.' },
    { turn: 6, speaker: 'mediator', summary: 'Proponuje ramę: przejrzystość vs zaufanie — bez rozstrzygania.' },
  ],
  successCriteria: [
    'Lęk obecnego partnera został usłyszany bez stygmatyzacji.',
    'Host opisał realną funkcję kontaktu (logistyka, dziecko).',
    'Para ma język do ustaleń o informowaniu / granicach.',
    'Brak ultimatum ani „wybierz mnie albo dziecko”.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Za każdym razem, kiedy dowiaduję się, że znowu rozmawiałaś ze swoim byłym, wraca ten sam niepokój. Nie chodzi o sam kontakt, tylko o to, że dowiaduję się o nim przypadkiem.',
    },
    {
      speaker: 'partner',
      text: 'Nie ukrywam tego specjalnie. Czasami po prostu nie wydaje mi się to na tyle ważne, żeby o każdej wiadomości opowiadać.',
    },
    {
      speaker: 'host',
      text: 'Ale właśnie przez to zaczynam się zastanawiać, czego jeszcze nie wiem. Wtedy trudno mi zachować spokój.',
    },
    {
      speaker: 'partner',
      text: 'A ja mam wrażenie, że cokolwiek zrobię, i tak będę podejrzana. To sprawia, że jeszcze mniej mam ochotę o tym rozmawiać.',
    },
    {
      speaker: 'host',
      text: 'Nie chcę cię przesłuchiwać. Chciałbym po prostu mieć poczucie, że jesteśmy wobec siebie otwarci.',
    },
    {
      speaker: 'partner',
      text: 'Rozumiem. Mogę mówić o takich kontaktach wcześniej, ale potrzebuję też czuć, że nie zostanę od razu oceniona.',
    },
  ],
};
