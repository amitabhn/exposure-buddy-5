---
title: 'Story 19.7: Upload Queue Does Not Stall on a Write the Server Will Never Accept'
type: 'bugfix'
created: '2026-10-10'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 2
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `uploadData` in `packages/sync/src/connector.ts` throws on any Supabase error except three `swap_ladder_positions` messages, so a write the server will never accept (constraint violation such as `uq_user_position`, RLS denial) is retried forever and every later write stays behind it. A retried multi-slot reorder chain (Story 19.6) can produce exactly this.

**Approach:** Classify errors as permanent (an enumerated set of Postgres constraint/RLS/data codes) or transient (network, 5xx, expired token, and anything unlisted). Transient errors keep the throw-to-retry contract. A permanent rejection gets 5 attempts in total (counted in memory per write); the 5th rejection drops it, and it is reported, so the batch can complete. A unique violation (23505) is treated like any other permanent rejection. A foreign-key violation (23503) is dropped immediately (no retries): its parent was dropped or is absent, and `ps_crud` order replay means it can never succeed later. When any write (PUT, PATCH, DELETE or swap) is dropped, the app also shows one generic, plain notice per upload batch (e.g. "Some changes couldn't be saved."), because sync will bring the server's version back (an edit reverts, a new item disappears, a deleted item reappears). The notice makes no promise (no "we've been notified"), names nothing, and has no button or report option: free-text bug reports would need first-party storage under FR-BETA-02 and belong to Epic 11. Also find why uploads did not resume after a reconnect until a JS reload (and why a stuck write once did not retry until relaunch), and fix it in this story if a cause is found.

## Boundaries & Constraints

**Always:** Keep ps_crud order replay and reorder-pair grouping from 19.6. Keep the three `NON_RETRYABLE_RPC_ERRORS` and their tests. Transient failures (network, 5xx, expired token) still throw. Anything logged or reported carries table, op, error code and, for a unique/FK/check violation, the constraint name only. PostgREST errors have no constraint field; the name appears only inside `message` (`... violates unique constraint "uq_user_position"`), so it may be extracted from `message` with a strict pattern and used only if it matches `^[a-z0-9_]+$`; if it does not match, omit it. Never send `error.message` or `details` themselves, and never fall back to them (Postgres echoes input values, e.g. 22P02 `invalid input syntax for type uuid: "<value>"`) — no row values or free text (DPDPA).

**Never:** No schema or RLS migration. No change to what the app writes. No user-visible UI except the one generic dropped-write notice (see Approach). No button, report option, or free-text field; no third-party feedback service. No local dead-letter table. No unbounded retry of a permanent rejection.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Permanent rejection, attempts 1-4 | insert rejected with 23505, then two valid inserts | throws; batch stays queued | PowerSync retries after its delay |
| Permanent rejection, attempt 5 | same write rejected a 5th time | rejected write dropped; the valid inserts upload; batch completes | one report (table, op, code, constraint name) |
| Transient failure | network error / 5xx on any entry | throws; batch stays queued | PowerSync retries |
| RLS denial | 42501 on an upsert, valid session | permanent; same bounded retries then drop | one report |
| 42501 with no valid session | 42501 while `getSession()` is null or expired (anon fallback after a token failure) | transient; throws, never counts toward the drop | n/a |
| FK violation | child insert (e.g. `suds_readings`) rejected with 23503 after its parent was dropped | dropped on first rejection; later writes proceed | one report |
| Dropped write | any write dropped (e.g. DELETE with 42501 on attempt 5, or a 23503 child); a dropped DELETE is reported at `error` level, others at `warning` | dropped; report sent per drop; generic notice shown once for the batch, after the batch completes | notice carries no row values, table name or button |
| Several drops in one batch | parent dropped, then 3 children dropped on 23503 | 4 reports, 1 notice | n/a |
| Retried swap chain | swap 1 returns 23505 on replay | same bounded retries then drop; later writes proceed | one report |
| Retry stall | offline write, then reconnect | upload resumes without a JS reload | n/a |

</frozen-after-approval>

## Code Map

- `packages/sync/src/connector.ts` -- `uploadData`, `toUploadUnits`, `isRetryableError`, `NON_RETRYABLE_RPC_ERRORS`; the only place errors are classified (currently `if (error) throw error` for every non-swap entry).
- `packages/sync/__tests__/connector.test.ts` -- mock supabase + `makeEntry`/`makeMockDatabase` helpers and the 19.6 order tests; add the stalled-queue regression here.
- `apps/mobile/src/i18n/locales/en.json`, `hi.json` -- notice string (hi.json takes an English placeholder, as elsewhere). The app has no toast component; its "toast" is `Alert.alert(t(...))` (see `app/(onboarding)/welcome.tsx:23`), so reuse that. `_layout.tsx` passes a second optional callback, `onWritesDropped()`, which the connector calls once after `batch.complete()` if any write was dropped in that batch.
- `apps/mobile/app/_layout.tsx:189` -- constructs the connector and calls `connect`; the place to pass a reporting callback.
- `apps/mobile/src/error-handler.ts` -- Sentry is initialised here (`@sentry/react-native`); `packages/sync` must not import it, so reporting is injected.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- 19.6 notes: retry-replay of a swap chain, offline-upload stall.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/sync/src/connector.ts` -- classify errors by Postgres code / HTTP status (permanent vs transient) and apply the chosen policy for permanent ones -- unblocks the queue. Classification:
  - Transient (throw, retry): network errors, any 5xx, 401, `PGRST301` (JWT expired), 408, 429, Postgres `40001`, `40P01`, `57014`, and **any unclassified error (the default)**. An unknown permanent error therefore still stalls the queue; this is the deliberate safe direction, never drop on an unknown.
  - Permanent, `23503`: dropped immediately, no retry.
  - Permanent (bounded retry, then drop): Postgres classes `22` (data), `23` (integrity, incl. `23505`, but not `23503`) and `42501` (RLS). Nothing else: there is no "other 4xx" catch-all, so `PGRST204`/`PGRST205` (schema-cache mismatch when the app is ahead of the DB) and unknown 4xx stay transient. `42501` is permanent only when `supabase.auth.getSession()` returns a non-expired session; with no valid session supabase-js falls back to the anon key, which yields `42501`, so it is transient.
  - Status plumbing: `_uploadEntry` and the swap RPC currently return only `{ error }`; carry the response `status` through if any rule uses it (network error = status 0 = transient).
  - Retry counter: in-memory `Map` keyed by the entry's `clientId` (a swap unit uses `a.clientId:b.clientId`). It resets on app relaunch, so the bound is per process, not lifetime. A key is cleared when its write succeeds. A dropped key is remembered and skipped if the batch is replayed (a later transient error throws before `batch.complete()`), so a dropped write is never re-attempted or re-reported; the map is cleared for the batch once it completes.
  - The three `NON_RETRYABLE_RPC_ERRORS` keep their immediate drop (known application errors that can never succeed, so bounded retry would only add delay); other swap errors follow the bounded path. Say this in a code comment.
- [ ] `packages/sync/src/connector.ts` -- optional injected reporter called for a dropped write with table, op, code, constraint name (parsed per the Always rule, never raw message/details), and a level (`error` for DELETE, else `warning`) -- Sentry without personal data
- [ ] Before coding the parser, capture real 23505, 23503 and 23514 responses from local Supabase and record in Implementation Notes which field carries the constraint name and which carry values
- [ ] `apps/mobile/app/_layout.tsx` -- pass a reporter that sends to Sentry -- surfaces drops; and pass `onWritesDropped` that shows the generic notice via `Alert.alert(t(...))` once per batch
- [ ] `apps/mobile/src/i18n/locales/en.json`, `hi.json` -- add the notice string
- [ ] `packages/sync/__tests__/connector.test.ts` -- regression: permanently rejected write ahead of valid ones fails on current code; plus transient-still-throws (incl. 401/429/40001, PGRST204, an unknown 4xx and an unclassified error), 42501 with/without a valid session, and a constraint-name test where `message` carries a value-bearing string that fails the pattern (name omitted) and the I/O matrix cases; a reporter test where `message`/`details` contain a UUID and free text and the reporter payload contains neither
- [ ] investigation (connector / PowerSync connect options / supabase client) -- find why uploads stall after reconnect; fix if a cause is found, device-verify on Android against hosted; record findings in Implementation Notes and deferred-work.md. First hypothesis: a supabase-js `fetch` with no timeout hangs on a dead network so `uploadData` never returns (also check `fetchCredentials` token refresh offline). Exit condition: if no cause is confirmed on device after one repro session, record the hypotheses tested and the evidence, and stop; do not extend the story

**Acceptance Criteria:**
- Given a batch with a permanently rejected write followed by valid writes, when `uploadData` runs, then the valid writes upload and the batch completes.
- Given a network error or 5xx, when `uploadData` runs, then it throws and the batch stays queued.
- Given a dropped write, when it is reported, then the report contains no row values and no `message`/`details` text, even when the error message contains an input value.
- Given a child write rejected with 23503, when `uploadData` runs, then it is dropped on the first attempt and later writes upload.
- Given one or more dropped writes in a batch, when the batch completes, then the user sees exactly one generic notice with no row values, table name or button, and each drop is reported separately.
- Given a dropped write followed by a transient error that throws, when the batch is retried, then the dropped write is not re-attempted or re-reported.
- Given an unclassified error, an unknown 4xx or `PGRST204`, when `uploadData` runs, then it throws (never dropped).
- Given `42501` with no valid session, when `uploadData` runs, then it throws and the write is not counted toward the drop.
- Given an offline write followed by reconnect, when the network returns, then the write uploads without a JS reload (or the cause is recorded if it cannot be fixed here).

## Implementation Notes

## Spec Change Log

- Party review (2026-10-10): named counter key/lifetime, wrote the classification table with default-transient, narrowed the report to code + constraint name (message can carry values), documented why the 3 swap errors stay immediate, added an exit condition to the investigation task.
- Decided by the human: `23503` drops immediately (avoids the N×25s dropped-parent cascade); the investigation stays in this story.
- Decided by the human: any dropped write shows one generic, plain notice per batch (reusing `Alert.alert`); no "we've been notified" promise and no report button (free-text reports belong to Epic 11); the "No user-visible UI" Never is amended for that notice only.

- Party review pass 2 (2026-10-10), decided by the human: constraint name may be parsed from `message` under a strict pattern (PostgREST has no constraint field); dropped the "other 4xx" catch-all and added status plumbing; `42501` without a valid session is transient; "5" now means 5 attempts; dropped DELETE reported at `error` level. Notice timing (once per foreground, not mid-session) considered and deliberately skipped.

## Review Triage Log

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green
