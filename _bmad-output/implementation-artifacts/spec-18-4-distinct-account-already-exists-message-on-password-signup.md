---
title: 'Distinct "Account Already Exists" Message on Password Sign-Up'
type: 'bugfix'
created: '2026-09-30'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: '36a45f6'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `classifyPasswordSignUpError` (`apps/mobile/app/(auth)/sign-in.tsx:120-129`) collapses every thrown, non-rate-limited `signUp()` error into the generic `auth.password.signUpError` ("Failed to create your account. Please try again."). Locally, GoTrue throws an explicit `422 user_already_exists` error for a duplicate identifier, so this path — not the adjacent no-session branch at `:409-411` — is what local/dev users actually hit, and it tells them neither what went wrong nor what to do. The code comment at `:123-126` wrongly asserts this thrown-error path can never be a duplicate; Story 12.1's live verification disproved that.

**Approach:** Add a duplicate-account branch to `classifyPasswordSignUpError` that detects GoTrue's explicit rejection (`error.code === 'user_already_exists'`, with a message-substring fallback for `'user already registered'` in case `code` is absent) and routes it to the same existing `auth.password.signUpUnavailable` copy already used by the no-session branch, so the experience is identical regardless of which of the two backend behaviors (local throw vs. production's silent email-enumeration-protected no-session) is active. Correct the now-disproven comment. This is a deliberate, recorded product decision: revealing "this identifier is already registered" is a modest enumeration-surface tradeoff against Supabase's concealment, accepted here for the usability case of an anxiety-focused health app — not an incidental side effect. No new i18n key is introduced (the existing `signUpUnavailable` key is reused), so no `en.json`/`hi.json` changes are needed. Add test coverage in `apps/mobile/app/(auth)/sign-in.test.tsx` for the thrown-422 path (new test) alongside the existing no-session test, asserting both produce `auth.password.signUpUnavailable`.

</frozen-after-approval>

## Implementation Notes

- `classifyPasswordSignUpError` now takes an optional `code` param, checked via a new `isDuplicateAccountError` helper. During Blind Hunter review, broadened the code check beyond `user_already_exists` alone to also cover auth-js's sibling `ErrorCode` values `email_exists`, `phone_exists`, and `identity_already_exists` (confirmed present in the installed `@supabase/auth-js@2.117.2` type union) — a future/version-shifted GoTrue response using one of those for the same duplicate-identifier condition would otherwise silently regress to the generic `signUpError` copy, the exact bug class this story exists to close. Widened the message-substring fallback from `'user already registered'` to `'already registered'` so it isn't email-wording-specific.
- Test coverage: added 3 tests (thrown `user_already_exists`, thrown `phone_exists` via a phone-identifier signup, and a code-less message-fallback case), plus corrected the existing no-session test's sibling by omitting the unread `data` field from the new tests' mocks (the code returns before reading `data` when `error` is set, so including it was misleading, per review).
- `isDuplicateAccountError` and its `DUPLICATE_ACCOUNT_ERROR_CODES` constant were placed next to `isRateLimitedError`, their sibling shared-detection helper, rather than immediately above `classifyPasswordSignUpError`.
- Verification: `pnpm --filter exposure-buddy-mobile typecheck` clean, `pnpm --filter exposure-buddy-mobile lint` clean, `npx jest sign-in.test` → 25/25 passing (apps/mobile).
- Reviewed by a Blind Hunter subagent (context-free, 8 findings); see Review Triage Log below.

## Review Triage Log

- **medium — patch applied.** `isDuplicateAccountError` only matched `user_already_exists` + a `'user already registered'` message substring; sibling auth-js `ErrorCode` values (`email_exists`, `phone_exists`, `identity_already_exists`) covering the same underlying condition (confirmed via a future GoTrue version, or a different identifier type) would silently fall through to the generic `signUpError` copy — the exact bug class this story exists to close. Evidence: `email_exists`/`phone_exists`/`identity_already_exists` are live members of the installed `@supabase/auth-js@2.117.2` `ErrorCode` union; `supabase/config.toml` pins no GoTrue image version, so version drift is plausible. Fixed by broadening the code check to a `DUPLICATE_ACCOUNT_ERROR_CODES` set and widening the message fallback to `'already registered'`.
- **low/medium — patch applied.** The message-substring fallback had zero standalone test coverage — the original new test supplied both `code` and a matching `message`, so only the `code` branch was ever exercised. Fixed by adding a dedicated fallback test with no `code` field.
- **medium — patch applied (same root cause as the first finding).** No test covered a duplicate-signup for a phone identifier; GoTrue's phone-duplicate error shape was unverified against the fix. Fixed by adding a phone-identifier test using the `phone_exists` code (now covered by the broadened check) rather than guessing at phone-specific message wording.
- **low — deferred.** `hi.json`'s `auth` object has no `password` subsection at all, so the reused `signUpUnavailable` key has no Hindi translation. Pre-existing gap predating this story (Epic 10), not introduced or worsened here since no new key was added. Logged in `deferred-work.md`.
- **low — patch applied.** Spec frontmatter was missing `baseline_commit`, present in sibling epic-18 and other oneshot specs. Added `baseline_commit: '36a45f6'` (the commit `main` was at when the `story/18-4-...` branch was cut).
- **low — patch applied.** `## Implementation Notes` was empty at review time despite working code/tests/verification already existing. Filled in with decisions, files touched, and verification commands/results.
- **low — patch applied.** The new thrown-error test's mock paired a truthy `error` with `data: { session: null }`, blurring the distinction from the adjacent no-session test's mock shape even though the code never reads `data` on that path. Fixed by omitting `data` from the three new tests' mocks.
- **low — rejected.** Reviewer flagged `isDuplicateAccountError`'s original placement (between `classifyPasswordSignInError` and `classifyPasswordSignUpError`) as inconsistent with its sibling `isRateLimitedError`. Real but purely cosmetic; folded into the same patch that broadened the check (moved it next to `isRateLimitedError` while fixing the first finding), so no separate action was needed.
