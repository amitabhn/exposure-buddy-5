# Story 9.1: PowerSync Schema Sync & Offline Degradation ADR

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer maintaining the offline-first architecture,
I want the PowerSync schema verified against the live Supabase schema and the offline degradation policy documented in a finalized ADR,
so that every dev agent knows the authoritative offline behaviour contract before implementing or testing offline paths (NFR-OFFLINE-01, NFR-OFFLINE-02).

## Acceptance Criteria

1. **Given** the PowerSync sync configuration file (`apps/mobile/powersync.config.ts` or equivalent) **When** this story is implemented **Then** every table and column referenced in the PowerSync schema matches the current Supabase migration state; any discrepancy is treated as a blocking defect and resolved before the story closes; a checklist comment in the config file lists the verified tables: `users`, `user_onboarding_metadata`, `fear_ladder_items`, `exposure_sessions`, `suds_readings`; **`suds_baselines` is excluded** — table is not created at MVP (Story 6.4 deferred); **`device_push_tokens` is excluded** — it is written directly via the `packages/supabase` push-tokens Edge Function client, not synced through PowerSync. [Source: epics.md#Story 9.1]

2. **Given** `ADR-OFFLINE-DEGRADATION` is referenced in architecture documentation but its content is not yet finalized **When** this story is implemented **Then** `_bmad-output/planning-artifacts/adrs/ADR-OFFLINE-DEGRADATION.md` is created (or updated, since a stub already exists) with the following decisions: (1) which writes are queued offline via `adapter.enqueue()` and which are rejected; (2) what the user sees when a queued write cannot sync within the session window; (3) how session state is recovered on app re-foreground after a kill mid-session; (4) the sync conflict resolution policy (last-write-wins vs. server-authoritative); the ADR status field is set to `Accepted`. [Source: epics.md#Story 9.1]

3. **Given** the PowerSync schema and ADR are finalized **When** a CI run executes **Then** a schema-drift check step is present that fails the build if the PowerSync schema references tables or columns not present in the migration history; the step runs on every PR touching `supabase/migrations/` or the PowerSync config file. [Source: epics.md#Story 9.1]

## Tasks / Subtasks

- [ ] **Task 1 — Verify PowerSync schema and sync-rules coverage against Supabase migrations (AC: 1)**
  - [ ] 1.1 Confirm `packages/sync/src/schema.ts` columns match the current migration state for all 5 tables (ground truth already verified during story creation — see Dev Notes "Schema verification — ground truth"; no drift found as of this writing, but re-verify against HEAD since migrations may have moved)
  - [ ] 1.2 Add a checklist comment block at the top of `packages/sync/src/schema.ts` listing the 5 verified tables and the two explicit exclusions (`suds_baselines`, `device_push_tokens`) with their rationale, matching AC 1's wording
  - [ ] 1.3 **Critical:** audit `supabase/sync-rules.yaml` bucket coverage against the 5 PowerSync-schema tables. `users` and `user_onboarding_metadata` currently have **no bucket definition at all** — see Dev Notes "sync-rules.yaml bucket gap" for full detail and why this was explicitly flagged as an Epic 9 cleanup item in Story 6.2-A. Decide and implement the fix (most likely: add bucket entries for both tables) or, if a bucket is deliberately not needed for a table, document why in the ADR
  - [ ] 1.4 If any other discrepancy between `schema.ts` and the migration history is found, resolve it before closing the story (per AC 1, this is a blocking defect, not a deferral candidate)

- [ ] **Task 2 — Finalize ADR-OFFLINE-DEGRADATION.md (AC: 2)**
  - [ ] 2.1 Replace the current "Policy Decisions Required" checkbox shell with finalized prose decisions for all 4 points required by AC 2 (see Dev Notes "ADR decision inputs" for the evidence gathered for each)
  - [ ] 2.2 Decision 1 (queued vs. rejected writes): document that all durable writes go through `adapter.enqueue()` → `PowerSyncSyncAdapter` → local SQLite, with no client-side rejection path; uploads are server-authoritative on reconnect via `uploadData()`
  - [ ] 2.3 Decision 2 (user-visible behaviour when a queued write can't sync within the session window): there is a known, currently-unresolved gap here — see Dev Notes "Known gap: silent enqueue failures". The ADR must explicitly take a position: either codify the current silent/no-toast behaviour as the accepted MVP policy (and link the existing deferred-work.md items as the tracked follow-up), or implement the missing user-visible toast/retry path as part of this story. Do not leave this decision implicit.
  - [ ] 2.4 Decision 3 (session recovery after kill mid-session): document the existing two-layer pattern — ADR-004's MMKV-based cold-start routing plus the PowerSync local-replica query pattern (`useActiveExposureSession`) that hydrates actual state. Reconcile the unused `KV_KEYS.SESSION_IN_PROGRESS` constant (see Dev Notes) — either confirm and document its intended role, or remove it if genuinely dead.
  - [ ] 2.5 Decision 4 (conflict resolution policy): document the actual implemented policy — server-authoritative for session lifecycle fields (`expires_at`, initial `status`) enforced by Postgres triggers (`fn_session_insert_guard`, `set_session_expires_at`), upsert/update semantics for the rest with no client merge UI. State explicitly whether this is "last-write-wins" or "server-authoritative" per field.
  - [ ] 2.6 Set the ADR's `Status` field to `Accepted` once all 4 decisions are filled in; update `Owner`/`Required before` fields if stale

- [ ] **Task 3 — Add CI schema-drift gate (AC: 3)**
  - [ ] 3.1 Add a new job to `.github/workflows/ci.yml` following the existing gate pattern (see Gates 1–6 in the same file for style: name format `"<TAG> — <description>"`, `runs-on: ubuntu-latest`, single shell step, explicit PASS/FAIL echo, `exit 1` on failure)
  - [ ] 3.2 The gate must fail if any table or column referenced in `packages/sync/src/schema.ts` has no corresponding table/column in `supabase/migrations/*.sql` history. A pure grep-based check is unlikely to be reliable for this (column renames, multi-statement `ALTER TABLE ADD COLUMN`); a small Node/TS script is the more realistic approach — there is no existing script-based CI gate in this repo (all 6 current gates are inline bash/grep), so this would be the first; keep it as small and dependency-free as possible
  - [ ] 3.3 Wire the new gate into the `build` job's `needs:` array alongside the existing 6 gates, matching the established pattern
  - [ ] 3.4 Confirm the gate effectively runs on every PR touching `supabase/migrations/` or `packages/sync/src/schema.ts` — the existing gates have no `paths:` filter and simply run on every push/PR to `main`, which already satisfies this; do not introduce a separate `paths:`-filtered workflow trigger unless there's a specific reason to scope it tighter than the existing gates

## Dev Notes

### Where the "PowerSync sync configuration file" actually lives

AC 1 refers to "`apps/mobile/powersync.config.ts` or equivalent" — **this file does not exist**. The real source of truth is `packages/sync/src/schema.ts`, which defines `AppSchema` (a `@powersync/react-native` `Schema`) and is consumed by `packages/sync/src/client.ts` (`getPowerSyncDatabase`/`createPowerSyncDatabase`) and re-exported from `packages/sync/src/index.ts`. Treat `packages/sync/src/schema.ts` as the AC 1 target file. [Source: packages/sync/src/schema.ts, packages/sync/src/client.ts]

### Schema verification — ground truth (verified during story creation)

Table-by-table comparison of `packages/sync/src/schema.ts` against `supabase/migrations/*.sql` as of this writing. PowerSync `Table` definitions have an implicit `id` column, so it is omitted from the schema.ts column lists below unless explicitly declared:

| Table | Migration columns | PowerSync schema.ts columns | Match? |
|---|---|---|---|
| `users` | `id, email, created_at` (0001) | `email, created_at` | ✅ |
| `user_onboarding_metadata` | `id, user_id, suds_calibration_value, completed_at, created_at` (0012) | `id, user_id, suds_calibration_value, completed_at, created_at` | ✅ |
| `fear_ladder_items` | `id, user_id, description, predicted_suds, peak_suds (renamed from actual_suds, 0015), position, status, created_at, updated_at` (0013, 0015, 0021) | `id, user_id, description, predicted_suds, peak_suds, position, status, created_at, updated_at` | ✅ |
| `exposure_sessions` | `id, user_id, fear_item_id, session_type, status, pre_session_intention, post_session_reflection, started_at, ended_at, expires_at, created_at, technique (added 0020)` (0016, 0020) | `user_id, fear_item_id, session_type, status, pre_session_intention, post_session_reflection, started_at, ended_at, expires_at (column.real), created_at, technique` | ✅ |
| `suds_readings` | `id, session_id, suds_value, recorded_at` (0017) | `session_id, suds_value, recorded_at` | ✅ |

No drift was found. `expires_at` is intentionally `column.real` (64-bit float) rather than an integer type to avoid 32-bit overflow on the epoch-ms `BIGINT` — already documented inline in `schema.ts`. Re-verify against `HEAD` before closing the story in case migrations changed since this story was authored. The remaining AC 1 work is primarily the checklist comment (Task 1.2) and the sync-rules gap below (Task 1.3) — not schema repair.

`device_push_tokens` (migrations 0028, 0029) is correctly excluded — it's written via `packages/supabase/src/functions/push-tokens.ts`, not through PowerSync. `suds_baselines` does not exist in migration history at all (Story 5.4/5.5 deferred-post-mvp).

### sync-rules.yaml bucket gap — likely the real work in this story

`supabase/sync-rules.yaml` defines exactly one bucket (`user_data`) covering only `fear_ladder_items`, `exposure_sessions`, and `suds_readings`. **`users` and `user_onboarding_metadata` have no bucket definition at all**, despite both being declared in `packages/sync/src/schema.ts`'s `AppSchema`. This means rows in those two tables can be written via the outbox (`adapter.enqueue()` → `uploadData()`) but will never be synced *down* to the local PowerSync replica — they are effectively write-only.

This was explicitly called out as a known gap in Story 6.2-A's Dev Notes: *"Note: `user_onboarding_metadata` has no sync-rules bucket today; it is effectively write-only. This is an Epic 9 cleanup item."* [Source: `_bmad-output/implementation-artifacts/6-2-a-powersync-foundation.md` § "Per-user data isolation" (D-CR-02)] `users` has the same gap and wasn't called out at the time, but the schema-table comparison above shows it has the identical problem.

Given this story's explicit purpose is "PowerSync schema verified against the live Supabase schema," this gap is squarely in scope under AC 1's "any discrepancy is treated as a blocking defect" — even though the literal AC wording is about column/table existence rather than bucket completeness, a schema entry with no sync path is the kind of drift this story exists to catch. Recommend adding bucket definitions for `users` and `user_onboarding_metadata` to `sync-rules.yaml`, scoped by `auth.uid()` the same way the existing `user_data` bucket is. If there's a reason not to (e.g. `users` data never needs local-read), document that reasoning explicitly in the ADR rather than silently leaving the gap.

### ADR decision inputs

The existing `ADR-OFFLINE-DEGRADATION.md` is a "shell" with checkbox options, not decisions. Evidence gathered for each of AC 2's 4 required decisions:

**Decision 1 — queued vs. rejected writes:** All durable writes (`fear_ladder_items`, `exposure_sessions`, `suds_readings`, `user_onboarding_metadata`) go through `getAdapter().enqueue()` → `PowerSyncSyncAdapter.enqueue()` (`packages/sync/src/adapter.ts`) → `db.execute()` against local SQLite → PowerSync's durable outbox (`ps_crud`) → `SupabasePowerSyncConnector.uploadData()` (`packages/sync/src/connector.ts`) on reconnect. There is no client-side rejection path for any of the 5 tables — everything queues locally first, matching the shell ADR's own "Recommendation: Option A" for SUDS logging. [Source: packages/sync/src/adapter.ts, packages/sync/src/connector.ts]

**Decision 2 — user-visible behaviour on sync failure (see "Known gap" below):** this is the one decision point where current behaviour is genuinely incomplete, not just undocumented.

**Decision 3 — session recovery on re-foreground after kill:** Two layers already exist:
- `ADR-004` (Status: Accepted, `core-architectural-decisions.md`) defines MMKV sync-read of `session.inProgress` as part of the cold-start dependency graph, routing to a Resume/Discard screen before any other navigation.
- The actually-implemented hydration mechanism is `useActiveExposureSession` (`apps/mobile/src/hooks/useActiveExposureSession.ts`), which queries `exposure_sessions WHERE status = 'started' ORDER BY started_at DESC LIMIT 1` directly against the local PowerSync SQLite replica — this works fully offline since PowerSync's local store is read synchronously once hydrated.
- `KV_KEYS.SESSION_IN_PROGRESS` (`packages/core/src/constants/kvKeys.ts:12`) and its paired type `SessionRecoveryData` (`packages/core/src/types/session-recovery-data.ts`) are defined for exactly the ADR-004 MMKV-flag pattern, but a repo-wide search found **no call site that actually reads or writes this key** in `apps/mobile` — only the comment in `kvKeys.ts` and the type file reference it. This is a discrepancy: either the MMKV-flag layer was never wired up (and the PowerSync-query hook alone is the real recovery mechanism, making `SESSION_IN_PROGRESS` dead code) or it's wired up somewhere this search missed. Verify and resolve before writing this decision into the ADR — don't describe a mechanism that isn't actually active.

**Decision 4 — conflict resolution policy:** Session lifecycle fields are server-authoritative by design: `fn_session_insert_guard` (migration 0019) forces `status = 'started'` and `expires_at = NULL` on every INSERT regardless of client payload; `set_session_expires_at` (migration 0018) sets `expires_at` server-side only on transition to `completed`. Both triggers exist specifically to prevent the client from supplying these values, which the plain RLS INSERT policy would otherwise permit. For other fields, `uploadData()` uses plain `upsert`/`update` (PUT/PATCH) with no merge logic — the last write to reach Supabase wins at the row level, except where a registered `ON_CONFLICT_OVERRIDES` entry exists (`user_onboarding_metadata` → `ON CONFLICT (user_id) DO UPDATE`, for outbox-retry idempotency, not conflict resolution between concurrent clients). Reorder operations (`fear_ladder_items` position swaps) get special-cased atomic handling via the `swap_ladder_positions` RPC to avoid the unique-position constraint racing against itself. [Source: supabase/migrations/0018, 0019; packages/sync/src/connector.ts]

### Known gap: silent enqueue failures (relevant to Decision 2)

`deferred-work.md` documents at least 3 places where `adapter.enqueue()` failures are currently swallowed with a `console.error` and no user-visible feedback, explicitly marked "Epic 6 must fill" (Epic 6 is now done without filling it):
- `4-2-D2` / `4-2-D4` — onboarding calibration enqueue: catch-and-return with `TODO(Epic 6)`, no toast, no retry UI (`apps/mobile/app/(onboarding)/assessment.tsx:handleNext`)
- `5-2-W15` — session abandonment cleanup runs unconditionally regardless of enqueue success/failure (`apps/mobile/app/session/grounding.tsx:52-56`)

No Epic 6/7/8 story implemented the missing user-visible error/retry path. This story (9.1) is scoped to schema verification and ADR documentation, not new UI surfaces — so the pragmatic path is almost certainly to **document the current silent-queue behaviour as the accepted MVP decision** for AC 2's Decision 2, and explicitly cross-reference these deferred-work.md items as the tracked follow-up (rather than building new error UI inside this story). This is a judgment call for whoever implements the story, but don't silently ignore it — the ADR's Decision 2 section must say something concrete, even if that something is "this is deferred, here's the tracking reference." [Source: `_bmad-output/implementation-artifacts/deferred-work.md` lines ~191, 304, 316]

### CI gate style reference

`.github/workflows/ci.yml` has 6 existing gates (`core-boundary-gate`, `dark-mode-gate`, `web-import-gate`, `sdk-dep-audit`, `supabase-import-gate`, `actual-suds-rename-gate`), all inline bash/grep, all feeding into `build`'s `needs:` array. Match this style/naming convention for the new schema-drift gate (Task 3). None of the existing gates use path filters — they all run unconditionally on every push/PR to `main`, which is sufficient to satisfy AC 3's "runs on every PR touching `supabase/migrations/` or the PowerSync config file."

### Out of scope

- Do not implement Story 9.2's integration tests (offline session recovery tests) — that story explicitly depends on this one being done first and is a separate, larger effort
- Do not build new user-facing error/retry UI for Decision 2 unless you decide that's the right call after reading "Known gap" above — the default expectation is documentation, not new UI
- Do not touch `ADR-HOME-STATE-RESOLVE.md` — it's a different ADR (home screen state priority ordering), unrelated to offline degradation despite topical overlap

### Project Structure Notes

- `packages/sync` is a Vitest-only package (zero RN/Expo deps at the schema/adapter/connector layer — `@powersync/react-native` is a dependency but the package itself runs under Vitest, not Jest)
- ADR files live in `_bmad-output/planning-artifacts/adrs/` — `ADR-OFFLINE-DEGRADATION.md` already exists there as a shell; update in place, don't create a duplicate
- `supabase/sync-rules.yaml` is deployed to the PowerSync service separately from Supabase migrations — verify the project's PowerSync deployment process if changing this file's bucket definitions (check `docs/setup/local-environment.md` for any documented deploy step)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.1] — full AC text
- [Source: packages/sync/src/schema.ts] — PowerSync `AppSchema` definition (AC 1 target)
- [Source: packages/sync/src/adapter.ts] — `PowerSyncSyncAdapter`, `SyncMode`, `filterSnakeCase`
- [Source: packages/sync/src/connector.ts] — `SupabasePowerSyncConnector.uploadData`, `ON_CONFLICT_OVERRIDES`, reorder-pair handling
- [Source: supabase/sync-rules.yaml] — current bucket definitions (gap: `users`, `user_onboarding_metadata` not covered)
- [Source: supabase/migrations/0001, 0012, 0013, 0015, 0016, 0017, 0018, 0019, 0020, 0021] — table/column/trigger ground truth
- [Source: _bmad-output/planning-artifacts/adrs/ADR-OFFLINE-DEGRADATION.md] — existing shell ADR to finalize
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ADR-004] — session recovery / MMKV cold-start pattern (Decision 3 input)
- [Source: packages/core/src/constants/kvKeys.ts, packages/core/src/types/session-recovery-data.ts] — `SESSION_IN_PROGRESS` / `SessionRecoveryData` (apparently unused — verify)
- [Source: apps/mobile/src/hooks/useActiveExposureSession.ts] — actual PowerSync-replica-based session recovery query
- [Source: _bmad-output/implementation-artifacts/6-2-a-powersync-foundation.md] — foundational PowerSync story; flags the sync-rules gap and the per-user isolation model
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — `4-2-D2`, `4-2-D4`, `5-2-W15` (silent enqueue-failure gap, Decision 2 input)
- [Source: _bmad-output/planning-artifacts/prd.md] — `NFR-OFFLINE-01`, `NFR-OFFLINE-02`, `NFR-OFFLINE-03`, `NFR-REL-02`
- [Source: .github/workflows/ci.yml] — existing CI gate pattern (AC 3 target)

## Testing Requirements

- `packages/sync` changes (schema.ts comment, any sync-rules-adjacent logic) run under Vitest (`pnpm --filter @exposure-buddy/sync test`); this story's `schema.ts` change is a comment-only addition, so no new test is required for Task 1.2, but re-run the existing `adapter.test.ts` / `connector.test.ts` suites to confirm nothing regressed
- The new CI gate script (Task 3) should be testable locally before relying on CI — run it directly against the current repo state and confirm it passes cleanly (no drift) before adding it to the workflow
- No mobile (Jest/RNTL) test changes are expected for this story — it does not touch `apps/mobile` UI

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
