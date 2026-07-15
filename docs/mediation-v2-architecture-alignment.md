# Mediation V2 — Architecture Alignment Audit

> **Typ:** read-only alignment audit (bez zmian w kodzie, bazie, deployu)  
> **Data:** 2026-07-15 (rev. 3 — UNKNOWN vs Open Decisions; live-mediator lokalnie; dispute-closure SLUG; rekonsylacja liczb Appendix A)  
> **Źródło prawdy produktowego:** [mediation-v2-product-contract.md](./mediation-v2-product-contract.md) (rev. 3)  
> **Źródła pomocnicze:** [mediation-legacy-inventory.md](./mediation-legacy-inventory.md), [runtime-entrypoints.md](./runtime-entrypoints.md), graf importów repo, migracje SQL, lokalne Edge Functions, `npx supabase functions list` (production)

---

## 1. Executive summary

Audyt obejmuje **150 sklasyfikowanych elementów** w tabelach §3–§7 (w tym pozycje pomocnicze: realtime subscriptions i dynamic imports w §3). Klasyfikacja względem **finalnego kontraktu V2**: tile flow 7 stanów, jeden runtime `mediation-turn-v2`, envelope `screen + content + actions`, max 4× LLM/sesję, brak orchestratora legacy.

**Statystyki architektury** (wyłącznie klasyfikacja elementów):

| Klasyfikacja | Liczba | Znaczenie |
|--------------|-------:|-----------|
| **KEEP** | **7** | Pasuje do V2 bez istotnego przepisywania |
| **REWRITE** | **30** | Potrzebne funkcjonalnie, kontrakt/implementacja nie pasuje |
| **DELETE_AFTER_CUTOVER** | **71** | Legacy runtime — usunąć po przepięciu callerów |
| **SHARED** | **35** | Współdzielone z innymi feature'ami — nie usuwać automatycznie |
| **UNKNOWN** | **7** | Status elementu nieustalony — wymaga dalszej analizy (§3–§7) |

**Open Decisions** (osobno, nie sumowane z UNKNOWN): **10** — decyzje produktowo-techniczne do podjęcia przed cutoverem (§11).

### Kluczowe ustalenia

1. **Produkcja live mediacji** idzie wyłącznie przez `mediator-runtime` (v2.3 chat/beats) — **0 callerów** do `mediation-turn-v2`.
2. **`mediation-turn-v2`** — skeleton lokalny + URL w `EDGE`; zgodny kierunkowo z kontraktem, wymaga **REWRITE** (pełna implementacja).
3. **`mediation_sessions` + `commit_mediation_turn` (031)** — schemat **niezgodny** z rev. 3; wymaga **REWRITE** migracji (nowy enum, `session_payload`, `commit_mediation_action`).
4. **`services/mediatorEngine/`** (~453 pliki) — **DELETE_AFTER_CUTOVER** w całości; wyjątek: materiał referencyjny promptu (REWRITE → nowe prompty V2).
5. **`live.tsx` + `liveMediation.ts` + `mediatorRuntimeClient/*`** — **DELETE_AFTER_CUTOVER** po nowym rendererze kafelkowym.
6. **Wszystkie 13 Edge Functions potwierdzone ACTIVE** w Supabase production (`npx supabase functions list`); wyjątek NAME≠SLUG: `dispute-closure` → slug `hyper-task`.
7. **Brak feature flag** V2 — cutover wymaga jawnego przełączenia route/callerów.

---

## 2. Docelowa minimalna architektura

Zgodnie z kontraktem rev. 3:

```
┌─────────────────────────────────────────────────────────────┐
│  React Native — renderer kontraktu                          │
│  (screen + content + actions + progress; bez logiki gałęzi) │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST { sessionId, requestId, action }
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  mediation-turn-v2 (jedyna Edge Function runtime mediacji)  │
│  auth → load session by session_id → idempotency → paywall  │
│  resolveFirstDealOutcome (deterministycznie, bez LLM)       │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
   [atomowy commit_mediation_action]   [LLM poza transakcją SQL]
   session_version++, generation_status   max 4× / sesję
              │                           │
              └─────────────┬─────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  public.mediation_sessions                                  │
│  session_id, macro_state, session_version, generation_status│
│  session_payload (JSON), couple_id, conflict_category       │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
              response envelope → klient
              (lub PROCESSING podczas generacji)
```

**Nie w scope docelowego runtime:** `mediatorEngine` pipeline, `live_messages` chat turns, `commit_mediation_turn` z `user_message`/`mediator_message`.

---

## 3. Tabela frontendowa

| path | current responsibility | classification | target responsibility | blocker | removal condition |
|------|------------------------|----------------|----------------------|---------|-------------------|
| `app/mediation/_layout.tsx` | Stack navigator mediacji | **SHARED** | Bez zmian — shell route'ów | — | N/A |
| `app/mediation/new.tsx` | Ankieta wstępna, OCR, paywall gate | **SHARED** | Ankieta → start sesji V2 | Brak API start sesji V2 | N/A (shared) |
| `app/mediation/analysis.tsx` | Pre-live analyze-perspectives | **SHARED** | Bez zmian (pre-live) | — | N/A |
| `app/mediation/invite.tsx` | Zaproszenie partnera, realtime na `mediations` | **REWRITE** | Start sesji V2 + sync bez chatu | `live.tsx` nadal entry | Po nowym flow invite→live V2 |
| `app/mediation/join.tsx` | Partner join by code | **SHARED** | Bez zmian | — | N/A |
| `app/mediation/partner-perspective.tsx` | Perspektywa partnera (5 pól) | **SHARED** | Bez zmian (pre-live) | — | N/A |
| `app/mediation/live.tsx` | Monolityczny chat UI (~3200 LOC), runtime beats, dynamic `callMediatorRuntime` | **DELETE_AFTER_CUTOVER** | Zastąpić rendererem 7 ekranów V2 | Jedyny prod UI live | Zero importów; route wskazuje na `live-v2` |
| `app/mediation/summary.tsx` | Post-mediation summary + agreements UI | **REWRITE** | Odczyt `agreement` z sesji V2 + archive | Legacy `LiveMessage` types | Po zapisie agreement w V2 |
| `app/mediation/closure.tsx` | Re-export `dispute-closure` | **SHARED** | Post-live navigation | — | N/A |
| `hooks/useRuntimeSession.ts` | Mirror `RuntimeSession` z JSONB `mediations` | **DELETE_AFTER_CUTOVER** | Hook na envelope V2 / poll PROCESSING | Używany przez `live.tsx` | Brak callerów legacy runtime |
| `components/feature/LiveRuntimeDevDiagnostics.tsx` | DEV overlay diagnostyki v2.3 | **REWRITE** | DEV panel dla `generation_status` / screen V2 | Zależność od legacy types | Opcjonalnie po V2 dev tooling |
| `components/feature/PartnerMediationBanner.tsx` | Banner pending invite | **SHARED** | Routing do V2 live | — | N/A |
| `services/liveMediation.ts` | Orchestrator chat: CRUD messages, `processMediationTurn`, subscribe realtime | **DELETE_AFTER_CUTOVER** | Usunąć — zastąpiony przez `callEdge(mediationTurnV2)` | 7 importerów | Grep: zero refs |
| `services/liveMediation.types.ts` | `LiveMediatorResponse`, `MediatorMode`, chat types | **DELETE_AFTER_CUTOVER** | Typy envelope V2 (nowy plik) | Używany przez summary, bridge | Brak importów |
| `services/liveMediationI18n.ts` | Localized opening/proposal strings (chat-era) | **REWRITE** | Copy dla ekranów V2 (kafelki) | Powiązany z chat modes | Po nowym i18n V2 |
| `services/mediatorRuntimeClient/*` (~32 moduły prod) | HTTP client `mediator-runtime`, persist JSONB, UI projection resolvers | **DELETE_AFTER_CUTOVER** | Cienki klient: `postMediationAction(sessionId, requestId, action)` | Cały live path | Zero importów |
| `services/mediatorRuntimeClient/mediatorRuntimeClient.ts` | `callMediatorRuntime` → POST mediator-runtime | **DELETE_AFTER_CUTOVER** | — | EP-01 production | Cutover complete |
| `services/mediatorRuntimeClient/processBothParticipantReplies.ts` | Atomic both-replies turn | **DELETE_AFTER_CUTOVER** | Logika sync w V2 backend | EP-04 | Cutover complete |
| `services/mediatorRuntimeClient/liveMediationBridge.ts` | `routeLiveMediatorTurn`, mode→trigger | **DELETE_AFTER_CUTOVER** | — | EP-03 | Cutover complete |
| `services/mediatorRuntimeClient/loadMediationRuntimeSession.ts` | Load `mediation_state`/`runtime_session` | **DELETE_AFTER_CUTOVER** | Load via `sessionId` only | Persistence path | Cutover complete |
| `services/mediatorRuntimeClient/mediationRuntimeSessionPersistence.ts` | UPDATE legacy JSONB columns | **DELETE_AFTER_CUTOVER** | — | Writes to `mediations.*` | Cutover complete |
| `services/mediatorRuntimeClient/resolveRuntime*.ts` (10 plików) | Map `RuntimeSession` → chat UI (panels, input, progress) | **DELETE_AFTER_CUTOVER** | RN renderuje `actions[]` z envelope | `live.tsx` | Cutover complete |
| `services/mediatorRuntimeClient/__tests__/*` (~38 plików) | Testy klienta legacy | **DELETE_AFTER_CUTOVER** | Nowe testy kontraktu V2 | — | Po nowych testach V2 |
| `services/mediationCreate.ts` | Insert `mediations` row | **SHARED** | Tworzenie rekordu mediacji + powiązanie sesji V2 | — | N/A |
| `services/mediationSubmit.ts` | Pipeline new mediation | **SHARED** | Bez zmian | — | N/A |
| `services/mediationAnalysisRun.ts` | `EDGE.analyzePerspectives` | **SHARED** | Pre-live analysis | — | N/A |
| `services/mediationAnalysisInterpret.ts` | Sanitize analysis | **SHARED** | Bez zmian | — | N/A |
| `services/mediationInvite.ts` | Invite codes, start live | **REWRITE** | Start sesji V2 zamiast legacy live | `startLiveMediation` flow | Po API sesji |
| `services/mediationPartner.ts` | Partner link, invites subscription | **SHARED** | Bez zmian | — | N/A |
| `services/mediationPartnerValidation.ts` | Partner link rules | **SHARED** | Bez zmian | — | N/A |
| `services/mediationOcr.ts` | `EDGE.ocrAnalyze` | **SHARED** | Pre-live OCR | — | N/A |
| `services/mediationStorage.ts` | Screenshot upload | **SHARED** | Bez zmian | — | N/A |
| `services/mediationSummary.ts` | Post-mediation CRUD | **REWRITE** | Czyta `session_payload.agreement` | Legacy message model | Po V2 agreement path |
| `services/mediationStats.ts` | History routing | **REWRITE** | Route do V2 screens/status | Status enum legacy | Po V2 status model |
| `services/mediationDelete.ts` | Delete mediation + cache | **SHARED** | Cascade na `mediation_sessions` po migracji | — | N/A |
| `services/agreementArchive.ts` | Persist agreements to `agreement_archive` | **REWRITE** | Kopiuj `agreement` z sesji V2 | Brak mapowania V2→archive | Open Decision §11 #5 |
| `services/supabase.ts` | Supabase client, `EDGE.*`, `callEdge()` | **REWRITE** | Zachować infra; live → `mediationTurnV2` only | Dual EDGE constants | Po cutover usunąć `mediatorRuntime` z aktywnej ścieżki |
| `services/checkLimits.ts` | Paywall via `check-limits` | **SHARED** | Integracja z momentem paywall V2 | Open Decision §11 #1 | N/A |
| `services/aiMediator.ts` | Legacy dispute/solo flow; wywołuje `realtimecoach` | **UNKNOWN** | Zachować tylko jeśli dispute flow zostaje | Open Decision §11 #3 | — |
| `types/mediator/*` (~31 plików) | v2.3 engine types (`RuntimeSession`, beats, pipeline) | **DELETE_AFTER_CUTOVER** | Nowe typy envelope V2 | Importy z client + tests | Zero importów |
| `types/mediator/runtimeSession.ts` | `RuntimeSession` contract (beats, panels) | **DELETE_AFTER_CUTOVER** | — | Core legacy UI contract | Cutover complete |
| `constants/i18n/liveMediation/*` | Chat UI copy + `runtimeStageLabels` | **REWRITE** | Copy dla 7 ekranów V2 | Chat-specific strings | Po nowym UI |
| `legacyMigration/*` (4 pliki) | Legacy stage inference, history filters | **DELETE_AFTER_CUTOVER** | — | Tylko diagnostic/display | Brak importów prod |
| `tests/runtimeComparison/*` (4 pliki) | Legacy vs runtime comparison harness | **DELETE_AFTER_CUTOVER** | — | Dev/test only | Po V2 stabilizacji |
| `utils/edgeFunctionError.ts` | `EdgeFunctionError`, `parseEdgeErrorBody` | **KEEP** | Bez zmian — używany przez `callEdge` | — | N/A |

### Realtime subscriptions (frontend)

| path / mechanism | current responsibility | classification | target | blocker | removal condition |
|------------------|------------------------|----------------|--------|---------|-------------------|
| `liveMediation.subscribeLiveMessages` | Realtime `live_messages` + `mediations` session channel | **DELETE_AFTER_CUTOVER** | Poll / push na `mediation_sessions` lub PROCESSING envelope | `live.tsx` | Brak chat UI |
| `mediationPartner.subscribePartnerMediationInvites` | Partner invite notifications | **SHARED** | Bez zmian | — | N/A |
| `invite.tsx` channel `mediation-invite:*` | Host waits for partner join | **SHARED** | Bez zmian | — | N/A |
| `live.tsx` fallback poll 3s | Backup when realtime fails | **DELETE_AFTER_CUTOVER** | V2 sync model (request/response) | `live.tsx` | Cutover complete |

### Dynamic imports (notable)

| location | import | classification |
|----------|--------|----------------|
| `live.tsx:~1771, ~1848` | `callMediatorRuntime` lazy | **DELETE_AFTER_CUTOVER** |
| `live.tsx:~543` | `MediatorRuntimeEdgeDevDiagnostics` type | **DELETE_AFTER_CUTOVER** |
| `processBothParticipantReplies.ts` | lazy supabase + client | **DELETE_AFTER_CUTOVER** |

---

## 4. Tabela legacy engine

Podział `services/mediatorEngine/` — **453 pliki**, ~39k LOC. Całość katalogu: **LEGACY_REPLACED** w inventory. Poniżej klasyfikacja **grup funkcjonalnych** (nie pojedynczy wpis).

| group / path | ~files | current role | classification | target after cutover | notes |
|--------------|-------:|--------------|----------------|----------------------|-------|
| `orchestrator/` | 4 | 10-module pipeline wiring | **DELETE_AFTER_CUTOVER** | Usunąć | Explicitly forbidden in V2 contract |
| `runtime/` | 9 | `runMediatorEngineTurn` executor | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `stateAnalyzer/` | 10 | Heuristic state/dynamics analysis | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `safety/` | 16 | Distress L1–L3 preemption | **DELETE_AFTER_CUTOVER** | Usunąć | Safety copy → REWRITE do promptu V2 if needed |
| `reflection/` | 9 | Post-intervention reflection | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `strategy/` | 13 | Therapeutic strategy selection | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `priority/` | 18 | Signal ranking, repair voice | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `decision/` | 18 | Intervention type selection | **DELETE_AFTER_CUTOVER** | Usunąć | V2: `resolveFirstDealOutcome` only |
| `intervention/` | 12 | Structured intervention objects | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `constitution/` | 22 | Policy rule pipeline | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `memory/` | 21 | Session memory update, continuity | **DELETE_AFTER_CUTOVER** | Usunąć | V2: `session_payload` + exclusion history |
| `metrics/` | 1 | Per-turn metrics (no-op) | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `responseValidator/` | 24 | Stylistic retry loop, therapeutic rules | **DELETE_AFTER_CUTOVER** | Usunąć | V2: JSON schema only |
| `promptComposer/` | 29 | Chat-turn prompt assembly | **REWRITE** | Salvage persona/copy → V2 LLM prompts | Keep ref: `mostMediatorPersona.md`, templates |
| `llm/` | 19 | Provider, request build, fallbacks | **REWRITE** | Thin adapter in `mediation-turn-v2` | Keep ref: `localizedMediatorTexts.ts` |
| `runtimeSession/` | 3 | Compose beats/panels for chat UI | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `clientEvents/` | 4 | Chat flow control events | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `goalContinuity/` | 16 | Therapeutic goal tracking | **DELETE_AFTER_CUTOVER** | Usunąć | |
| `evaluation/` | 54 | Benchmark / ending quality harness | **DELETE_AFTER_CUTOVER** | Usunąć | Optional keep fixtures temporarily |
| `corpus/relationshipLanguage/` | 16 | Phrase bank by emotion | **REWRITE** | Reference for V2 copy | Not wired to runtime |
| `edge/` | 13 | HTTP handler bundled into `mediator-runtime` | **DELETE_AFTER_CUTOVER** | Zastąpione przez `mediation-turn-v2` | Includes generated bundle source |
| `participants/` | 2 | HOST/PARTNER display names | **REWRITE** | Simple name map in V2 prompts | |
| `__tests__/` | 118 | Unit/integration/golden tests | **DELETE_AFTER_CUTOVER** | Usunąć po V2 tests | Golden fixtures: temp reference |
| `_internal/` | 1 | Skeleton defaults | **DELETE_AFTER_CUTOVER** | Usunąć | |

### Materiał referencyjny (czasowo zachować przed cutoverem)

| path | classification | use |
|------|----------------|-----|
| `promptComposer/persona/mostMediatorPersona.md` | **REWRITE** | Ton Mościka dla V2 promptów |
| `promptComposer/config/promptTemplates.ts` | **REWRITE** | Reguły językowe |
| `llm/config/localizedMediatorTexts.ts` | **REWRITE** | Fallback copy 6 języków |
| `corpus/relationshipLanguage/*.ts` | **REWRITE** | EASY_CHOICES / LESSON inspiration |
| `__tests__/goldenConversations/*.ts` (23) | **DELETE_AFTER_CUTOVER** | Porównanie przed usunięciem engine |

---

## 5. Tabela Edge Functions

Potwierdzone deploymenty: **`npx supabase functions list`** (Supabase production, 2026-07-15). Wszystkie poniższe funkcje: **status ACTIVE**.

| NAME (remote) | SLUG (URL) | version | local folder | local code | active callers (repo) | classification | action after cutover |
|---------------|------------|--------:|--------------|------------|----------------------|----------------|----------------------|
| **mediation-turn-v2** | `mediation-turn-v2` | 1 | `supabase/functions/mediation-turn-v2/` | skeleton ~76 LOC | **0** (`EDGE.mediationTurnV2` only) | **REWRITE** | Jedyny runtime mediacji — pełna implementacja |
| **mediator-runtime** | `mediator-runtime` | 22 | `supabase/functions/mediator-runtime/` | bundle ~10.7k LOC | **4** HTTP (`callMediatorRuntime`, smoke) | **DELETE_AFTER_CUTOVER** | Undeploy po zero callerach |
| **live-mediator** | `live-mediator` | 35 | `supabase/functions/live-mediator/` | kod odzyskany z prod: `index.ts` ~3589 LOC, `i18n.ts` ~1251 LOC | **0** aktywnych callerów | **DELETE_AFTER_CUTOVER** | Undeploy dopiero po analizie logów Supabase |
| **realtimecoach** | `realtimecoach` | 14 | `supabase/functions/realtimecoach/` | odzyskany z prod ~59 LOC | **3** via `services/aiMediator.ts` | **UNKNOWN** | Open Decision §11 #3 |
| **analyze-perspectives** | `analyze-perspectives` | 21 | `supabase/functions/analyze-perspectives/` | Yes | **4** pre-live | **SHARED** | Zachować |
| **check-limits** | `check-limits` | 13 | `supabase/functions/check-limits/` | Yes | **1** service → many screens | **SHARED** | Zachować; moment paywall TBD |
| **dispute-closure** | **`hyper-task`** ⚠️ | 11 | `supabase/functions/dispute-closure/` | Yes | **0** aktywnych HTTP callerów (`EDGE.disputeClosure` unused) | **UNKNOWN** | Open Decision §11 #8 |
| **solo-coach** | `solo-coach` | 15 | `supabase/functions/solo-coach/` | Yes | **2** | **SHARED** | Zachować |
| **ocr-analyze** | `ocr-analyze` | 14 | `supabase/functions/ocr-analyze/` | Yes | **2** mediation OCR | **SHARED** | Zachować |
| **screenshot-interpret** | `screenshot-interpret` | 11 | `supabase/functions/screenshot-interpret/` | Yes | **4** | **SHARED** | Zachować |
| **connect-couple** | `connect-couple` | 10 | `supabase/functions/connect-couple/` | Yes | **1** `CoupleContext` | **SHARED** | Zachować — źródło `couple_id` |
| **relationship-reminder** | `relationship-reminder` | 10 | `supabase/functions/relationship-reminder/` | Yes | **1** hook | **SHARED** | Zachować |
| **revenuecat-webhook** | `revenuecat-webhook` | 9 | `supabase/functions/revenuecat-webhook/` | Yes | **0** app (external POST) | **SHARED** | Zachować |

### Uwagi do Edge Functions

**`realtimecoach` (UNKNOWN, nie orphan):**
- Wdrożony ACTIVE (v14); **nie jest** osieroconym deploymentem.
- Ma **aktywnych callerów** w `services/aiMediator.ts` (stary dispute/solo flow).
- Wymaga decyzji produktowej: czy cały stary dispute flow pozostaje poza mediacją V2.

**`live-mediator` (DELETE_AFTER_CUTOVER):**
- Wdrożony ACTIVE (v35).
- Kod **odzyskany z produkcji** i zapisany lokalnie w `supabase/functions/live-mediator/` (`index.ts` ~3589 LOC, `i18n.ts` ~1251 LOC).
- **Brak aktywnych callerów** w obecnym kodzie aplikacji (superseded by `mediator-runtime`).
- Usunięcie/undeploy **dopiero po analizie logów Supabase** — możliwe zewnętrzne/stare wywołania.

**`dispute-closure` (UNKNOWN):**
- Wdrożony ACTIVE (v11). Lokalny folder: `supabase/functions/dispute-closure/`.
- **Nie uznawać automatycznie za orphan** — wymaga sprawdzenia zewnętrznych callerów i logów.

**NAME vs SLUG (informacja techniczna):**
Supabase wywołuje Edge Function po **SLUG**, nie po NAME widocznym w panelu. Dla tej funkcji:
- **NAME:** `dispute-closure`
- **SLUG:** `hyper-task`

Endpoint HTTP ma postać `/functions/v1/hyper-task`, mimo że nazwa funkcji w panelu Supabase pozostaje `dispute-closure`. Klasyfikacja **UNKNOWN** bez zmian.

---

## 6. Tabela PostgreSQL

| object | current role | classification | target form | migration required | safe removal condition |
|--------|--------------|----------------|-------------|-------------------|------------------------|
| **TABLE** `public.mediations` | Intake, status, couple link, legacy runtime JSONB | **SHARED** | Bazowy rekord mediacji; usunąć legacy kolumny runtime | Yes — DROP columns phase | Po cutover + backup |
| **COLUMN** `mediations.mediation_state` | Legacy analyzer state JSONB | **DELETE_AFTER_CUTOVER** | Usunąć | Yes | Zero reads/writes |
| **COLUMN** `mediations.session_memory` | Legacy memory JSONB | **DELETE_AFTER_CUTOVER** | Usunąć | Yes | Zero reads/writes |
| **COLUMN** `mediations.mediator_runtime_session` | v2.3 `RuntimeSession` JSONB | **DELETE_AFTER_CUTOVER** | Usunąć | Yes | Zero reads/writes |
| **COLUMN** `mediations.mediator_runtime_metadata` | Engine metadata JSONB | **DELETE_AFTER_CUTOVER** | Usunąć | Yes | Zero reads/writes |
| **COLUMN** `mediations.mediator_engine_version` | Engine version tag | **DELETE_AFTER_CUTOVER** | Usunąć | Yes | Zero reads/writes |
| **COLUMN** `mediations.mediator_last_goal` | Debug/engine snapshot | **DELETE_AFTER_CUTOVER** | Usunąć | Yes | Zero reads/writes |
| **COLUMN** `mediations.mediator_last_strategy` | Debug/engine snapshot | **DELETE_AFTER_CUTOVER** | Usunąć | Yes | Zero reads/writes |
| **COLUMN** `mediations.mediator_last_safety_level` | Debug/engine snapshot | **DELETE_AFTER_CUTOVER** | Usunąć | Yes | Zero reads/writes |
| **COLUMN** `mediations.couple_id` | Para (FK logic) | **SHARED** | Źródło `couple_id` dla V2 (opcja B) | Maybe — dokumentacja FK path | N/A |
| **TABLE** `public.live_messages` | Chat messages + realtime | **UNKNOWN** | Brak w V2 contract — prawdop. deprecated dla live | TBD | Open Decision §11 #4 |
| **TABLE** `public.agreement_archive` | Long-term agreement storage | **SHARED** | Przyjmować kopię z `session_payload.agreement` | Maybe — trigger/job | Po mapowaniu V2 agreement |
| **TABLE** `public.mediation_sessions` (031) | V2 provisional session store | **REWRITE** | Final schema: payload, version, generation_status | **Yes — new migration** | Replace 031 shape |
| **COLUMN** `mediation_sessions.chat_history` | Append-only chat array | **DELETE_AFTER_CUTOVER** | → `session_payload` | Yes | Contract rev.3 |
| **COLUMN** `mediation_sessions.message_count` | Turn counter | **DELETE_AFTER_CUTOVER** | → `session_version` | Yes | Contract rev.3 |
| **COLUMN** `mediation_sessions.current_macro_state` | Uses wrong enum | **REWRITE** | Enum: SUMMARY…END (+ PAYWALL server-only?) | Yes | New enum type |
| **TYPE** `mediation_macro_state` | START_CHAT, GATHER_INFO, PROPOSE_DEAL, PAYWALL | **DELETE_AFTER_CUTOVER** | Replace new enum | Yes — DROP TYPE after migrate | No dependencies |
| **TYPE** `mediation_talker` | HOST, PARTNER | **KEEP** | Mapowanie auth.uid() | Maybe rename | Align with contract |
| **TYPE** `mediation_talker` usage | Talker rotation (chat) | **REWRITE** | Uproszczone role w payload | Yes | Tile flow sync rules |
| **RPC** `commit_mediation_turn` | Chat turn append + idempotency | **DELETE_AFTER_CUTOVER** | → `commit_mediation_action` | Yes | Zero edge callers |
| **RPC** `commit_mediation_action` (planned) | Atomowe akcje kafelkowe | **REWRITE** | **CREATE** per contract | Yes | N/A — not exists yet |
| **RPC** `get_mediation_by_invite_code` | Partner join | **SHARED** | Bez zmian | No | N/A |
| **RPC** `connect_couple_by_invite_code` | Couple linking | **SHARED** | Bez zmian | No | N/A |
| **RPC** `get_my_couple_connection` | Couple context | **SHARED** | Bez zmian | No | N/A |
| **FUNCTION** `set_mediation_session_updated_at` | Trigger helper | **KEEP** | Bez zmian | No | N/A |
| **RLS** `mediation_sessions` SELECT participants | Read-only dla pary | **REWRITE** | Align z `session_id` access | Maybe | After schema final |
| **RLS** `mediations` (4+ policies) | Host/partner/couple access | **SHARED** | Bez zmian | No | N/A |
| **RLS** `live_messages` (028) | Couple participant send/view | **UNKNOWN** | TBD if table deprecated | TBD | Decyzja live_messages |
| **RLS** `agreement_archive` (4 policies) | Couple-scoped archive | **SHARED** | Bez zmian | No | N/A |
| **Realtime** `live_messages` publication (018) | Chat sync | **UNKNOWN** | TBD | TBD | Decyzja live_messages |
| **Realtime** `mediations` publication | Session status sync | **REWRITE** | `mediation_sessions` lub poll V2 | Maybe | Po V2 sync model |
| **INDEX** `mediation_sessions_*` | Lookup by host/partner/request | **KEEP** | Adjust after schema | Maybe | |
| **TRIGGER** `mediation_sessions_set_updated_at` | updated_at | **KEEP** | Bez zmian | No | N/A |
| **SECRET** `OPENAI_API_KEY` (mediator-runtime) | Legacy LLM provider | **UNKNOWN** | V2 provider TBD | — | After mediator-runtime undeploy |
| **Exclusion history store** (planned) | per couple+category+type | **REWRITE** | **CREATE** — not in 031 | Yes | New table or JSONB |

---

## 7. Tabela testów i tooling

| path / script | current role | classification | V2 use | action after cutover |
|---------------|--------------|----------------|--------|----------------------|
| `npm run build:mediator:edge` | esbuild `mediatorEngine` → bundle | **DELETE_AFTER_CUTOVER** | — | Remove script |
| `scripts/build-mediator-runtime-edge.mjs` | Bundle builder | **DELETE_AFTER_CUTOVER** | — | Delete file |
| `npm run smoke:mediator-runtime` | HTTP smoke test legacy | **DELETE_AFTER_CUTOVER** | — | Replace with V2 smoke |
| `scripts/smoke-mediator-runtime.mjs` | Smoke script | **DELETE_AFTER_CUTOVER** | — | Delete |
| `npm run test:mediator:edge:bundle` | Bundle + edge tests | **DELETE_AFTER_CUTOVER** | — | Remove |
| `npm run test:mediator:*` (orchestrator modules, 15+ scripts) | Legacy engine unit tests | **DELETE_AFTER_CUTOVER** | — | Remove en bloc |
| `npm run test:mediator:client` | mediatorRuntimeClient tests | **DELETE_AFTER_CUTOVER** | — | Replace V2 client tests |
| `npm run test:mediator:production` | Legacy e2e 180s | **DELETE_AFTER_CUTOVER** | — | New V2 e2e |
| `npm run test:mediator:evaluation` | Benchmark harness | **DELETE_AFTER_CUTOVER** | — | Delete |
| `mediatorEngine/__tests__/` (118 files) | Engine tests + golden | **DELETE_AFTER_CUTOVER** | Fixtures temp reference | Delete after V2 tests |
| `mediatorRuntimeClient/__tests__/` (38 files) | Client/RLS tests | **DELETE_AFTER_CUTOVER** | RLS patterns reusable | Delete |
| `tests/runtimeComparison/` (4 files) | Legacy vs runtime diff | **DELETE_AFTER_CUTOVER** | — | Delete |
| `docs/runtime-live-manual-test-checklist.md` | Manual QA legacy | **REWRITE** | V2 manual checklist | Update doc |
| `tsconfig.mediator-client.json` | Typecheck client isolation | **REWRITE** | V2 client tsconfig | Repoint |
| `tsconfig.edge.json` | Edge typecheck | **KEEP** | mediation-turn-v2 | Adjust paths |
| `supabase/functions/mediator-runtime/_generated/mediatorRuntime.bundle.ts` | Generated ~10.7k LOC | **DELETE_AFTER_CUTOVER** | — | Delete with function |
| `supabase/functions/mediator-runtime/import-compat-manifest.json` | Deno compat | **DELETE_AFTER_CUTOVER** | — | Delete |

### Testy wykorzystalne jako materiał regresyjny V2

| materiał | classification | note |
|----------|----------------|------|
| `utils/edgeFunctionError.ts` tests (if any) | **KEEP** | Error envelope parsing |
| `mediatorRuntimeClient/__tests__/client/liveMessagesCoupleParticipantRls.test.ts` | **REWRITE** | RLS patterns for couple participants |
| `goldenConversations/*` scenarios | **REWRITE** | Conflict categories → V2 fixture input |
| `noLegacyLiveTakeover.test.ts` | **DELETE_AFTER_CUTOVER** | Replace with „no mediator-runtime" guard |

---

## 8. Minimalny zestaw po cleanupie (prognoza)

### Frontend (docelowo)

| path | role |
|------|------|
| `app/mediation/_layout.tsx` | Route shell |
| `app/mediation/new.tsx`, `analysis.tsx`, `invite.tsx`, `join.tsx`, `partner-perspective.tsx` | Pre-live (SHARED) |
| `app/mediation/live-v2.tsx` *(new)* | Tile renderer 7 ekranów |
| `app/mediation/summary.tsx` | Post-live (REWRITE) |
| `services/supabase.ts` | `callEdge`, `EDGE.mediationTurnV2` |
| `services/mediationActionClient.ts` *(new)* | POST action + PROCESSING poll |
| `services/mediation*.ts` (pre/post live, bez liveMediation) | Lifecycle |
| `services/checkLimits.ts`, `agreementArchive.ts` | SHARED (REWRITE archive path) |
| `types/mediationV2/*` *(new)* | Envelope + screen types |
| `constants/i18n/mediationV2/*` *(new)* | Screen copy |

### Edge Functions (docelowo)

| function | role |
|----------|------|
| **mediation-turn-v2** | **Jedyny** runtime mediacji |
| analyze-perspectives, check-limits, ocr-analyze, screenshot-interpret, connect-couple, solo-coach, relationship-reminder, revenuecat-webhook | SHARED |

**Usunięte po cleanupie:** `mediator-runtime`, `live-mediator` (po analizie logów), ewentualnie `realtimecoach` / `dispute-closure` (po Open Decisions §11).

### PostgreSQL (docelowo)

| object | role |
|--------|------|
| `public.mediations` | Intake + status (bez legacy JSONB runtime) |
| `public.mediation_sessions` | V2 session row: `session_id`, `session_payload`, `session_version`, `generation_status`, `macro_state`, `couple_id`, `conflict_category` |
| `public.agreement_archive` | Long-term agreements (SHARED) |
| `commit_mediation_action` | Atomowe RPC (service_role) |
| exclusion history table/store | per couple+category+type |
| `get_mediation_by_invite_code`, couple RPCs | SHARED |

**Usunięte / deprecated po decyzji:** `live_messages`, legacy JSONB columns, `commit_mediation_turn`, stary `mediation_macro_state` enum.

### Testy (docelowo)

- Contract tests: envelope schema per screen
- Integration: `resolveFirstDealOutcome` paths (YES+YES / COMPROMISE)
- Smoke: `mediation-turn-v2` full session
- RLS: participant access to `mediation_sessions`

### Dokumentacja (docelowo)

- `mediation-v2-product-contract.md` (source of truth)
- `mediation-v2-architecture-alignment.md` (this audit — archive)
- V2 manual test checklist (REWRITE from legacy)
- CLEANUP log per commit

---

## 9. Kolejność zmian

| etap | scope | output |
|------|-------|--------|
| **1. Database alignment** | Nowa migracja: enum SUMMARY…END, `session_payload`, `session_version`, `generation_status`, `commit_mediation_action`; decyzja `couple_id`/`conflict_category`; exclusion store | Migracja SQL reviewed, not 031 patch |
| **2. Edge Function implementation** | `mediation-turn-v2`: auth, action handler, LLM calls (max 4), PROCESSING, exclusion | Deploy równoległy (skeleton → full) |
| **3. React Native renderer** | Nowy ekran tile-based; `mediationActionClient`; typy envelope; dynamic progress 6/7 | Feature branch, no legacy delete |
| **4. Parallel cutover** | Feature flag lub route `live-v2`; nowe sesje → V2; stare in-flight → legacy | Okres równoległy (TBD) |
| **5. Legacy caller removal** | Usunąć `callMediatorRuntime`, `processMediationTurn`, dynamic imports w `live.tsx` | Grep zero refs |
| **6. Engine deletion** | `mediatorEngine/`, bundle, `build:mediator:edge`, 031 RPC | Osobne commity |
| **7. Supabase cleanup** | Undeploy `mediator-runtime`, `live-mediator` (po logach); DROP legacy columns; optional `live_messages` | Backup + audit |
| **8. Final repo vs production audit** | Git EF list ↔ Supabase ↔ RN callers ↔ PG objects; **obowiązkowa macierz NAME ↔ SLUG ↔ local folder ↔ active caller** (§9.1) | Sign-off checklist §22 contract |

### 9.1 Obowiązkowa macierz końcowego audytu Edge Functions

Każdy wiersz musi być **spójny** przed sign-off cleanupu:

| remote NAME | URL SLUG | local folder | active caller(s) | notes |
|-------------|----------|--------------|------------------|-------|
| `mediation-turn-v2` | `mediation-turn-v2` | `supabase/functions/mediation-turn-v2/` | *(po cutover)* RN `callEdge(EDGE.mediationTurnV2)` | v1 ACTIVE |
| `mediator-runtime` | `mediator-runtime` | `supabase/functions/mediator-runtime/` | `callMediatorRuntime`, smoke script | v22 ACTIVE → DELETE_AFTER_CUTOVER |
| `live-mediator` | `live-mediator` | `supabase/functions/live-mediator/` | brak aktywnych callerów | v35 ACTIVE; kod lokalny (odzyskany z prod); undeploy po logach |
| `realtimecoach` | `realtimecoach` | `supabase/functions/realtimecoach/` | `services/aiMediator.ts` | v14 ACTIVE; UNKNOWN — Open Decision §11 #3 |
| `analyze-perspectives` | `analyze-perspectives` | `supabase/functions/analyze-perspectives/` | pre-live analysis services | v21 ACTIVE |
| `check-limits` | `check-limits` | `supabase/functions/check-limits/` | `services/checkLimits.ts` | v13 ACTIVE |
| `dispute-closure` | **`hyper-task`** | `supabase/functions/dispute-closure/` | brak aktywnych HTTP callerów | v11 ACTIVE; endpoint `/functions/v1/hyper-task`; Open Decision §11 #8 |
| `solo-coach` | `solo-coach` | `supabase/functions/solo-coach/` | `services/soloCoach.ts` | v15 ACTIVE |
| `ocr-analyze` | `ocr-analyze` | `supabase/functions/ocr-analyze/` | `services/mediationOcr.ts` | v14 ACTIVE |
| `screenshot-interpret` | `screenshot-interpret` | `supabase/functions/screenshot-interpret/` | `services/screenshotInterpret.ts` | v11 ACTIVE |
| `connect-couple` | `connect-couple` | `supabase/functions/connect-couple/` | `contexts/CoupleContext.tsx` | v10 ACTIVE |
| `relationship-reminder` | `relationship-reminder` | `supabase/functions/relationship-reminder/` | `hooks/useRelationshipReminder.ts` | v10 ACTIVE |
| `revenuecat-webhook` | `revenuecat-webhook` | `supabase/functions/revenuecat-webhook/` | RevenueCat (external POST) | v9 ACTIVE |

---

## 10. Delete blockers

Dla każdego głównego elementu **DELETE_AFTER_CUTOVER** — warunek usunięcia:

| element | removal condition |
|---------|-------------------|
| `app/mediation/live.tsx` | Route mediacji live wskazuje na renderer V2; zero importów legacy runtime |
| `services/liveMediation.ts` | Grep: 0 importers; V2 sync zastąpił subscribe/poll |
| `services/mediatorRuntimeClient/*` | Grep: 0 importers; `callMediatorRuntime` usunięty |
| `services/mediatorEngine/**` | `build:mediator:edge` usunięty; `mediator-runtime` undeployed; 0 bundle refs |
| `supabase/functions/mediator-runtime/**` | Zero HTTP callerów 30+ dni; undeploy Supabase; backup bundle |
| `supabase/functions/live-mediator/**` | Wdrożony ACTIVE (v35); kod lokalny w `supabase/functions/live-mediator/` (odzyskany z prod); brak aktywnych callerów; **analiza logów Supabase** potwierdza brak ruchu |
| `types/mediator/*` (runtime session) | Zero TS imports |
| `legacyMigration/*` | Zero imports |
| `tests/runtimeComparison/*` | V2 regression suite green |
| `mediations.mediation_state` column | Zero SELECT/UPDATE w kodzie i RPC |
| `mediations.session_memory` column | j.w. |
| `mediations.mediator_runtime_session` column | j.w. |
| `mediations.mediator_runtime_metadata` column | j.w. |
| `mediations.mediator_last_*` + `mediator_engine_version` | j.w. |
| `commit_mediation_turn` RPC | Zero GRANT usage; zastąpione przez `commit_mediation_action` |
| `mediation_macro_state` enum (031) | Żaden column/RPC nie używa; nowy enum live |
| `mediation_sessions.chat_history` | Zastąpione przez `session_payload` |
| `npm run build:mediator:edge` + scripts | CI nie woła; package.json cleaned |
| `constants/i18n/liveMediation/runtimeStageLabels.ts` | V2 i18n complete |
| `hooks/useRuntimeSession.ts` | Zastąpiony hookiem V2 |

---

## 11. Open Decisions

Lista decyzji produktowo-technicznych **osobno** od klasyfikacji UNKNOWN elementów architektury.

| # | decision | impact | recommendation |
|---|----------|--------|----------------|
| 1 | **Moment paywalla V2** | `check-limits` integration | Product decision before prod (contract §20) |
| 2 | **Undeploy `live-mediator`** | Wdrożony ACTIVE v35; kod lokalny (odzyskany z prod); brak aktywnych callerów | Analiza logów Supabase przed undeploy |
| 3 | **Los `realtimecoach` / dispute flow** | Wdrożony ACTIVE v14; **nie orphan**; callery w `aiMediator.ts` | Decyzja: czy cały stary dispute flow pozostaje (poza mediacją V2) |
| 4 | **Los `live_messages`** | Realtime chat infra vs deprecated | If V2 has no chat → DELETE_AFTER_CUTOVER table |
| 5 | **Zapis `agreement` → `agreement_archive`** | `agreementArchive.ts` expects manual/summary flow | Define copy trigger at END screen commit |
| 6 | **Źródło `couple_id` + `conflict_category`** | Required before LLM/exclusion | Choose option A (columns) or B (FK) — contract §9.1 |
| 7 | **Okres równoległy legacy + V2** | Rollback safety | Feature flag duration + kill switch legacy |
| 8 | **Los `dispute-closure` / slug `hyper-task`** | NAME≠SLUG; v11 ACTIVE; endpoint `/functions/v1/hyper-task`; brak aktywnych HTTP callerów | Sprawdzić external callery + logi |
| 9 | **LLM provider / secrets V2** | OPENAI vs Anthropic | Align with `mediation-turn-v2` implementation |
| 10 | **PAYWALL w `macro_state`** | 031 enum has PAYWALL; V2 contract 7 screens | Server-only technical state vs screen |

---

## Appendix A — Count reconciliation

| classification | frontend | engine groups | edge | postgres | tests/tooling | **total** |
|----------------|----------|---------------|------|----------|---------------|-----------|
| KEEP | 1 | 0 | 0 | 4 | 2 | **7** |
| REWRITE | 10 | 8 | 1 | 7 | 4 | **30** |
| DELETE_AFTER_CUTOVER | 21 | 21 | 2 | 12 | 15 | **71** |
| SHARED | 19 | 0 | 8 | 8 | 0 | **35** |
| UNKNOWN | 1 | 0 | 2 | 4 | 0 | **7** |
| **subtotal** | **52** | **29** | **13** | **35** | **21** | **150** |

**UNKNOWN (architektura) = 7** — suma wierszy ze statusem UNKNOWN w tabelach §3–§7 (frontend 1 + edge 2 + postgres 4).

**Open Decisions = 10** — osobna lista w §11; nie wchodzi w sumę klasyfikacji architektury.

**Weryfikacja sum:** 7 + 30 + 71 + 35 + 7 = **150**; 52 + 29 + 13 + 35 + 21 = **150**.

---

## Appendix B — Top 10 DELETE_AFTER_CUTOVER (największy impact)

| rank | element | ~LOC / scope | why critical path |
|------|---------|--------------|-------------------|
| 1 | `services/mediatorEngine/` | ~453 files | Cały orchestrator zabroniony w V2 |
| 2 | `app/mediation/live.tsx` | ~3200 LOC | Jedyny prod UI legacy runtime |
| 3 | `services/liveMediation.ts` | ~2477 LOC | Client orchestrator chat turns |
| 4 | `supabase/functions/mediator-runtime/_generated/mediatorRuntime.bundle.ts` | ~10700 LOC | Server bundle legacy engine |
| 5 | `services/mediatorRuntimeClient/*` | ~93 files | HTTP + persist + UI projection |
| 6 | `supabase/functions/mediator-runtime/` | deploy path | Production Edge runtime |
| 7 | `types/mediator/*` | ~31 files | RuntimeSession contract |
| 8 | `mediatorEngine/__tests__/` | 118 files | Legacy test suite |
| 9 | `mediations.*` legacy JSONB columns (5+) | DB | Split-brain state with V2 sessions |
| 10 | `commit_mediation_turn` + `chat_history` model | SQL 031 | Chat-turn RPC incompatible with tiles |

---

## V2 Principles — non-negotiable

1. Backend jest jedynym źródłem prawdy o stanie sesji.
2. React Native jest rendererem kontraktu `screen + content + actions`; nie podejmuje decyzji biznesowych.
3. Klient nigdy nie przesyła swojej roli, aktualnego ekranu, `couple_id` ani stanu jako źródła prawdy.
4. LLM generuje wyłącznie treść widoczną dla użytkowników.
5. LLM nigdy nie wybiera następnego ekranu ani gałęzi flow.
6. Wszystkie przejścia ekranów są deterministyczne i jawne w backendzie.
7. Tylko jedna aktywna Edge Function odpowiada za runtime mediacji: `mediation-turn-v2`.
8. Każda mutacja stanu jest zapisywana atomowo przez jawne RPC lub równoważną operację transakcyjną.
9. Wywołania LLM zawsze odbywają się poza transakcją SQL.
10. Jedna poprawna odpowiedź API opisuje jeden kompletny ekran.
11. W flow V2 nie ma otwartego chatu ani dowolnych wiadomości użytkownika.
12. Każdy ekran musi być możliwy do odtworzenia wyłącznie z `mediation_sessions` i `session_payload`.
13. Każda zakończona sesja ma dokładnie jedno `agreement`.
14. `agreement.acceptance` musi odróżniać `ACCEPTED_BY_BOTH` od `GENERATED_FINAL`.
15. Exclusion history jest przechowywana per `couple_id + conflict_category + content_type`.
16. Nie wolno dodawać nowego stanu, modułu analitycznego, retry stylistycznego ani dodatkowego wywołania LLM bez aktualizacji kontraktu produktowego.
17. Legacy pozostaje tylko do czasu pełnego cutoveru i potwierdzonego braku callerów.
18. Repozytorium i Supabase production muszą ostatecznie zawierać ten sam zestaw Edge Functions.

Każdy PR dotyczący mediacji V2 musi jawnie potwierdzić, że nie łamie żadnej z powyższych zasad.

---

*Audyt read-only (rev. 3). Jedyny zmieniony artefakt: ten plik.*
