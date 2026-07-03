import type { ClosureBundle } from './types';

export const CLOSURE_PL: ClosureBundle = {
  survey: [
    { id: 'talkQuality', prompt: 'Jak oceniasz tę rozmowę?', options: ['Słabo', 'Przeciętnie', 'Dobrze', 'Bardzo dobrze'] },
    { id: 'heard', prompt: 'Czy czujesz, że zostałeś/aś wysłuchany/a?', options: ['Tak', 'Częściowo', 'Nie', 'Trudno powiedzieć'] },
    { id: 'ready', prompt: 'Czy jesteś gotowy/a na kolejny krok w relacji?', options: ['Tak', 'Jeszcze nie', 'Nie wiem'] },
    {
      id: 'hardest',
      prompt: 'Co było najtrudniejsze?',
      options: ['Opisanie emocji', 'Zrozumienie drugiej strony', 'Spokojna rozmowa', 'Znalezienie rozwiązania', 'Coś innego'],
    },
    { id: 'closer', prompt: 'Po tej rozmowie czujesz się bliżej partnera?', options: ['Tak', 'Trochę', 'Nie', 'Za wcześnie żeby ocenić'] },
  ],
  dateIdeaDefault: {
    title: 'Spacer z jednym pytaniem',
    description:
      'Wyjdźcie na 30–40 minut spaceru. Zasada: jedno pytanie na raz, bez przerywania. Pierwsze: „Co dziś było dla Ciebie najważniejsze w naszej rozmowie?” Drugie: „Czego od nas teraz potrzebujesz?” Trzecie (opcjonalnie): „Co moglibyśmy zrobić inaczej jutro?”. Po spacerze obejmijcie się albo chwytcie za ręce — bez oczekiwania wielkiej rozmowy od razu.',
    whyItFits:
      'Ruch i brak patrzenia sobie w oczy często ułatwia szczerą rozmowę po kłótni. To proste, tanie i naprawdę działa.',
    estimatedCost: '0 zł',
  },
  ui: {
    surveyTitle: 'Krótka ankieta',
    dateIdeaTitle: 'Pomysł na randkę',
    dateIdeaTodayTitle: 'Pomysł na dziś',
    durationLabel: 'Czas',
    durationMinutes: '{minutes} min',
    budgetFree: 'Za darmo',
    budgetLow: 'Niski koszt',
    shuffleDateIdea: 'Losuj inny pomysł',
    questionProgress: 'Pytanie {current} z {total}',
    loadingMediation: 'Kończymy mediację...',
    loadingDateIdea: 'Przygotowujemy pomysł na randkę od serca...',
    whyItFits: 'Dlaczego to pasuje',
    cost: 'Koszt',
    footerNote: 'To pomysł od serca — bez drogich rzeczy, za to z bliskością. Możecie go dopasować do siebie.',
    finish: 'Zakończ',
    finishLive: 'Przejdź do podsumowania',
    errorPrep: 'Nie udało się zakończyć mediacji.',
    errorSave: 'Nie udało się zapisać. Spróbuj ponownie.',
    errorTitle: 'Błąd',
    noSession: 'Brak sesji solo do zapisania.',
  },
};
