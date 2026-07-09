import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';

export const brokenPromisesEndingConversation: EndingConversation = {
  id: 'broken-promises-ending',
  title: 'Niezrealizowane obietnice — domknięcie mediacji',
  description:
    'Kontynuacja konfliktu o złamane obietnice i erozję zaufania. Para zbliża się do jednego ' +
    'sprawdzalnego kroku: rachunki w tym miesiącu, potwierdzenie bez przypominania, wczesna komunikacja o problemach.',
  sourceGoldenConversationId: 'broken-promises',
  tags: ['trust', 'promises', 'ending', 'micro-step', 'accountability'],
  participants: {
    host: {
      role: 'Osoba rozczarowana utratą zaufania i zmęczona rolą przypominającej',
      typicalEmotions: ['rozczarowanie', 'zmęczenie', 'brak zaufania', 'potrzeba konkretu'],
    },
    partner: {
      role: 'Osoba bojąca się kolejnej porażki i presji wielkich obietnic',
      typicalEmotions: ['wstyd', 'lęk przed zawiedzeniem', 'obronność', 'przytłoczenie'],
    },
  },
  openingSituation:
    'Para jest już w trakcie mediacji. Rozmowa przeszła od utraty zaufania do jednej konkretnej ' +
    'rzeczy na ten tydzień: rachunki, potwierdzenie po zapłacie i wczesna informacja o problemach.',
  expectedEndingConcepts: [
    {
      id: 'broken_trust',
      label: 'Utrata zaufania i trudność w wierzeniu obietnicom',
      patterns: [/zaufan/i, /wiar/i, /utrat/i, /rozwal/i, /nie.*wierz/i],
    },
    {
      id: 'fear_of_disappointing_again',
      label: 'Lęk przed ponownym zawiedzeniem i rolą listy porażek',
      patterns: [/zawod/i, /porażk/i, /znowu/i, /boj.*zaw/i],
    },
    {
      id: 'responsibility_without_shame',
      label: 'Odpowiedzialność bez zawstydzania',
      patterns: [/odpowiedzialn/i, /bez.*wstyd/i, /nie.*dobij/i],
    },
    {
      id: 'one_specific_task',
      label: 'Jedna konkretna rzecz zamiast wielkiego planu naprawy',
      patterns: [/jeden konkret/i, /jedn[aą] rzecz/i, /mały krok/i, /jedno zadanie/i],
    },
    {
      id: 'bills_this_month',
      label: 'Rachunki w tym miesiącu',
      patterns: [/rachunk/i, /miesi[aą]c/i],
    },
    {
      id: 'confirmation_without_reminder',
      label: 'Potwierdzenie bez czekania na przypomnienie',
      patterns: [/potwierdz/i, /bez.*przypomin/i, /sam.*potwierdz/i],
    },
    {
      id: 'communicate_before_failure',
      label: 'Komunikacja wcześniej, nie po fakcie',
      patterns: [/wcześniej/i, /nie po fakcie/i, /zanim.*wybuch/i, /opóźn/i],
    },
    {
      id: 'trust_rebuilt_by_consistency',
      label: 'Zaufanie odbudowane powtarzalnością, nie jedną rozmową',
      patterns: [/powtarzaln/i, /spójno/i, /konsekwenc/i, /mał[eą]mi/i, /test.*spójno/i, /dowiez/i],
    },
  ],
  expectedMediatorBehaviour: [
    'Krótko podsumować: host potrzebuje powtarzalnej odpowiedzialności, partner boi się kolejnej porażki.',
    'Nazwać wspólny punkt: zaufanie wraca małymi dowiezionymi rzeczami, nie jedną rozmową.',
    'Odbić mikro-krok: rachunki, termin, potwierdzenie, wczesna komunikacja o problemach.',
    'Powiedzieć, że to pierwszy test spójności — nie odbudowane zaufanie.',
    'Zapytać, czy krok jest jasny i bezpieczny dla obojga na teraz.',
  ],
  forbiddenMediatorBehaviour: [
    'Zawstydzać partnera lub wskazywać winy.',
    'Mówić hostowi, że ma po prostu zaufać.',
    'Stwierdzać, że problem został rozwiązany lub zaufanie odbudowane.',
    'Wymuszać przeprosin.',
    'Dawać ogólną radę typu „musicie lepiej się komunikować”.',
    'Proponować dużej listy napraw.',
    'Ignorować ciężaru osoby, która musiała przypominać i kontrolować.',
    'Ignorować lęku partnera przed kolejną porażką.',
  ],
  successCriteria: [
    'Mediator nazwał utratę zaufania bez moralizowania.',
    'Mediator odbił jeden sprawdzalny krok uzgodniony przez parę.',
    'Mediator nie udawał pełnej odbudowy zaufania.',
    'Mediator zapytał o jasność i bezpieczeństwo kroku dla obojga.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Ja nie oczekuję, że dzisiaj wszystko naprawisz. Ale kiedy słyszę kolejne \'będzie inaczej\', to już nie wiem, czy mam w to wierzyć.',
    },
    {
      speaker: 'partner',
      text: 'Wiem. I chyba dlatego czasem wolę nic nie obiecywać, bo boję się, że znowu cię zawiodę.',
    },
    {
      speaker: 'host',
      text: 'Tylko że jak nic nie mówisz, to ja mam wrażenie, że ty nawet nie widzisz, ile razy ja musiałam potem sama ogarniać konsekwencje.',
    },
    {
      speaker: 'partner',
      text: 'Widzę. Może za późno, ale widzę. Tylko jak zaczynamy o tym rozmawiać, to od razu czuję się jak ktoś, kto ma tylko listę porażek.',
    },
    {
      speaker: 'host',
      text: 'Ja nie chcę cię dobijać. Ja chcę przestać żyć w takim trybie, że wszystko muszę sprawdzać i przypominać, bo inaczej znowu coś spadnie na mnie.',
    },
    {
      speaker: 'partner',
      text: 'To jest fair. Ja też nie chcę, żebyś była moim kalendarzem i kontrolerem. Tylko nie wiem, jak mam odbudować zaufanie, skoro każde potknięcie potwierdza najgorszy scenariusz.',
    },
    {
      speaker: 'host',
      text: 'Może nie przez wielkie obietnice. Może przez jedną rzecz, którą naprawdę dowieziesz bez mojego przypominania.',
    },
    {
      speaker: 'partner',
      text: 'To brzmi mniej strasznie. Jedna rzecz jest do zrobienia. Gorzej, jak mam od razu naprawić całe ostatnie pół roku.',
    },
    {
      speaker: 'host',
      text: 'To wybierzmy coś konkretnego. Na przykład rachunki w tym miesiącu. Ty bierzesz termin, przypomnienie i potwierdzenie, że zapłacone.',
    },
    {
      speaker: 'partner',
      text: 'Mogę to wziąć. I mogę ci sam wysłać potwierdzenie, bez czekania aż zapytasz.',
    },
    {
      speaker: 'host',
      text: 'Dla mnie ważne jest też, żeby jak czegoś nie dasz rady zrobić, powiedzieć mi wcześniej, a nie po fakcie.',
    },
    {
      speaker: 'partner',
      text: 'Tak. Mogę powiedzieć wcześniej, nawet jeśli to będzie dla mnie niewygodne. Bo chyba to ukrywanie najbardziej rozwala zaufanie.',
    },
    {
      speaker: 'host',
      text: 'Dokładnie. Ja nie potrzebuję ideału. Potrzebuję widzieć, że bierzesz odpowiedzialność zanim wszystko wybuchnie.',
    },
    {
      speaker: 'partner',
      text: 'Okej. To na ten tydzień: rachunki są po mojej stronie, potwierdzam po zapłacie, a jeśli coś się wysypie, mówię wcześniej, nie po fakcie.',
    },
  ],
};
