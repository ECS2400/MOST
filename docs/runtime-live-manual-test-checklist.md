# Runtime Live — Manual Test Checklist (Two Users)

Use this checklist for paired manual QA of live mediation on **two devices** (host + partner).
DEV builds show a floating runtime diagnostics badge (`Runtime OK` / `Runtime Failed`).

**Prerequisites**

- [ ] Migrations `022_mediation_runtime_state.sql` and `023_mediator_runtime_session.sql` applied to Supabase project
- [ ] `mediator-runtime` Edge Function deployed with fresh bundle (`npm run build:mediator:edge`)
- [ ] `OPENAI_API_KEY` set as **Supabase Edge secret only** (not in Expo app)
- [ ] Post-deploy smoke: `npm run smoke:mediator-runtime`
- [ ] Two test accounts linked as a couple
- [ ] `__DEV__` build on at least one device to read diagnostics badge

---

## 1. Bootstrap from survey

| Step | Host | Partner | Expected |
|------|------|---------|----------|
| 1.1 | Complete pre-mediation form (`new.tsx`) | — | Mediation created |
| 1.2 | — | Complete partner perspective (if applicable) | Partner description saved |
| 1.3 | Run analysis → invite partner → start live | Join via invite | Both enter `/mediation/live` |
| 1.4 | Wait for opening | See opening in chat | Opening appears **once** (no duplicate bootstrap) |
| 1.5 | Check DEV badge | — | `stage=intake`, `nextBeat` advances, `Runtime OK` |

- [ ] Opening generated once
- [ ] DEV: `mediationId` matches session
- [ ] Supabase row has non-null `mediation_state`, `session_memory`, `mediator_runtime_session` after first turn

---

## 2. Host / partner messages

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 2.1 | Host | Send message answering opening question | Message visible to both |
| 2.2 | Partner | Send reply | Message visible to both |
| 2.3 | — | Observe mediator turn | `answer_ack` or follow-up from runtime (no duplicate AI turns) |

- [ ] Both messages delivered in realtime
- [ ] No duplicate mediator messages for same turn
- [ ] DEV: `pending` reflects awaiting state correctly

---

## 3. Answer ack and questions

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 3.1 | Both | Answer current question | Turn state advances |
| 3.2 | Host | Auto-advance / generate next | New question appears |
| 3.3 | — | Repeat 2–3 cycles | Progress increases, no stuck state |

- [ ] `answer_ack` path works (user message, not auto-advance duplicate)
- [ ] Next question appears once per cycle
- [ ] DEV: `nextBeat=deliver_question` or `await_user_action` as appropriate

---

## 4. Continue (after summary)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 4.1 | — | Reach main decision after final summary | Continue / resolve panel shown |
| 4.2 | Host | Tap continue | `continue_session` client event |
| 4.3 | Partner | Tap continue (if required) | Session continues |

- [ ] Decision panel visible at correct stage
- [ ] Continue advances flow (extension offer or next phase)
- [ ] DEV: `pending` clears after both continue

---

## 5. Extension

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 5.1 | Host | Choose extension (`start_extension`) | Extension phase starts |
| 5.2 | Host | Generate extension questions | Extension questions appear |
| 5.3 | Both | Answer extension questions | Flow continues |
| 5.4 | — | Extension summary | `extension_check` summary shown |

- [ ] Extension questions distinct from main phase
- [ ] DEV: `stage=extension`, `nextBeat` reflects extension beats

---

## 6. Proposal — accept

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 6.1 | — | Reach proposed solution | Proposal panel shown |
| 6.2 | Host | Accept proposal | Vote recorded |
| 6.3 | Partner | Accept proposal | Both accepted → resolved |
| 6.4 | — | Closure navigation | Single navigation to closure |

- [ ] Proposal panel shows correct waiting hints
- [ ] Both accepts → `outcome=resolved`, closure navigates once
- [ ] DEV: `proposal=accepted`, `closure=close_on_accept`

---

## 7. Proposal — reject (separate session)

Run a **fresh mediation** for reject path.

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 7.1 | Host or partner | Reject proposal | Mediation continues or closes unresolved |
| 7.2 | — | Verify no false resolved state | Status not `resolved` |

- [ ] Reject path does not navigate to resolved closure
- [ ] DEV: `proposal=rejected` or flow continues

---

## 8. Resolve session

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 8.1 | — | Reach decision after summary | Resolve option available |
| 8.2 | User | Tap resolve (`resolve_session`) | Closure without agreement |
| 8.3 | — | Check Supabase status | `pending_agreements` or equivalent |

- [ ] Single closure navigation (no double redirect)
- [ ] DEV: `closure=close_without_agreement`

---

## 9. Closure (happy path)

| Step | Expected |
|------|----------|
| 9.1 | Resolved session navigates to dispute closure screen once |
| 9.2 | Closure screen shows correct outcome |
| 9.3 | Returning to live is blocked or shows finished state |

- [ ] No duplicate closure screens
- [ ] Back navigation behaves correctly

---

## 10. Safety (L3)

**Warning:** use test phrase only in staging.

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 10.1 | Partner | Send L3 safety phrase (e.g. self-harm) | Safety intervention message |
| 10.2 | — | Try to send normal message | Input blocked |
| 10.3 | — | Check DEV badge | `stage=safety_hold`, `nextBeat=safety_intervention`, `Runtime OK` |

- [ ] Input hidden (`hideInput=true`)
- [ ] No normal auto-advance after safety
- [ ] Safety closure directive set

---

## 11. Reload — one device

| Step | Action | Expected |
|------|--------|----------|
| 11.1 | Mid-session: force-close app on host device | — |
| 11.2 | Reopen live session | State restored from Supabase |
| 11.3 | Partner continues messaging | Host sees updates after reload |

- [ ] `mediation_state`, `session_memory`, `runtimeSession` preserved
- [ ] Proposal votes / extension flags intact
- [ ] DEV badge matches pre-reload stage

---

## 12. Reload — both devices

| Step | Action | Expected |
|------|--------|----------|
| 12.1 | Both users reload app mid-session | Both rejoin same flow state |
| 12.2 | Host sends message | Partner receives |
| 12.3 | Continue decision flow | Panels consistent on both devices |

- [ ] No desync between host and partner panels
- [ ] No duplicate runtime turns after reload

---

## 13. Network loss / runtime failure fallback

| Step | Action | Expected |
|------|--------|----------|
| 13.1 | Disable network mid-turn | Turn fails gracefully |
| 13.2 | Re-enable network | Next turn uses runtime again |
| 13.3 | (Optional) Block Edge URL / invalid key | DEV badge shows `Runtime Failed` |
| 13.4 | Verify legacy fallback | Session continues via local fallback (degraded) |

- [ ] App does not crash on runtime failure
- [ ] `runtimeFailed` reflected in DEV diagnostics
- [ ] Legacy fallback only when runtime unavailable (not on every turn)

---

## Sign-off

| Area | Tester | Pass | Notes |
|------|--------|------|-------|
| Bootstrap + survey | | ☐ | |
| Messages + questions | | ☐ | |
| Continue + extension | | ☐ | |
| Proposal + closure | | ☐ | |
| Safety | | ☐ | |
| Reload (1 + 2 devices) | | ☐ | |
| Runtime failure fallback | | ☐ | |

**Build / deploy reference**

```bash
# Tests
npm run test:mediator:client
npm run test:mediator:runtime
npm run build:mediator:edge
npm run test:mediator:edge
npm run test:mediator:evaluation

# Deploy mediator-runtime
npm run build:mediator:edge
npx supabase functions deploy mediator-runtime --project-ref <PROJECT_REF>
npx supabase secrets set OPENAI_API_KEY=sk-... --project-ref <PROJECT_REF>

# Post-deploy smoke
npm run smoke:mediator-runtime
```
