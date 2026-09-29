---
title: 'Story 17.1: Provision PowerSync Sync Service & Deploy Sync Rules'
type: 'feature'
created: '2026-09-29'
status: 'ready-for-dev'
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
- [ ] `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` -- document the hosting decision (PowerSync Cloud, `ap-south-1`, user-owned account) -- new infra needs a recorded rationale, matching this project's ADR convention
- [ ] **Human step:** user creates the PowerSync Cloud project (India region) directly and provides the resulting connection URL + service credentials -- account creation on a new third-party service cannot be done by an agent on the user's behalf
- [ ] Deploy `supabase/sync-rules.yaml` to the new instance, connected to hosted Supabase's Postgres via logical replication -- confirm the hosted Supabase plan actually permits a replication slot before assuming this works
- [ ] Set `EXPO_PUBLIC_POWERSYNC_URL` in the relevant EAS environment(s) via `eas env:create` -- mirrors the existing `EXPO_PUBLIC_SUPABASE_*` pattern
- [ ] `docs/setup/local-environment.md` -- add a section for local `.env.local` PowerSync setup -- close the same documentation gap Story 16.4 hit for Supabase env vars
- [ ] Real on-device verification per the I/O matrix above -- the actual regression this story exists to close; this is this project's first-ever real exercise of the ADR-RN-VERSION.md-mandated PowerSync integration scenario

**Acceptance Criteria:**
- Given the hosting decision is resolved, when `ADR-RN-VERSION.md` is checked, then it documents the choice, region, and account owner
- Given a durable write is made offline on a real device, when connectivity returns, then exactly one corresponding row appears in Supabase with no duplicate
- Given a Supabase row already exists for the signed-in user before a fresh device install, when the app first syncs, then that row appears locally
- Given `pnpm turbo typecheck lint test` runs after this story's changes, then it passes with zero regressions (this story is primarily infra/config — no JS/TS surface is expected to change, but the full suite still confirms no incidental regression)

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all packages/apps pass, 0 regressions

**Manual checks (if no CLI):**
- With network disabled, add one fear ladder item on a real device; confirm it appears immediately in the UI. Re-enable network; confirm the same row appears in Supabase's `fear_ladder_items` shortly after reconnect, with no duplicate.
- On a second device (or a fresh install of the first), sign in as the same user and confirm previously-synced ladder items appear without any local-only write being needed to trigger it.
