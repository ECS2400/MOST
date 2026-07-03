import { APP_NAME, DATA_CONTROLLER, LEGAL_LAST_UPDATED } from '@/constants/legal';
import type { LegalDocumentContent } from './types';

export const privacyPolicyPl: LegalDocumentContent = {
  title: 'Polityka prywatności',
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      title: '1. Administrator danych',
      paragraphs: [
        `Administratorem danych osobowych w aplikacji ${APP_NAME} jest ${DATA_CONTROLLER.name} (dalej: „Administrator”).`,
        `Kontakt w sprawach ochrony danych: ${DATA_CONTROLLER.email}.`,
        `Niniejsza polityka opisuje, jakie dane zbieramy, w jakim celu je przetwarzamy oraz jakie prawa przysługują użytkownikom na podstawie RODO (rozporządzenie UE 2016/679).`,
      ],
    },
    {
      title: '2. Zakres danych, które przetwarzamy',
      paragraphs: [
        'Dane konta: adres e-mail, imię lub pseudonim, hasło (w formie zahashowanej — nie przechowujemy go w postaci jawnej), identyfikator użytkownika, data rejestracji, preferowany język, plan subskrypcji.',
        'Dane profilu: opcjonalne zdjęcie profilowe (awatar), kolor awatara, statystyki aktywności w aplikacji (mediacje, osiągnięcia, seria dni).',
        'Dane relacji: identyfikator pary, kod zaproszenia, data połączenia z partnerem — jeśli korzystasz z funkcji wspólnej mediacji.',
        'Treści użytkownika: perspektywy w sporach, wiadomości w mediacji na żywo, ustalenia, notatki z Analizy Solo, zrzuty rozmów przesłane do OCR (jeśli korzystasz z tej funkcji), eksportowane raporty PDF.',
        'Dane płatności i subskrypcji: identyfikator transakcji, rodzaj planu, data zakupu i wygaśnięcia, status subskrypcji. Nie przechowujemy numerów kart płatniczych — płatności obsługuje Google Play.',
        'Dane techniczne: adres IP, typ urządzenia, wersja systemu i aplikacji, logi błędów — w zakresie niezbędnym do działania, bezpieczeństwa i diagnostyki.',
        'Powiadomienia push: token urządzenia — tylko jeśli wyrazisz zgodę na powiadomienia w ustawieniach systemu i aplikacji.',
      ],
    },
    {
      title: '3. Cele i podstawy prawne przetwarzania',
      paragraphs: [
        'Świadczenie usługi (art. 6 ust. 1 lit. b RODO): rejestracja, logowanie, mediacje, Analiza Solo, łączenie kont partnerów, przechowywanie historii i ustaleń.',
        'Obsługa płatności i subskrypcji (art. 6 ust. 1 lit. b RODO): aktywacja planu Premium, odnowienia, przywracanie zakupów.',
        'Bezpieczeństwo i zapobieganie nadużyciom (art. 6 ust. 1 lit. f RODO): ochrona konta, wykrywanie błędów, utrzymanie infrastruktury.',
        'Komunikacja z użytkownikiem (art. 6 ust. 1 lit. f RODO): odpowiedzi na zgłoszenia, informacje o zmianach regulaminu lub polityki.',
        'Powiadomienia (art. 6 ust. 1 lit. a RODO — zgoda): przypomnienia o serii, aktywności partnera — tylko po włączeniu w ustawieniach.',
        'Analityka produktu w formie zagregowanej (art. 6 ust. 1 lit. f RODO): ulepszanie funkcji — bez profilowania reklamowego.',
      ],
    },
    {
      title: '4. Przetwarzanie przez sztuczną inteligencję (AI)',
      paragraphs: [
        `Aplikacja ${APP_NAME} korzysta z modeli językowych (np. OpenAI) do funkcji: AI Mediator, Analiza Solo, analiza perspektyw, podsumowania mediacji.`,
        'Treści, które wpisujesz w tych funkcjach, są przekazywane do dostawcy AI wyłącznie w celu wygenerowania odpowiedzi lub analizy. Nie wykorzystujemy ich do trenowania własnych modeli.',
        'Perspektywa w fazie indywidualnej nie jest widoczna dla partnera — widzi ją wyłącznie system AI w celu mediacji, zgodnie z opisem w aplikacji.',
        'Nie przesyłaj do AI danych wrażliwych (np. PESEL, dane zdrowotne), jeśli nie jest to konieczne do rozwiązania sporu. W sytuacjach przemocy lub zagrożenia życia skorzystaj z pomocy specjalistów lub służb ratunkowych.',
      ],
    },
    {
      title: '5. Odbiorcy danych i podmioty przetwarzające',
      paragraphs: [
        'Supabase (hosting bazy danych, uwierzytelnianie, przechowywanie plików) — infrastruktura w chmurze z siedzibą poza EOG może wiązać się z transferem danych; stosowane są standardowe klauzule umowne UE.',
        'OpenAI — przetwarzanie treści konwersacji AI Mediatora i Analizy Solo.',
        'Google (Google Play, opcjonalnie logowanie Google) — uwierzytelnianie i rozliczenia w sklepie Play.',
        'RevenueCat — zarządzanie statusami subskrypcji i synchronizacja zakupów z Google Play Billing.',
        'Dostawcy powiadomień (np. Expo / Firebase Cloud Messaging) — jeśli włączysz powiadomienia push.',
        'Nie sprzedajemy danych osobowych podmiotom trzecim w celach marketingowych.',
      ],
    },
    {
      title: '6. Okres przechowywania danych',
      paragraphs: [
        'Dane konta i treści mediacji przechowujemy przez czas korzystania z aplikacji oraz do momentu usunięcia konta na Twoje żądanie.',
        'Dane rozliczeniowe i potwierdzenia transakcji — przez okres wymagany przepisami podatkowymi i rachunkowymi (zwykle do 5 lat).',
        'Logi techniczne — do 12 miesięcy, chyba że dłuższy okres jest konieczny do wyjaśnienia incydentu bezpieczeństwa.',
        'Po usunięciu konta dane są usuwane lub anonimizowane w rozsądnym terminie, z wyjątkiem danych, które musimy zachować z mocy prawa.',
      ],
    },
    {
      title: '7. Twoje prawa (RODO)',
      paragraphs: [
        'Masz prawo do: dostępu do danych, sprostowania, usunięcia („prawo do bycia zapomnianym”), ograniczenia przetwarzania, przenoszenia danych, sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie.',
        'Możesz wycofać zgodę na powiadomienia w dowolnym momencie — nie wpływa to na zgodność z prawem przetwarzania sprzed wycofania.',
        'Masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa.',
        `Aby skorzystać z praw, napisz na: ${DATA_CONTROLLER.email}. Odpowiemy w ciągu 30 dni.`,
      ],
    },
    {
      title: '8. Bezpieczeństwo',
      paragraphs: [
        'Stosujemy szyfrowanie transmisji (HTTPS/TLS), kontrolę dostępu do bazy danych oraz polityki bezpieczeństwa po stronie dostawców infrastruktury.',
        'Hasła są przechowywane po stronie Supabase Auth w formie zahashowanej. Nie mamy do nich dostępu w postaci jawnej.',
        'Żaden system nie gwarantuje 100% bezpieczeństwa — w razie podejrzenia nieuprawnionego dostępu do konta natychmiast zmień hasło i skontaktuj się z nami.',
      ],
    },
    {
      title: '9. Dzieci',
      paragraphs: [
        `Aplikacja ${APP_NAME} nie jest przeznaczona dla osób poniżej 16. roku życia. Nie zbieramy świadomie danych dzieci. Jeśli dowiesz się, że dziecko założyło konto, skontaktuj się z nami — konto zostanie usunięte.`,
      ],
    },
    {
      title: '10. Zmiany polityki',
      paragraphs: [
        'Możemy aktualizować niniejszą politykę. O istotnych zmianach poinformujemy w aplikacji lub e-mailem. Data ostatniej aktualizacji znajduje się na górze dokumentu.',
        'Dalsze korzystanie z aplikacji po wejściu zmian w życie oznacza akceptację zaktualizowanej polityki, o ile prawo nie wymaga dodatkowej zgody.',
      ],
    },
  ],
};

export const termsOfServicePl: LegalDocumentContent = {
  title: 'Regulamin',
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      title: '1. Postanowienia ogólne',
      paragraphs: [
        `Niniejszy Regulamin określa zasady korzystania z aplikacji mobilnej ${APP_NAME} (dalej: „Aplikacja”) świadczonej przez ${DATA_CONTROLLER.name}.`,
        `Kontakt: ${DATA_CONTROLLER.email}.`,
        'Korzystając z Aplikacji, akceptujesz Regulamin i Politykę prywatności. Jeśli się nie zgadzasz — nie korzystaj z Aplikacji.',
      ],
    },
    {
      title: '2. Definicje',
      paragraphs: [
        'Użytkownik — osoba posiadająca konto w Aplikacji.',
        'Partner — druga osoba połączona z Użytkownikiem w ramach funkcji pary.',
        'Mediacja — proces rozwiązywania sporu prowadzony w Aplikacji z udziałem AI Mediatora.',
        'Premium — płatny plan rozszerzający funkcje Aplikacji.',
      ],
    },
    {
      title: '3. Wymagania i konto',
      paragraphs: [
        'Aby korzystać z Aplikacji musisz mieć ukończone 16 lat i posiadać pełną zdolność do czynności prawnych.',
        'Rejestrujesz się podając prawdziwy adres e-mail. Jesteś odpowiedzialny za bezpieczeństwo hasła i aktywność na koncie.',
        'Zabronione jest udostępnianie konta osobom trzecim, tworzenie kont w celu nadużyć lub podszywanie się pod inne osoby.',
      ],
    },
    {
      title: '4. Zakres usługi',
      paragraphs: [
        `${APP_NAME} wspiera komunikację i rozwiązywanie konfliktów w związku za pomocą narzędzi cyfrowych i AI. Aplikacja nie jest usługą medyczną, psychoterapeutyczną, prawną ani doradztwem kryzysowym.`,
        'Funkcje mogą obejmować: mediacje, czat na żywo z AI, Analizę Solo, centrum wiedzy, statystyki, eksport PDF, OCR, program poleceń i inne — zgodnie z aktualną wersją Aplikacji.',
        'Administrator może rozwijać, modyfikować lub wycofywać funkcje, o ile nie narusza to praw nabytych w ramach opłaconej subskrypcji.',
      ],
    },
    {
      title: '5. Zasady korzystania',
      paragraphs: [
        'Zobowiązujesz się do korzystania z Aplikacji w sposób zgodny z prawem, Regulaminem i dobrymi obyczajami.',
        'Zabronione jest: publikowanie treści obraźliwych, grożących, naruszających prawa osób trzecich, propagujących przemoc lub nękanie.',
        'Administrator może zawiesić lub usunąć konto w przypadku rażącego naruszenia Regulaminu.',
      ],
    },
    {
      title: '6. Płatności i subskrypcje',
      paragraphs: [
        'Szczegółowe warunki subskrypcji opisuje dokument „Warunki subskrypcji”. Płatności na Androidzie realizowane są przez Google Play Billing.',
        'Status subskrypcji może być synchronizowany przez RevenueCat. Ceny, okresy i funkcje planów są widoczne w Aplikacji przed zakupem.',
      ],
    },
    {
      title: '7. Własność intelektualna',
      paragraphs: [
        'Aplikacja, jej interfejs, znaki, treści edukacyjne przygotowane przez Administratora oraz oprogramowanie są chronione prawem autorskim.',
        'Treści, które wprowadzasz (perspektywy, wiadomości), pozostają Twoje. Udzielasz Administratorowi niewyłącznej licencji na ich przechowywanie i przetwarzanie wyłącznie w celu świadczenia usługi.',
      ],
    },
    {
      title: '8. Odpowiedzialność',
      paragraphs: [
        'Aplikacja jest świadczona „w stanie, w jakim jest” (as is). AI może generować odpowiedzi nieprecyzyjne — decyzje w relacji podejmujecie Wy.',
        'Administrator nie odpowiada za skutki decyzji podjętych na podstawie treści AI ani za działania partnera w Aplikacji poza naszą kontrolą.',
        'W zakresie dozwolonym przez prawo odpowiedzialność Administratora ogranicza się do kwoty opłat zapłaconych przez Użytkownika w ostatnich 12 miesiącach.',
      ],
    },
    {
      title: '9. Rozwiązanie umowy',
      paragraphs: [
        'Możesz w każdej chwili usunąć konto, kontaktując się na adres e-mail Administratora.',
        'Administrator może zakończyć świadczenie usługi z zachowaniem 30-dniowego okresu wypowiedzenia, z wyjątkiem naruszeń Regulaminu.',
      ],
    },
    {
      title: '10. Postanowienia końcowe',
      paragraphs: [
        'Regulamin podlega prawu polskiemu. Spory rozstrzygają sądy właściwe dla siedziby Administratora, o ile bezwzględnie obowiązujące przepisy nie stanowią inaczej.',
        'Nieważność pojedynczego postanowienia nie wpływa na ważność pozostałych.',
      ],
    },
  ],
};

export const subscriptionTermsPl: LegalDocumentContent = {
  title: 'Warunki subskrypcji',
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      title: '1. Plany i ceny',
      paragraphs: [
        `${APP_NAME} oferuje plan darmowy oraz płatne plany Premium (m.in. tygodniowy, miesięczny, roczny) oraz jednorazową Analizę Solo.`,
        'Aktualne ceny, opisy i funkcje każdego planu są wyświetlane w Aplikacji przed zakupem. Ceny mogą obejmować podatek VAT zgodnie z przepisami.',
        'Przykładowe plany (mogą ulec zmianie): Tygodniowy — 14,99 zł; Miesięczny — 49,99 zł; Roczny — 399,99 zł; Analiza Solo (jednorazowo) — 9,99 zł.',
      ],
    },
    {
      title: '2. Płatności',
      paragraphs: [
        'Na urządzeniach z systemem Android płatności realizowane są przez Google Play Billing. Nie przechowujemy danych karty płatniczej.',
        'RevenueCat (RevenueCat, Inc.) służy do weryfikacji i synchronizacji statusu subskrypcji między sklepem a Aplikacją. Polityka prywatności RevenueCat: https://www.revenuecat.com/privacy',
        'Zakup jest potwierdzany przez Google. Rachunek lub potwierdzenie otrzymasz od Google Play.',
      ],
    },
    {
      title: '3. Odnowienia automatyczne',
      paragraphs: [
        'Subskrypcje Premium (tygodniowa, miesięczna, roczna) odnawiają się automatycznie na koniec bieżącego okresu rozliczeniowego, chyba że anulujesz je przed datą odnowienia.',
        'Opłata za kolejny okres zostanie pobrana z konta Google Play w ciągu 24 godzin przed wygaśnięciem bieżącego okresu.',
        'Analiza Solo jest zakupem jednorazowym i nie odnawia się automatycznie.',
      ],
    },
    {
      title: '4. Anulowanie',
      paragraphs: [
        'Subskrypcję anulujesz w ustawieniach Google Play: Płatności i subskrypcje → Subskrypcje → Most → Anuluj subskrypcję.',
        'Po anulowaniu Premium pozostaje aktywne do końca opłaconego okresu. Nie otrzymujesz zwrotu za niewykorzystaną część okresu, chyba że przepisy lub polityka Google Play stanowią inaczej.',
        'Usunięcie Aplikacji z urządzenia nie anuluje subskrypcji.',
      ],
    },
    {
      title: '5. Przywracanie zakupów',
      paragraphs: [
        'Po ponownej instalacji lub zmianie urządzenia możesz użyć opcji „Przywróć zakupy” w ekranie subskrypcji, logując się tym samym kontem Google Play i kontem w Aplikacji.',
      ],
    },
    {
      title: '6. Zwroty',
      paragraphs: [
        'Zwroty za zakupy w Google Play reguluje polityka Google: https://support.google.com/googleplay/answer/2479637',
        'W sprawach problemów z płatnością lub subskrypcją napisz na: ' + DATA_CONTROLLER.email + '.',
      ],
    },
    {
      title: '7. Zmiany cen i planów',
      paragraphs: [
        'Możemy zmieniać ceny lub zakres funkcji planów. O zmianach cen dla istniejących subskrypcji poinformujemy zgodnie z wymogami Google Play i obowiązującym prawem.',
        'Kontynuacja subskrypcji po wejściu nowej ceny w życie może wymagać Twojej zgody w Google Play.',
      ],
    },
    {
      title: '8. Kontakt',
      paragraphs: [
        `Pytania dotyczące subskrypcji: ${DATA_CONTROLLER.email}.`,
      ],
    },
  ],
};
