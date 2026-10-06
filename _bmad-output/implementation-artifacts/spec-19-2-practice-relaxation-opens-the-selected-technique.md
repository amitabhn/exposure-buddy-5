---
title: 'Practice Relaxation Opens the Selected Technique'
type: 'bugfix'
created: '2026-10-06'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '940cb722f0a990450d71004d92d2d0f41132e821'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (Beta feedback items 3 and 6, severity 2; FR-RELAX-01.) Home's "Practice Relaxation" opens the exposure-flow technique picker for the lowest pending ladder item, and its Continue pushes `/session/intent` — so picking any option starts an exposure item. With an empty ladder it dumps the user on `/ladder`.

**Approach:** Give Practice Relaxation its own technique picker that is not tied to a ladder item or session. It lists the six named somatic techniques from the PRD — Box Breathing and 5-4-3-2-1 Grounding open their existing screens (`/calm-me/breathing`, `/calm-me/grounding`); 4-7-8 Breathing, Bhramari, Nadi Shodhana and Body Scan have no screen yet and open a "Coming soon" screen with a way back. The exposure flow's own use of `/session/technique` is untouched.

**Decision (2026-10-06, product owner):** the picker shows named techniques, not the three exposure-flow cards (Somatic / Breathing / Cognitive); cognitive techniques are not listed.

## Boundaries & Constraints

**Always:** No `exposure_sessions` row and no `fearItemId`/`sessionId` is created or passed by Practice Relaxation. Reuse the existing `/calm-me` technique screens; back from a technique returns to the picker. All new copy lives in `en.json` and `hi.json` (Hindi mirrors English per convention) with natural-speech accessibility labels; neutral, non-clinical wording. Practice Relaxation works with an empty ladder.

**Never:** Do not change `/session/technique`, `ladder.tsx`'s "Start session", or `intent.tsx`. Do not duplicate the breathing or grounding screens. Do not add a migration, a PowerSync table, or MMKV state. Do not change the Insta Calm FAB or `/calm-me/index`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open from Home, ladder has items | Tap Practice Relaxation | Picker opens; route has no `fearItemId`/`sessionId` | N/A |
| Open from Home, empty ladder | Tap Practice Relaxation | Picker opens (not `/ladder`) | N/A |
| Built technique | Pick Box Breathing or 5-4-3-2-1 Grounding | `/calm-me/breathing` or `/calm-me/grounding`; back returns to the picker | N/A |
| Unbuilt technique | Pick 4-7-8, Bhramari, Nadi Shodhana or Body Scan | "Coming soon" screen naming it, with a back control to the picker | Unknown key falls back to the generic message |
| Exposure flow | Ladder item → Start session → technique → Continue | Still reaches `/session/intent` | N/A |

</frozen-after-approval>

## Code Map

- `apps/mobile/app/(app)/index.tsx` -- `handlePracticeRelaxation` (`:106`) builds a `/session/technique` URL via `buildSessionRoute`; reroute to the new picker and drop `'/session/technique'` from that helper's union
- `apps/mobile/app/(app)/index.test.tsx` -- asserts the old `/session/technique?fearItemId=…` URL and the empty-ladder `/ladder` fallback (`:181`, `:187`); update both
- `apps/mobile/app/session/technique.tsx` -- exposure-flow picker; its Continue pushes `/session/intent`. Reference for card styling only; do not modify
- `apps/mobile/app/ladder.tsx` -- `:502` is the real caller of `/session/technique`; leave it
- `apps/mobile/app/calm-me/breathing.tsx`, `grounding.tsx` -- standalone techniques with no params; both exit via `router.back()`, so back returns to the picker
- `apps/mobile/app/_layout.tsx` -- root Stack; register the new `relaxation` route next to `calm-me` / `session` (`:135-140`)
- `apps/mobile/src/components/navigation/BackButton.tsx` -- reuse for headers
- `apps/mobile/src/i18n/locales/en.json`, `hi.json` -- `session.technique.*` is the exposure-flow card copy (leave it); add a `relaxation.*` block — picker title, a label and short description for each of the six techniques, coming-soon title/body/back
- `apps/mobile/app/session/technique.test.tsx` -- must keep passing untouched

## Tasks & Acceptance

**Execution:**
- [x] `apps/mobile/app/relaxation/_layout.tsx`, `index.tsx` -- picker screen listing the six techniques; the two built ones route to `/calm-me/breathing` and `/calm-me/grounding`, the rest to coming-soon; no ladder or session params
- [x] `apps/mobile/app/relaxation/coming-soon.tsx` -- generic screen reading the technique key from params, with a back control
- [x] `apps/mobile/app/_layout.tsx` -- register the `relaxation` stack screen
- [x] `apps/mobile/app/(app)/index.tsx` -- `handlePracticeRelaxation` → `router.push('/relaxation')`; narrow `buildSessionRoute`
- [x] `apps/mobile/src/i18n/locales/en.json`, `hi.json` -- new `relaxation.*` keys
- [x] `apps/mobile/app/(app)/index.test.tsx`, new `app/relaxation/*.test.tsx` -- tests for the I/O matrix: both Home cases, each technique's route (built vs coming-soon), coming-soon with back, picker carries no `fearItemId`/`sessionId`

**Acceptance Criteria:**
- Given Home, when the user taps Practice Relaxation with or without ladder items, then the relaxation picker opens and no exposure session or `exposure_sessions` write occurs
- Given a technique with a screen, when it is chosen, then that screen opens and back returns to the picker
- Given a listed technique with no screen, when it is chosen, then a "Coming soon" screen shows with a visible way back and no crash
- Given the exposure flow, when a session is started from the ladder, then `/session/technique` → `/session/intent` behaves as before and its tests pass unchanged
- Given English and Hindi, when the new screens render, then all text comes from locale keys and every control has an accessible label

## Implementation Notes

- Implemented directly from the spec (no subagent). Files: new `app/relaxation/{_layout,index,coming-soon}.tsx` (+ tests), new `src/relaxation/techniques.ts` (+ test), `app/_layout.tsx` (registers `relaxation`), `app/(app)/index.tsx` (handler → `/relaxation`; `buildSessionRoute` narrowed to `/session/intent`), `en.json` / `hi.json` (`relaxation.*`, Hindi mirrors English per convention), `app/(app)/index.test.tsx` (two Practice Relaxation tests rewritten).
- The technique list lives in the mobile app (`src/relaxation/techniques.ts`), not `packages/core`: it is route data, not domain logic, so no `packages/core` change.
- Coming-soon takes the technique key as a route param and falls back to a generic message for an unknown or missing key.
- The "back returns to the picker" rows rely on `router.back()` in the existing `/calm-me/breathing` and `/calm-me/grounding` screens (already covered by their own tests) and on the picker `push`ing onto the stack; no extra test added for the stack itself.
- Verified: full mobile Jest 564/564 (45 suites), `eslint app src`, `tsc --noEmit` clean; `session/technique.test.tsx` and `ladder.test.tsx` pass unchanged.
- `sprint-status.yaml`: story flipped to `in-progress`; the long `last_updated` history comment was preserved.
- Review patches (2026-10-06): double-tap guard on the picker, `en`/`hi` key-parity test, sturdier picker and Home assertions, `buildSessionRoute` parameter dropped. After patches: affected suites 83/83, `eslint` and `tsc` clean.
- Device verification (Android dev client on this branch): picker opens with an empty ladder; Box Breathing and 5-4-3-2-1 Grounding open and back returns to the picker; a Coming soon technique names itself and both its "Back to techniques" button and hardware back return to the picker; edge-swipe back from the picker returns to Home. Not run on device: Practice Relaxation with a pending ladder item and the exposure-flow regression (both covered by Jest; `session/technique.test.tsx` and `ladder.test.tsx` pass unchanged).
- Observation: the picker shows "Practice Relaxation" twice (navigation header and heading), the same pattern as the existing `session/technique.tsx`.

## Spec Change Log

## Review Triage Log

Layers run 2026-10-06 as subagents: Blind Hunter (11 findings), Edge Case Hunter (6), Verification Gap (none). No intent_gap or bad_spec entries, so no loopback; `review_loop_iteration` stays 0.

| # | Layer | Finding | Verdict | Route / evidence |
|---|-------|---------|---------|------------------|
| 1 | Blind | `buildSessionRoute` keeps a single-value `path` parameter and a stale comment | low | patch — parameter dropped, comment updated (`(app)/index.tsx`) |
| 2 | Blind | `hi.json` mirrors English for all of `relaxation.*`; no tracked follow-up | low | rejected — the spec's Boundaries state the existing convention (Hindi mirrors English); translating is outside this story |
| 3 | Blind | Hindi test only checks truthiness; nothing compares the `en`/`hi` key sets | low | patch — added a deep key-parity test (`techniques.test.ts`) |
| 4 | Blind | Back-returns-to-picker unproven: the picker pushes a `/calm-me/*` route in another navigator | false | verified on device (Redmi K20 Pro, dev client on this branch): Box Breathing, 5-4-3-2-1 Grounding and Coming soon all return to the picker via hardware back; "Back to techniques" works; edge-swipe back from the picker returns to Home |
| 5 | Blind | Header configured at root, nested layout and per screen; literal colours elsewhere | false | mirrors the existing `session/technique.tsx` pattern; no header flash seen on device |
| 6 | Blind | Hint repeats the description; unbuilt techniques not announced as such | low | hint is not duplicated (the label overrides the children, the hint is the description); marking unbuilt cards needs new UI behaviour, so the fix edits the spec — rejected |
| 7 | Blind | Four dead-end cards with no visible "Coming soon" badge; no follow-up for cognitive techniques | low | rejected — the feedback specifies Coming soon on tap; a badge edits the spec. Candidate follow-up if wanted |
| 8 | Blind | `technique` param may be a `string[]` | low | rejected — contrived (repeated param in a hand-built deep link), harmless generic fallback, fix adds a branch |
| 9 | Blind | Spec `in-review` vs sprint `in-progress`; long `last_updated` comment; `.env.local.disabled` untracked | false | `in-review` is set by this step and sprint status is synced at presentation; the comment pattern pre-exists; the untracked file is excluded from the diff |
| 10 | Blind | No analytics/history; FAB and Practice Relaxation duplicate entry points | false | the spec says no new persistence; the FAB reaches Insta Calm, a different entry from Practice Relaxation |
| 11 | Blind | Brittle tests: hard-coded count, loose regex, unchecked non-null access | low | patch — loops the technique list, asserts on route shape, safe destructuring (`index.test.tsx` ×2) |
| 12 | Edge | Rapid double tap pushes duplicate technique screens | medium | patch — focus-re-armed guard (same pattern as the onboarding ladder); new test fails without the guard (mutation-checked) |
| 13 | Edge | Array param (see 8) | low | rejected, as 8 |
| 14 | Edge | Coming soon `router.back()` with no history after a deep link | low | rejected — reachable only from the picker; same `router.back()` pattern as `BackButton` everywhere |
| 15 | Edge | Picker as stack root leaves the back control inert | low | rejected, as 14 |
| 16 | Edge | Hindi untranslated (see 2) | low | rejected, as 2 |
| 17 | Edge | No test for real-stack back-to-picker | false | verified on device (see 4) |


## Verification

**Commands:**
- `cd apps/mobile && npx jest relaxation "app/\(app\)/index" app/session/technique` -- expected: all pass
- `pnpm turbo typecheck lint` -- expected: clean

**Manual checks (if no CLI):**
- On a device: Home → Practice Relaxation → each option opens the right screen or Coming soon; back works; no session starts
