import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export const workOverFamilyConversation: GoldenConversation = {
  id: 'work-over-family',
  title: 'Praca kosztem rodziny',
  description:
    'Jedna osoba pracuje bardzo dużo — nadgodziny, mail po godzinach, delegacje. ' +
    'Prawdziwy problem: różne definicje „zabezpieczenia rodziny” vs „obecności” oraz poczucie niewidzialności wkładu.',
  difficulty: 'medium',
  tags: ['work-life-balance', 'absence', 'provider-role', 'resentment'],
  expectedGoalPath: [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
    'AGREEMENT',
  ],
  expectedStrategies: [
    'validate_emotions',
    'hold_space',
    'increase_mutual_understanding',
  ],
  expectedReplayGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
  expectedReplayStrategies: ['build_safety', 'validate_emotions'],
  safetyExpectation: 'none',
  participants: {
    host: {
      role: 'Osoba zostająca z dziećmi i domem, czująca się samotna',
      typicalEmotions: ['samotność', 'złość', 'przeciążenie', 'niedocenienie'],
    },
    partner: {
      role: 'Osoba pracująca intensywnie, czująca presję finansową i zawodową',
      typicalEmotions: ['presja', 'wina', 'obronność', 'zmęczenie'],
    },
  },
  openingSituation:
    'Partner wrócił(a) po kolejnej delegacji w piątek wieczorem. Dzieci już spały. Host powiedział(a): ' +
    '„Znowu nas nie było” — partner odpowiedział(a): „Robię to dla was”. Od tygodnia chłód.',
  expectedMediatorBehaviour: [
    'Uznać obie narracje: zabezpieczenie finansowe i potrzeba obecności.',
    'Nie moralizować o „workoholizmie” w pierwszej kolejności.',
    'Pomóc opisać koszt emocjonalny absencji.',
    'Nie faworyzować „pracującego” jako bohatera ani „zostającego” jako ofiary.',
    'Szukać języka o wyborach, nie o winie.',
  ],
  forbiddenMediatorBehaviour: [
    'Radzić natychmiastowej zmiany pracy.',
    'Bagatelizować samotność jako „drobny kaprys”.',
    'Stwierdzać, że pieniądze rozwiążą problem relacji.',
    'Oskarżać partnera o egoizm lub hosta o niewdzięczność.',
    'Ignorować realnej presji ekonomicznej.',
  ],
  conversationOutline: [
    { turn: 1, speaker: 'host', summary: '„Wychowuję dzieci sama — ty jesteś tylko gościem.”' },
    { turn: 2, speaker: 'partner', summary: '„Bez mojej pracy nie mielibyście tego mieszkania.”' },
    { turn: 3, speaker: 'mediator', summary: 'Pyta: co każde z was daje rodzinie — i czego brakuje?' },
    { turn: 4, speaker: 'host', summary: 'Opisuje codzienność bez wsparcia — głos się załamuje.' },
    { turn: 5, speaker: 'partner', summary: 'Mówi o lęku przed utratą pracy i statusu.' },
    { turn: 6, speaker: 'mediator', summary: 'Odbija oba wkłady bez hierarchii „ważniejszy”. ' },
  ],
  successCriteria: [
    'Obie strony opisały, co dają rodzinie i czego im brakuje.',
    'Pojęcie „obecność” i „bezpieczeństwo finansowe” zostało rozdzielone.',
    'Brak eskalacji do „ja vs ty” bez końca.',
    'Para widzi potrzebę rozmowy o granicach pracy — nawet bez gotowego planu.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Mam wrażenie, że twoja praca zawsze wygrywa z nami. Nawet kiedy jesteś w domu, i tak odbierasz telefony albo odpisujesz na wiadomości.',
    },
    {
      speaker: 'partner',
      text: 'Nie robię tego dlatego, że nie chcę być z wami. Po prostu boję się, że jak odpuszczę, to wszystko zacznie się sypać w pracy.',
    },
    {
      speaker: 'host',
      text: 'Rozumiem, że masz presję, ale ja też zaczynam czuć, że jesteśmy tylko dodatkiem do twojego grafiku.',
    },
    {
      speaker: 'partner',
      text: 'To boli, kiedy tak mówisz, bo mam poczucie, że właśnie dla was tyle pracuję. Tylko chyba nie widzę, kiedy przekraczam granicę.',
    },
    {
      speaker: 'host',
      text: 'Nie potrzebuję, żebyś zarabiał więcej kosztem wszystkiego. Potrzebuję czuć, że czas z nami też jest dla ciebie ważny.',
    },
    {
      speaker: 'partner',
      text: 'Masz rację, że nie wystarczy mówić, że robię to dla rodziny, jeśli potem tej rodziny przy mnie nie ma. Chcę to poukładać inaczej.',
    },
  ],
};
