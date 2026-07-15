# Mediation V2 — Product Contract

> **Typ:** kontrakt produktowy (nie implementacja)  
> **Data:** 2026-07-15 (rev. 3 — finalne korekty techniczne)  
> **Cel:** ostateczna, maksymalnie uproszczona definicja flow nowego silnika mediacji MOST, aby późniejsza implementacja nie rozrosła się ponownie do wielomodułowego orchestratora.

---

## 1. Główne założenie produktu

MOST **nie jest** tradycyjnym czatem mediacyjnym.

Nowe doświadczenie to szybki, interaktywny proces oparty głównie na:

- krótkich ekranach,
- kafelkach odpowiedzi,
- prostych decyzjach,
- minimalnej ilości ręcznego pisania.

**Mościk** prowadzi parę przez **gotowy, skończony flow** — nie prowadzi nieskończonego chatu.

Użytkownik nie pisze esejów. Wybiera kafelki, głosuje raz nad FIRST_DEAL, czyta krótkie podsumowania. Cała sesja ma trwać minuty, nie godziny.

---

## 2. Ostateczne stany flow

Flow składa się z **dokładnie 7 stanów**. Nie ma podstanów, nie ma gałęzi powrotnych, nie ma otwartego chatu, nie ma drugiej rundy głosowania.

| # | Stan | Opis skrócony |
|---|------|---------------|
| 1 | `SUMMARY` | Podsumowanie sporu po ankiecie |
| 2 | `EASY_CHOICES` | 5 rund kafelkowych pytań |
| 3 | `FIRST_DEAL` | Pierwsze proponowane rozwiązanie + głosowanie |
| 4 | `COMPROMISE` | Finalne rozwiązanie sesji (**warunkowy** — tylko gdy YES+YES nie wystąpiło) |
| 5 | `LESSON` | Krótka lekcja |
| 6 | `DATE` | Pomysł na randkę |
| 7 | `END` | Zakończenie sesji |

**Usunięte ze scope V2 (nie implementować):**

- `DECISION` jako stan ekranu ani `macro_state`,
- `EASY_DEAL` jako osobny stan,
- ponowne głosowanie nad COMPROMISE,
- dodatkowe rundy negocjacji.

---

### 2.1 SUMMARY

| Aspekt | Opis |
|--------|------|
| **Cel** | Potwierdzić wspólne zrozumienie sporu po ankiecie wstępnej. Para wie, o czym rozmawiają. |
| **Co widzi użytkownik** | Krótki tytuł, 2–4 zdania podsumowania sporu z perspektywy pary (nie oskarżenia), opcjonalny podtytuł. Przycisk „Dalej". |
| **Co generuje LLM** | `content.summary` — neutralne, konkretne podsumowanie na podstawie ankiety i kategorii konfliktu. Preferowane: wspólne wywołanie z EASY_CHOICES (patrz sekcja 12). |
| **Działania użytkownika** | `CONTINUE` — oboje muszą potwierdzić. |
| **Przejście dalej** | Oboje potwierdzili → `EASY_CHOICES`. |

---

### 2.2 EASY_CHOICES

| Aspekt | Opis |
|--------|------|
| **Cel** | Rozluźnić atmosferę, zebrać sygnały preferencji pary przez 5 krótkich rund kafelkowych. |
| **Co widzi użytkownik** | Numer rundy (1/5 … 5/5), jedno pytanie, 3–4 kafelki odpowiedzi. Partner odpowiada osobno; widać status „czekam na partnera" / „partner odpowiedział". |
| **Co generuje LLM** | Wszystkie 5 rund — preferowane wspólnie z SUMMARY jednym wywołaniem. Odpowiedzi konkretne, życiowe, lekko humorystyczne. |
| **Działania użytkownika** | Wybór jednego kafelka na rundę. Brak wolnego tekstu. |
| **Przejście dalej** | Oboje ukończyli rundę 5 → `FIRST_DEAL`. |

---

### 2.3 FIRST_DEAL

| Aspekt | Opis |
|--------|------|
| **Cel** | Zaproponować jedno konkretne rozwiązanie sporu i zebrać głos obu partnerów. |
| **Co widzi użytkownik** | Tytuł propozycji, krótki opis dealu (2–4 zdania), trzy kafelki: **YES**, **NO**, **STUBBORN** („Nie chcę, jestem uparty/a"). |
| **Co generuje LLM** | `content.dealText` — jedno konkretne, wykonalne rozwiązanie dopasowane do sporu, odpowiedzi z EASY_CHOICES i exclusion history. |
| **Działania użytkownika** | Wybór dokładnie jednego: `YES` \| `NO` \| `STUBBORN`. Oboje muszą zagłosować. |
| **Przejście dalej** | Po **drugim głosie** backend atomowo zapisuje głosy i uruchamia `resolveFirstDealOutcome` (patrz §5, §7). Następny ekran: `LESSON` (YES+YES) lub `COMPROMISE` (po zakończeniu generacji). |

---

### 2.4 COMPROMISE (warunkowy)

| Aspekt | Opis |
|--------|------|
| **Cel** | Wyświetlić **jedno finalne rozwiązanie sesji**, gdy para nie zaakceptowała FIRST_DEAL (YES+YES). |
| **Co widzi użytkownik** | Tytuł, tekst kompromisu, krótkie wyjaśnienie dlaczego pasuje obojgu. Przycisk „Dalej" — **bez głosowania**. |
| **Co generuje LLM** | `content.dealText`, `content.whyItFitsBoth` — jedno rozwiązanie wygenerowane **jednym wywołaniem poza transakcją SQL** po drugim głosie z FIRST_DEAL (patrz §7). |
| **Działania użytkownika** | Tylko `CONTINUE`. Brak akcji `VOTE`. |
| **Przejście dalej** | COMPROMISE jest automatycznie zapisany jako `agreement` → po CONTINUE → `LESSON`. |

**COMPROMISE nie występuje**, gdy oboje wybrali YES — wtedy FIRST_DEAL staje się `agreement` i flow przechodzi bezpośrednio do LESSON.

---

### 2.5 LESSON

| Aspekt | Opis |
|--------|------|
| **Cel** | Zamknąć spor refleksją — co uruchomiło konflikt i jedna konkretna lekcja na przyszłość. |
| **Co widzi użytkownik** | Tytuł, 2–4 zdania obserwacji + 1 zdanie lekcji. Przycisk „Dalej". |
| **Co generuje LLM** | `content.observation`, `content.lesson` — preferowane wspólnie z DATE jednym wywołaniem. Max kilka zdań, bez tonu terapeutycznego, bez diagnoz partnerów, bez banałów. Lekki humor dozwolony; wyśmiewanie osób zabronione. |
| **Działania użytkownika** | `CONTINUE`. |
| **Przejście dalej** | Potwierdzenie → `DATE`. |

---

### 2.6 DATE

| Aspekt | Opis |
|--------|------|
| **Cel** | Zaproponować spersonalizowany pomysł na randkę zamykającą sesję pozytywnie. |
| **Co widzi użytkownik** | Tytuł pomysłu, mini-scenariusz (krok po kroku, 3–5 punktów), opcjonalny podtytuł. Przycisk „Zakończ". |
| **Co generuje LLM** | `content.dateIdea`, `content.scenario[]` — preferowane wspólnie z LESSON jednym wywołaniem. Realny do wykonania; bez powtórzeń z exclusion history. |
| **Działania użytkownika** | `FINISH`. |
| **Przejście dalej** | → `END`. |

---

### 2.7 END

| Aspekt | Opis |
|--------|------|
| **Cel** | Zamknąć sesję mediacji. |
| **Co widzi użytkownik** | Krótkie podziękowanie, nawigacja do app shell. |
| **Co generuje LLM** | **Nic** (statyczny ekran lub krótki template). |
| **Działania użytkownika** | `CLOSE`. |
| **Przejście dalej** | Brak — sesja zakończona, `macro_state = END`. |

---

## 3. Ostateczny flow

### 3.1 Diagram

```
Ankieta wstępna
    ↓
SUMMARY
    ↓
EASY_CHOICES (5 rund)
    ↓
FIRST_DEAL (głosowanie YES / NO / STUBBORN)
    ↓
resolveFirstDealOutcome(hostVote, partnerVote)
    ↓
    ├── YES + YES ──→ agreement (ACCEPTED_BY_BOTH) ──→ LESSON
    └── inna kombinacja ──→ Commit 1 → LLM (poza SQL) → Commit 2
                              → COMPROMISE → agreement (GENERATED_FINAL) → LESSON
    ↓
LESSON → DATE → END
```

### 3.2 YES + YES

- `FIRST_DEAL` zostaje zapisany jako wspólne ustalenie pary (`agreement.source = FIRST_DEAL`, `agreement.acceptance = ACCEPTED_BY_BOTH`).
- **Nie generujemy** COMPROMISE.
- Przejście **bezpośrednio** do LESSON.

### 3.3 Każda inna kombinacja

Dotyczy m.in.:

- YES + NO
- YES + STUBBORN
- NO + YES
- NO + NO
- NO + STUBBORN
- STUBBORN + YES
- STUBBORN + NO
- STUBBORN + STUBBORN

Backend wywołuje LLM **jeden raz poza transakcją SQL** i generuje jedno rozwiązanie COMPROMISE.

COMPROMISE:

- **nie wymaga akceptacji**,
- **nie ma** przycisków YES / NO / STUBBORN,
- **nie uruchamia** kolejnej rundy głosowania,
- zostaje **automatycznie zapisany** jako wspólne ustalenie sesji (`agreement.source = COMPROMISE`, `agreement.acceptance = GENERATED_FINAL`),
- po wyświetleniu użytkownicy klikają tylko CONTINUE,
- następny ekran to LESSON.

### 3.4 Zasady flow

- **Brak powrotów** między stanami.
- **Brak otwartego chatu**.
- **Brak dodatkowych podstanów** — paginacja EASY_CHOICES (rundy 1–5) nie tworzy nowych `macro_state`.
- **Jedno głosowanie** w całej sesji — wyłącznie nad FIRST_DEAL.
- **Każda sesja kończy się jednym zapisanym `agreement`**.

---

## 4. EASY_CHOICES (szczegóły)

EASY_CHOICES zastępuje legacy nazwę **QUIZ**.

| Reguła | Wartość |
|--------|---------|
| Liczba rund | **Dokładnie 5** |
| Pytanie na rundę | 1 krótkie pytanie |
| Opcje na rundę | **3 lub 4** kafelki |
| Prezentacja | Kafelki (tiles), nie lista radio |
| Ton odpowiedzi | Konkretne, życiowe, lekko humorystyczne |
| Odpowiedzi partnerów | Osobno — oboje muszą wybrać przed przejściem do następnej rundy |
| Generacja LLM | **Preferowane:** SUMMARY + EASY_CHOICES jednym wywołaniem (sekcja 12) |

### Przykładowa struktura generacji (LLM → backend)

```json
{
  "summary": "string",
  "rounds": [
    {
      "roundIndex": 1,
      "question": "Kiedy ostatnio poculiście się razem bez telefonów?",
      "options": [
        { "id": "a", "label": "Wczoraj — ale to był przypadek" },
        { "id": "b", "label": "Tydzień temu, przy kawie" },
        { "id": "c", "label": "Nie pamiętam, ale brzmi znajomo" },
        { "id": "d", "label": "Telefon to mój partner życiowy" }
      ]
    }
  ]
}
```

---

## 5. FIRST_DEAL

Mościk generuje **jedno konkretne rozwiązanie sporu**.

### Dostępne wybory użytkownika

| Akcja | Znaczenie dla użytkownika | Backend |
|-------|---------------------------|---------|
| `YES` | Akceptuję propozycję | Zapisuje głos `yes` |
| `NO` | Odrzucam propozycję | Zapisuje głos `no` |
| `STUBBORN` | „Nie chcę, jestem uparty/a" | Zapisuje głos `stubborn` |

Backend **nie interpretuje psychologicznie** odpowiedzi. Tylko zapisuje głosy i wywołuje `resolveFirstDealOutcome`.

### Po drugim głosie — przebieg atomowy (bez LLM w transakcji)

**Zasada:** wywołanie LLM **nigdy** nie odbywa się wewnątrz transakcji SQL. Transakcja zapisuje stan i wersję; LLM działa między commitami.

#### Ścieżka `ACCEPT_FIRST_DEAL` (YES + YES)

Druga kompletująca akcja uruchamia **jeden atomowy commit** (RPC), który:

1. Zapisuje `firstDealVotes.HOST` i `firstDealVotes.PARTNER`.
2. Wywołuje `resolveFirstDealOutcome` → `ACCEPT_FIRST_DEAL`.
3. Ustawia `agreement` (`source = FIRST_DEAL`, `acceptance = ACCEPTED_BY_BOTH`).
4. Zwiększa `session_version`.
5. Ustawia `macro_state = LESSON` (lub `generation_status = GENERATING_CONTENT`, jeśli LESSON+DATE wymagają jeszcze LLM).

Jeśli LESSON+DATE nie są jeszcze wygenerowane: LLM × 1 **poza transakcją**, potem osobny atomowy commit zapisuje treść i `generation_status = IDLE`.

#### Ścieżka `GENERATE_COMPROMISE` (każda inna kombinacja)

Patrz §7 — dwufazowy commit + LLM poza transakcją.

---

## 6. Backendowa decyzja — `resolveFirstDealOutcome`

**Nie tworzymy stanu DECISION.** Decyzja to prosta funkcja backendowa:

```typescript
resolveFirstDealOutcome(hostVote, partnerVote)
  → 'ACCEPT_FIRST_DEAL' | 'GENERATE_COMPROMISE'
```

### Reguła

| Warunek | Wynik |
|---------|-------|
| Tylko `YES + YES` | `ACCEPT_FIRST_DEAL` |
| Wszystko inne | `GENERATE_COMPROMISE` |

**Zakazane:** scoring, klasyfikatory, LLM do podejmowania tej decyzji, osobny stan/macro_state DECISION.

---

## 7. COMPROMISE

COMPROMISE to **jedno finalne rozwiązanie sesji** — bez głosowania, bez akcji VOTE. Nadal **nie wymaga akceptacji** — jest finalnym wynikiem sesji.

### Przebieg generowania COMPROMISE (bezpieczny, poza transakcją SQL)

```
[druga kompletująca akcja VOTE z FIRST_DEAL]
        ↓
Commit 1 (atomowy RPC):
  • zapis obu głosów
  • resolveFirstDealOutcome → GENERATE_COMPROMISE
  • generation_status = GENERATING_COMPROMISE
  • session_version++
        ↓
LLM × 1 (poza transakcją SQL)
        ↓
Commit 2 (atomowy RPC):
  • zapis compromise
  • agreement (source=COMPROMISE, acceptance=GENERATED_FINAL)
  • macro_state = COMPROMISE
  • generation_status = IDLE
        ↓
Ekran COMPROMISE → CONTINUE → LESSON
```

**Równoległe żądania** podczas `generation_status = GENERATING_COMPROMISE` (lub `GENERATING_CONTENT`) otrzymują stabilną odpowiedź **`PROCESSING`** — bez mutacji stanu, bez ponownego wywołania LLM.

**Ochrona przed podwójnym zapisem:** `requestId` (idempotencja żądania) + `session_version` (optimistic concurrency w RPC).

**Błąd LLM:** `generation_status = FAILED`; klient widzi komunikat błędu; ponowienie dozwolone tylko przez nowe żądanie z nowym `requestId` (max zgodnie z budżetem retry).

### Reguły generowania (treść LLM)

#### Gdy głosy są różne (np. YES + NO, YES + STUBBORN, NO + YES)

LLM powinien:

- uwzględnić element rozwiązania preferowany przez osobę, która wybrała YES,
- uwzględnić zastrzeżenie osoby, która wybrała NO lub STUBBORN,
- wykorzystać odpowiedzi z EASY_CHOICES,
- stworzyć **jeden konkretny kompromis** łączący oba stanowiska.

#### Gdy oboje odrzucili lub wybrali upór (NO+NO, NO+STUBBORN, STUBBORN+STUBBORN, …)

LLM powinien:

- zmniejszyć zakres rozwiązania,
- zaproponować prostszy wariant,
- ustawić krótki horyzont (dziś, 24 godziny, jednorazowy eksperyment),
- **nadal zwrócić wynik jako COMPROMISE** — nie używać osobnego stanu EASY_DEAL.

### Ekran COMPROMISE

**Content:**

```json
{
  "dealText": "string",
  "whyItFitsBoth": "string"
}
```

**Actions:**

```json
[
  {
    "id": "continue",
    "type": "CONTINUE",
    "label": "Dalej",
    "voteValue": null
  }
]
```

Po CONTINUE → LESSON.

---

## 8. Wspólne ustalenie — `agreement`

Jawne pole w session payload:

```json
{
  "source": "FIRST_DEAL | COMPROMISE",
  "text": "string",
  "acceptance": "ACCEPTED_BY_BOTH | GENERATED_FINAL",
  "createdAt": "timestamp"
}
```

### Reguły

| Wynik głosowania | `agreement.source` | `agreement.text` | `agreement.acceptance` |
|------------------|-------------------|------------------|------------------------|
| YES + YES | `FIRST_DEAL` | tekst z `firstDeal.dealText` | `ACCEPTED_BY_BOTH` |
| Każda inna kombinacja | `COMPROMISE` | tekst z `compromise.dealText` | `GENERATED_FINAL` |

Nie tworzymy osobnej tabeli ani warstwy domenowej w tym dokumencie. To część stanu sesji V2 i może później zostać skopiowane do istniejącego agreement archive.

**Każda zakończona sesja ma dokładnie jeden `agreement`.**

---

## 9. Ostateczny session payload

Minimalny payload sesji V2:

```json
{
  "summary": null,
  "easyChoices": {
    "rounds": [],
    "answers": {
      "HOST": {},
      "PARTNER": {}
    },
    "currentRound": 0
  },
  "firstDeal": null,
  "firstDealVotes": {
    "HOST": null,
    "PARTNER": null
  },
  "compromise": null,
  "agreement": null,
  "lesson": null,
  "date": null,
  "confirmations": {}
}
```

### Usunięte z payload (nie implementować)

- `compromiseVotes`,
- `easyDeal`,
- druga runda decyzji / głosowania,
- `chat_history` (zastąpione przez `session_payload`).

### Pola wiersza sesji DB (poza `session_payload`)

| Pole | Opis |
|------|------|
| `session_id` | PK — **to samo UUID co `sessionId` w API** (`public.mediation_sessions.session_id`) |
| `session_version` | Zastępuje legacy `message_count`; licznik mutacji sesji (optimistic concurrency) |
| `macro_state` | Aktualny ekran produktowy (`SUMMARY` … `END`) |
| `generation_status` | Stan techniczny generacji LLM — **nie** jest ekranem ani `macro_state` |
| `couple_id` | Wymagane — patrz §9.1 |
| `conflict_category` | Wymagane — patrz §9.1 |

### `generation_status` (kontrakt techniczny)

| Wartość | Znaczenie |
|---------|-----------|
| `IDLE` | Brak trwającej generacji; normalna obsługa akcji |
| `GENERATING_COMPROMISE` | Trwa generowanie COMPROMISE po drugim głosie |
| `GENERATING_CONTENT` | Trwa generowanie innej treści LLM (np. SUMMARY+EASY_CHOICES, FIRST_DEAL, LESSON+DATE) |
| `FAILED` | Ostatnia generacja LLM nie powiodła się |

### 9.1 Wymagane źródła danych: `couple_id`, `conflict_category`

Backend **musi** znać oba identyfikatory przed generacją LLM i zapisem exclusion history. **Backend nie może zgadywać źródła.**

**Przed migracją produkcyjną** należy podjąć jednoznaczną decyzję architektoniczną:

| Opcja | Opis |
|-------|------|
| **A — kolumny w `mediation_sessions`** | `couple_id uuid NOT NULL`, `conflict_category text NOT NULL` zapisane przy tworzeniu sesji |
| **B — jawne FK / join** | Np. `mediation_id` → `mediations.couple_id` + osobne pole kategorii z ankiety; **jedna udokumentowana ścieżka odczytu** w Edge Function |

Do momentu decyzji implementacja **nie powinna** hardcodować domyślnych wartości ani implicit joinów bez kontraktu.

---

## 10. Kontrakt ekranu

Cała komunikacja **Edge Function → React Native** używa **jednego** formatu odpowiedzi.

### 10.1 Envelope

```json
{
  "ok": true,
  "sessionId": "uuid",
  "screen": "SUMMARY | EASY_CHOICES | FIRST_DEAL | COMPROMISE | LESSON | DATE | END",
  "title": "string",
  "subtitle": "string | null",
  "content": {},
  "actions": [],
  "progress": {
    "current": 1,
    "total": 6
  },
  "generationStatus": "IDLE | GENERATING_COMPROMISE | GENERATING_CONTENT | FAILED"
}
```

`progress.total` jest **dynamiczny** — patrz §11. `generationStatus` odzwierciedla pole wiersza sesji (§9); nie jest `screen`.

**Usunięte z enum `screen`:** `DECISION`, `EASY_DEAL`.

**React Native jest rendererem** kontraktu `screen + content + actions`. Nie zawiera logiki gałęziowania flow.

### 10.1a Mapowanie tożsamości API

| Reguła | Wartość |
|--------|---------|
| `sessionId` w request/response | **=** `public.mediation_sessions.session_id` (UUID PK) |
| Klient **nie przesyła** | `mediation_id`, `couple_id`, roli (HOST/PARTNER), aktualnego `screen` jako źródła prawdy |
| Źródło prawdy stanu | Wiersz sesji w DB + envelope z Edge Function |
| Identyfikacja użytkownika | Wyłącznie JWT → `auth.uid()` → mapowanie na HOST/PARTNER po stronie backendu |

### 10.2 Minimalny `content` per ekran

#### SUMMARY

```json
{ "summary": "string" }
```

#### EASY_CHOICES

```json
{
  "roundIndex": 1,
  "totalRounds": 5,
  "question": "string",
  "options": [{ "id": "string", "label": "string" }],
  "partnerStatus": "waiting | answered | both_done"
}
```

#### FIRST_DEAL

```json
{ "dealText": "string" }
```

#### COMPROMISE

```json
{
  "dealText": "string",
  "whyItFitsBoth": "string"
}
```

#### LESSON

```json
{
  "observation": "string",
  "lesson": "string"
}
```

#### DATE

```json
{
  "dateIdea": "string",
  "scenario": ["string"]
}
```

#### END

```json
{ "closingMessage": "string" }
```

### 10.3 Minimalny `actions` per ekran

Wspólny typ akcji:

```json
{
  "id": "string",
  "type": "CONTINUE | VOTE | FINISH | CLOSE",
  "label": "string",
  "voteValue": "yes | no | stubborn | null"
}
```

| Ekran | Dozwolone `actions` |
|-------|---------------------|
| SUMMARY | `[{ type: "CONTINUE", label: "Dalej" }]` |
| EASY_CHOICES | `[{ type: "VOTE", id: "<optionId>", label: "<optionLabel>", voteValue: null }]` × 3–4 |
| FIRST_DEAL | `[{ type: "VOTE", voteValue: "yes" }, { type: "VOTE", voteValue: "no" }, { type: "VOTE", voteValue: "stubborn" }]` |
| COMPROMISE | `[{ type: "CONTINUE", label: "Dalej" }]` — **tylko CONTINUE** |
| LESSON | `[{ type: "CONTINUE", label: "Dalej" }]` |
| DATE | `[{ type: "FINISH", label: "Zakończ" }]` |
| END | `[{ type: "CLOSE", label: "Wróć" }]` |

### 10.4 Request od klienta

```json
{
  "sessionId": "uuid",
  "requestId": "uuid",
  "action": {
    "type": "CONTINUE | VOTE | FINISH | CLOSE",
    "optionId": "string | null",
    "voteValue": "yes | no | stubborn | null"
  }
}
```

- `requestId` — idempotencja.
- Klient **nie przesyła** roli, `mediation_id`, `couple_id` ani aktualnego `screen` — backend mapuje `auth.uid()` na HOST/PARTNER i ładuje stan z DB.
- Brak pola `message` z dowolnym tekstem użytkownika.

### 10.5 Format błędu

```json
{
  "ok": false,
  "error": "INVALID_REQUEST | NOT_AUTHORIZED | PAYWALL | NOT_IMPLEMENTED | INTERNAL",
  "message": "string",
  "correlationId": "uuid"
}
```

### 10.6 Odpowiedź PROCESSING (generacja w toku)

Gdy `generation_status` ∈ `{ GENERATING_COMPROMISE, GENERATING_CONTENT }`, równoległe żądania (poll, drugi partner, retry) zwracają:

```json
{
  "ok": true,
  "processing": true,
  "sessionId": "uuid",
  "generationStatus": "GENERATING_COMPROMISE | GENERATING_CONTENT",
  "message": "PROCESSING",
  "progress": { "current": 3, "total": 6 }
}
```

Bez mutacji stanu. Po zakończeniu generacji kolejne żądanie zwraca pełny envelope ekranu.

---

## 11. Progress

Progress używa **dynamicznego `total`** — liczba widocznych ekranów zależy od tego, czy w sesji wystąpi COMPROMISE.

### Ścieżka bez COMPROMISE (YES + YES) — 6 widocznych ekranów

| `screen` | `progress.current` / `progress.total` |
|----------|----------------------------------------|
| SUMMARY | 1 / 6 |
| EASY_CHOICES | 2 / 6 |
| FIRST_DEAL | 3 / 6 |
| LESSON | 4 / 6 |
| DATE | 5 / 6 |
| END | 6 / 6 |

Po FIRST_DEAL następuje **bezpośrednio** LESSON z `4 / 6` — **bez skoku** (np. nie wolno `3/7 → 5/7`).

### Ścieżka z COMPROMISE — 7 widocznych ekranów

| `screen` | `progress.current` / `progress.total` |
|----------|----------------------------------------|
| SUMMARY | 1 / 7 |
| EASY_CHOICES | 2 / 7 |
| FIRST_DEAL | 3 / 7 |
| COMPROMISE | 4 / 7 |
| LESSON | 5 / 7 |
| DATE | 6 / 7 |
| END | 7 / 7 |

### Reguły

- `progress.total` ustawiane **per sesja** po znanym wyniku `resolveFirstDealOutcome` (6 lub 7).
- Podczas `PROCESSING` (generacja COMPROMISE) envelope zachowuje `progress.current` i `progress.total` zgodne z docelową ścieżką (zwykle `3 / 7` do momentu wyświetlenia COMPROMISE).
- Envelope **zawsze** zawiera oba pola: `progress.current` i `progress.total`.

---

## 12. Budżet LLM

### Plan wywołań

| # | Moment | Wywołania | Uwagi |
|---|--------|-----------|-------|
| 1 | SUMMARY + EASY_CHOICES | **1** (preferowane) | Jedno wywołanie na start flow interaktywnego |
| 2 | FIRST_DEAL | **1** | Jeden deal |
| 3 | COMPROMISE | **0 lub 1** | Tylko warunkowo — gdy `GENERATE_COMPROMISE` |
| 4 | LESSON + DATE | **1** (preferowane) | Jedno wywołanie przed LESSON |

### Target

| Scenariusz | Liczba wywołań LLM |
|------------|-------------------|
| Bez COMPROMISE (YES+YES) | **3** |
| Z COMPROMISE | **4** |

### Hard maximum

- **4 wywołania** na pełną sesję.
- **Brak retry stylistycznego.**
- Dopuszczalny **maksymalnie jeden techniczny retry** przy błędzie dostawcy (timeout, 5xx).
- Dopuszczalny **maksymalnie jeden retry unikalności** przy oczywistym duplikacie exclusion history (§15) — **nie** wlicza się jako osobna „runda" produktowa; nadal obowiązuje limit 4 wywołań łącznie.

Więcej wywołań wymaga uzasadnienia w PR i aktualizacji tej sekcji.

---

## 13. Synchronizacja

| Reguła | Opis |
|--------|------|
| Rola użytkownika | Klient **nie przesyła roli**. Backend mapuje `auth.uid()` → `HOST` lub `PARTNER`. |
| Odpowiedzi EASY_CHOICES | Jedna odpowiedź na osobę na rundę. |
| Zmiana odpowiedzi | Dozwolona **tylko do momentu** odpowiedzi drugiej osoby w tej samej rundzie. |
| Zamknięcie rundy | Po odpowiedzi obojga — runda zamknięta, brak edycji. |
| Głosowanie FIRST_DEAL | Po drugim głosie stan głosowania **zamknięty**. Druga kompletująca akcja uruchamia atomowy commit (§5, §7) — **bez LLM w transakcji SQL**. |
| Generacja COMPROMISE | Commit 1 → LLM poza transakcją → Commit 2. Równoległe żądania → `PROCESSING`. |
| Idempotencja | `requestId` + `session_version` chronią przed podwójnym zapisem i race conditions. |
| COMPROMISE | Generowany i commitowany **przed** wyświetleniem ekranu — oboje widzą ten sam tekst po odświeżeniu. |

---

## 14. Historia unikalności

Historia użytych treści jest przechowywana **per para + kategoria konfliktu + typ treści**.

### Identyfikacja

| Klucz | Opis |
|-------|------|
| `couple_id` | Para połączona w MOST |
| `conflict_category` | Np. `money`, `chores`, `intimacy`, `parenting`, … |
| `content_type` | Np. `summaries`, `easy_choices`, `deals`, `lessons`, `dates` |

### Przykładowa struktura (logiczna)

```json
{
  "money": {
    "summaries": [],
    "easy_choices": [],
    "deals": [],
    "lessons": [],
    "dates": []
  },
  "chores": {
    "summaries": [],
    "easy_choices": [],
    "deals": [],
    "lessons": [],
    "dates": []
  }
}
```

### Co oznacza „nie globalnie"

- Historia **jednej pary nie wpływa** na treści generowane dla innych par.
- Użycie pomysłu w kategorii `money` **nie musi blokować** tego samego pomysłu w kategorii `chores`.
- Globalny cache treści między parami jest **zabroniony**.

---

## 15. Exclusion History

### Klucz i zakres

Historia przechowywana **per** `couple_id + conflict_category + content_type`.

Przed generacją backend pobiera historię i przekazuje LLM sekcję:

```
ALREADY USED — DO NOT REPEAT
- [fingerprint]
- ...
```

### Limity i zapis

| Reguła | Wartość |
|--------|---------|
| Maksymalna głębokość kubełka | **50 ostatnich wpisów** na `(couple_id, conflict_category, content_type)` |
| Moment zapisu | **Dopiero po** udanym finalnym commicie i udostępnieniu treści parze (nie po surowej odpowiedzi LLM przed walidacją) |
| Fingerprint | Krótki **znormalizowany descriptor** (np. lowercased, trimmed, skrócony tytuł/summary) — nie pełny tekst |

### Zakazane w pierwszej wersji

- embeddings,
- vector DB,
- semantic search.

### Retry unikalności (nie stylistyczny)

- **Maksymalnie jeden** retry generacyjny **tylko** przy oczywistym powtórzeniu wykrytym względem exclusion history (exact/near-exact match fingerprintu).
- Retry unikalności **nie jest** retry stylistycznym — nie oceniamy tonu, humoru ani „jakości prose".
- Retry unikalności **wlicza się** w hard maximum 4 wywołań LLM na sesję tylko jeśli wystąpi; preferowane unikanie przez dobry prompt z sekcją ALREADY USED.

**Cel (realistyczny):** bardzo wysokie ograniczenie powtórek, wykrywanie oczywistych duplikatów. **Nie obiecujemy** 100% matematycznej unikalności.

---

## 16. Odpowiedzialność backendu

Backend (`mediation-turn-v2` — jedyna Edge Function runtime mediacji) odpowiada **wyłącznie** za:

| Obszar | Zakres |
|--------|--------|
| Auth | JWT, identyfikacja użytkownika, mapowanie HOST/PARTNER |
| Para | Identyfikacja hosta i partnera, `couple_id` |
| Stan | Aktualny `screen` / `macro_state`, przejścia deterministyczne |
| Decyzja | `resolveFirstDealOutcome` — bez LLM |
| Odpowiedzi | Zapis wyborów kafelkowych i głosów YES/NO/STUBBORN (tylko FIRST_DEAL) |
| Agreement | Zapis `agreement` (`acceptance`: ACCEPTED_BY_BOTH \| GENERATED_FINAL) |
| Generacja | `generation_status`; LLM **poza** transakcją SQL |
| Limity | `session_version`, paywall |
| Idempotencja | `requestId` + `session_version` + deduplikacja commitów |
| Historia | Exclusion history per couple_id/category/type (max 50/kubełek) |
| LLM | Wywołanie modelu (max 4/sesję), przekazanie exclusion context |
| Walidacja | Struktura JSON odpowiedzi LLM (schema, nie styl) |
| Persystencja | Atomowe RPC, np. `commit_mediation_action` — **nie** legacy `commit_mediation_turn` |

### Backend NIE MOŻE zawierać

- state analyzera, reflection engine, strategy engine, priority engine, intervention engine,
- constitution pipeline, rozbudowanej session memory,
- validatora stylistycznego z retry loop,
- własnych klasyfikatorów psychologicznych,
- stanu DECISION, EASY_DEAL, drugiej rundy głosowania,
- wywołań LLM wewnątrz transakcji SQL.

---

## 17. Odpowiedzialność LLM

LLM odpowiada za:

| Obszar | Przykład |
|--------|----------|
| Ton Mościka | Ciepły, konkretny, lekko humorystyczny |
| SUMMARY + EASY_CHOICES | Preferowane jednym wywołaniem |
| FIRST_DEAL | Jeden deal |
| COMPROMISE | Jedno finalne rozwiązanie (różne głosy lub upór — ten sam stan) |
| LESSON + DATE | Preferowane jednym wywołaniem |
| Kontekst | Język, para, kategoria konfliktu, odpowiedzi z sesji, głosy z FIRST_DEAL |
| Unikanie powtórek | Respektowanie sekcji ALREADY USED |

LLM **nie decyduje** o gałęzi flow — to robi `resolveFirstDealOutcome` w backendzie.

---

## 18. Zakazane rozszerzenia architektury

| # | Zakaz |
|---|-------|
| 1 | Kolejny orchestrator (wielowarstwowy pipeline modułów) |
| 2 | Więcej niż **jedna** aktywna Edge Function nowego runtime mediacji |
| 3 | Event bus / message queue wewnątrz runtime mediacji |
| 4 | Dependency injection framework |
| 5 | Repository layer / abstrakcja nad abstrakcją |
| 6 | Wiele analizatorów LLM (emotion, intent, strategy, …) |
| 7 | Wielokrotne wywołania modelu na jeden ekran bez uzasadnienia |
| 8 | Retry loop oceniający styl odpowiedzi |
| 9 | Dodatkowe stany `macro_state` bez decyzji produktowej (w tym DECISION, EASY_DEAL) |
| 10 | Otwarty chat / dowolne wiadomości użytkownika w flow V2 |
| 11 | Osobne formaty HTTP response per stan |
| 12 | Druga runda głosowania / compromiseVotes / easyDeal |
| 13 | Wywołania LLM wewnątrz transakcji SQL |
| 14 | Embeddings / vector DB / semantic search w exclusion history (v1) |

### Dozwolona architektura (docelowa)

```
React Native (renderer kontraktu)
        ↓ POST action { sessionId, requestId, action }
mediation-turn-v2 (Edge Function)
        ↓
  [auth → load session by session_id → idempotency → paywall]
        ↓
  [deterministic transition / resolveFirstDealOutcome]
        ↓
  [atomowy commit_mediation_action]  ← bez LLM
        ↓
  [optional: LLM call poza transakcją + JSON schema validate]  (max 4/session)
        ↓
  [atomowy commit_mediation_action]  ← zapis treści, agreement, screen
        ↓
  screen envelope → klient  (lub PROCESSING jeśli generacja w toku)
```

---

## 19. Database contract delta

Migracja `031_mediation_runtime_v2.sql` jest **prowizoryczna** i **nie odpowiada** finalnemu flow produktowemu ani kontraktowi kafelkowemu.

### Faktyczny stan migracji 031 (audyt)

| Element w 031 | Faktyczna zawartość / problem |
|---------------|------------------------------|
| Enum `mediation_macro_state` | `START_CHAT`, `GATHER_INFO`, `PROPOSE_DEAL`, `PAYWALL` — **niezgodny** z finalnymi 7 stanami (`SUMMARY` … `END`); enum **musi zostać zastąpiony** nowym typem |
| `chat_history` (jsonb array) | Model czatu — **zastąpić** przez `session_payload` |
| `message_count` | Licznik tur czatu — **zastąpić** przez `session_version` |
| `commit_mediation_turn` | Appenduje pary `user_message` / `mediator_message` do `chat_history`; **niezgodne** z flow kafelkowym — **zastąpić** atomowymi operacjami, np. `commit_mediation_action` |
| Parametry `p_user_message`, `p_mediator_message` | Legacy chat — **nie adaptować** do nowego flow |
| Brak `session_payload`, `agreement`, `generation_status` | Wymagane w finalnym schemacie |
| Brak `couple_id`, `conflict_category` | Wymagana decyzja §9.1 przed migracją |

### Wymagana przyszła migracja

**Przed rozbudową Edge Function** wymagana jest **osobna migracja** dopasowująca schemat bazy do finalnego kontraktu z tego dokumentu.

Nie implementujemy tej migracji w ramach tego artefaktu.

---

## 20. PAYWALL DECISION REQUIRED

**Decyzja produktowa wymagana przed implementacją produkcyjnego flow.**

Ten dokument **nie definiuje** momentu ani reguły paywalla. Należy osobno ustalić:

- czy paywall blokuje start sesji, FIRST_DEAL, COMPROMISE, LESSON, czy coś innego,
- czy limity liczone są per `session_version`, per para, per okres rozliczeniowy,
- jak integracja z RevenueCat / `check-limits` mapuje się na V2.

Backend musi obsłużyć odpowiedź `PAYWALL` w envelope błędu, ale **konkretna reguła biznesowa nie jest częścią tego kontraktu** do momentu osobnej decyzji produktowej.

---

## 21. CLEANUP CONTRACT — plan usuwania legacy

### 21.1 Zasady ogólne

1. **Nie usuwamy** niczego na podstawie samej nazwy pliku.
2. Każdy element musi zostać sklasyfikowany:

| Klasyfikacja | Znaczenie |
|--------------|-----------|
| `ACTIVE` | Używany w produkcji, pozostaje |
| `SHARED` | Współdzielony z innymi feature'ami — nie usuwać automatycznie |
| `LEGACY_REPLACED` | Zastąpiony przez V2, callerzy do przepięcia |
| `ORPHANED` | Brak callerów, brak referencji |
| `UNKNOWN` | Wymaga ręcznej weryfikacji przed usunięciem |

3. Usuwamy **dopiero po**: przepięciu callerów, grep importów/string references, potwierdzeniu braku wywołań produkcyjnych, backupie, okresie równoległym V2.

### 21.2 Zakres cleanup

- Nieużywane pliki TypeScript (`mediatorEngine/`, `mediatorRuntimeClient/`, `liveMediation.ts`)
- Stary bundle i Edge Functions (`mediator-runtime`, ewentualnie `live-mediator`, `realtimecoach`)
- Nieużywane RPC, kolumny JSONB, policies, sekrety
- Orphan deployments w Supabase

### 21.3 Elementy chronione (SHARED)

OCR, solo coach, RevenueCat/check-limits, couple connection, analyze-perspectives, wspólne typy auth/couples/mediations.

### 21.4 Procedura

- Każde usunięcie w osobnym commicie lub migracji.
- **DROP CASCADE zabronione** bez pełnego raportu zależności.
- Końcowy audit: **Git repo ↔ Supabase production ↔ aktywne callery RN ↔ PostgreSQL**.

### 21.5 Mapa startowa (do weryfikacji)

| Element | Klasyfikacja |
|---------|-------------|
| `supabase/functions/mediator-runtime/` | LEGACY_REPLACED |
| `services/mediatorEngine/` | LEGACY_REPLACED |
| `services/mediatorRuntimeClient/` | LEGACY_REPLACED |
| `services/liveMediation.ts` | LEGACY_REPLACED |
| `supabase/functions/mediation-turn-v2/` | ACTIVE (docelowo) |
| `supabase/functions/check-limits/` | SHARED |

---

## 22. Kryteria ukończenia projektu V2

Projekt uznajemy za **zakończony**, gdy spełnione są **wszystkie** poniższe:

| # | Kryterium |
|---|-----------|
| 1 | Flow działa: `SUMMARY → EASY_CHOICES → FIRST_DEAL →` opcjonalny `COMPROMISE → LESSON → DATE → END` |
| 2 | COMPROMISE **nie wymaga** drugiego głosowania — tylko CONTINUE |
| 3 | Każda sesja kończy się **jednym zapisanym `agreement`** z poprawnym `acceptance` |
| 4 | Wszystkie ekrany używają **jednego kontraktu** (sekcja 10) |
| 5 | Progress dynamiczny: 6 lub 7 ekranów bez skoku numeracji |
| 6 | Generacja COMPROMISE: LLM poza transakcją SQL; `PROCESSING` podczas generacji |
| 7 | `mediation-turn-v2` jest **jedynym** runtime Edge Function dla mediacji |
| 8 | **Zero** aktywnych callerów legacy |
| 9 | Stary `mediator-runtime` usunięty z Supabase production |
| 10 | Nieużywane tabele, kolumny, RPC, policies usunięte (osobne migracje) |
| 11 | Repo i produkcja zawierają **ten sam zestaw** Edge Functions |
| 12 | Testy i typecheck przechodzą |
| 13 | Cleanup wykonany i zweryfikowany (audit repo vs Supabase) |
| 14 | Budżet LLM: max 4 wywołania/sesję, bez retry stylistycznego |

---

*Dokument zamknięty (rev. 3). Implementacja kodu, migracji i deploymentu poza zakresem tego artefaktu.*
