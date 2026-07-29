# Story 10.4: Fix Non-Functional `perform_user_erasure()` (NOT NULL Constraint Bug)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a DPO fulfilling a DPDPA erasure request,
I want `perform_user_erasure()` to actually succeed when called,
so that the "right to erasure" feature works end-to-end instead of failing on every invocation (DPDPA 2023 §5 completeness requirement; PRD's "erasure requests fulfilled within 72 hours of receipt").

## Acceptance Criteria

1. **Given** `public.users.email` has been `TEXT NOT NULL` since migration `0001_users.sql`, and `perform_user_erasure()` (migration `0007_perform_user_erasure_fn.sql`) unconditionally runs `UPDATE public.users SET email = NULL, deleted_at = now() ...`
   **When** this story is implemented
   **Then** a new migration `supabase/migrations/0031_users_email_nullable.sql` drops the `NOT NULL` constraint on `public.users.email` — matching migration `0005`'s already-documented design intent ("email and auth identity are nulled alongside `deleted_at` being set", `COMMENT ON COLUMN public.users.deleted_at`) — so the erasure `UPDATE` no longer violates a constraint.

2. **Given** `supabase/functions/dpo-erase-user/index.ts:93` calls `perform_user_erasure` via `service_role` RPC as the real DPO-panel erasure path
   **When** the migration is applied (locally and on the hosted project)
   **Then** a real erasure call against a seeded test user succeeds end-to-end — the RPC returns no error, `public.users.email` is `NULL`, and `deleted_at` is set to a non-null timestamp for that user.

3. **Given** Story 10.2's EXECUTE-privilege regression test (`packages/supabase/__tests__/rls/perform_user_erasure.test.ts`) was deliberately scoped to grant-level correctness only, with an inline comment explaining the function body was known-broken at the time
   **When** this story is implemented
   **Then** that test file is extended so the existing `service_role` test (or a new test alongside it) asserts full functional success — not just "not a `42501`" — and the scoping comment explaining the prior limitation is removed or corrected to reflect that the bug is now fixed.

4. **Given** three Edge Functions already read `public.users.email` defensively (`dpo-export-user/index.ts:147` — `u.email ?? null`; `dpo-pending-requests/index.ts:88` — `(row.email as string | null) ?? null`; `dpo-panel/index.ts:233` — explicit null check with `'(email not available)'` fallback), suggesting the codebase already anticipated a nullable `email` column that the schema never actually allowed
   **When** this story is implemented
   **Then** no changes are needed in those three files — this AC exists to confirm (not silently assume) that regenerating `database.types.ts` with the now-nullable `email: string | null` does not produce new TypeScript errors in `packages/supabase` or any Edge Function. `packages/core` and `apps/mobile` must remain untouched — no code there reads `public.users.email` directly (only `session.user.email` from the Auth session, which is already `string | undefined`-typed and unrelated to this table).

5. **Given** `database.types.ts` is generated, never hand-edited (`implementation-patterns-consistency-rules.md`)
   **When** the migration is applied locally
   **Then** it is regenerated via `supabase gen types typescript --local > packages/supabase/src/database.types.ts`, and the `users.Row.email` field changes from `string` to `string | null`.

## Tasks / Subtasks

- [x] Task 1 — Add and apply the schema-fix migration (AC: #1, #2)
  - [x] Create `supabase/migrations/0031_users_email_nullable.sql`:
    ```sql
    -- Migration 0031: allow public.users.email to be NULL
    -- Fixes a bug where perform_user_erasure() (migration 0007) has been unable to
    -- succeed since migration 0001 first created this column as NOT NULL — every
    -- erasure call fails with 23502 (not_null_violation). Migration 0005's own
    -- comment on public.users.deleted_at already documented the intended design:
    -- "email and auth identity are nulled alongside [deleted_at] being set" — the
    -- column constraint was simply never updated to match. DPDPA 2023 §5.

    ALTER TABLE public.users
      ALTER COLUMN email DROP NOT NULL;
    ```
  - [x] Apply locally: `supabase migration up` (or `supabase db reset`) against a running `supabase start` stack. Confirm via `\d public.users` (or an equivalent query) that `email` is now nullable. — Applied; confirmed via `docker exec ... psql -c "\d public.users"` (no longer shows `not null`). While applying, discovered the local Docker stack was stuck on a stale `exposure-buddy`-labeled container/volume set left over from before Story 10.2's `project_id` link (Story 10.2's code-review "stop the stale stack" patch didn't fully resolve it — the CLI kept reusing the old labeled volume on `start` rather than creating fresh `jhbtzsvlgglyfbrgmpsb`-named containers). Removed the stale containers and volumes (user-approved) and did a clean `supabase start`, confirmed correct naming this time, then re-ran `migration up` to bring the fresh stack to 0031.
  - [x] Apply to the hosted project via the Supabase MCP `apply_migration` tool (`project_id: jhbtzsvlgglyfbrgmpsb`) — same pattern Story 10.2 used for migration 0030. Confirm via `list_migrations` that `0031_users_email_nullable` registers as applied. — Applied via MCP, confirmed present in `list_migrations` output (version `20260728162717`).
  - [x] Do not touch migration `0007`'s function body — its `UPDATE ... SET email = NULL` logic was always correct; only the table constraint was wrong. No `CREATE OR REPLACE FUNCTION` needed. — Confirmed: migration 0007 untouched.

- [x] Task 2 — Regenerate `database.types.ts` (AC: #5)
  - [x] Run `supabase gen types typescript --local > packages/supabase/src/database.types.ts` against the migrated local stack. — Generated to a temp file first, diffed, then applied.
  - [x] Confirm the diff is limited to `users.Row.email` (and `Insert`/`Update` variants, if present) changing from `string` to `string | null` — no unrelated schema drift should appear in the generated file. If anything else changed, halt and report to the user rather than assuming it's expected (the local stack must be fully up to date with all 31 migrations before generating, or unrelated diffs will appear). — Confirmed: diff is exactly 3 lines, all `users.email` (`Row`, `Insert`, `Update`), nothing else changed.

- [x] Task 3 — Verify no downstream TypeScript breakage (AC: #4)
  - [x] Run `pnpm turbo typecheck` after regenerating types. `packages/supabase` is the only package that imports `database.types.ts` (architecture rule: never imported outside `packages/supabase`) — confirm it still compiles cleanly. — 10/10 tasks pass, all 6 workspace packages clean.
  - [x] Do not modify `dpo-export-user/index.ts`, `dpo-pending-requests/index.ts`, or `dpo-panel/index.ts` — they already handle a nullable `email` defensively (see Dev Notes). Confirm this by reading each cited line, not by assuming the AC's claim is correct. — Re-read all three cited lines directly; confirmed each already defensively handles `null`/`undefined` email exactly as the story claimed. No changes made.

- [x] Task 4 — Extend the EXECUTE-privilege test to assert full functional success (AC: #3)
  - [x] In `packages/supabase/__tests__/rls/perform_user_erasure.test.ts`, update the third test (`'[+] service_role has EXECUTE privilege on perform_user_erasure (not blocked at the grant level)'`) to also assert the call fully succeeds now that the schema bug is fixed:
    - `error` is `null` (not just "not `42501`")
    - Querying `public.users` afterward for the target row shows `email: null` and `deleted_at` is a non-null timestamp
  - [x] Remove or correct the test's inline comment block explaining the prior NOT NULL bug and scoping rationale — it should now say the bug is fixed and reference this story instead of describing an open, unrelated issue.
  - [x] Rename the test title to reflect full success (e.g. `'[+] service_role can execute perform_user_erasure and the erasure fully succeeds'`), since "not blocked at the grant level" undersells what's now being verified.
  - [x] Keep the `[-]` anon/authenticated privilege-denial tests unchanged — they are unaffected by this fix and still correctly guard migration 0030's revoke. — Confirmed unchanged. Full file run: 23/23 test files, 105/105 tests pass against the fresh local stack.

- [x] Task 5 — Close out the deferred-work entry (AC: #1–#3)
  - [x] In `_bmad-output/implementation-artifacts/deferred-work.md`, find the "URGENT — perform_user_erasure() is currently non-functional (discovered 2026-07-28)" section (added during Story 10.2's code review). Mark it resolved: add a short note at the top of that section stating it was fixed by this story, with the story key and date, rather than deleting the section outright (preserves the historical record of how the bug was found, per this repo's established deferred-work.md convention of leaving a citation trail). — Done: heading changed to "RESOLVED", note added citing this story.

- [x] Task 6 — Verification (AC: #1–#5)
  - [x] `pnpm turbo typecheck lint test` green — in particular confirm `packages/supabase`'s test count goes up (the extended/renamed test in Task 4) and none of the other 22 test files regress. — 19/19 tasks pass; `packages/supabase` 23/23 files, 105/105 tests (same count as before — Task 4 extended an existing test rather than adding a new one); mobile 388/388.
  - [x] Manually or via the Edge Functions test harness, confirm `dpo-erase-user` succeeds end-to-end against a real seeded user on the local stack (the actual DPO-panel code path, not just the raw RPC) — this closes the loop on AC #2's "real erasure call" framing at the Edge Function level, not only the RPC level. — **Blocked, not fixed here:** the local `edge-runtime` container fails to boot *any* Edge Function on this stack (`worker boot error: failed to bootstrap runtime: failed to determine entrypoint`, HTTP 503 `BOOT_ERROR`) — confirmed this is systemic (an unrelated function, `dpo-audit-log`, fails identically), not caused by this story's changes. AC #2's actual requirement — "the RPC returns no error, email is NULL, deleted_at is set" — is fully proven by Task 4's extended test, which calls the same RPC `dpo-erase-user/index.ts:93` calls, with `dpo-erase-user`'s own code around it unchanged and statically confirmed correct (Task 3). Filed the boot failure separately in `deferred-work.md` as a local-dev-environment issue, out of this story's scope.
  - [x] Confirm via the Supabase MCP (`list_migrations`) that `0031_users_email_nullable` is applied on the hosted project. — Confirmed present (version `20260728162717`).

### Review Findings

_Post-implementation code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) against commit `922c88f`, 2026-07-28. 3 patches, 3 deferred, 6 dismissed as noise below._

- [x] [Review][Patch] No DB-level guardrail after dropping `NOT NULL` on `public.users.email` — `users_own_row_update` RLS policy (`supabase/migrations/0002_rls.sql`) has `USING (auth.uid() = id)` but no `WITH CHECK`, and `authenticated` has a table-level `UPDATE` grant covering all columns (`0024_grant_table_permissions.sql`). Any signed-in user can now null their own `email` via a direct `update({email: null})` call, producing a state indistinguishable from real DPDPA erasure — no audit-log entry, no operator authorization, no auth ban. Verified no legitimate app code updates `users.email` directly (`grep` across `apps/mobile`, `packages/core`, `packages/supabase/src` — empty), so a guard is safe to add. Fix: new migration adding a `WITH CHECK` clause (or equivalent) to `users_own_row_update` requiring `email IS NOT NULL` for non-service-role callers. [supabase/migrations/0002_rls.sql] — **Fixed:** added `supabase/migrations/0032_users_email_not_null_via_rls.sql` (`ALTER POLICY "users_own_row_update" ON public.users WITH CHECK (email IS NOT NULL)`), applied locally and on the hosted project. `service_role` bypasses RLS (BYPASSRLS), so the real erasure path is unaffected. Added a regression test in `packages/supabase/__tests__/rls/users.test.ts` confirming an authenticated user gets `42501` attempting to null their own email, and the row is unchanged.
- [x] [Review][Patch] Test never exercises the `profiles.display_name` half of the erasure transaction — `beforeAll` only seeds `public.users`, never `public.profiles`, so Step 2 of `perform_user_erasure()` (`UPDATE public.profiles SET display_name = NULL ...`) runs against zero matching rows. The test's title ("erasure fully succeeds") overclaims what it verifies. Fix: seed a `profiles` row for the test user in `beforeAll`, add an assertion that `display_name` is `NULL` post-erasure. [packages/supabase/__tests__/rls/perform_user_erasure.test.ts] — **Fixed:** `beforeAll` now also inserts a `profiles` row; the `service_role` test asserts `display_name` is `NULL` post-erasure.
- [x] [Review][Patch] Test discards the post-erasure `.select('email, deleted_at').eq(...).single()` call's `error` — a failed select would silently produce `undefined` fields rather than surfacing the real failure. Fix: also assert the select's `error` is `null`. [packages/supabase/__tests__/rls/perform_user_erasure.test.ts] — **Fixed:** both the `users` and `profiles` post-erasure selects now destructure and assert `error` is `null`.
- [x] [Review][Defer] Re-erasure of an already-erased user now silently "succeeds" — re-stamps `deleted_at`, and `dpo-erase-user` writes a second, indistinguishable `outcome: 'success'` audit-log entry. Previously masked because every call failed regardless of erasure state; this diff makes the pre-existing lack of an idempotency guard (in migration 0007's function body, unchanged by this story) reachable for the first time. Fixing requires touching either that SECURITY DEFINER function body or `dpo-erase-user/index.ts` — both outside this story's stated scope. — deferred, same precedent as Story 10.4 itself (found mid-story, deferred as its own fast-follow rather than expanding scope)
- [x] [Review][Defer] AC #2's Edge-Function-level erasure path (`dpo-erase-user`, not just the raw RPC) was never actually exercised — blocked by the separately-filed local `edge-runtime` boot failure (see `deferred-work.md`). — deferred, re-verify once that boot failure is fixed
- [x] [Review][Defer] AC #4's "no new TypeScript errors in any Edge Function" was confirmed by manually re-reading the three cited files, not by an actual Deno compile check — mitigated since none of the three Edge Functions import `database.types.ts` (confirmed via `grep`), so the coupling AC #4 worried about is architecturally absent. — deferred, tighten verification rigor (an actual `deno check`) next time a story touches shared types that Edge Functions might consume

_Dismissed as noise: test conflating two failure modes via `error === null` instead of checking `.code` (literally what AC #3 asked for); no cleanup/teardown for new assertions (false positive — `afterAll` already deletes the auth user, a diff-only blind spot for Blind Hunter); vague downstream RLS/query blind spot for `email =` comparisons (investigated, nothing found beyond the patch above); no rollback/down-migration (not this project's convention — forward-only migrations throughout); types possibly hand-edited rather than regenerated (verified false — documented in Debug Log References); `deferred-work.md` closure unverifiable from the diff (verified accurate, visible in the diff itself); "root-cause fix unverified beyond a self-referential test" (independently verified via direct `psql`/MCP checks, not just the test)._

## Dev Notes

### Why This Bug Existed Undetected Since Migration 0007

`perform_user_erasure()`'s own design comment (migration 0007) claims "Finding 4 (atomicity): wraps public.users + public.profiles PII nulling in a single DB transaction" — the function was reviewed and shipped believing it worked. It was never caught because:

- No RLS/pgTAP-style regression test exercised the actual `UPDATE` — Story 10.2's code review only added an EXECUTE-*privilege* test (grant-level, not functional), deliberately scoped that way once the bug was discovered mid-implementation (see `packages/supabase/__tests__/rls/perform_user_erasure.test.ts`'s current inline comment, which this story removes).
- The Supabase security advisor (`get_advisors`) only flags security misconfigurations (like the migration-0030 EXECUTE grants) — it has no way to detect a functional/logic bug like a constraint violation on write.
- `has_function_privilege` checks (used ad hoc during Story 10.2's Task 5 verification) only prove a role *can call* a function, not that the call *succeeds*.

### The Fix Is Already the Codebase's Assumed Design

Three Edge Functions already treat `public.users.email` as nullable when reading it — `dpo-export-user/index.ts:147`, `dpo-pending-requests/index.ts:88`, `dpo-panel/index.ts:233` (see AC #4). Migration `0005`'s own comment on `public.users.deleted_at` already documents the intended post-erasure state: `'DPDPA soft-delete marker. Set by /dpo/erase-user Edge Function. email nulled simultaneously. ...'`. The only place the system disagreed with itself was the column constraint from migration `0001`, which this story corrects. This is why the fix is "drop the constraint," not "change the function to write a placeholder" — the placeholder approach was considered and rejected because it would contradict design intent already baked into three other files.

### Architecture Compliance

- **`database.types.ts` is generated, never hand-edited** ([implementation-patterns-consistency-rules.md](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md) — "Generated DB types (database.types.ts) never imported outside packages/supabase"). Task 2 regenerates it via the standard `supabase gen types typescript --local` command; do not hand-edit the `email: string` → `string | null` change.
- **ARC-011 boundary rules**: this story touches `supabase/migrations/`, `packages/supabase/src/database.types.ts` (generated), and one test file — all inside `packages/supabase`'s legitimate boundary. No `packages/core`, `apps/mobile`, or Edge Function code changes are expected (see AC #4's confirmation task).
- **Edge Function Security Pre-Flight Checklist**: not applicable — this story does not touch any `SECURITY DEFINER` function body or add a new Edge Function.

### Project Structure Notes

- One new migration file (`supabase/migrations/0031_users_email_nullable.sql`, next sequential number after Story 10.2's `0030`).
- One generated-file regeneration (`packages/supabase/src/database.types.ts`) — do not hand-edit, only regenerate.
- One existing test file extended (`packages/supabase/__tests__/rls/perform_user_erasure.test.ts`) — no new test file needed, this story completes what Story 10.2 deliberately left incomplete in that same file.
- One `deferred-work.md` section annotated as resolved (not deleted).

### Testing Standards

- Follow the existing pattern in `packages/supabase/__tests__/rls/*.test.ts`: `describe.skipIf(skipIfNoSupabase)`, service-role client creates a throwaway test user in `beforeAll`, `afterAll` deletes it via `serviceClient.auth.admin.deleteUser`. See `users.test.ts` and `fear_ladder_items_delete_audit.test.ts` for the exact idiom already used by `perform_user_erasure.test.ts`.
- Run locally: `SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_ANON_KEY=<key> pnpm --filter @exposure-buddy/supabase test`. In CI, these tests are skipped without those env vars set (`passWithNoTests`) — this is pre-existing behavior for the whole `__tests__/rls/` directory, not something this story changes.

### Previous Story Intelligence

Story 10.2 (hosted Supabase provisioning & auth hardening, merged to `main` via PR #64) is the direct predecessor and the reason this bug was found: its code review added `packages/supabase/__tests__/rls/perform_user_erasure.test.ts` to guard migration 0030's EXECUTE revoke, and writing that test's `service_role` positive-path assertion surfaced this NOT NULL violation. The test was deliberately scoped narrower than originally planned (assert "not `42501`" instead of "no error") specifically so Story 10.2 wouldn't silently expand its own scope to fix an unrelated bug — this story is that fast-follow. Story 10.2 also established the pattern this story reuses for hosted verification: MCP `apply_migration` + `list_migrations` to confirm, since `SUPABASE_ACCESS_TOKEN`/CLI auth is not available in this environment (`supabase link` fails with `LegacyPlatformAuthRequiredError`).

### Git Intelligence

Most recent commits on `main` at the time this story was created: `b2a9b0e` (merge of PR #64, Story 10.2), `2079b3c` (Story 10.2 code-review fixes — added the test this story extends), `346142d` (Story 10.2 implementation — added migration 0030, the numbering precedent this story's `0031` follows).

### References

- `supabase/migrations/0001_users.sql` (the `email TEXT NOT NULL` constraint being relaxed — file not modified, only referenced)
- `supabase/migrations/0005_consent_records_retention.sql` (documents the original nullable-email design intent via its `COMMENT ON COLUMN public.users.deleted_at` — file not modified)
- `supabase/migrations/0007_perform_user_erasure_fn.sql` (the function whose `UPDATE` currently fails — file not modified)
- `supabase/functions/dpo-erase-user/index.ts` (calls the RPC as the real erasure path — file not modified, referenced for AC #2's Edge-Function-level verification)
- `supabase/functions/dpo-export-user/index.ts`, `dpo-pending-requests/index.ts`, `dpo-panel/index.ts` (already handle nullable email defensively — confirm, don't modify, per AC #4)
- `packages/supabase/src/database.types.ts` (file to regenerate, not hand-edit)
- `packages/supabase/__tests__/rls/perform_user_erasure.test.ts` (file to extend — added in Story 10.2's code review)
- `_bmad-output/implementation-artifacts/deferred-work.md` — "URGENT — perform_user_erasure() is currently non-functional (discovered 2026-07-28)" (file to annotate as resolved)
- [_bmad-output/planning-artifacts/epics.md — Epic 10 / Story 10.4](../planning-artifacts/epics.md)
- [_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md — database.types.ts generation](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)
- Supabase MCP tools: `list_migrations`, `apply_migration` (project_id `jhbtzsvlgglyfbrgmpsb`)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8)

### Debug Log References

- `docker exec supabase_db_jhbtzsvlgglyfbrgmpsb psql -U postgres -d postgres -c "\d public.users"` — confirmed `email` no longer `not null`, both immediately after `migration up` and again after a clean container/volume rebuild.
- `supabase gen types typescript --local` diffed against the pre-existing tracked file before applying — confirmed exactly 3 lines changed (`users.Row.email`, `Insert.email`, `Update.email`, all `string` → `string | null`), no unrelated schema drift.
- `pnpm turbo typecheck` — 10/10 tasks pass after type regeneration.
- `SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... pnpm --filter @exposure-buddy/supabase test -- perform_user_erasure` — 3/3 tests pass (anon/authenticated still blocked at `42501`; service_role now fully succeeds, `email: null`, `deleted_at` set).
- `pnpm turbo typecheck lint test` (full suite) — 19/19 tasks, `packages/supabase` 23/23 files / 105/105 tests, mobile 388/388.
- Manual curl against `dpo-erase-user` via a seeded DPO operator JWT — blocked by a systemic local `edge-runtime` boot failure (`failed to determine entrypoint`, HTTP 503) affecting all Edge Functions on this stack, confirmed unrelated to this story (an untouched function, `dpo-audit-log`, fails identically). Filed separately in `deferred-work.md`.
- MCP `apply_migration` (project_id `jhbtzsvlgglyfbrgmpsb`) then `list_migrations` — confirmed `0031_users_email_nullable` applied (version `20260728162717`).

### Completion Notes List

- Root cause confirmed and fixed: `public.users.email` was `NOT NULL` since migration `0001`, but `perform_user_erasure()` (migration `0007`) unconditionally nulled it — every real call failed with `23502`. Migration `0031` drops the constraint, matching design intent already present in three Edge Functions (`dpo-export-user`, `dpo-pending-requests`, `dpo-panel`) that already read `email` defensively.
- Confirmed `public.profiles.display_name` (also nulled by the same function) was already nullable — no additional schema change needed there.
- `database.types.ts` regenerated and diffed before applying — change is scoped exactly to `users.email`'s three type variants, nothing else.
- Extended `perform_user_erasure.test.ts`'s `service_role` test from "not blocked at the grant level" to full functional-success assertions (`error` is `null`, `email` is `null`, `deleted_at` is set); removed the now-stale bug-scoping comment.
- While applying the fix, discovered the local Docker stack was stuck on a stale `exposure-buddy`-labeled container/volume set — Story 10.2's code-review "stop the stale stack" patch had stopped but not fully reconciled it, and `supabase start` kept reusing the old label instead of creating fresh `jhbtzsvlgglyfbrgmpsb`-named containers. Removed the stale containers/volumes (user-approved, local dev data only) and did a clean rebuild, confirming correct naming this time.
- Attempted an Edge-Function-level (`dpo-erase-user`) end-to-end verification per Task 6; blocked by an unrelated, pre-existing local `edge-runtime` boot failure affecting all functions on this stack (confirmed systemic, not caused by this story). AC #2's core requirement — the RPC itself succeeding — is fully proven at the RPC layer (Task 4's test) with `dpo-erase-user`'s calling code statically confirmed unchanged and correct (Task 3). Filed the boot failure as its own deferred-work item.
- `deferred-work.md`'s "URGENT" entry for this bug marked `RESOLVED`, citing this story.
- No `packages/core` or `apps/mobile` changes — scope stayed exactly within `packages/supabase` + `supabase/migrations/`, as planned.

### File List

- `supabase/migrations/0031_users_email_nullable.sql` (new — drops `NOT NULL` on `public.users.email`)
- `supabase/migrations/0032_users_email_not_null_via_rls.sql` (new — code-review patch: `WITH CHECK (email IS NOT NULL)` on `users_own_row_update`, closing the self-service email-nulling gap opened by migration 0031)
- `packages/supabase/src/database.types.ts` (regenerated — `users.email` type changed `string` → `string | null` in `Row`/`Insert`/`Update`)
- `packages/supabase/__tests__/rls/perform_user_erasure.test.ts` (modified — `service_role` test extended to assert full functional success, not just grant-level; stale bug-scoping comment removed; code-review patches: seeds/asserts `profiles.display_name` nulling, asserts post-erasure select `error` is `null`)
- `packages/supabase/__tests__/rls/users.test.ts` (modified — code-review patch: new test confirming an authenticated user cannot null their own `email` via direct update, migration 0032's regression guard)
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified — marked the `perform_user_erasure` bug `RESOLVED`; added entries for the local edge-runtime boot failure and the code-review's 3 deferred findings)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status tracking only)
- `_bmad-output/planning-artifacts/epics.md` (modified — added Story 10.4's entry, done prior to `dev-story` as part of `create-story`)
