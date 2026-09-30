---
title: 'Insta Calm Affirmation Rotation'
type: 'feature'
created: '2026-09-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/spec-18-3-affirmations-content.md']
baseline_commit: '2f90ed06a98e7ca2e318ffa094fa52b5eee43c74'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `CALM_ME_AFFIRMATIONS` (`packages/core/src/config/calmMeConfig.ts`) is a single-entry array; both display sites (`apps/mobile/app/calm-me/index.tsx:107` and `apps/mobile/app/session/grounding.tsx:104`) hardcode `CALM_ME_AFFIRMATIONS[0]`, so a distressed user sees the identical line on every visit.

**Approach:** Add more entries to the array, and add a pure no-immediate-repeat selection function in `packages/core` that both display sites call. The previously-shown affirmation key is persisted per-user via MMKV (following the existing `AuthProvider` getter/setter pattern) so the "no repeat" guarantee holds across separate visits, not just within one screen mount, and is shared between the two display sites.

**Decisions (resolved 2026-09-30):**
- Affirmation copy: human-supplied verbatim. 15 new English entries append as `calmMe.affirmation.2` through `calmMe.affirmation.16` (existing `calmMe.affirmation.1` is untouched) — full text in `spec-18-3-affirmations-content.md` (listed in this spec's `context`).
- Hindi (`hi.json`): duplicate the English text for the 15 new entries, per this codebase's existing convention for not-yet-translated copy (`session.intent.intentionPrompt`, `session.debrief.saveFailed`) — placeholder pending real translation later.
- `calmMe.affirmation.1`'s pre-existing missing `hi.json` entry is left as-is — out of scope for this story.

## Boundaries & Constraints

**Always:**
- Selection logic lives in `packages/core` as a pure function (pool + previous key in, new key out) — zero `react-native`/`expo-*`/`@supabase/*` imports (ARC-011).
- The function must handle a single-entry pool without failing (returns that entry regardless of "previous").
- Persistence of "last shown" goes through a new `KV_KEYS` entry and a new `AuthProvider` getter/setter pair, mirroring `getLastUsedTechnique`/`setLastUsedTechnique` exactly (interface entry, default no-op, function body, value in the context object) — no new storage mechanism.
- Both `calm-me/index.tsx` and `session/grounding.tsx` read/write the *same* persisted key, so rotation state is shared across both entry points.
- New affirmation strings are i18n keys (`calmMe.affirmation.N`), added to both `en.json` and `hi.json` — the numeric-segment key pattern is already whitelisted in `apps/mobile/src/i18n/i18n.test.ts`'s `KEY_PATTERN`.

**Never:**
- Do not persist affirmation *content* anywhere — only the previously-shown key (an index into a static, non-sensitive list). No DPDPA consent/erasure surface is introduced.
- Do not change `CALM_ME_AFFIRMATIONS[0]`'s existing key (`calmMe.affirmation.1`) or its existing English text — only append.
- Do not fix the pre-existing broader `hi.json` `calmMe` gap (missing `debriefNow`, `comingSoon`, `back`, `technique.*`, etc.) — out of scope, unrelated to rotation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First-ever visit | No persisted "last shown" key | Any entry from the pool may be selected | N/A |
| Repeat visit | Persisted last-shown = key X, pool has ≥2 entries | Selection excludes X; picks uniformly among the rest | N/A |
| Single-entry pool | Pool = `['calmMe.affirmation.1']` only | Returns that one entry every time, no error | N/A |
| Cross-screen visit | User sees affirmation on `calm-me`, then immediately on `session/grounding` | Second screen does not repeat the first screen's affirmation (shared persisted state) | N/A |

</frozen-after-approval>

## Code Map

- `packages/core/src/constants/kvKeys.ts:12` (near `SESSION_LAST_TECHNIQUE`) -- add `LAST_AFFIRMATION: (userId: string) => \`calmMe:last_affirmation:${userId}\`` (user-scoped, retained across sign-out like `SESSION_LAST_TECHNIQUE` — non-sensitive rotation state, not DPDPA-scoped)
- `packages/core/src/config/calmMeConfig.ts` -- append new entries to `CALM_ME_AFFIRMATIONS` (keys `calmMe.affirmation.2`..`calmMe.affirmation.16`, i18n keys only — text lives in `en.json`/`hi.json`); add `selectNextAffirmation(pool: string[], previousKey: string | null): string` — uniform-random pick excluding `previousKey` when `pool.length > 1`, else returns `pool[0]`
- Affirmation text: see `spec-18-3-affirmations-content.md` (loaded via this spec's `context`) for the full verbatim list of the 15 new entries and their exact keys
- `packages/core/src/index.ts:36` -- add `selectNextAffirmation` to the existing `calmMeConfig` export line
- `packages/supabase/src/auth/AuthProvider.tsx:397-412` (`getLastUsedTechnique`/`setLastUsedTechnique`) -- exact pattern to copy for `getLastAffirmation(): string | null` / `setLastAffirmation(key: string): void`; also add to the interface block (~:50), the default context value (~:86-87), and the returned value object (~:482-485)
- `packages/supabase/src/auth/useAuth.ts:42-43,90-91` -- mirror the same two lines for `getLastAffirmation`/`setLastAffirmation` in the interface and the returned hook value
- `apps/mobile/app/calm-me/index.tsx:107` -- replace `CALM_ME_AFFIRMATIONS[0]!` with a selection computed via `selectNextAffirmation` + `useAuth()`'s new getter/setter (compute once per mount, not per render; persist the new selection immediately after computing it)
- `apps/mobile/app/session/grounding.tsx:104` -- same change, same pattern
- `apps/mobile/app/calm-me/index.test.tsx:48,76` / `apps/mobile/app/session/grounding.test.tsx:35,68` -- existing tests mock `CALM_ME_AFFIRMATIONS` as a single-entry array and assert index-0 text renders; extend `useAuth`/`AuthProvider` mocks in these files with the new getter/setter (returning `null`/no-op) so existing assertions keep passing unchanged, then add a rotation-specific assertion (setter called with the selected key)
- `apps/mobile/src/i18n/locales/en.json:345` (`calmMe.affirmation`) -- add the 15 new numeric keys with the text listed above
- `apps/mobile/src/i18n/locales/hi.json` (`calmMe` block, currently missing `affirmation` entirely) -- add the same 15 keys, duplicating the English text verbatim (placeholder pending real translation; `calmMe.affirmation.1` stays unadded, out of scope)

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/constants/kvKeys.ts` -- add `LAST_AFFIRMATION` key
- [x] `packages/core/src/config/calmMeConfig.ts` -- append the 15 new affirmation keys; add `selectNextAffirmation`
- [x] `packages/core/src/index.ts` -- export `selectNextAffirmation`
- [x] `packages/core/src/config/calmMeConfig.test.ts` (new) -- unit-test `selectNextAffirmation`: never repeats the previous key when pool.length > 1 (run many trials), returns the sole entry when pool.length === 1, handles `previousKey === null`
- [x] `packages/supabase/src/auth/AuthProvider.tsx` -- add `getLastAffirmation`/`setLastAffirmation` (interface, default, function, value object) following the `getLastUsedTechnique`/`setLastUsedTechnique` pattern exactly
- [x] `packages/supabase/src/auth/useAuth.ts` -- expose the same two functions
- [x] `packages/supabase/__tests__/auth/` -- extend existing `AuthProvider` coverage with get/set round-trip for the new key
- [x] `apps/mobile/app/calm-me/index.tsx` -- wire rotation selection in place of `CALM_ME_AFFIRMATIONS[0]`
- [x] `apps/mobile/app/session/grounding.tsx` -- same
- [x] `apps/mobile/app/calm-me/index.test.tsx` -- update mocks, add rotation assertion
- [x] `apps/mobile/app/session/grounding.test.tsx` -- update mocks, add rotation assertion
- [x] `apps/mobile/src/i18n/locales/en.json` -- add the 15 new `calmMe.affirmation.N` entries (text in `spec-18-3-affirmations-content.md`)
- [x] `apps/mobile/src/i18n/locales/hi.json` -- add the same 15 entries, English text duplicated as placeholder

**Acceptance Criteria:**
- Given a pool with 2+ affirmations and a persisted previous selection, when either `calm-me` or `session/grounding` mounts, then the displayed affirmation is never the same key as the persisted previous one
- Given a pool with exactly 1 affirmation, when either screen mounts, then that one entry displays with no error thrown
- Given a user sees an affirmation on `calm-me`, when they subsequently reach `session/grounding` in the same or a later app session, then the second screen's affirmation differs from the first (shared persisted state)
- Given `pnpm turbo lint`, when it runs, then the i18n literal-string and key-naming checks pass with no new violations

## Implementation Notes

- Matrix Test Audit gap closed: `apps/mobile/app/calm-me/index.test.tsx` and `apps/mobile/app/session/grounding.test.tsx` previously mocked `selectNextAffirmation` as a trivial `(pool) => pool[0]` that ignored `previousKey`, so no test actually proved the persisted "last shown" affirmation was threaded through across screens. Both mocks are now `jest.fn()` (same default behavior, so existing assertions are unchanged), and each file adds a test that sets `mockGetLastAffirmation.mockReturnValue('calmMe.affirmation.7')` and asserts `selectNextAffirmation` was called with `(CALM_ME_AFFIRMATIONS_MOCK, 'calmMe.affirmation.7')` -- proving each screen reads the shared persisted value and passes it through as `previousKey`, closing the Cross-screen visit row of the I/O & Edge-Case Matrix.
- Review pass 1 patches applied (2026-09-30): `LAST_AFFIRMATION`'s namespace renamed `calmMe` -> `calm_me` (matches sibling snake_case convention); `selectNextAffirmation`'s dead duplicate-pool fallback branch now covered by a test; the deleted extension-point comment on `CALM_ME_AFFIRMATIONS` was restored (updated to name the i18n files); both screen test files' `mockGetLastAffirmation` stub now resets in `afterEach` so it can't leak into later tests; `authProvider.lastAffirmation.test.ts` gained a `renderAuthProvider`-pattern describe block (mirroring `authProvider.pendingDeletion.test.ts`) that round-trips `getLastAffirmation`/`setLastAffirmation` through the real `AuthProvider`, with the original inline-replica tests kept (renamed `replica*`) for the userId-scoping/overwrite cases they still uniquely cover. Full `pnpm turbo typecheck`/`lint`/`test` re-run clean after patches (10/10, 8/8, 9/9 tasks; mobile 486/486 tests).

## Spec Change Log

## Review Triage Log

**Review pass 1 (2026-09-30, Blind Hunter + Edge Case Hunter + Verification Gap):**

- `apps/mobile/app/calm-me/index.tsx` / `session/grounding.tsx` — `setLastAffirmation` called inside a `useState(() => ...)` lazy initializer, claimed unsafe under React Strict Mode double-invocation — **false.** Grepped the whole `apps/mobile` tree for `StrictMode`: zero matches, confirming the app does not use it anywhere. Story 18.2's own Implementation Notes independently documented the identical non-issue for an analogous lazy-`useState` pattern in this same codebase ("No React StrictMode in this app, so the one-shot lazy-`useState` consumption is safe from double-invocation").
- `hi.json`'s `calmMe.affirmation` block — claimed that Hindi users now hit a random ~1/16 "missing-key" affirmation instead of the previous 100%-predictable gap — **false.** Verified `en.json`/`hi.json`: entries `.2`-`.16` in `hi.json` are the English text duplicated verbatim (per this story's explicit Decision), identical to what i18next's `fallbackLng: 'en'` already produces for the still-missing `.1`. The rendered text is 100% English either way, both before and after this diff — no behavior change, just a different code path producing the same output.
- Spec frontmatter `status: 'in-review'` vs. `sprint-status.yaml`'s narrative comment ("ready-for-dev... implementation started") — **false.** Direct precedent already recorded in this exact codebase: Story 18.2's own Review Triage Log ruled the identical claim false — `sprint-status.yaml` is only synced at named workflow checkpoints (ready-for-dev, in-progress, done); step-04 never calls for an in-review sync, so this divergence is expected.
- `## Spec Change Log` / `## Review Triage Log` empty despite all Execution tasks checked — **false.** Both sections populate only during/after this review step (Change Log on a `bad_spec` loopback only, Triage Log during this very pass) — being empty pre-review is the expected state, not a defect.
- `selectNextAffirmation` with an empty pool (`pool.length === 0`) returns `undefined` — **low, rejected.** Unreachable with real data: `CALM_ME_AFFIRMATIONS` is a fixed 16-entry literal, never dynamically emptied, and the only two call sites use it directly. The fix (a new guard/throw) is more than a direct correction, and the defect is unlikely to be encountered in practice — rejected per the low-finding rule.
- `getLastAffirmation`/`setLastAffirmation` no-op (return `null`/no-op) when `authState.userId` is falsy, so the no-repeat guarantee silently doesn't hold for an unauthenticated visit — **low, rejected.** Verified real: `CalmMeFab` (`apps/mobile/src/components/CalmMeFab.tsx`) has no auth gate and is mounted globally, so this is technically reachable pre-sign-in. But every other MMKV-backed preference in this codebase (`getLastUsedTechnique`, `getReminderTime`, etc.) has the identical no-op-without-userId property by design — this story's spec explicitly directed mirroring that exact pattern "exactly." A guest has no persisted preferences of any kind in this app; "fixing" this would mean adding a device-scoped fallback that contradicts the spec's explicit design decision — more than a direct correction, and unlikely to be noticed in practice. Rejected per the low-finding rule.
- `selectNextAffirmation`'s `effectiveCandidates = candidates.length > 0 ? candidates : pool` fallback branch (only reachable when every pool entry equals `previousKey`) has zero test coverage — **low, patch.** Verified: with the real 16 unique-string pool this branch can never trigger; it's only reachable with a contrived duplicate-value pool. Real gap, trivial fix (one test).
- `packages/core/src/constants/kvKeys.ts`'s new `LAST_AFFIRMATION` key uses a camelCase namespace segment (`calmMe`) where every sibling key uses snake_case (`session:...`, `notifications:...`, `account:...`) — **low, patch.** Verified against the file directly. Brand-new key, no migration cost; trivial rename.
- `calmMeConfig.ts`'s removed comment ("Post-MVP rotation: add more entries here — no other code changes needed.") was a deliberate extension-point breadcrumb, deleted with no replacement — **low, patch.** Verified removed in the diff with nothing added back. Trivial: restore a short comment describing the (now-true) extension point.
- New cross-screen-sharing tests in `calm-me/index.test.tsx`/`grounding.test.tsx` call `mockGetLastAffirmation.mockReturnValue('calmMe.affirmation.7')` with nothing resetting it afterward; `jest.clearAllMocks()` in `beforeEach` clears call history but not a previously-set `mockReturnValue`, so the stub leaks into every later test in the file — **low, patch.** Verified against Jest's documented `clearAllMocks`/`resetAllMocks` distinction and the diff's `beforeEach`. Currently harmless (no other test asserts on `getLastAffirmation`'s return value), but a real footgun for the next test added to either file. Trivial fix.
- `getLastAffirmation`/`setLastAffirmation`'s real `AuthProvider.tsx` implementation (and, by extension, the cross-screen "shared state" mechanism the story's headline behavior depends on) is never exercised by any test — only a hand-copied reimplementation (`authProvider.lastAffirmation.test.ts`) and screen-level mocks that bypass `AuthProvider` entirely — **medium, patch.** Verified: `authProvider.lastAffirmation.test.ts` defines its own local functions, never importing from `AuthProvider.tsx`; confirmed a wrong `KV_KEYS` call or dropped `?? null` would ship undetected. Distinguishes from Story 18.2's precedent for the same class of finding (deferred there as "an unplanned package-wide test-architecture change") because a real-render helper already exists in the same test directory (`authProvider.pendingDeletion.test.ts`'s `renderAuthProvider`, itself added after an earlier code-review correction for this exact concern: "a hand-copied replica can stay green while the real component regresses") — reusing it here is cheap and well-precedented, not an architecture-wide change.
