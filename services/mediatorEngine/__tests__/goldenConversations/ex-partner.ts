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
};
