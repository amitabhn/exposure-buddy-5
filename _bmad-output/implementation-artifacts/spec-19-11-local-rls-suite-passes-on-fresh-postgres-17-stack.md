---
title: 'Story 19.11: Local RLS Test Suite Passes on a Fresh Postgres 17 Stack'
type: 'bugfix'
created: '2026-10-13'
status: 'done'
baseline_commit: '6577c5f272b1fc3f52c5cfb76c62a44ecdfdc19e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On a freshly built local Supabase stack (Postgres 17.6), the `dpo_operators` RLS tests "[-] unauthenticated (anon) read is blocked" and "[-] authenticated regular user read is blocked" fail: the read returns no error where the test expects `42501`. Separately, `supabase/config.toml` pins `[db] major_version = 15` while the stack runs Postgres 17 (the hosted project and the local image are both 17.6.1.127), so the config, the docs and reality disagree, and a developer whose volume still holds Postgres 15 data hits an unexplained crash loop.

**Approach:** The failures are real, not a Postgres 17 regression. Migration 0023 says `anon`/`authenticated` have "no grants (blocked at grant level)" but only ever grants to `service_role`; the Supabase default privileges on `public` give `anon` and `authenticated` every privilege on every new table, so with RLS on and no policy the read returns an empty result instead of `42501`. Add a numbered migration that revokes those client-role grants on `dpo_operators`, make the migration's stated model true, and keep the tests as written. Set `config.toml` to `major_version = 17`, and make `docs/setup/local-environment.md` agree and document the version-mismatch recovery.

</frozen-after-approval>

## Boundaries & Constraints

**Always:**
- Keep both denial tests asserting `42501`; do not loosen them to accept an empty result.
- The migration changes `dpo_operators` only, and `service_role` keeps `SELECT, INSERT, DELETE` (the `dpo-login` / `dpo-audit-log` Edge Functions and test seeding depend on it).
- Schema changes ship as a numbered migration under `supabase/migrations/` (next number 0035). Apply it first with `supabase migration up` (non-destructive). One `supabase db reset` is approved by the human (2026-10-13) to prove 0001..0035 build from nothing on Postgres 17: it wipes local-only data (test users); no other volume wipe.
- `packages/supabase/src/database.types.ts` is regenerated only if the migration changes it (a REVOKE does not).

**Never:**
- Never apply the migration to the hosted project from this story: hosted is migrated separately and deliberately by the human.
- Never run `supabase config push`, or change `project_id` (see the warning in `config.toml`).
- No change to any other table's grants (see Decision 4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Anon read | anon key `select * from dpo_operators` | `error.code === '42501'` | n/a |
| Authenticated regular user read | signed-in non-operator selects | `error.code === '42501'` | n/a |
| Service role read | service key selects | succeeds; rows returned | n/a |
| Service role insert / delete | seeding and teardown in the same suite | succeed | n/a |
| Fresh stack | one approved `supabase db reset` runs 0001..0035 on 17 | all migrations apply; grants as above; `config.toml` and the running image agree on 17; RLS suite results recorded | a failing migration on 17 is a finding, not ignored |
| Volume still on Postgres 15 | old `supabase_db_*` volume | documented recovery steps resolve the crash loop | docs |

## Code Map

- `supabase/migrations/0023_dpo_operators_rls.sql` -- states the intended grant model; enables RLS; grants `service_role` only. Do not edit (applied migrations are immutable).
- `supabase/migrations/0030_revoke_definer_function_execute.sql` -- precedent for a REVOKE-only migration and its comment style.
- `supabase/migrations/0035_*.sql` (new) -- `REVOKE ALL ON public.dpo_operators FROM PUBLIC, anon, authenticated;`, with a comment naming 0023's intent and the Supabase default privileges as the cause. 0023's header says service_role gets "SELECT only", but its statement grants `SELECT, INSERT, DELETE`; the comment cites the statement, not the header. After applying, confirm `service_role` still has `SELECT, INSERT, DELETE` (psql output into Implementation Notes); no GRANT is added unless that check fails.
- `packages/supabase/__tests__/rls/dpo_operators.test.ts` -- unchanged; the proof. Run with `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from `supabase status -o env`.
- `supabase/config.toml` -- `[db] major_version = 15` becomes `17`.
- `docs/setup/local-environment.md` -- "Known gotchas": add the Postgres version entry (symptoms `database files are incompatible with server` and edge_runtime `BOOT_ERROR`; check `docker ps -a`; the entry opens with a warning that the fix wipes all local data such as test users, placed before the command; fix: `supabase stop --no-backup` (deletes the project's data volumes whatever they are named; older notes cite `exposure-buddy` volume names, the project is now `jhbtzsvlgglyfbrgmpsb`), then `supabase start`). Also make "Supabase RLS tests skip without local Supabase" say how to export the keys (`eval "$(supabase status -o env ...)"`) so the suite does not skip, and that CI does not run the RLS suite (no anon key), so green CI does not mean RLS verified.

## Tasks & Acceptance

**Execution:**
- [x] Migration 0035: revoke all client-role privileges on `dpo_operators`; apply locally with `supabase migration up`.
- [x] Run `dpo_operators.test.ts` against the local stack: all three tests pass. Confirm the service-role test seeds its own row (`seed.sql` seeds no operator, so after `db reset` the table is empty). Then run the whole RLS directory (`packages/supabase/__tests__/rls`) and record any other failure in Implementation Notes (fix only if it is the same root cause; otherwise defer).
- [x] Fresh-stack proof: after `migration up` passes, run `supabase db reset` (human-approved), re-export the keys, re-run the whole RLS directory, and record results; note that local test users are gone. A failing migration on 17 stops the story before the config change.
- [x] Only after that proof passes: `config.toml` `major_version = 17`; docs per the Code Map.
- [ ] CI proof: the PR carries `run-e2e`; the three Maestro shards (they are the only CI jobs that run `supabase start`, now on Postgres 17 instead of 15) pass.
- [x] Record in Implementation Notes: before/after grants for `dpo_operators` (psql output), the test results, and the hosted project's status (see Decision 3). The PR description states that 0035 is not applied to hosted, and `deferred-work.md` carries an entry for the hosted apply so it outlives this spec.

**Acceptance Criteria:**
- Given a local stack on Postgres 17 with migrations applied, when the `dpo_operators` RLS test runs, then the anon and authenticated reads fail with `42501` and the service-role read passes.
- Given `config.toml`, the running image and the docs, then all name Postgres 17.
- Given a developer whose volume holds Postgres 15 data, when they follow the documented steps, then `supabase start` boots cleanly.
- Given a fresh `supabase db reset` on Postgres 17, then all migrations apply and the `dpo_operators` tests pass.
- Given the PR's CI, then the three Maestro shards pass on the Postgres 17 stack.
- Given `pnpm turbo typecheck lint test`, then all pass (the RLS suite skips in CI without the keys, as before).

## Decisions (resolved 2026-10-13)

1. **Fix in the database, not the test.** Revoke the grants (0023's own stated model, and defense in depth: `TRUNCATE` is not subject to RLS). Rejected: relaxing the tests to accept an empty result, which would bless the grant leak.
2. **Intended Postgres version is 17.** Hosted reports 17.6.1.127 (`get_project`), the same image the local stack pulled. `config.toml` follows reality.
3. **Hosted not touched or inspected here.** The same default privileges apply on hosted, so `dpo_operators` there very likely has the same grants; a read of hosted grants was blocked by the permission classifier. The human decides when to apply 0035 to hosted (and may verify with `information_schema.role_table_grants` first).
4. **Other tables are out of scope.** All 12 `public` tables currently grant `anon` every privilege, including `TRUNCATE`, with RLS as the only gate (local query, 2026-10-13). Revoking those is a wider hardening change with its own test impact; recorded in `deferred-work.md`.

## Implementation Notes

2026-10-13 (local stack, Postgres 17.6, image 17.6.1.127):

- **Grants on `dpo_operators`** (`information_schema.role_table_grants`, psql output).

  Before 0035:

  ```
      grantee    |                          privs
  ---------------+---------------------------------------------------------
   anon          | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
   authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
   postgres      | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
   service_role  | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
  ```

  After 0035 (identical after the fresh `db reset`):

  ```
     grantee    |                          privs
  --------------+---------------------------------------------------------
   postgres     | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
   service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
  ```

  `service_role` still has SELECT, INSERT, DELETE (plus the other default privileges, left alone); no GRANT was added.
- **Tests:** `dpo_operators.test.ts` 3/3 after `migration up`. Whole RLS directory 14 files, 66 tests, after `migration up` and again after `supabase db reset` (0001..0035 all applied on 17.6, no migration failed). The service-role test seeds its own operator row, so the empty table after reset is fine. No other RLS failures.
- **Local data:** the human ran `supabase db reset`; local test users are gone.
- **Other gates:** `pnpm turbo typecheck lint test` green (19 tasks, mobile jest 649/649).
- **Docs/config:** `config.toml` `major_version = 17`; `docs/setup/local-environment.md` has the Postgres-version gotcha (data-loss warning first) and the key-export recipe plus the CI-skips-RLS note. The Postgres 15 recovery steps were not exercised (no Postgres 15 volume exists locally).
- **Hosted:** 0035 not applied; recorded in `deferred-work.md` and to be stated in the PR description.
- **Still open:** CI proof (`run-e2e` on the PR, three Maestro shards on Postgres 17) needs a pushed PR.


## Spec Change Log

- 2026-10-13, party pass 1, applied by the human's call: CI proof for the 15 to 17 change (`run-e2e`, Maestro shards); one approved `db reset` for the fresh-stack row; docs use `supabase stop --no-backup` and note the project_id rename and that CI skips the RLS suite; the GRANT sentence replaced by a service_role check. Review also confirmed no policy or function reads `dpo_operators` as a client role (REVOKE is safe), and that 0024 shows the old stack gave no default grants, so the REVOKE is idempotent on both. Frozen block untouched.

- 2026-10-13, party pass 2, applied by the human's call: 0035 comment cites 0023's grant statement, not its "SELECT only" header; service-role test must seed its own row (empty table after reset); `config.toml` change moved after the fresh-stack proof; docs warning precedes the wipe command; hosted-not-migrated recorded in the PR description and `deferred-work.md`. The PG15-recovery AC was left as written (the human did not ask to change it). Frozen block untouched.

## Review Triage Log

| Finding (layer) | Verdict | Route | Evidence |
|---|---|---|---|
| No `deferred-work.md` entry for the hosted 0035 apply (all three) | false | rejected | Entry exists, committed in the spec commit before `baseline_commit`, so it is not in the diff; `grep` finds both 19.11 entries. |
| sprint-status says in-progress while spec is in-review (all three) | low | patch | Set 19-11 to `review` and updated `last_updated`. |
| Before/after grants recorded as prose, not psql output (Blind Hunter) | low | patch | Implementation Notes now carry the actual psql output. |
| No CI-run check that the revoke holds; RLS suite skips in CI (Verification Gap, Edge Case, Blind Hunter) | medium | defer | Pre-existing arrangement (suite needs local keys), documented in the docs edit; not caused by this story. Deferred-work entry added. |
| Service-role INSERT/DELETE only indirectly asserted (Verification Gap) | low | rejected | The read test already fails if the seed insert is lost; a fix means new test scaffolding for an unlikely regression. |
| Revoke covers one table only; default privileges remain (Blind Hunter) | low | rejected | Excluded by the frozen intent (Decision 4) and already in `deferred-work.md`. |
| Hosted stays exposed, no tracked action (Blind Hunter) | low | rejected | Frozen Decision 3; tracked in `deferred-work.md`; RLS with no policy keeps hosted reads empty. |
| `jhbtzsvlgglyfbrgmpsb` is the hosted ref, may not match local project_id (Blind Hunter) | false | rejected | `config.toml` `project_id = "jhbtzsvlgglyfbrgmpsb"`; local docker volumes carry that name. |
| PG15 recovery steps unexercised (Edge Case, Blind Hunter) | low | rejected | Already stated in Implementation Notes; no PG15 volume exists to exercise. |
| 0023 header not corrected (Blind Hunter) | false | rejected | Applied migrations are immutable; 0035's comment names the stale header. |
| `eval`/`sed` recipe fragile; `npx` vs pnpm; `last_updated` chain long (Blind Hunter) | low | rejected | Cosmetic; the recipe was run as written and matches the spec's own Verification command. |
| CI proof open, no revert plan if shards fail (Blind Hunter) | low | rejected | The CI proof is a tracked unchecked task awaiting the PR; a revert is one line in `config.toml`. |


## Verification

**Commands:**
- `supabase migration up` -- expected: applies 0035 only
- `cd packages/supabase && SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npx vitest run __tests__/rls` -- expected: `dpo_operators` green; other results recorded
- `supabase db reset` (human-approved), then the RLS directory again -- expected: all migrations apply; `dpo_operators` green
- `pnpm turbo typecheck lint test` -- expected: all green
- PR labelled `run-e2e` -- expected: E2E Smoke (core, session, onboarding) green on Postgres 17
