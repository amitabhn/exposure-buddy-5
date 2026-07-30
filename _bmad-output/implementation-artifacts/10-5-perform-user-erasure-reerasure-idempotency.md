# Story 10.5: Re-Erasure Idempotency Guard for `perform_user_erasure()`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a DPO reviewing the erasure audit log,
I want a second erasure attempt against an already-erased user to be rejected instead of silently "succeeding" again,
so that the audit trail stays trustworthy — no indistinguishable duplicate `outcome: 'success'` entries — and re-erasure can't mask an operator mistake or a scripting bug (DPDPA 2023 §5 completeness requirement; FR-DPO-06 audit-log integrity).

## Acceptance Criteria

1. **Given** `perform_user_erasure()` (migration `0007_perform_user_erasure_fn.sql`) currently runs its `UPDATE public.users SET email = NULL, deleted_at = now() ...` unconditionally whenever the target row exists
   **When** this story is implemented
   **Then** a new migration `supabase/migrations/0033_perform_user_erasure_idempotency_guard.sql` replaces the function body with this exact control flow (row existence and already-erased checks both happen in a single `SELECT ... FOR UPDATE`, run *before* either `UPDATE` — the old `UPDATE`-then-`NOT FOUND` check is fully replaced, not kept alongside the new check):
      ```sql
      DECLARE
        v_deleted_at TIMESTAMPTZ;
      BEGIN
        SELECT deleted_at INTO v_deleted_at
        FROM public.users
        WHERE id = p_target_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'erasure_target_not_found: user % does not exist in public.users', p_target_user_id;
        END IF;

        IF v_deleted_at IS NOT NULL THEN
          RAISE EXCEPTION 'erasure_already_erased: user % was already erased at %', p_target_user_id, v_deleted_at;
        END IF;

        UPDATE public.users SET email = NULL, deleted_at = now() WHERE id = p_target_user_id;
        UPDATE public.profiles SET display_name = NULL WHERE id = p_target_user_id;
      END;
      ```
      Both exception message prefixes (`erasure_target_not_found:`, `erasure_already_erased:`) must stay byte-for-byte substring-compatible with what `dpo-erase-user/index.ts` already/newly `.includes()`-matches on (AC #2) — the `FOR UPDATE` row lock closes the check-then-act race a plain `SELECT` would leave open between two concurrent calls against the same never-before-erased user. The guard belongs in the `SECURITY DEFINER` function body (not only in the calling Edge Function) so it protects every current and future caller of the RPC, not just `dpo-erase-user`.

2. **Given** `supabase/functions/dpo-erase-user/index.ts:97-121` already pattern-matches `rpcError.message?.includes('erasure_target_not_found')` to special-case the not-found path with its own audit-log outcome and HTTP response
   **When** this story is implemented
   **Then** the same file gains an analogous branch that pattern-matches `erasure_already_erased` on the RPC error message, writes a `dpo_audit_log` entry with `outcome: 'failure'` and `metadata: { failed_step: 'already_erased' }` (parallel to the existing `user_not_found` metadata shape), and returns HTTP `400` with a body like `{ error: 'Target user was already erased' }` — never a `200`/`{ ok: true }` response for a re-erasure attempt, and never a second indistinguishable `outcome: 'success'` entry.

3. **Given** the guard changes what `perform_user_erasure()` does on a second call against the same user
   **When** this story is implemented
   **Then** `packages/supabase/__tests__/rls/perform_user_erasure.test.ts`'s existing `service_role` test (`'[+] service_role can execute perform_user_erasure and the erasure fully succeeds'`) is followed by a new test in the same `describe` block — e.g. `'[-] a second erasure call against an already-erased user is rejected, not silently repeated'` — that calls the RPC a second time against the same already-erased `userId` and asserts: the call returns an `error` (not `null`), the error message contains `erasure_already_erased`, and `public.users.deleted_at` for that row is unchanged from its first-erasure value (proving no re-stamp occurred, not just that an error was thrown).

4. **Given** this is a `SECURITY DEFINER` function body change touching a DPDPA-critical erasure path
   **When** this story is implemented
   **Then** the migration is applied both locally (`supabase migration up` or `supabase db reset`) and on the hosted project (`jhbtzsvlgglyfbrgmpsb`) via the Supabase MCP `apply_migration` + `list_migrations` pattern established by Stories 10.2 and 10.4, and `pnpm turbo typecheck lint test` is green afterward.

5. **Given** the local `edge-runtime` Docker container has been unable to boot any Edge Function since Story 10.4 (`worker boot error: failed to bootstrap runtime`, HTTP 503 `BOOT_ERROR` — filed in `deferred-work.md`, still unresolved as of this story)
   **When** this story is implemented
   **Then** AC #2's `dpo-erase-user/index.ts` change is verified by direct code reading (confirm the new branch's control flow, audit-log payload shape, and HTTP status match AC #2 exactly) rather than an actual Edge-Function-level invocation — do not attempt to fix the unrelated `edge-runtime` boot failure as part of this story; if it happens to already be resolved when this story is implemented, prefer a real end-to-end curl/HTTP call against `dpo-erase-user` instead and note that in Dev Agent Record.

## Tasks / Subtasks

- [x] Task 1 — Add the idempotency guard to `perform_user_erasure()` (AC: #1)
  - [x] Create `supabase/migrations/0033_perform_user_erasure_idempotency_guard.sql` with a `CREATE OR REPLACE FUNCTION public.perform_user_erasure(...)` implementing exactly the control flow specified in AC #1 (`SELECT deleted_at INTO v_deleted_at ... FOR UPDATE` → `NOT FOUND` check → already-erased check → both `UPDATE`s). Do not keep the old `UPDATE`-then-`NOT FOUND` check alongside the new `SELECT`-based one — the `SELECT` fully replaces it as the row-existence guard.
    - Both `UPDATE`s stay inside the same implicit function-body transaction as before, per migration 0007's existing atomicity design — Step 2 (`profiles.display_name`) is naturally skipped whenever either exception is raised, since it now runs after both checks
    - Updates the `COMMENT ON FUNCTION` string to mention the new idempotency guard and cite this story
  - [x] Apply locally: `supabase migration up` against a running `supabase start` stack. Confirm via a manual two-call test (or the Task 3 test) that a second call against an already-erased user is rejected. — Applied; confirmed via `\df+ public.perform_user_erasure` that the new body + comment are live.
  - [x] Apply to the hosted project via the Supabase MCP `apply_migration` tool (`project_id: jhbtzsvlgglyfbrgmpsb`), same pattern Stories 10.2/10.4 used. Confirm via `list_migrations` that `0033_perform_user_erasure_idempotency_guard` registers as applied. — Applied via MCP, confirmed present in `list_migrations` output (version `20260729085733`).

- [x] Task 2 — Handle the new error in `dpo-erase-user/index.ts` (AC: #2)
  - [x] In `supabase/functions/dpo-erase-user/index.ts`, add an `alreadyErased` branch alongside the existing `notFound` branch (both derived from `rpcError.message?.includes(...)` checks on the same `rpcError` from the `perform_user_erasure` RPC call)
  - [x] On `alreadyErased`, insert a `dpo_audit_log` row with `outcome: 'failure'`, `metadata: { failed_step: 'already_erased' }` (mirrors the existing `notFound` block's insert shape exactly, changing only `metadata`), and return HTTP `400` with `{ error: 'Target user was already erased' }`
  - [x] Do not change the `notFound`, `auth_ban` (Step 3), or final audit-log-write-regardless-of-outcome logic — those paths are unaffected by this story. Confirmed: the new `alreadyErased` block returns early, same as `notFound`, never reaching Step 3 or the generic outcome write.

- [x] Task 3 — Add the re-erasure regression test (AC: #3)
  - [x] Promote a `let capturedDeletedAt: string | null` to the `describe` block's top-level scope (alongside the existing `let userId: string | undefined`). In the existing `'[+] service_role can execute perform_user_erasure and the erasure fully succeeds'` test, assign `capturedDeletedAt = row?.deleted_at ?? null` right after that test's existing `expect(row?.deleted_at).not.toBeNull()` assertion.
  - [x] Add a new `it(...)` immediately after that test, in the same `describe` block, reusing the same `userId` (already erased by the preceding test — tests in this file run sequentially within the block, so ordering matters; added a comment noting the dependency)
  - [x] Assert: `error` is not `null`; `error!.message` contains `erasure_already_erased`; a fresh `SELECT deleted_at FROM users WHERE id = userId!` equals `capturedDeletedAt` exactly — proving no re-stamp occurred, not just that some non-null value is still present. Ran against the local stack: `perform_user_erasure.test.ts` now 4/4 (was 3), full suite 107/107 across 23 files, no regressions.

- [x] Task 4 — Verification (AC: #1, #3, #4)
  - [x] `pnpm turbo typecheck lint test` green — 19/19 tasks; `packages/supabase` test count increased by exactly 1 (105→107 total across the package, `perform_user_erasure.test.ts` 3→4); mobile 388/388, no regressions
  - [x] Confirm via the Supabase MCP (`list_migrations`) that `0033_perform_user_erasure_idempotency_guard` is applied on the hosted project — confirmed (version `20260729085733`)

- [x] Task 5 — Close out the deferred-work entry (AC: #1-#3)
  - [x] In `_bmad-output/implementation-artifacts/deferred-work.md`, find the "Re-erasure of an already-erased user now silently 'succeeds'" bullet under Story 10.4's deferred-findings section (near the top of the file). Mark it resolved with a short note citing this story's key and date, following the same annotate-don't-delete convention Story 10.4 used for its own predecessor bug.

### Review Findings

_Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) against `origin/main...HEAD` (commit `6561607`). 1 decision-needed, 0 patches, 1 deferred, 9 dismissed as noise._

- [x] [Review][Decision] Unchecked `dpo_audit_log.insert()` in the new `alreadyErased` branch — `supabase/functions/dpo-erase-user/index.ts:131-138` inserted the rejected-re-erasure audit entry without checking the result. This exactly mirrored a pre-existing unchecked `.insert()` in the sibling `notFound` block a few lines above (same file, same pattern, predates this story). **Resolved:** fixed both the `notFound` and `alreadyErased` blocks — each now captures `{ error: auditError }` from the insert and `console.error`s if it fails, matching the pattern already established at the file's final audit-log write (lines ~163-177). The HTTP response returned to the caller is unchanged either way (a failed audit write doesn't change the RPC-driven outcome), consistent with how the file already treats audit-log write failures elsewhere.
- [x] [Review][Defer] No automated regression test exists for the `erasure_target_not_found` path after the `SELECT ... FOR UPDATE` rewrite [supabase/migrations/0033_perform_user_erasure_idempotency_guard.sql, packages/supabase/__tests__/rls/perform_user_erasure.test.ts] — deferred, pre-existing gap (no test for this path existed before this story either — confirmed via repo-wide grep for `erasure_target_not_found` in `__tests__/`), but this migration rewrote the underlying check mechanism (`UPDATE`-then-`NOT FOUND` → `SELECT ... FOR UPDATE`-then-`NOT FOUND`) without adding coverage confirming the rewrite preserved that behavior.

## Dev Notes

### Why the Guard Belongs in the Function, Not Just the Edge Function

`dpo-erase-user/index.ts` is the only current caller of `perform_user_erasure`, but the function is `SECURITY DEFINER` and callable by any future `service_role`-authenticated caller (another Edge Function, a script, a DPO tooling addition). Putting the guard in the function body — the same place the existing `erasure_target_not_found` guard already lives (Finding 8, migration 0007) — means the protection travels with the function itself rather than depending on every caller remembering to check `deleted_at` first. `deferred-work.md`'s original trigger text floated an Edge-Function-side check as one option ("likely a `deleted_at IS NOT NULL` check in `dpo-erase-user/index.ts`") but explicitly left it open ("alternative: guard inside the function body") — this story picks the function-body approach for the reason above, and Task 2 still updates the Edge Function because it needs to translate the new exception into an appropriate audit-log entry and HTTP response, not because it needs to duplicate the guard.

### Race Condition Consideration (Task 1)

A naive `IF (SELECT deleted_at FROM users WHERE id = ...) IS NOT NULL THEN RAISE ...` followed by a separate `UPDATE` has a check-then-act race: two concurrent erasure calls against the same never-before-erased user could both pass the check before either commits its `UPDATE`. In practice this is low-risk (the DPO panel is a single-operator admin tool, not a high-concurrency user-facing path), but the correct fix is cheap: `SELECT ... FOR UPDATE` (AC #1) takes a row lock before branching, so a concurrent second call blocks until the first transaction commits and then sees the now-non-null `deleted_at`. This keeps the same atomicity guarantee migration 0007's own comment already claims ("wraps public.users + public.profiles PII nulling in a single DB transaction").

`SELECT ... INTO` inside a `SECURITY DEFINER` PL/pgSQL function body is not a new pattern in this codebase — `supabase/migrations/0026_swap_ladder_positions_rpc.sql` already uses `SELECT user_id INTO v_owner_a FROM ...` twice for a similar pre-mutation ownership check. Follow that file's style (variable naming, `DECLARE` block placement) rather than inventing a new convention.

### Architecture Compliance

- **`database.types.ts` is unaffected** — this story only changes a function body (`CREATE OR REPLACE FUNCTION`), not any table schema. No regeneration needed, no diff expected in `packages/supabase/src/database.types.ts`. If `supabase gen types` output is inadvertently non-empty, halt and report rather than assuming it's expected — this deviates from Story 10.4's precedent (which did change a column type) and would indicate the migration touched more than intended.
- **ARC-011 boundary rules**: this story touches `supabase/migrations/` (new file), `supabase/functions/dpo-erase-user/index.ts`, and one test file in `packages/supabase` — all inside `packages/supabase`'s and Edge Functions' legitimate boundaries. No `packages/core` or `apps/mobile` changes expected.
- **Edge Function Security Pre-Flight Checklist**: `dpo-erase-user/index.ts` is an existing, already-reviewed Edge Function — this story adds one new error-handling branch, not a new function or a new attack surface. No new auth/authz logic is introduced (the existing operator-JWT verification and self-erasure guard at the top of the file are untouched).

### Project Structure Notes

- One new migration file (`supabase/migrations/0033_perform_user_erasure_idempotency_guard.sql`, next sequential number after Story 10.4's `0032`).
- One Edge Function file modified (`supabase/functions/dpo-erase-user/index.ts`) — new branch only, no restructuring.
- One existing test file extended (`packages/supabase/__tests__/rls/perform_user_erasure.test.ts`) — one new test appended, no new test file.
- One `deferred-work.md` entry annotated as resolved (not deleted), following Story 10.4's established convention.

### Testing Standards

- Follow the existing pattern in `packages/supabase/__tests__/rls/*.test.ts`: `describe.skipIf(skipIfNoSupabase)`, service-role client, shared `beforeAll`/`afterAll` test-user lifecycle already present in `perform_user_erasure.test.ts` — do not duplicate the setup, append to the existing `describe` block.
- Run locally: `SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_ANON_KEY=<key> pnpm --filter @exposure-buddy/supabase test`. In CI these tests are skipped without those env vars set (`passWithNoTests`) — pre-existing behavior, unchanged by this story.
- `dpo-erase-user/index.ts` has no automated test coverage (no Deno test harness in this repo for Edge Functions — verification has always been either RLS/RPC-layer Vitest tests or manual/curl checks against a booted `edge-runtime`). AC #5 explicitly scopes this story's Edge Function verification to code reading, given the still-unresolved local boot failure — do not treat "couldn't curl it" as a blocker.

### Previous Story Intelligence

Story 10.4 (`10-4-fix-perform-user-erasure-not-null-bug`, merged to `main` via PR #65) is the direct predecessor and the reason this story exists: its code review found that fixing the NOT NULL bug made a *pre-existing* idempotency gap reachable for the first time (previously masked because every call failed regardless of state) and explicitly deferred it as its own fast-follow rather than expanding scope — see `deferred-work.md`'s "Re-erasure of an already-erased user now silently 'succeeds'" entry, which is this story's direct source. Story 10.4 also established the exact process this story reuses: MCP `apply_migration` + `list_migrations` for hosted verification (`SUPABASE_ACCESS_TOKEN`/CLI auth is not available in this environment — `supabase link` fails with `LegacyPlatformAuthRequiredError`), and the "annotate deferred-work.md as resolved, don't delete" convention. Story 10.4 also left the local `edge-runtime` boot failure unresolved and filed separately — AC #5 of this story inherits that same constraint rather than re-discovering it.

### Git Intelligence

Most recent commits on `main` at the time this story was created: `e9e7d78` (merge of PR #65, Story 10.4), `ddb375d` (Story 10.4 code-review fixes — added the `WITH CHECK` RLS guard, `profiles.display_name` test coverage, unchecked-select-error fix), `922c88f` (Story 10.4 implementation — added migrations 0031/0032, the numbering precedent this story's `0033` follows, and extended `perform_user_erasure.test.ts`'s `service_role` test to full functional-success assertions, the test this story's Task 3 appends after).

### References

- `supabase/migrations/0007_perform_user_erasure_fn.sql` (the function body this story replaces via `CREATE OR REPLACE`)
- `supabase/migrations/0031_users_email_nullable.sql`, `0032_users_email_not_null_via_rls.sql` (Story 10.4's migrations — numbering precedent, not modified)
- `supabase/migrations/0026_swap_ladder_positions_rpc.sql` (existing `SELECT ... INTO` precedent for pre-mutation checks inside a `SECURITY DEFINER` function — follow its style for the `DECLARE`/`SELECT FOR UPDATE` block)
- `supabase/functions/dpo-erase-user/index.ts` (the Edge Function this story adds one branch to — lines 93-121 are the relevant existing `notFound` pattern to mirror)
- `packages/supabase/__tests__/rls/perform_user_erasure.test.ts` (file to extend — the `service_role` test this story's new test runs after)
- `_bmad-output/implementation-artifacts/deferred-work.md` — "Re-erasure of an already-erased user now silently 'succeeds'" (this story's direct source; file to annotate as resolved) and "Local edge-runtime fails to boot any Edge Function" (the still-open constraint behind AC #5)
- [_bmad-output/planning-artifacts/epics.md — Epic 10 / Story 10.5](../planning-artifacts/epics.md)
- [_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md — Edge Function Security Pre-Flight Checklist](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)
- Supabase MCP tools: `list_migrations`, `apply_migration` (project_id `jhbtzsvlgglyfbrgmpsb`)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `docker exec supabase_db_jhbtzsvlgglyfbrgmpsb psql -U postgres -d postgres -c "\df+ public.perform_user_erasure"` — confirmed the new function body + updated `COMMENT ON FUNCTION` are live locally after `supabase migration up`.
- Supabase MCP `apply_migration` (project_id `jhbtzsvlgglyfbrgmpsb`, name `perform_user_erasure_idempotency_guard`) then `list_migrations` — confirmed applied on the hosted project (version `20260729085733`).
- `SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... pnpm --filter @exposure-buddy/supabase test -- perform_user_erasure` — 4/4 tests pass (was 3/3; new re-erasure-rejection test added).
- `pnpm turbo typecheck lint test` (full suite, with Supabase env vars set) — 19/19 tasks pass; `packages/supabase` 23/23 files / 107/107 tests (was 105/105 as of Story 10.4 — +1 from Task 3, +1 unrelated growth elsewhere not touched by this story); mobile 388/388.

### Completion Notes List

- Replaced `perform_user_erasure()`'s `UPDATE`-then-`NOT FOUND` check with a single `SELECT deleted_at INTO v_deleted_at ... FOR UPDATE` that checks both row-existence and already-erased state before either `UPDATE` runs — closes the check-then-act race a plain `SELECT` would leave open, per AC #1's exact control flow. Exception message prefixes (`erasure_target_not_found:`, `erasure_already_erased:`) kept byte-for-byte compatible with `dpo-erase-user/index.ts`'s `.includes()` checks.
- Migration `0033_perform_user_erasure_idempotency_guard.sql` applied both locally and on the hosted project (`jhbtzsvlgglyfbrgmpsb`); confirmed via direct psql inspection and `list_migrations` respectively.
- `dpo-erase-user/index.ts` gained an `alreadyErased` branch structurally parallel to the existing `notFound` branch — early return, `outcome: 'failure'` audit entry with `metadata: { failed_step: 'already_erased' }`, HTTP 400 `{ error: 'Target user was already erased' }`. Never reaches Step 3 (auth ban) or the generic outcome-write path. Verified by direct code reading per AC #5 — the local `edge-runtime` boot failure from Story 10.4 is still unresolved, so no live HTTP invocation was possible.
- Extended `perform_user_erasure.test.ts`: promoted `capturedDeletedAt` to `describe`-block scope, captured it in the existing `service_role` success test, added a new test asserting a second RPC call against the same user is rejected with `erasure_already_erased` and `deleted_at` is byte-for-byte unchanged from the captured value (not just "still non-null").
- `deferred-work.md`'s "Re-erasure of an already-erased user now silently 'succeeds'" entry marked `RESOLVED`, citing this story, following Story 10.4's annotate-don't-delete convention.
- No `packages/core` or `apps/mobile` changes — scope stayed within `supabase/migrations/`, `supabase/functions/dpo-erase-user/`, and `packages/supabase/__tests__/`, as planned. `database.types.ts` unaffected (function-body-only change) — confirmed by inspection, no regeneration needed.

### File List

- `supabase/migrations/0033_perform_user_erasure_idempotency_guard.sql` (new — idempotency guard via `SELECT ... FOR UPDATE`, replaces the old `UPDATE`-then-`NOT FOUND` check)
- `supabase/functions/dpo-erase-user/index.ts` (modified — new `alreadyErased` branch parallel to the existing `notFound` branch)
- `packages/supabase/__tests__/rls/perform_user_erasure.test.ts` (modified — `capturedDeletedAt` promoted to describe-block scope; new test asserting re-erasure rejection)
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified — marked the re-erasure idempotency finding `RESOLVED`, citing this story)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status tracking only)
