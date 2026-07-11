# Story 10.2: Hosted Supabase Provisioning & Auth Hardening

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer preparing the password-auth epic for a real beta,
I want the hosted Supabase project fully migration-current and hardened against the cross-user PII-erasure hole found in migration 0007,
so that password-based accounts run on production-shaped infrastructure with no known auth-adjacent security gaps.

## Acceptance Criteria

1. **Given** the hosted Supabase project "Exposure Buddy" (`jhbtzsvlgglyfbrgmpsb`, ap-northeast-1)
   **When** this story is implemented
   **Then** it is linked in `supabase/config.toml` (`project_id` set to the real ref, replacing the `"exposure-buddy"` placeholder), migrations through 0030 are confirmed applied on the hosted project, and the `exposure-buddy://reset-password` redirect URL is confirmed present under Auth → URL Configuration → Redirect URLs on the hosted project dashboard.

4. **Given** two loose ends found by cross-checking this story against the unmerged `feature/password-based-login` branch (not in epics.md's original AC text, added here so the dev agent doesn't have to rediscover them)
   **When** this story is implemented
   **Then** (a) `.gitignore` also excludes `.env.production` alongside the already-present `.env.remote` (hosted-project env-file hygiene, same class of file), and (b) `supabase/config.toml`'s `[auth.sms]` section sets `enable_signup = true` so phone+password sign-up (shipped in Story 10.1, already merged to `main`) actually works against a local `supabase start` stack — currently it's `false`, which would reject local phone signup attempts even though the app code supports it.

2. **Given** `perform_user_erasure` and `fear_ladder_items_delete_audit` were found to have public EXECUTE grants (a cross-user PII-erasure hole introduced in migration 0007)
   **When** this story is implemented
   **Then** a new migration `supabase/migrations/0030_revoke_definer_function_execute.sql` exists in the repo, revoking public EXECUTE on both functions and re-granting EXECUTE on `perform_user_erasure` to `service_role` only, and this is confirmed applied on the hosted project.

3. **Given** leaked-password protection (HaveIBeenPwned check) requires a Supabase Pro-plan feature
   **When** this story is implemented on the Free-plan hosted project
   **Then** the feature is deferred, not silently skipped — a new entry is added to `_bmad-output/implementation-artifacts/deferred-work.md` with the trigger "enable when upgraded to Pro plan (Auth → Providers → Email → Password Security)"; the client-side 8-character minimum length (already shipped in Story 10.1) remains the only password-strength check at MVP.

**Source:** [_bmad-output/planning-artifacts/epics.md#Story 10.2](../planning-artifacts/epics.md), NFR-SEC-02 in [prd.md](../planning-artifacts/prd.md) (see Dev Notes — NFR Citation below for a discrepancy with the epics.md text).

## Tasks / Subtasks

- [ ] Task 1 — Link `supabase/config.toml` to the hosted project and verify (don't blindly re-push) migration/redirect state (AC: #1)
  - [ ] Change `project_id = "exposure-buddy"` to `project_id = "jhbtzsvlgglyfbrgmpsb"` in `supabase/config.toml` (single-line change; keep the existing comment above it but update it to reflect the real ref instead of "placeholder... Story 1.7 → Epic 2")
  - [ ] **Do not run a blind `supabase db push` against this project.** The hosted DB is already fully migrated (verified live via the Supabase MCP `list_migrations` tool on 2026-07-11 — see Dev Notes: Remote State Is Already Correct below). Confirm sync with `supabase link --project-ref jhbtzsvlgglyfbrgmpsb` followed by `supabase migration list --linked` (or the MCP `list_migrations` tool), and only apply Task 2's new migration file (0030) — do not attempt to reconcile or reapply 0004–0029, which are already live remotely under different (batched) applied-migration names. That naming mismatch is expected — see Dev Notes.
  - [ ] Confirm (do not blindly re-add) that `exposure-buddy://reset-password` is present under Auth → URL Configuration → Redirect URLs on the hosted project dashboard. This was added in a prior out-of-band session; dashboard config is independent of git branch/commit state, so it should still be there, but verify rather than assume.
- [ ] Task 2 — Add migration 0030 to close the definer-function EXECUTE hole (AC: #2)
  - [ ] Create `supabase/migrations/0030_revoke_definer_function_execute.sql` (exact content below — already proven correct and already live on the hosted DB, verified via `get_advisors` security scan on 2026-07-11 showing neither function flagged as anon/authenticated-executable):
    ```sql
    -- Migration 0030: revoke public EXECUTE on SECURITY DEFINER functions
    -- (security advisor lints 0028/0029 — anon/authenticated_security_definer_function_executable)
    --
    -- Both functions below are SECURITY DEFINER but, via PostgreSQL's default PUBLIC execute
    -- grant, were callable by anon/authenticated over PostgREST RPC. Neither is meant to be
    -- invoked directly through the API:
    --   * perform_user_erasure (migration 0007): nulls a user's PII + sets deleted_at, running
    --     as owner (bypasses RLS). Only the dpo-erase-user Edge Function (service_role) should
    --     call it. Left public, ANY signed-in user could erase ANY other user's PII by id.
    --   * fear_ladder_items_delete_audit (migration 0027): an AFTER DELETE trigger function that
    --     writes to the append-only dpo_audit_log. Trigger functions fire as the table owner
    --     regardless of the invoker's EXECUTE privilege, so revoking public EXECUTE does NOT
    --     break the trigger — it only removes the ability to forge audit rows via direct RPC.

    REVOKE EXECUTE ON FUNCTION public.perform_user_erasure(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.perform_user_erasure(uuid) TO service_role;

    REVOKE EXECUTE ON FUNCTION public.fear_ladder_items_delete_audit() FROM PUBLIC, anon, authenticated;
    ```
  - [ ] Verify `perform_user_erasure`'s existing `SET search_path = public` pin (migration 0007) is undisturbed — no change needed, this is a compliance check against the Edge Function Security Pre-Flight Checklist's `SECURITY DEFINER` rule (already satisfied; confirm, don't re-add).
  - [ ] Apply the migration to the hosted project (`supabase db push --linked` once Task 1's link is confirmed, or the `mcp__plugin_supabase_supabase__apply_migration` tool with `project_id: jhbtzsvlgglyfbrgmpsb`). This is safe/idempotent — the remote DB already has the equivalent grants revoked — but running it makes the migration file the source of truth for any future environment provisioned from these files (fresh local reset, CI, disaster recovery).
  - [ ] Re-run the security advisor (`mcp__plugin_supabase_supabase__get_advisors`, `type: security`, `project_id: jhbtzsvlgglyfbrgmpsb`) after applying — confirm `perform_user_erasure` / `fear_ladder_items_delete_audit` do not appear in any anon/authenticated-executable finding. (They don't as of 2026-07-11 — this step closes the loop after Task 1 relinks the project to source control, it is not expected to surface a new problem.)
- [ ] Task 3 — Document the leaked-password-protection deferral (AC: #3)
  - [ ] Add a new dated section to `_bmad-output/implementation-artifacts/deferred-work.md`, following the file's existing per-story convention (see the `## Deferred from: code review of 10-1-...` section for the exact format: `##` heading + italic context line + bullet(s) + a source-file citation line), stating: hosted project is on the Free plan; the HaveIBeenPwned leaked-password check requires Pro; not an MVP blocker since the client-side 8-character minimum (Story 10.1) already ships; trigger = "enable the toggle (Auth → Providers → Email → Password Security) when the project is upgraded to Pro."
  - [ ] **Scope this entry narrowly** — do not reintroduce the broader "Hosted/remote Supabase — mostly provisioned" or "Reset + email-confirmation deep-link flow not E2E-verified" entries that existed on the old `feature/password-based-login` branch's `deferred-work.md`. Those belong to Story 10.3 (forgot/reset-password flow), which has not been created yet and is out of this story's scope.
- [ ] Task 4 — Close the two cross-check gaps (AC: #4)
  - [ ] Add `.env.production` to `.gitignore` alongside the existing `.env.remote` line (same section, one new line) — protects a future hosted-project env file from being committed, matching the intent already established for `.env.remote`.
  - [ ] In `supabase/config.toml`'s `[auth.sms]` section, change `enable_signup = false` to `enable_signup = true` (mirrors `[auth.email] enable_signup = true`, already set). This is a **local-dev-only** config fix — it does not touch the hosted project's own SMS provider settings (those are dashboard-level, separate from this file) — it only makes local `supabase start` accept phone-based `signUp()` calls without a real SMS provider, consistent with how `[auth.email] enable_confirmations = false` already lets email password-signup auto-confirm locally.
- [ ] Task 5 — Verification (AC: #1, #2, #3, #4)
  - [ ] No application code changes in this story (infra config + one SQL migration + two docs/config one-liners) — there is no new unit-test surface. Run `pnpm turbo typecheck lint test` to confirm nothing regresses (in particular the RLS/pgTAP harness per ADR-006, which enumerates migrations).
  - [ ] Confirm via the Supabase MCP (`list_migrations`, `get_advisors`) that the hosted project's applied-migration list includes `0030_revoke_definer_function_execute` and the security advisor no longer flags the two definer functions.
  - [ ] Confirm `supabase link --project-ref jhbtzsvlgglyfbrgmpsb` (or MCP equivalent) succeeds locally using the updated `config.toml`.
  - [ ] Manually verify local phone+password sign-up (Story 10.1's flow) no longer gets rejected by GoTrue after the `[auth.sms] enable_signup` change, against a local `supabase start` stack.

## Dev Notes

### Remote State Is Already Correct (read this first)

The hosted Supabase project ("Exposure Buddy", `jhbtzsvlgglyfbrgmpsb`, ap-northeast-1, Free plan, Postgres 17) was already fully provisioned and hardened by a prior out-of-band session working directly against the hosted project via the Supabase MCP — **verified live on 2026-07-11**:

- `mcp__plugin_supabase_supabase__list_migrations` shows 7 applied migrations: `0001_users`, `0002_rls`, `0003_profiles` individually, then three **batched backfill migrations** (`backfill_0004_0020_dpo_onboarding_ladder_sessions`, `backfill_0021_0022_ladder_status_active_thread`, `backfill_0023_0029_grants_delete_swap_pushtokens`) covering local files 0004–0029, then `0030_revoke_definer_function_execute` applied individually.
- `mcp__plugin_supabase_supabase__get_advisors` (security) does **not** flag `perform_user_erasure` or `fear_ladder_items_delete_audit` as anon/authenticated-executable — the PII-erasure hole is already closed on the remote DB. Remaining advisor findings (4× `rls_enabled_no_policy` on pre-existing tables, 3× `function_search_path_mutable` on unrelated functions, `auth_leaked_password_protection`) are pre-existing/out-of-scope or exactly what AC #3 tracks — not new problems this story needs to fix.

**None of this is reflected in the repo on `main`**: `supabase/config.toml` still has the placeholder `project_id = "exposure-buddy"`, and `supabase/migrations/0030_revoke_definer_function_execute.sql` does not exist locally (local `migrations/` currently only goes 0001–0029). This story's real job is to bring the **repo** in line with what is already true on the **hosted infrastructure** — not to re-derive or re-run the provisioning from scratch. Do not be alarmed that the remote's applied-migration names for 0004–0029 don't match the local per-story filenames 1:1; that's a byproduct of how they were bootstrapped (batched SQL application) in the prior session, not drift to reconcile.

A previous attempt at this work exists on the unmerged `feature/password-based-login` branch (commit `13ba0f5`) with byte-identical `config.toml`/migration-0030 content to what's specified above — it was independently re-verified against the live remote project for this story rather than blindly trusted.

### Cross-Check Against `feature/password-based-login` (2026-07-11)

Every commit on that branch was individually diffed against `main` to confirm this story's scope is complete except for Story 10.3 (forgot/reset flow). Full breakdown:

| Commit | What it does | Disposition |
|---|---|---|
| `f2463d1`, `767a12b` | Password sign-up/sign-in, email + phone | Story 10.1 (already merged, reimplemented fresh) |
| `13ba0f5` | config.toml link + migration 0030 | **This story**, Task 1/2 |
| `d7adb0c` | deferred-work.md: leaked-password deferral | **This story**, Task 3 |
| `d3811b9` | .gitignore: `.env.remote` + `.env.production` | `.env.remote` already on `main`; `.env.production` was missing — **this story**, Task 4 |
| `73c0caa` | forgot/reset screens, `recovery-url.ts`, local `config.toml` redirect-URL entry | Story 10.3 (not yet created) — correctly excluded |
| `cf9e9ae` | deferred-work.md: email-confirmation/SMTP details | Story 10.3 — correctly excluded |
| `ccc4d4d` | `EXPO_PUBLIC_ENABLE_PASSWORD_RESET` flag gating | Story 10.3 — correctly excluded |

One additional gap surfaced that is **not** from this branch's diff but from checking whether Story 10.1's merged code actually works locally: `767a12b` also set `[auth.sms] enable_signup = true` in local `config.toml`, and that flag is missing on `main` even though `main`'s `sign-in.tsx` (Story 10.1) calls `signUp({ phone, password })`. Folded into Task 4/AC #4 per user decision (2026-07-11) rather than filed as a separate Story 10.1 follow-up, since `config.toml` is already being touched here.

### NFR Citation Discrepancy

`epics.md`'s Story 10.2 section cites "NFR-SEC-01, NFR-SEC-06" for this story. Checked against `prd.md`: **NFR-SEC-01** is about encryption at rest/in transit (AES-256/TLS 1.3) and **NFR-SEC-06** is about on-device crisis-keyword detection — neither is about access control or the PII-erasure hole this story actually fixes. The applicable requirement is **NFR-SEC-02**: "Row Level Security is enforced on all database tables containing user health data; cross-user data access is blocked at the database layer with no application-layer bypass permitted" — this is a likely citation error in `epics.md`, noted here rather than silently propagated or corrected in the planning doc.

### Architecture Compliance

- **Edge Function Security Pre-Flight Checklist, item 6** ([implementation-patterns-consistency-rules.md](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)): `SECURITY DEFINER` functions must pin `search_path`. `perform_user_erasure` already does (`SET search_path = public`, migration 0007) — verify, don't re-add.
- **ADR-006 — RLS Policy Test Harness** ([core-architectural-decisions.md](../planning-artifacts/architecture/core-architectural-decisions.md)): this story's migration doesn't touch RLS policies (only function-level EXECUTE grants), but confirm the pgTAP harness still runs clean since it enumerates the migrations directory.
- This story is infra/SQL/docs only — no `packages/core`, `apps/mobile`, or Edge Function code changes, so ARC-011 boundary rules don't apply here.

### Project Structure Notes

- No new code files. One new SQL migration (`supabase/migrations/0030_revoke_definer_function_execute.sql`, standard sequential-numbering convention already used by 0001–0029), one `config.toml` line change, one `deferred-work.md` section addition.
- `apps/mobile/.env.remote` (gitignored, hosted URL + publishable key) already exists in this worktree — no action needed; it's a local dev convenience file, not part of this story's repo-tracked scope. Pointing the running app at the hosted project (vs. local Supabase) and wiring EAS env vars for preview/production builds is **out of scope** for this story's AC — not mentioned in epics.md's Story 10.2 acceptance criteria; leave for a deployment-focused story if/when needed.

### Testing Standards

- No new unit-test surface (infra + SQL + docs). Verification is operational, per Task 4: `pnpm turbo typecheck lint test` green, plus live confirmation via Supabase MCP tools (`list_migrations`, `get_advisors`) that the hosted project matches the new migration file and no longer flags the two definer functions.

### Previous Story Intelligence

Story 10.1 (password sign-up/sign-in, merged to `main` via PR #63) touched only `apps/mobile/app/(auth)/sign-in.tsx` and i18n keys — no overlap with this story's scope (hosted infra, migrations, deferred-work docs). Per the decision recorded in 10.1: the retroactively-documented `feature/password-based-login` branch is treated as reference/prior-art, not as a base to build from — Story 10.1 was reimplemented fresh on its own branch off `main`, and this story follows the same precedent for its own subset of that branch's work (see "Remote State Is Already Correct" above).

### Git Intelligence

Relevant commits on `feature/password-based-login` (unmerged, reference-only): `13ba0f5` (config.toml link + migration 0030 — content reproduced and independently re-verified above), `d7adb0c`/`cf9e9ae` (the deferred-work.md entries this story's Task 3 partially recreates, scoped down to just the leaked-password-protection item per AC #3 — the broader hosted-provisioning and reset-flow entries belong to a future Story 10.3, not this story).

### References

- [_bmad-output/planning-artifacts/epics.md — Epic 10 / Story 10.2](../planning-artifacts/epics.md)
- [_bmad-output/planning-artifacts/prd.md — NFR-SEC-02](../planning-artifacts/prd.md) (see NFR Citation Discrepancy above)
- [_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md — Edge Function Security Pre-Flight Checklist item 6](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)
- [_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md — ADR-006](../planning-artifacts/architecture/core-architectural-decisions.md)
- `supabase/config.toml` (file to modify)
- `supabase/migrations/0007_perform_user_erasure_fn.sql` (function being re-hardened, not modified)
- `supabase/migrations/0027_fear_ladder_items_delete_audit.sql` (function being re-hardened, not modified)
- `_bmad-output/implementation-artifacts/deferred-work.md` (file to modify)
- Supabase MCP tools: `list_migrations`, `get_advisors`, `apply_migration` (project_id `jhbtzsvlgglyfbrgmpsb`)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
