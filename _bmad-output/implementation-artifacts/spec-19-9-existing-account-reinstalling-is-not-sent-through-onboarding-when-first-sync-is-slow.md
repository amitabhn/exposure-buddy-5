---
title: 'Story 19.9: An Existing Account Reinstalling Is Not Sent Through Onboarding Again When the First Sync Is Slow'
type: 'bugfix'
created: '2026-10-12'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '3037f22'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-18-7-skip-onboarding-for-existing-users-after-reinstall.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 18.7's reinstall fallback (`useOnboardingExistenceFallback`, `apps/mobile/app/(app)/_layout.tsx`) holds the onboarding redirect for at most `SYNC_WAIT_TIMEOUT_MS` (10 s) and then treats "timed out" as "decided: new account". When the first PowerSync sync takes longer than that (slow or dropped network), an existing user is sent to onboarding. Redirecting unmounts the `(app)` layout, so the fallback can never correct itself when the data does arrive. Continuing through onboarding adds a position-1 ladder item that collides with the server's position 1 (`uq_user_position`), which stalls the upload queue (reproduced on the preview build, 2026-10-06: sign in on cleared data, cut the network ~6 s later).

**Approach:** A timeout is not an answer. Only a hit or a completed first sync with an authoritative local read decides "new account". When the hold times out with the first sync still incomplete, the user is released to Home (the `(app)` group, so the layout and the fallback query stay mounted) and is **not** routed to onboarding and **not** marked complete. The fallback keeps running: a hit later calls `markOnboardingComplete()`; a completed first sync with no rows routes to onboarding as today. The 10 s hold stays for the common fast path.

</frozen-after-approval>

## Boundaries & Constraints

**Always:**
- Keep 18.7's signal (`fear_ladder_items` existence), its reuse of `markOnboardingComplete()`, no `user_id` filter, and the ARC-005 boundary (`@exposure-buddy/sync` only).
- Keep the mid-onboarding carve-out (`onboardingProgressStep !== null` goes to welcome and resumes).
- Fast path unchanged: first sync under 10 s still lands on Home (existing account) or onboarding (new account) with the same spinner and no added latency.
- No new persisted state: undecided is a runtime state, never written to MMKV.
- **Undecided means read-only for the ladder.** While the onboarding decision is undecided (hold expired, no hit, first sync not yet complete with an authoritative read), no `fear_ladder_items` write may originate on this device. A local row written then would (a) read as a hit and wrongly mark a new account onboarded, and (b) take position 1 and collide with the server's (`uq_user_position`). Enforced by the `/ladder` route redirecting to Home while undecided (see Decisions 5).
- A hit counts only when it is not caused by a local write this session. Satisfied by the gate above (the only inserting, deleting and reordering writers are `app/ladder.tsx` and `app/(onboarding)/ladder.tsx`; the latter is reached only mid-onboarding, which the carve-out excludes from the undecided state; `calm-me`, `session/grounding`, `session/active` and the `(app)/_layout` recovery path only UPDATE existing ids); the hook's query is not changed to filter rows.
- The `/ladder` gate is an implementation constraint derived from the frozen Approach ("a timeout is not an answer"), not a change to it; the frozen block stays untouched.
- **Late hit never navigates.** Once the hold has expired the user is already inside `(app)` and may be in `/calm-me`, `/relaxation` or another screen. A late hit calls `markOnboardingComplete()` only; the `router.replace('/(app)')` in the hit effect runs only when the hold has not expired (the spinner case, as in 18.7). No navigation the user did not ask for.
- **Undecided signal contract:** `isUndecided = isAwaitingOnboardingDecision && !isDecided && isHoldExpired`, derived on every render, never latched. It is false whenever `(app)/_layout` is unmounted (sign-out, account switch): the publishing `useLayoutEffect` returns a cleanup that resets it to false, so a stale `true` can never outlive the layout and block the Ladder for the next account. Its default is false (so existing `ladder` tests and any route reached without the layout are unaffected). The layout publishes it with `useLayoutEffect`; this relies on `/ladder` mounting only after a tap on Home (no deep link or notification targets it today), so the value is set before the Ladder mounts.
- **No dead taps on Home (party pass 4).** While `isUndecided`, Home does not render any control whose action navigates to `/ladder` (the empty-state CTA, the "Your ladder" action button, the completed-state CTA and the courage-card fallback from `handleStartNextStep`; confirm the set with `grep -n "/ladder" apps/mobile/app/\(app\)/index.tsx`). Nothing is disabled-looking or explained: the controls are simply absent, so no new string is needed. Home reads the signal from the same context the layout publishes (it is under the layout). Non-ladder controls (Insta Calm, Practice Relaxation, settings) stay. Once decided, the controls render as today. The `/ladder` redirect stays as the backstop for any other entry.

**Never:**
- Never route to onboarding on a timeout alone. Never mark onboarding complete without a hit.
- No schema, RLS or sync-rule change. No new user-visible copy: no banner or new strings while the decision is undecided; Home renders as normal.
- No visible disabled state, banner or new string for the gate: Home hides the `/ladder` controls (see "No dead taps") and the `/ladder` redirect is silent. Supersedes the earlier "redirect only" wording of Decision 2.
- Not in scope: why the Android Expo dev client never leaves `connecting` (documented in `docs/setup/local-environment.md`; see Spec Change Log), and the upload stall itself (owned by 19.7, merged).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reinstall, fast sync | rows arrive < 10 s | hit; `markOnboardingComplete()`; Home | n/a |
| Reinstall, slow sync | first sync not done at 10 s, existing account | released to Home, flag unset; when rows arrive, hit marks complete; never sees onboarding | n/a |
| Reinstall, network cut before first sync | sync never completes | stays on Home (empty), flag unset; recovers if the network returns | no trap, no onboarding |
| New signup, fast sync | first sync completes, 0 rows | decided empty; onboarding | unchanged |
| New signup, slow sync | first sync not done at 10 s | released to Home, then routed to onboarding once sync completes empty | no write happens before routing |
| Already onboarded | local flag true | hook disabled; unchanged | n/a |
| Mid-onboarding on this device | saved step present | welcome, resumes; fallback not consulted | unchanged |
| Open Ladder while undecided | hold expired, undecided, user taps a Home entry to `/ladder` | redirected back to Home; no add form, no write | silent, no copy |
| Open Ladder after decision | hit arrives (flag set) | Ladder opens normally, shows synced items | n/a |
| First sync done, local read rejected | `hasSynced` true, `getAll` rejects | bounded retry (3 attempts, short backoff). A retry that answers decides as normal. If all fail, stay undecided: the reactive query is never used to answer "no account" (it lags `hasSynced`, see the hook comment), but a reactive row still counts as a hit. Ladder gated, Home usable, no onboarding. A cold restart re-runs the decision | a rejection never routes to onboarding; an unrecoverable local-read failure leaves a new account on an empty Home until restart (accepted, Decision 5) |

## Code Map

- `apps/mobile/src/hooks/useOnboardingExistenceFallback.ts` -- `isDecided` currently includes `timedOut`; split into `isDecided` (hit, or first sync + local read answered) and `isHoldExpired` (timeout). Keep `SYNC_WAIT_TIMEOUT_MS`.
- `apps/mobile/app/(app)/_layout.tsx` -- `isDecisionPending` / the onboarding redirect effect: spinner while pending and hold not expired; redirect to welcome only when `isDecided && !hasExistingAccountData`; on hold expiry without a decision render the normal `(app)` children and leave the fallback enabled.
- `apps/mobile/app/ladder.tsx` -- redirect to Home while the decision is undecided. `ladder.tsx` is a sibling of the `(app)` group, so `(app)/_layout` context does not reach it; the undecided signal travels by a root-level React context provider above both route groups, written by the `(app)` layout's `useLayoutEffect` and reset in its cleanup (decided 2026-10-12: no module-level store, which would outlive an account switch). The other `fear_ladder_items` touchers (`calm-me/index.tsx`, `session/grounding.tsx`, `session/active.tsx`) only UPDATE existing ids, so they need no gate.
- `apps/mobile/app/(app)/index.tsx` -- hide the four `/ladder`-bound controls while undecided (read the context; no new strings).
- `apps/mobile/src/hooks/useOnboardingExistenceFallback.test.ts`, `apps/mobile/app/(app)/_layout.test.tsx` -- 18.7 held-redirect tests assume timeout decides; update them and add the slow-sync cases.
- `docs/setup/local-environment.md` -- dev-client streaming gotcha (read only, see Decisions 3).

## Tasks & Acceptance

**Execution:**
- [ ] Hook: separate "hold expired" from "decided"; timeout no longer sets `isDecided`.
- [ ] Layout: on hold expiry with no decision, render Home without redirecting or marking complete; keep the fallback enabled so a late hit or a completed empty sync still acts.
- [ ] Ladder gate: while undecided, `/ladder` redirects to Home (no add form mounted, no `enqueue`); once decided it behaves as today. Publish the signal per the contract above. Writer audit already done (UPDATE-only elsewhere); re-confirm and record in Implementation Notes.
- [ ] Hook: replace the one-shot post-sync read with a bounded retry (3 attempts, short backoff), then stop and stay undecided (no reactive-empty fallback). The attempt counter (a ref) re-arms when `enabled` or `hasSynced` changes or when the sync status's `lastSyncedAt` changes (each completed sync checkpoint earns up to 3 more reads); no timers, no new persisted state. Worst case is 3 reads per checkpoint.
- [ ] Home: while `isUndecided`, hide the `/ladder`-bound controls (see "No dead taps"); they render as today once decided.
- [ ] Tests (written first, must fail on current code): slow sync then late hit never calls `router.replace('/(onboarding)/welcome')`; timeout with `hasSynced` false does not route to onboarding; completed sync with 0 rows after the hold routes to onboarding; opening `/ladder` while undecided redirects to Home and never calls `enqueue('fear_ladder_items', ...)`; a rejected post-sync local read does not route to onboarding on the first failure, a later successful retry decides, after all retries fail a new `lastSyncedAt` re-arms the attempts and a successful read then decides (and a permanent failure is capped at 3 reads per checkpoint), and after all retries fail with an empty settled reactive query the hook stays undecided (no onboarding route, `/ladder` still gated), while a reactive row after exhaustion still counts as a hit; a late hit after the hold expired calls `markOnboardingComplete()` and never calls `router.replace`; the undecided signal resets to false when `(app)/_layout` unmounts (sign-out then sign-in as another account leaves `/ladder` usable); Home renders none of the `/ladder`-bound controls while undecided and renders them again once decided; fast-path cases unchanged; mid-onboarding unchanged.
- [ ] Device verification on an EAS `preview` build (not the dev client): repeat the 2026-10-06 repro (cleared data, sign in, cut network ~6 s later) and confirm Home, then restore the network and confirm the ladder appears with no onboarding; repeat with a very slow connection; record in Implementation Notes and `deferred-work.md`. Also run the three Maestro shards (core, session, onboarding): 19.12 broke on exactly this hold timing, and the release-to-Home path changes where `ensureOnboarded.yaml` lands first.

**Acceptance Criteria:**
- Given an existing account reinstalled with a first sync longer than 10 s, when the hold expires, then the user is on Home, not onboarding, and the onboarding flag is unset.
- Given that user's data arrives later, then the fallback marks onboarding complete and no onboarding screen appears.
- Given a brand-new account, when the first sync completes with no rows, then onboarding starts as today.
- Given the decision is undecided, when the user opens the Ladder, then they are returned to Home and no ladder write is enqueued.
- Given a new account on a slow sync that taps into the Ladder, then no local row is created, so the account is not marked onboarded and is routed to onboarding once the empty sync completes.
- Given the hold has expired and the user is in another screen (e.g. Insta Calm), when a late hit arrives, then onboarding is marked complete and the user is not navigated.
- Given all post-sync local-read retries fail, then the user stays on Home, is not sent to onboarding, and the Ladder stays gated; and given a later sync checkpoint, then the read is attempted again.
- Given the decision is undecided, then Home shows no control that leads to the Ladder; given it is decided, they appear.
- Given a first sync under 10 s, then behaviour and timing are unchanged.
- Given `pnpm turbo typecheck lint test`, then all pass.

## Decisions (resolved 2026-10-12)

1. **Slow new signup — release to Home.** Releasing to Home on timeout means a new signup on a slow network sees an empty Home before being routed to onboarding once the empty sync completes. Alternative: keep the spinner past 10 s while the network is up and only release when offline (needs a connectivity signal the app does not have today). Chosen: release to Home; new signups need network and sync with an empty account is fast.
2. **Home while undecided.** Plain empty Home, or a small neutral "Still loading your account" banner (needs en/hi strings and an accessibility label)? Chosen: no banner. Amended 2026-10-12 (party pass 4): the `/ladder`-bound controls are hidden while undecided, so no tap is silently bounced; still no new strings.
3. **Dev-client diagnosis.** The story key says "diagnose dev-client replica download"; the epic title covers only the slow first sync. Chosen: out of scope here, file separately; the fix and verification target the `preview` build.
4. **Cold JS start offline shows sign-in** (19.7 side finding, related to 19.8): stays with 19.8.
5. **Gate ladder writes while undecided (added 2026-10-12, party review).** Home links to `/ladder`, and the add path computes position from the local list (`ladder.tsx:246`), so an undecided Home would let a reinstalled account insert position 1 (collision) or let a new account's own insert read as a hit (wrongly marked onboarded). Chosen: option 2, redirect `/ladder` to Home while undecided. Rejected: snapshotting the local row count at hold expiry (fixes the fake hit, not the collision); holding the spinner while online (needs a connectivity signal, Decision 1). A post-sync local read that rejects is retried (3 attempts), and if all fail the decision stays undecided (resolved 2026-10-12, party pass 3: a reactive-empty fallback would re-create the 18.7 hasSynced-but-query-lagging hazard; an existing account wrongly onboarded stalls uploads, a new account on an empty Home does not). Accepted cost: after three consecutive local-read failures a new account stays on Home until a cold restart re-runs the decision. It never falls back to a bare timeout. The gate is a silent redirect to Home, not a spinner on `/ladder` (a spinner would need a new accessibility label string; the redirect always ends).

## Implementation Notes

Writer audit, run 2026-10-12 (`grep -rnE "enqueue\(|fear_ladder_items" apps/mobile/app apps/mobile/src`, non-test): `fear_ladder_items` INSERT/DELETE/reorder only in `app/ladder.tsx` (216 UPDATE, 261 INSERT, 292 DELETE, 364 reorder_positions) and `app/(onboarding)/ladder.tsx` (100 INSERT, 151 reorder; mid-onboarding only, excluded by the carve-out). UPDATE-only: `app/(app)/_layout.tsx:208`, `calm-me/index.tsx:84`, `session/grounding.tsx:71`, `session/active.tsx:152`. Re-run at implementation and record any change here.

Entry points to `/ladder` found 2026-10-12: `app/(app)/index.tsx` lines 101 (fallback), 177, 220, 232; none from notifications or deep links.

## Spec Change Log

- 2026-10-12, decided by the human (accepted the drafted recommendations): slow new signup is released to Home and routed to onboarding once the empty sync completes; no banner or new strings; dev-client replica-download diagnosis is out of scope (file separately; verify on the `preview` build); cold-start-offline sign-in screen stays with 19.8. Frozen.

- 2026-10-12, party pass 2, applied by the human's call: the false "retried on next change" sentence replaced by a bounded retry then reactive fallback (closes a permanent-undecided trap for new accounts); undecided signal contract added; gate stays a redirect to Home; writer audit recorded. Frozen block untouched.
- 2026-10-12, party review (draft, awaiting human sign-off): added the read-only-while-undecided rule, the `/ladder` redirect, and Decision 5. Frozen Approach is unchanged in intent but now implies the gate; if the human wants the frozen block to say so, it needs an explicit renegotiation.

- 2026-10-12, party pass 3, applied by the human's call: retry exhaustion stays undecided (no reactive-empty fallback; restart recovers, accepted); late hit no longer calls `router.replace` after the hold expires; signal cleanup-reset contract and test; writer-audit grep recorded in Implementation Notes; one-line constraint noting the gate derives from the frozen Approach. Frozen block untouched.

- 2026-10-12, party pass 4, applied by the human's call: Home hides the `/ladder`-bound controls while undecided (no dead taps, no new strings; Decision 2 amended); retry attempts re-arm on each `lastSyncedAt` change, capped at 3 reads per checkpoint; writer audit corrected (`(onboarding)/ladder.tsx` also inserts, safe via the carve-out) and recorded; root context provider chosen for the signal; Maestro shards added to verification. Frozen block untouched.

## Review Triage Log

(empty)

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green
