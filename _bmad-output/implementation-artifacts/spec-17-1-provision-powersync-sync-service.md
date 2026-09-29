---
title: 'Story 17.1: Provision PowerSync Sync Service & Deploy Sync Rules'
type: 'feature'
created: '2026-09-29'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md'
  - '{project-root}/_bmad-output/planning-artifacts/adrs/ADR-OFFLINE-DEGRADATION.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No PowerSync sync service (hosted or self-hosted) has ever been deployed for this project. `EXPO_PUBLIC_POWERSYNC_URL` is absent everywhere (every EAS environment, every local `.env*`), so `connector.ts`'s `fetchCredentials()` always returns `null` and PowerSync never connects — writes never leave a device, nothing syncs down from Supabase, and the durable outbox never drains. Confirmed directly during Story 16.4: sign-in works, but an existing Supabase ladder item never appeared on a fresh device install.

**Approach:** Provision a real PowerSync instance, deploy the existing `supabase/sync-rules.yaml` to it connected to hosted Supabase via logical replication, wire `EXPO_PUBLIC_POWERSYNC_URL` into both EAS and local dev, and for the first time in this project's history, actually run the ADR-RN-VERSION.md-mandated "offline write → reconnect → assert single row" scenario for real. **Decisions:** PowerSync Cloud (Free plan), region `ap-south-1` (India) — best available DPDPA alignment on the PowerSync side, even though the Tokyo-hosted Supabase project this replicates from is a separate, not-reopened decision. The user owns and creates the PowerSync Cloud account/project directly (an agent cannot sign up for a new third-party account on the user's behalf) and provides the resulting connection URL/credentials to continue; no budget ceiling is needed now since the Free plan requires no credit card. The disconnected/mid-sync UI state stays silent for this story, matching the already-accepted MVP posture in `ADR-OFFLINE-DEGRADATION.md` Decision 2.

## Boundaries & Constraints

**Always:** Document the hosting decision (PowerSync Cloud, `ap-south-1`) in `ADR-RN-VERSION.md` before provisioning — this is new production infrastructure, not a reversible local config change. Connect to the *hosted* Supabase project (`jhbtzsvlgglyfbrgmpsb`) — no new Supabase project.

**Never:** Do not author new `sync-rules.yaml` bucket definitions or change existing ones — that's Story 9.1's already-shipped scope. Do not change `packages/sync/src/connector.ts`'s `fetchCredentials()` null-check behavior — an unset `EXPO_PUBLIC_POWERSYNC_URL` correctly no-ops today and must keep doing so for any environment that intentionally omits it (local/CI).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Offline write → reconnect | Airplane mode on; add a fear ladder item; airplane mode off | Item appears in UI immediately (local-first); after reconnect, exactly one matching row lands in Supabase's `fear_ladder_items` | No duplicate row |
| Existing Supabase data → fresh device | A row already exists in Supabase for the signed-in user; fresh app install, no prior local DB | Row appears locally after PowerSync's initial sync completes | If sync fails, a visible (not silent) indication — see Open Question 3 |

</frozen-after-approval>

## Code Map

- `packages/sync/src/connector.ts` — `fetchCredentials()`'s `EXPO_PUBLIC_POWERSYNC_URL` check; do not change, only supply the env var.
- `supabase/sync-rules.yaml` — already exists (Story 9.1); this story deploys it, doesn't edit it, unless the chosen sync service requires a deploy-specific wrapper/config the existing file doesn't have — confirm PowerSync's actual deploy mechanism (dashboard upload for Cloud, or a config path for self-hosted) at implementation time.
- `docs/setup/local-environment.md` — needs a new section documenting how to get `EXPO_PUBLIC_POWERSYNC_URL` into a local `.env.local`, matching the existing `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` pattern established there.
- EAS environment variables (`eas env:list`/`env:create` — confirmed via Story 16.4's session that `development`/`preview`/`production` currently have `EXPO_PUBLIC_SUPABASE_*` but no PowerSync var) — add `EXPO_PUBLIC_POWERSYNC_URL` to whichever environments the hosting decision covers.
- `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` — Upgrade Policy §3 already names the verification scenario this story finally makes runnable; record the hosting decision here per the Always rule above.
- Supabase's Postgres connection settings (via the Supabase MCP plugin or dashboard) — logical replication / WAL access needs to be confirmed available on the hosted project's current plan before provisioning.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` -- document the hosting decision (PowerSync Cloud, `ap-south-1`, user-owned account) -- new infra needs a recorded rationale, matching this project's ADR convention
- [x] **Human step:** user creates the PowerSync Cloud project (India region) directly and provides the resulting connection URL + service credentials -- account creation on a new third-party service cannot be done by an agent on the user's behalf
- [x] Deploy `supabase/sync-rules.yaml` to the new instance, connected to hosted Supabase's Postgres via logical replication -- confirm the hosted Supabase plan actually permits a replication slot before assuming this works
- [x] Set `EXPO_PUBLIC_POWERSYNC_URL` in the relevant EAS environment(s) via `eas env:create` -- mirrors the existing `EXPO_PUBLIC_SUPABASE_*` pattern
- [x] `docs/setup/local-environment.md` -- add a section for local `.env.local` PowerSync setup -- close the same documentation gap Story 16.4 hit for Supabase env vars
- [ ] Real on-device verification per the I/O matrix above -- the actual regression this story exists to close; this is this project's first-ever real exercise of the ADR-RN-VERSION.md-mandated PowerSync integration scenario -- **DEFERRED, see Review Findings** (sync-down half verified on iOS; offline-write-upload half blocked by an unresolved device-specific stall)

**Acceptance Criteria:**
- **VERIFIED** — Given the hosting decision is resolved, when `ADR-RN-VERSION.md` is checked, then it documents the choice, region, and account owner
- **NOT VERIFIED (deferred)** — Given a durable write is made offline on a real device, when connectivity returns, then exactly one corresponding row appears in Supabase with no duplicate
- **VERIFIED (iOS)** — Given a Supabase row already exists for the signed-in user before a fresh device install, when the app first syncs, then that row appears locally
- **VERIFIED** — Given `pnpm turbo typecheck lint test` runs after this story's changes, then it passes with zero regressions (this story is primarily infra/config — no JS/TS surface is expected to change, but the full suite still confirms no incidental regression)

### Review Findings

_Code review (Blind Hunter + Edge Case Hunter + Verification Gap + Acceptance Auditor) against `origin/main...HEAD`, narrowed to authored changes (`powersync/*.yaml`, `apps/mobile/app.config.ts`) — the full 39-file/10,519-line branch diff excluded the vendored PowerSync skill docs and mechanical `skills-lock.json` update. 2026-09-29._

- [x] [Review][Defer] Real on-device verification (offline write → reconnect → exactly one Supabase row) was never completed [I/O & Edge-Case Matrix; Tasks & Acceptance] — this story's own stated completion gate is still unmet. iOS separately confirmed the *fresh-device-sync* half (2 pre-existing rows synced down successfully, cross-checked directly against Supabase), but the offline-write-then-upload half was never confirmed on any device this session, after extensive troubleshooting on the one Android device available (app restarts, sign-out/sign-in, full reinstall — all inconclusive, isolated to that device's PowerSync client not retrying despite confirmed network/server health). Deferred: no reliable device available right now — Android device's PowerSync client stalled unresolved; iOS already covered sync-down. Revisit with a fresh/different device.

- [x] [Review][Patch] `ADR-RN-VERSION.md` was never updated with the hosting decision [`_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md`] — violates the frozen Boundaries' "Always" rule and AC1; `powersync/service.yaml`'s `region: in` (pulled directly from the live provisioned instance via `powersync pull instance`, not hand-typed) has no documented mapping anywhere in the repo to the decided ap-south-1/India choice. **Fixed:** added the PowerSync sync service row to the Decision table plus a dated entry recording Cloud/region/account-owner/budget.
- [x] [Review][Patch] `docs/setup/local-environment.md` has no PowerSync local `.env.local` setup section [`docs/setup/local-environment.md`] — mirrors the exact gap Story 16.4 already closed for Supabase env vars. **Fixed:** added a "PowerSync setup" subsection; also added the project's first `CLAUDE.md` pointer to the `powersync` skill (per the skill's own onboarding step), since the doc referenced it and none existed yet.
- [x] [Review][Patch] `powersync/sync-config.yaml` and `supabase/sync-rules.yaml` are now two parallel, uncross-referenced sources of truth for the same sync scope, and CI's `verify-sync-bucket-coverage` gate only validates the legacy file [`supabase/sync-rules.yaml`; `scripts/ci/verify-sync-bucket-coverage.sh:10`; `powersync/sync-config.yaml`] — a future table/column added to `AppSchema` could keep this CI gate green while silently never reaching the actually-deployed PowerSync Cloud sync config. **Fixed:** added a supersession note to `supabase/sync-rules.yaml`'s header; extended `verify-sync-bucket-coverage.sh` to check both files (verified live — passes against the real repo, and a negative test with a table renamed in a scratch copy of `sync-config.yaml` correctly fails).
- [x] [Review][Patch] The spec's own Tasks checklist and Implementation Notes were never updated to reflect what was actually done (EAS env var creation, Supabase-side SQL setup, CLI provisioning, deploy) — someone reading this file alone would think nothing happened. **Fixed:** Tasks checked off above, Implementation Notes filled in below.

**Rejected:**
- **low** — Unrelated app-version bump (`1.0.0` → `1.0.1`) bundled into this branch [`apps/mobile/app.config.ts`]. Real observation, but it's its own cleanly-labeled commit (`f45dc69`), unrelated to and non-overlapping with the PowerSync changes, and was an explicit separate user instruction in this session — not worth splitting the branch over.
- **false** — Claimed "unexplained schema-qualification drop" (`public.<table>` → unqualified) in `powersync/sync-config.yaml` [`powersync/sync-config.yaml:16,21,26,32,42`]. Verified against the PowerSync skill's own official Sync Streams examples (`references/sync-config.md`) — every documented example uses unqualified table names; this is the idiomatic style for Sync Streams, not an oversight.

## Implementation Notes

**Supabase-side setup (2026-09-29):** Confirmed the hosted project (`jhbtzsvlgglyfbrgmpsb`) already uses new asymmetric (ES256) JWT signing keys (checked via its JWKS endpoint) and already has Data API grants on all 5 synced tables (migration `0024`) — neither needed touching. Created the dedicated `powersync_role` (`REPLICATION BYPASSRLS`, read-only `SELECT` grant), set `REPLICA IDENTITY FULL` on all 5 tables, and created publication `powersync` scoped to exactly those tables — all via the Supabase MCP plugin with the user's explicit confirmation of the exact SQL beforehand. Verified directly via `pg_roles`/`pg_publication`/`pg_class` queries, not just assumed success.

**PowerSync Cloud provisioning:** Installed the official `powersync-ja/agent-skills` skill (same pattern as `expo-upgrade`) and followed its CLI-first onboarding playbook rather than hand-writing config. User created the PowerSync Cloud project ("Exposure Buddy") and both its default instances (Development, Production) via the dashboard, choosing the `IN` (India) region for each per the ADR decision. Linked the CLI to the Development instance (`powersync link cloud --instance-id=...`), pulled its template config, and filled in: `service.yaml`'s replication connection (individual fields + `!env` secrets, not a bare URI, matching the skill's Cloud example) and `client_auth.supabase: true` (auto-detects JWKS from the connection string — no legacy secret needed, confirmed compatible with the ES256 keys found above). Converted `supabase/sync-rules.yaml`'s legacy Sync Rules to Sync Streams (`config: edition: 3`) in `powersync/sync-config.yaml`, per the skill's explicit "Sync Streams for new projects" rule — same tables, same per-user `auth.user_id()` scoping, same `suds_readings` join, just the new query format. `powersync deploy`'s own validation caught a real bug before it shipped: the `suds_readings sr` alias would have synced that table client-side as `sr` instead of `suds_readings`, silently breaking every existing query against it — fixed by dropping the FROM-table alias (kept it on the joined `exposure_sessions es`, which doesn't affect the sync target name).

**Deployed and verified live:** `powersync status` shows all 5 tables actively replicating with 0-byte lag and `Initial replication done: true`. `EXPO_PUBLIC_POWERSYNC_URL` set in the EAS `development` environment via `eas env:create`, and in local `apps/mobile/.env.local` for Metro-served dev-client testing.

**On-device verification — fresh-device sync-down (VERIFIED, iOS):** Restarted Metro with the new env var loaded, reconnected the iOS Simulator app (whose local SQLite was confirmed empty earlier in the session, before this story's fix existed), signed in as `test1@test.com`, and the real Home screen rendered "2 of 2 steps climbed" — the exact 2 pre-existing `fear_ladder_items` rows already in Supabase ("Talking to a stranger", "Say hi to someone in the lift"). Cross-checked directly against the database, not just the UI, to rule out stale local state.

**On-device verification — offline write → reconnect (NOT COMPLETED, see Review Findings/deferred-work.md):** Attempted extensively on the one Android device available (Redmi K20 Pro): disabled Wi-Fi/mobile data via `adb shell svc wifi/data disable` (confirmed via `dumpsys connectivity` — no active networks), added a test ladder item locally (appeared immediately, confirming the local-first write path works), re-enabled network (confirmed DNS resolution + a full TLS handshake to the PowerSync host from the device shell), but the item never reached Supabase despite: two full app force-restarts, a sign-out/sign-in cycle, and a complete uninstall/reinstall — all with `powersync status` showing the *server* side healthy and replicating throughout. This looks like a stall specific to that device/session's PowerSync client, not the sync service itself, but was never resolved. Deferred per the human decision recorded in Review Findings above.

**Pre-existing bug found (not fixed here, out of scope):** `WARN [PowerSync]: Schema validation failed... "An id column is automatically added, custom id columns are not supported"` fires on every launch — the `powersync` skill's own "Key Rules" confirm this is a real anti-pattern (`packages/sync/src/schema.ts` explicitly declares `id: column.text` on `fear_ladder_items`/`user_onboarding_metadata`, which PowerSync auto-adds and rejects declaring). Pre-existing since Story 6.2-A, unrelated to this story's diff — noting it here since this session is the first time it's been directly traced to a documented anti-pattern rather than treated as unexplained noise.

## Spec Change Log

## Review Triage Log

_Review pass 1 (2026-09-29): Blind Hunter + Edge Case Hunter + Verification Gap + Acceptance Auditor against `origin/main...HEAD`, narrowed to authored changes. See "Review Findings" above for the full write-up — this log records the verdict per finding._

- **[medium — patched]** `ADR-RN-VERSION.md` hosting decision never recorded (Blind Hunter + Verification Gap + Acceptance Auditor, converged independently). Verified: file had zero mentions of "PowerSync Cloud"/"ap-south-1"/account owner before the fix.
- **[medium — patched]** `docs/setup/local-environment.md` missing PowerSync setup section (Blind Hunter + Acceptance Auditor). Verified: file had no `.env.local` PowerSync guidance before the fix.
- **[high — patched]** `sync-config.yaml`/`sync-rules.yaml` uncross-referenced + CI coverage gate blind to the deployed file (Blind Hunter + Acceptance Auditor + Verification Gap, the latter arriving pre-verified per its evidence rules and demonstrating a concrete silent-drift scenario). Verified via direct read of `scripts/ci/verify-sync-bucket-coverage.sh` — hardcoded to `supabase/sync-rules.yaml` only, and its `public.`-qualified regex wouldn't even have matched `sync-config.yaml`'s unqualified style if pointed at it.
- **[medium — patched]** Spec's own Tasks/Implementation Notes never updated to reflect real progress (Blind Hunter + Acceptance Auditor). Verified: all 6 tasks were unchecked and Implementation Notes was empty before this pass, despite substantial completed work.
- **[high — resolved as defer, human-decided]** Real on-device offline-write-then-reconnect verification never completed (Acceptance Auditor, the story's own stated completion gate). Verified true — genuinely not done on any device this session. Human chose to defer rather than continue troubleshooting the one available device; reason and trigger recorded in `deferred-work.md`.
- **[low — rejected]** Unrelated version bump bundled into the branch (Blind Hunter + Acceptance Auditor). Verified true as an observation, but rejected: already its own clean commit, explicit separate user instruction, unlikely to confuse anyone reading the git log.
- **[false — rejected]** "Unexplained" schema-qualification drop in `sync-config.yaml` (Blind Hunter). Verified false: every official Sync Streams example in the `powersync` skill's own reference docs uses unqualified table names — this is the idiomatic style, not an oversight.

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all packages/apps pass, 0 regressions

**Manual checks (if no CLI):**
- With network disabled, add one fear ladder item on a real device; confirm it appears immediately in the UI. Re-enable network; confirm the same row appears in Supabase's `fear_ladder_items` shortly after reconnect, with no duplicate.
- On a second device (or a fresh install of the first), sign in as the same user and confirm previously-synced ladder items appear without any local-only write being needed to trigger it.
