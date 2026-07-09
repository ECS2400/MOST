import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';

export const recurringArgumentsEndingConversation: EndingConversation = {
  id: 'recurring-arguments-ending',
  title: 'Powtarzające się kłótnie — domknięcie mediacji',
  description:
    'Kontynuacja konfliktu o powtarzalny cykl kłótni (naciskanie vs wycofanie). Para ustala procedurę: ' +
    'hasło stop, 20 minut przerwy, powrót i jedno zdanie o tym, co naprawdę zabolało.',
  sourceGoldenConversationId: 'recurring-arguments',
  tags: ['recurring', 'escalation', 'ending', 'pause', 'pursue-withdraw'],
  participants: {
    host: {
      role: 'Osoba eskalująca pod presją lęku przed byciem zignorowaną',
      typicalEmotions: ['frustracja', 'lęk przed ignorowaniem', 'napięcie', 'zmęczenie cyklem'],
    },
    partner: {
      role: 'Osoba wycofująca się, by nie pogorszyć sytuacji',
      typicalEmotions: ['przeciążenie', 'obronność', 'wycofanie', 'lęk przed eskalacją'],
    },
  },
  openingSituation:
    'Para jest już w trakcie mediacji. Rozmowa przeszła od powtarzalnego schematu kłótni do ' +
    'konkretnej procedury: stop, 20 minut, powrót i jedno zdanie o uruchamiającej emocji.',
  expectedEndingConcepts: [
    {
      id: 'recurring_conflict_cycle',
      label: 'Powtarzalny cykl konfliktu, nie jeden temat',
      patterns: [/cykl/i, /powtarz/i, /schemat/i, /wzor/i, /zawsze.*sam/i],
    },
    {
      id: 'pursue_withdraw_pattern',
      label: 'Wzorzec naciskanie vs wycofanie',
      patterns: [/nacisk/i, /wycof/i, /znik/i, /goni/i],
    },
    {
      id: 'escalation_pause',
      label: 'Zatrzymanie eskalacji przez pauzę',
      patterns: [/eskal/i, /pauz/i, /przerw/i, /zatrzym/i],
    },
    {
      id: 'named_stop_signal',
      label: 'Ustalone hasło lub sygnał stop',
      patterns: [/stop/i, /hasł/i, /sygnał/i],
    },
    {
      id: 'twenty_minute_break',
      label: '20 minut przerwy',
      patterns: [/20 minut/i, /dwadzieścia minut/i],
    },
    {
      id: 'return_to_conversation',
      label: 'Powrót do rozmowy po przerwie',
      patterns: [/wrac/i, /powrót/i, /wróc/i],
    },
    {
      id: 'one_hurt_sentence',
      label: 'Jedno zdanie o tym, co naprawdę zabolało',
      patterns: [/jedn[oą] (rzecz|zdan)/i, /zaboli/i, /uruchomi/i, /zdanie/i],
    },
    {
      id: 'no_disappearing_without_signal',
      label: 'Brak znikania bez słowa',
      patterns: [/bez słowa/i, /nie znik/i, /bez.*znikan/i, /nie.*uciek/i],
    },
  ],
  expectedMediatorBehaviour: [
    'Krótko podsumować: host naciska z lęku przed ignorowaniem, partner wycofuje się z lęku eskalacji.',
    'Nazwać wspólny punkt: problemem jest powtarzalny cykl, nie tylko temat kłótni.',
    'Odbić procedurę: stop, 20 minut, brak gonienia, brak znikania, jedno zdanie po powrocie.',
    'Powiedzieć, że to procedura na schemat — nie koniec kłótni.',
    'Zapytać, czy sposób jest realistyczny do przetestowania przy następnej kłótni.',
  ],
  forbiddenMediatorBehaviour: [
    'Wskazywać winnego.',
    'Stwierdzać, że problem został rozwiązany.',
    'Każeć jednej stronie po prostu się uspokoić.',
    'Ignorować wycofania partnera.',
    'Ignorować lęku hosta przed byciem zignorowaną.',
    'Dawać ogólnej rady typu „komunikujcie się spokojniej”.',
    'Proponować zbyt dużej listy zasad.',
    'Pozwalać na stop jako ucieczkę bez powrotu.',
  ],
  successCriteria: [
    'Mediator nazwał cykl konfliktu bez szukania winnego.',
    'Mediator odbił uzgodnioną procedurę pauzy i powrotu.',
    'Mediator nie udawał, że para przestanie się kłócić.',
    'Mediator zapytał o realność procedury przy następnej kłótni.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Ja widzę, że my nawet nie kłócimy się już tylko o konkretną rzecz. To zawsze kończy się tak samo: ja podnoszę głos, ty się zamykasz i potem przez pół dnia chodzimy obok siebie.',
    },
    {
      speaker: 'partner',
      text: 'Bo jak słyszę ten ton, to od razu mam wrażenie, że cokolwiek powiem, będzie dolane do ognia. Więc wolę się wyłączyć.',
    },
    {
      speaker: 'host',
      text: 'A ja jak widzę, że się wyłączasz, to czuję się jeszcze bardziej zignorowana. I wtedy cisnę mocniej, chociaż wiem, że to nie pomaga.',
    },
    {
      speaker: 'partner',
      text: 'To jest chyba ten moment, w którym oboje już nie reagujemy na temat, tylko na to, co znamy z poprzednich kłótni.',
    },
    {
      speaker: 'host',
      text: 'Tak. Ja już wchodzę w rozmowę z założeniem, że znowu będę musiała walczyć o uwagę.',
    },
    {
      speaker: 'partner',
      text: 'A ja z założeniem, że zaraz usłyszę, że jestem obojętny albo niedojrzały.',
    },
    {
      speaker: 'host',
      text: 'Nie chcę tak. Tylko w trakcie kłótni naprawdę nie umiem tego zatrzymać. Jak emocje idą w górę, to ja mam w głowie tylko: nie daj się zbyć.',
    },
    {
      speaker: 'partner',
      text: 'U mnie jest odwrotnie. Jak emocje idą w górę, to mam w głowie: nie mów nic, bo będzie gorzej.',
    },
    {
      speaker: 'host',
      text: 'Czyli nasz problem to nie tylko temat kłótni, ale ten automatyczny schemat: ja naciskam, ty znikasz.',
    },
    {
      speaker: 'partner',
      text: 'Tak. I może zanim zaczniemy rozwiązywać konkretny temat, musimy mieć sposób, jak zatrzymać ten schemat.',
    },
    {
      speaker: 'host',
      text: 'Może hasło stop. Ale nie takie, że ktoś ucieka z rozmowy na cały dzień.',
    },
    {
      speaker: 'partner',
      text: 'Dla mnie stop ma sens, jeśli wiadomo, kiedy wracamy. Na przykład 20 minut przerwy i potem jedno zdanie: co mnie naprawdę zabolało.',
    },
    {
      speaker: 'host',
      text: 'To mogę przyjąć. I ja wtedy nie idę za tobą z kolejnymi argumentami, tylko daję te 20 minut.',
    },
    {
      speaker: 'partner',
      text: 'A ja nie znikam bez słowa. Mówię stop, wrócę za 20 minut, i potem mówię jedną rzecz, która mnie naprawdę uruchomiła.',
    },
  ],
};
