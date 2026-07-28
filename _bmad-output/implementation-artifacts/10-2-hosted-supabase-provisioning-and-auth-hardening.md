# Story 10.2: Hosted Supabase Provisioning & Auth Hardening

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer preparing the password-auth epic for a real beta,
I want the hosted Supabase project fully migration-current and hardened against the cross-user PII-erasure hole found in migration 0007,
so that password-based accounts run on production-shaped infrastructure with no known auth-adjacent security gaps beyond the explicitly deferred Free-plan leaked-password check (AC #3).

## Acceptance Criteria

1. **Given** the hosted Supabase project "Exposure Buddy" (`jhbtzsvlgglyfbrgmpsb`, ap-northeast-1)
   **When** this story is implemented
   **Then** it is linked in `supabase/config.toml` (`project_id` set to the real ref, replacing the `"exposure-buddy"` placeholder); migration `0030` is confirmed applied on the hosted project; migrations `0001`–`0029` are confirmed present on the hosted project under their batched applied-migration names (not reconciled or reapplied — see Dev Notes: Remote State Is Already Correct); and the `exposure-buddy://reset-password` redirect URL is confirmed present under Auth → URL Configuration → Redirect URLs on the hosted project dashboard. (Note: `epics.md`'s Story 10.2 AC text reads "migrations are backfilled to match local (0004–0030)" — this AC deliberately narrows that to "confirmed present," not "reconciled," per the batched-name mismatch explained in Dev Notes.)

2. **Given** `perform_user_erasure` and `fear_ladder_items_delete_audit` were found to have public EXECUTE grants (a cross-user PII-erasure hole introduced in migration 0007)
   **When** this story is implemented
   **Then** a new migration `supabase/migrations/0030_revoke_definer_function_execute.sql` exists in the repo, revoking public EXECUTE on both functions and re-granting EXECUTE on `perform_user_erasure` to `service_role` only, and this is confirmed applied on the hosted project.

3. **Given** leaked-password protection (HaveIBeenPwned check) requires a Supabase Pro-plan feature
   **When** this story is implemented on the Free-plan hosted project
   **Then** the feature is deferred, not silently skipped — a new entry is added to `_bmad-output/implementation-artifacts/deferred-work.md` with the trigger "enable when upgraded to Pro plan (Auth → Providers → Email → Password Security)"; the client-side 8-character minimum length (already shipped in Story 10.1) remains the only password-strength check at MVP.

4. **Given** two loose ends found by cross-checking this story against the unmerged `feature/password-based-login` branch (not in epics.md's original AC text, added here so the dev agent doesn't have to rediscover them)
   **When** this story is implemented
   **Then** (a) `.gitignore` also excludes `.env.production` alongside the already-present `.env.remote` (hosted-project env-file hygiene, same class of file), and (b) `supabase/config.toml`'s `[auth.sms]` section sets `enable_signup = true` so phone+password sign-up (shipped in Story 10.1, already merged to `main`) actually works against a local `supabase start` stack — currently it's `false`, which would reject local phone signup attempts even though the app code supports it.

**Source:** [_bmad-output/planning-artifacts/epics.md#Story 10.2](../planning-artifacts/epics.md), NFR-SEC-02 in [prd.md](../planning-artifacts/prd.md) (see Dev Notes — NFR Citation below for a discrepancy with the epics.md text; also see AC #1 note above for a second, smaller wording deviation from epics.md's AC text).

## Tasks / Subtasks

- [x] Task 1 — Link `supabase/config.toml` to the hosted project and verify (don't blindly re-push) migration/redirect state (AC: #1)
  - [x] Change `project_id = "exposure-buddy"` to `project_id = "jhbtzsvlgglyfbrgmpsb"` in `supabase/config.toml` (single-line change; keep the existing comment above it but update it to reflect the real ref instead of "placeholder... Story 1.7 → Epic 2")
  - [x] `supabase link` requires either `SUPABASE_ACCESS_TOKEN` set in the environment or an interactive browser OAuth flow — neither is guaranteed available (confirmed absent as of this review). Before linking, ensure `SUPABASE_ACCESS_TOKEN` is set (see `docs/setup/local-environment.md`), or fall back to the MCP tools (`list_migrations`, `get_advisors`, `apply_migration`) for every check in this task, which don't require it.
  - [x] **Do not run a blind `supabase db push` against this project.** The hosted DB is already fully migrated (verified live via the Supabase MCP `list_migrations` tool on 2026-07-11 — see Dev Notes: Remote State Is Already Correct below). Confirm sync with `supabase link --project-ref jhbtzsvlgglyfbrgmpsb` followed by `supabase migration list --linked` (or the MCP `list_migrations` tool), and only apply Task 2's new migration file (0030) — do not attempt to reconcile or reapply 0004–0029, which are already live remotely under different (batched) applied-migration names. That naming mismatch is expected — see Dev Notes. **If this check finds anything other than the expected batched-name state (e.g. genuine drift, a migration missing remotely) — halt and report to the user rather than proceeding to Task 2.**
  - [x] If linking or any CLI command in this task fails in a way that looks version-related, note that the hosted project runs Postgres 17 while local `supabase/config.toml` pins `major_version = 15` (see `[db] major_version` in `config.toml`) — this repo has hit a real local/hosted Postgres version mismatch before (a prior local `supabase start` incident from mismatched Docker volumes). It is not expected to block this story's CLI/MCP operations, but rule it out first if something behaves unexpectedly.
  - [x] Before relinking, check for a pre-existing link (e.g. `supabase status` or existing local Supabase CLI project state) — do not relink over a different previously-linked project without confirming with the user first.
  - [x] Confirm (do not blindly re-add) that `exposure-buddy://reset-password` is present under Auth → URL Configuration → Redirect URLs on the hosted project dashboard. This was added in a prior out-of-band session; dashboard config is independent of git branch/commit state, so it should still be there, but verify rather than assume. **If it is missing — halt and report to the user rather than assuming and proceeding; do not silently re-add it.** — **Finding: missing (2026-07-15), then resolved (2026-07-28).** No MCP tool exposes hosted Auth URL configuration and no `SUPABASE_ACCESS_TOKEN`/dashboard access was available to this session, so the user checked the dashboard directly (2026-07-15) and confirmed the redirect URL was **not** present, despite Dev Notes' "prior out-of-band session" claim. Per the explicit halt instruction, this was not silently re-added by the agent. On 2026-07-28, the user added `exposure-buddy://reset-password` under Auth → URL Configuration → Redirect URLs on the hosted dashboard directly, and confirmed it is now saved and present. AC #1's redirect-URL requirement is now satisfied.
- [x] Task 2 — Add migration 0030 to close the definer-function EXECUTE hole (AC: #2)
  - [x] Create `supabase/migrations/0030_revoke_definer_function_execute.sql` (exact content below — already proven correct and already live on the hosted DB, verified via `get_advisors` security scan on 2026-07-11 showing neither function flagged as anon/authenticated-executable):
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
  - [x] Verify `perform_user_erasure`'s existing `SET search_path = public` pin (migration 0007) is undisturbed — no change needed, this is a compliance check against the Edge Function Security Pre-Flight Checklist's `SECURITY DEFINER` rule (already satisfied; confirm, don't re-add).
  - [x] Apply the migration to the hosted project (`supabase db push --linked` once Task 1's link is confirmed, or the `mcp__plugin_supabase_supabase__apply_migration` tool with `project_id: jhbtzsvlgglyfbrgmpsb`). This is safe/idempotent — the remote DB already has the equivalent grants revoked — but running it makes the migration file the source of truth for any future environment provisioned from these files (fresh local reset, CI, disaster recovery). — Confirmed already applied remotely under this exact name (`0030_revoke_definer_function_execute`, version `20260704111617`) via `list_migrations`; the migration file created in Task 2 now matches it byte-for-byte, no reapplication needed.
  - [x] If applied via the MCP `apply_migration` tool, confirm it also registers in the CLI-tracked migration history: run `supabase migration list --linked` and check `0030_revoke_definer_function_execute` appears as applied. MCP-applied SQL doesn't necessarily go through the same tracked-migration bookkeeping as `supabase db push` — if it's missing from the linked migration list, a future `supabase db push --linked` could attempt to reapply it; note and reconcile if so. — Confirmed present via MCP `list_migrations` (same tracking table `supabase.schema_migrations` that `--linked` reads); CLI-based double-check blocked by missing `SUPABASE_ACCESS_TOKEN` (see Task 1).
  - [x] Re-run the security advisor (`mcp__plugin_supabase_supabase__get_advisors`, `type: security`, `project_id: jhbtzsvlgglyfbrgmpsb`) after applying — confirm `perform_user_erasure` / `fear_ladder_items_delete_audit` do not appear in any anon/authenticated-executable finding. (They don't as of 2026-07-11 — this step closes the loop after Task 1 relinks the project to source control, it is not expected to surface a new problem.) **If either function is still flagged — halt and report to the user rather than assuming it's a caching lag.**
- [x] Task 3 — Document the leaked-password-protection deferral (AC: #3)
  - [x] Add a new dated section to `_bmad-output/implementation-artifacts/deferred-work.md`, following the file's existing per-story convention (see the `## Deferred from: code review of 10-1-...` section for the exact format: `##` heading + italic context line + bullet(s) + a source-file citation line), stating: hosted project is on the Free plan; the HaveIBeenPwned leaked-password check requires Pro; not an MVP blocker since the client-side 8-character minimum (Story 10.1) already ships; trigger = "enable the toggle (Auth → Providers → Email → Password Security) when the project is upgraded to Pro."
  - [x] **Scope this entry narrowly** — do not reintroduce the broader "Hosted/remote Supabase — mostly provisioned" or "Reset + email-confirmation deep-link flow not E2E-verified" entries that existed on the old `feature/password-based-login` branch's `deferred-work.md`. Those belong to Story 10.3 (forgot/reset-password flow), which has not been created yet and is out of this story's scope.
- [x] Task 4 — Close the two cross-check gaps (AC: #4)
  - [x] Add `.env.production` to `.gitignore` alongside the existing `.env.remote` line (same section, one new line) — protects a future hosted-project env file from being committed, matching the intent already established for `.env.remote`.
  - [x] In `supabase/config.toml`'s `[auth.sms]` section, change `enable_signup = false` to `enable_signup = true` (mirrors `[auth.email] enable_signup = true`, already set). This is a **local-dev-only** config fix — it does not touch the hosted project's own SMS provider settings (those are dashboard-level, separate from this file) — it only makes local `supabase start` accept phone-based `signUp()` calls without a real SMS provider, consistent with how `[auth.email] enable_confirmations = false` already lets email password-signup auto-confirm locally. — **Correction discovered during Task 5 verification:** this claim was wrong. `enable_signup = true` alone does not flip GoTrue's phone channel locally; the Supabase CLI forces `GOTRUE_EXTERNAL_PHONE_ENABLED=false` ("no SMS provider is enabled. Disabling phone login") unless a `[auth.sms.<provider>]` block with `enabled = true` is also present, confirmed via direct docker inspection of the local auth container both before and after clean restarts, and via Supabase's own docs ("You also need to set up an SMS provider"). Added `[auth.sms.twilio]` with `enabled = true` and dummy credentials — never actually contacted, since `enable_confirmations = false` means signup autoconfirms — to close the real gap; verified working end-to-end via a raw `signup` API call returning an access token for a phone+password account.
- [x] Task 5 — Verification (AC: #1, #2, #3, #4)
  - [x] (AC #2) Apply migration `0030` to the **local** Supabase stack (`supabase db reset` or `supabase migration up` against a running `supabase start`) before running tests below — the RLS/pgTAP harness only exercises the new `REVOKE`/`GRANT` if the local DB actually has migration 0030 applied; otherwise the suite silently passes without covering this story's change. — Applied via `supabase start` (migration 0030 is now part of the local migrations directory and applies on stack (re)start); confirmed via direct `psql`-equivalent query (`docker exec ... has_function_privilege`) that anon/authenticated cannot execute either function and service_role can execute `perform_user_erasure`.
  - [x] (AC #1, #2, #4) No application code changes in this story (infra config + one SQL migration + two docs/config one-liners) — there is no new unit-test surface. Run `pnpm turbo typecheck lint test` to confirm nothing regresses (in particular the RLS/pgTAP harness per ADR-006, which enumerates migrations, now covering 0030 per the step above). — 19/19 turbo tasks pass (387/387 mobile Jest tests); `packages/supabase` Vitest suite re-run directly with `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` set against the live local stack: 22/22 test files, 102/102 tests pass, including `fear_ladder_items_delete_audit.test.ts` which empirically confirms the AFTER DELETE trigger still fires post-revocation (closes the previously-deferred review finding).
  - [x] (AC #2) Confirm via the Supabase MCP (`list_migrations`, `get_advisors`) that the hosted project's applied-migration list includes `0030_revoke_definer_function_execute` and the security advisor no longer flags the two definer functions. — Confirmed: `list_migrations` shows it applied; `get_advisors` (security) shows only the 4 pre-existing `rls_enabled_no_policy`, 3 pre-existing `function_search_path_mutable`, and the AC #3-tracked `auth_leaked_password_protection` — no anon/authenticated-executable finding for either function.
  - [x] (AC #1) Confirm `supabase link --project-ref jhbtzsvlgglyfbrgmpsb` (or MCP equivalent) succeeds locally using the updated `config.toml`. — CLI `supabase link` fails with `LegacyPlatformAuthRequiredError` (no `SUPABASE_ACCESS_TOKEN`, no browser OAuth available in this environment), consistent with the story's own risk note. Substituted the MCP equivalent per Task 1's documented fallback: `get_project`, `list_migrations`, `get_advisors` all succeed against `jhbtzsvlgglyfbrgmpsb` using the updated ref.
  - [x] (AC #4) Manually verify local phone+password sign-up (Story 10.1's flow) no longer gets rejected by GoTrue after the `[auth.sms] enable_signup` change, against a local `supabase start` stack. — Initial verification with only `enable_signup = true` **failed** (`phone_provider_disabled`); root-caused and fixed with the `[auth.sms.twilio]` addition documented above; re-verified passing after a clean `supabase stop`/`supabase start` cycle (raw signup API call returns a valid session for a `+1555...` phone number with `password`).

### Review Findings

_Pre-dev adversarial spec review (Blind Hunter + Edge Case Hunter). `no-spec` mode — the story document was the review target itself. 9 patches, 4 deferred, 4 dismissed as noise below._

- [x] [Review][Patch] AC list is out of order (1, 4, 2, 3) and never renumbered — reads as bolted-on. Renumber sequentially.
- [x] [Review][Patch] AC #1's "migrations through 0030 are confirmed applied" contradicts Task 1's own "do not attempt to reconcile or reapply 0004–0029" instruction, and silently diverges from `epics.md`'s actual Story 10.2 AC text ("migrations are backfilled to match local (0004–0030)") without flagging the deviation the way the NFR citation is flagged. Reword AC #1 to distinguish "0030 confirmed applied" from "0001–0029 confirmed via batched-name equivalence, not reconciled," and note the epics.md wording deviation alongside the existing NFR Citation Discrepancy note.
- [x] [Review][Patch] Several "confirm rather than assume" verification steps have no defined fallback if the expected state doesn't hold: Task 1's migration-drift check, Task 1's redirect-URL presence check, Task 1's relink (no guard against relinking over a different previously-linked project), Task 2's post-apply advisor re-check. Add an explicit instruction: if any of these checks find drift/absence/an unexpected flag, halt and report to the user rather than proceeding.
- [x] [Review][Patch] Story statement's "no known auth-adjacent security gaps" is directly contradicted by AC #3's explicit deferral of leaked-password protection. Soften to "no known auth-adjacent security gaps beyond the explicitly deferred Free-plan leaked-password check."
- [x] [Review][Patch] Task 5 is labeled "(AC: #1, #2, #3, #4)" but its sub-bullets aren't individually mapped to which AC each verifies. Map each sub-bullet to its AC number.
- [x] [Review][Patch] `supabase link` requires `SUPABASE_ACCESS_TOKEN` or interactive browser auth — neither is guaranteed present in a dev/CI environment (confirmed absent in this worktree). Task 1 and Task 5 assume it "succeeds." Add a fallback note: ensure `SUPABASE_ACCESS_TOKEN` is set (see `docs/setup/local-environment.md`), or use the MCP tools exclusively, which don't require it.
- [x] [Review][Patch] Local `supabase/config.toml` pins Postgres `major_version = 15` while the hosted project runs Postgres 17 — the same mismatch class that caused a prior local incident in this repo (PG17-vs-PG15 docker volume issue). Never checked or mentioned in this story. Add a caution note to Task 1/Task 2 referencing this known issue class.
- [x] [Review][Patch] Task 5 claims `pnpm turbo test` (RLS/pgTAP per ADR-006) verifies "nothing regresses," but no task applies migration 0030 to the *local* Supabase stack — the local pgTAP suite runs against pre-migration grant state and will silently pass without exercising the new REVOKE/GRANT. Add a Task 5 step to apply 0030 locally (`supabase db reset` or `supabase migration up`) before running tests, or explicitly note the local suite doesn't cover this and that's acceptable.
- [x] [Review][Patch] No step confirms MCP `apply_migration` registers migration 0030 in the CLI-tracked `supabase_migrations.schema_migrations` history the same way `supabase db push` would — risk of a later `supabase db push --linked` attempting to reapply/diverge. Add a step to run `supabase migration list --linked` after applying via MCP to confirm 0030 is registered.
- [x] [Review][Defer] Trigger-function (`fear_ladder_items_delete_audit`) EXECUTE-revocation reasoning is technically sound but never actually exercised — no task performs a DELETE on `fear_ladder_items` post-migration to confirm the trigger still fires. — deferred, low risk/optional
- [x] [Review][Defer] NFR citation error in `epics.md` (cites NFR-SEC-01/06 instead of NFR-SEC-02) is deliberately left uncorrected at the source. — deferred, doc-only follow-up
- [x] [Review][Defer] Task 5's `pnpm turbo typecheck lint test` could fail on unrelated pre-existing issues with no triage guidance for the dev agent. — deferred, general operational judgment
- [x] [Review][Defer] Task 4's `[auth.sms] enable_signup = true` doesn't address future interaction with `enable_confirmations` once a real SMS provider is configured for local dev (the email case already documents this pattern; the SMS case doesn't). — deferred, speculative/future

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

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `mcp__plugin_supabase_supabase__list_migrations` (project `jhbtzsvlgglyfbrgmpsb`) — confirmed 7 applied migrations matching Dev Notes exactly, including `0030_revoke_definer_function_execute` already live.
- `mcp__plugin_supabase_supabase__get_advisors` (security) — confirmed no anon/authenticated-executable finding for either hardened function, both before and after local verification.
- `docker exec supabase_db_jhbtzsvlgglyfbrgmpsb psql ... has_function_privilege(...)` — empirically confirmed EXECUTE grants post-migration-0030 locally (anon/authenticated: false for both functions; service_role: true for `perform_user_erasure`).
- `supabase link --project-ref jhbtzsvlgglyfbrgmpsb` → `LegacyPlatformAuthRequiredError` (no `SUPABASE_ACCESS_TOKEN`/browser OAuth available); fell back to MCP tools per Task 1's documented contingency.
- Phone+password signup investigation: `curl .../auth/v1/signup` with only `[auth.sms] enable_signup = true` → `{"code":400,"error_code":"phone_provider_disabled"}`. `docker inspect supabase_auth_jhbtzsvlgglyfbrgmpsb` showed `GOTRUE_EXTERNAL_PHONE_ENABLED=false` even after a clean `supabase stop`/`supabase start`. Root cause confirmed via Supabase docs ("You also need to set up an SMS provider") — added `[auth.sms.twilio]` with `enabled = true` and dummy credentials (never contacted, since local signup autoconfirms); re-verified `GOTRUE_EXTERNAL_PHONE_ENABLED=true` and a successful signup returning an access token.

### Completion Notes List

- Repo now matches the hosted project's already-correct state: `supabase/config.toml`'s `project_id` points to the real ref (`jhbtzsvlgglyfbrgmpsb`), and `supabase/migrations/0030_revoke_definer_function_execute.sql` exists locally matching what was already live remotely.
- AC #2's EXECUTE-revocation was verified two ways: hosted (`get_advisors` shows no anon/authenticated-executable finding) and local (direct `has_function_privilege` query post-migration, plus the previously-deferred trigger-still-fires check via `fear_ladder_items_delete_audit.test.ts` passing against the live local stack).
- AC #3: leaked-password-protection deferral documented in `deferred-work.md`, scoped narrowly per the story's own instruction (did not reintroduce the broader Story 10.3-owned entries).
- AC #4(a): `.env.production` added to `.gitignore`.
- AC #4(b): the story's stated fix (`[auth.sms] enable_signup = true` alone) turned out to be **insufficient** — verified this empirically (see Debug Log References) rather than trusting the story's stated reasoning. The actual fix required an additional `[auth.sms.twilio]` provider block with `enabled = true` and placeholder credentials (never contacted locally, since autoconfirm is on). This was surfaced to the user mid-implementation; user asked me to investigate further rather than defer it, and the investigation found a working, minimal, local-only fix.
- Task 1's dashboard redirect-URL check found `exposure-buddy://reset-password` **missing** from Auth → URL Configuration → Redirect URLs on the hosted project (contradicts Dev Notes' claim it was added in a prior out-of-band session). Per the story's explicit "halt and report, don't silently re-add" instruction, this was not touched by this story's automated work. The user added it directly via the dashboard on 2026-07-28, outside this story's repo-scoped work, and confirmed it is now present — AC #1 is fully satisfied.
- Full verification suite green: `pnpm turbo typecheck lint test` (19/19 tasks, 387/387 mobile tests), plus `packages/supabase`'s Vitest suite re-run directly against the live local Supabase stack with `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` set (22/22 files, 102/102 tests, including all RLS/pgTAP-equivalent tests that are normally skipped without those env vars).
- No `packages/core`, `apps/mobile`, or Edge Function code changes — infra/SQL/docs only, consistent with the story's stated scope (plus the one additional config block needed to make AC #4(b) actually true, per above).

### File List

- `supabase/config.toml` (modified — `project_id` linked to hosted ref; `[auth.sms] enable_signup` flipped to `true`; added `[auth.sms.twilio]` fake-provider block required to actually unblock local phone signup)
- `supabase/migrations/0030_revoke_definer_function_execute.sql` (new — revokes public EXECUTE on `perform_user_erasure` and `fear_ladder_items_delete_audit`)
- `.gitignore` (modified — added `.env.production`)
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified — added leaked-password-protection deferral entry, scoped to AC #3)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status tracking only)
