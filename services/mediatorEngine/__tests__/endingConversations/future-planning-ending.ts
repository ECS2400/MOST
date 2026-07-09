import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';

export const futurePlanningEndingConversation: EndingConversation = {
  id: 'future-planning-ending',
  title: 'Planowanie przyszłości — domknięcie mediacji',
  description:
    'Kontynuacja konfliktu o przyszłość (mieszkanie, dziecko, pieniądze). Para nazwała emocje i ' +
    'zbliża się do konkretnego mikro-kroku: jeden temat, jeden wieczór tygodniowo, prawo do pauzy.',
  sourceGoldenConversationId: 'future-planning',
  tags: ['future', 'life-goals', 'ending', 'micro-step', 'planning-pressure'],
  participants: {
    host: {
      role: 'Osoba potrzebująca poczucia, że przyszłość nie jest tylko na niej',
      typicalEmotions: ['lęk', 'panika', 'potrzeba konkretu', 'zmęczenie'],
    },
    partner: {
      role: 'Osoba bojąca się obietnic i presji planowania',
      typicalEmotions: ['lęk przed zawiedzeniem', 'przeciążenie', 'obronność', 'niepewność'],
    },
  },
  openingSituation:
    'Para jest już w trakcie mediacji. Emocje zostały nazwane; rozmowa przeszła od ogólnych obaw ' +
    'do propozycji jednego tematu (mieszkanie i pieniądze) oraz jednego wieczoru tygodniowo.',
  expectedEndingConcepts: [
    {
      id: 'shared_future_anxiety',
      label: 'Wspólny lęk o przyszłość i rozmywanie ustaleń',
      patterns: [/przyszło/i, /niepewn/i, /rozmyj/i, /rok/i],
    },
    {
      id: 'planning_pressure',
      label: 'Presja planowania i odczucie wyroku',
      patterns: [/presj/i, /plan/i, /wyrok/i, /konkret/i],
    },
    {
      id: 'fear_of_disappointing',
      label: 'Lęk przed niedowiezieniem obietnic',
      patterns: [/zawodzi/i, /obietnic/i, /dowieź/i, /dowiez/i],
    },
    {
      id: 'one_small_step',
      label: 'Jeden mały krok zamiast wielkiego planu',
      patterns: [/mał[yą] krok/i, /jeden krok/i, /pierwsz[yą] (mał[yą] )?krok/i, /mały krok/i],
    },
    {
      id: 'one_topic_at_a_time',
      label: 'Jeden temat naraz',
      patterns: [/jeden temat/i, /jednego tematu/i, /naraz/i],
    },
    {
      id: 'weekly_conversation',
      label: 'Jedna rozmowa tygodniowo',
      patterns: [/tygodni/i, /wieczór/i, /raz w tygodniu/i],
    },
    {
      id: 'permission_to_pause',
      label: 'Prawo do powiedzenia stop przy presji',
      patterns: [/stop/i, /pauz/i, /przerw/i, /presj/i],
    },
    {
      id: 'return_to_topic',
      label: 'Powrót do tematu po pauzie',
      patterns: [/wrac/i, /następn/i, /kolejn/i, /termin/i],
    },
  ],
  expectedMediatorBehaviour: [
    'Krótko podsumować emocje i potrzeby obu stron.',
    'Nazwać wspólny punkt: oboje chcą przyszłości, inaczej reagują na niepewność.',
    'Odbić uzgodniony mikro-krok (jeden temat, jeden wieczór tygodniowo, stop + powrót).',
    'Powiedzieć, że to pierwszy mały krok — nie pełne rozwiązanie.',
    'Zapytać, czy taki krok jest dla obojga wystarczająco bezpieczny na teraz.',
  ],
  forbiddenMediatorBehaviour: [
    'Wskazywać jednej osobie winy.',
    'Stwierdzać, że para osiągnęła pełne porozumienie lub że problem jest rozwiązany.',
    'Dawać długą listę porad.',
    'Proponować terapii jako jedynego rozwiązania.',
    'Używać tonu moralizującego.',
    'Ignorować lęku partnera przed obietnicami.',
    'Ignorować potrzeby hosta dotyczącej bezpieczeństwa i konkretu.',
  ],
  successCriteria: [
    'Mediator podsumował obie perspektywy bez wskazywania winnego.',
    'Mediator odbił mikro-krok uzgodniony przez parę.',
    'Mediator nie udawał pełnego rozwiązania konfliktu.',
    'Mediator zapytał o zgodę na następny krok lub bezpieczeństwo propozycji.',
  ],
  messages: [
    {
      speaker: 'host',
      text: 'Ja chyba najbardziej się boję, że za rok znowu będziemy w tym samym miejscu. Będziemy mówić, że coś ustalimy, a potem życie pójdzie swoim tempem i wszystko się rozmyje.',
    },
    {
      speaker: 'partner',
      text: 'Ja to rozumiem, tylko jak słyszę \'ustalmy konkrety\', to od razu mam wrażenie, że mam podpisać coś, czego nie będę w stanie dowieźć.',
    },
    {
      speaker: 'host',
      text: 'Nie chcę od ciebie podpisu pod całym życiem. Chcę wiedzieć, że nie jestem jedyną osobą, która patrzy dalej niż do następnej wypłaty.',
    },
    {
      speaker: 'partner',
      text: 'Ja patrzę dalej. Tylko może inaczej. Dla mnie najpierw ważne jest, żebyśmy nie dokładali sobie kolejnego stresu, jeśli już teraz ledwo ogarniamy pracę, pieniądze i dom.',
    },
    {
      speaker: 'host',
      text: 'To powiedz mi to tak, a nie uciekaj z rozmowy. Jak milczysz, ja sobie dopowiadam, że po prostu nie chcesz tej przyszłości ze mną.',
    },
    {
      speaker: 'partner',
      text: 'Nie uciekam dlatego, że nie chcę. Uciekam, bo boję się, że znowu wyjdę na kogoś, kto cię zawodzi.',
    },
    {
      speaker: 'host',
      text: 'Dobra, to może ja też za szybko wchodzę w tryb planowania. Bo wtedy czuję się bezpieczniej. Jak mam jakiś plan, to mniej panikuję.',
    },
    {
      speaker: 'partner',
      text: 'A ja jak słyszę duży plan, to panikuję bardziej. Może dlatego ciągle mijamy się w tej rozmowie.',
    },
    {
      speaker: 'host',
      text: 'Czyli ty potrzebujesz, żeby to nie było od razu wszystko naraz, a ja potrzebuję widzieć, że coś jednak rusza.',
    },
    {
      speaker: 'partner',
      text: 'Tak. Ja mogę się zgodzić na mały krok, tylko nie na rozmowę, która kończy się listą dziesięciu rzeczy do naprawienia.',
    },
    {
      speaker: 'host',
      text: 'To może jeden temat. Na przykład mieszkanie i pieniądze. Bez dziecka, bez całej przyszłości, tylko co realnie możemy zrobić w tym miesiącu.',
    },
    {
      speaker: 'partner',
      text: 'To jest dla mnie do przyjęcia. Jeśli to będzie jedna rozmowa i jeden konkretny krok, a nie przesłuchanie.',
    },
    {
      speaker: 'host',
      text: 'Ja mogę spróbować nie naciskać na odpowiedź od razu. Ale potrzebuję, żebyś nie znikał z tematu na tydzień.',
    },
    {
      speaker: 'partner',
      text: 'Okej. To możemy ustalić jeden wieczór w tygodniu na spokojną rozmowę o przyszłości. I jeśli któreś z nas czuje presję, mówimy stop, ale wracamy do tematu następnego dnia.',
    },
  ],
};
