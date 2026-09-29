# Epic 17 Context: PowerSync Sync Service Provisioning

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Close a gap that has existed since Story 9.1: this project has never had a working PowerSync sync service, in any environment. Every screen reads/writes exclusively through PowerSync's local SQLite replica, so without a real sync endpoint nothing written on one device ever reaches another device or Supabase, and the durable outbox never drains. This epic provisions a real PowerSync instance and deploys the existing `supabase/sync-rules.yaml` to it — it does not cover new sync-rules content or new sync-related UI/UX.

## Stories

- Story 17.1: Provision PowerSync Sync Service & Deploy Sync Rules — draft

## Requirements & Constraints

- `EXPO_PUBLIC_POWERSYNC_URL` is currently absent from every EAS environment and every local `.env*` file — confirmed directly during Story 16.4 (2026-09-29).
- `packages/sync/src/connector.ts`'s `fetchCredentials()` returns `null` whenever this env var is unset, by design ("not configured in this env — local/CI use") — this is why the app has run silently without sync for its entire history rather than erroring loudly.
- `ADR-RN-VERSION.md`'s Upgrade Policy names "offline write → reconnect → assert single row" as the standard PowerSync verification scenario. This exact scenario has never been exercised for real in this project — closing that gap is this epic's concrete exit criterion, not just standing up infrastructure.
- The hosted Supabase project (`jhbtzsvlgglyfbrgmpsb`) is in `ap-northeast-1` (Tokyo) — a pre-existing decision from Epic 10, not reopened by this epic. Any new PowerSync region choice is a separate, fresh decision.
- This project has a hard DPDPA 2023 compliance requirement (per `CLAUDE.md`) — data-residency posture is a real factor in the hosting decision, not just cost/ops convenience.
- `supabase/sync-rules.yaml` already exists (from Story 9.1) with bucket definitions for `users`, `user_onboarding_metadata`, `fear_ladder_items`, `exposure_sessions`, `suds_readings` — this epic deploys it, it does not author new sync rules.

## Technical Decisions

- **Hosting choice (Cloud vs. self-hosted) is an explicit human decision, not a default.** PowerSync Cloud has a no-credit-card Free plan and, as of 2026-09-29, an India (`ap-south-1`) region. Self-hosting uses PowerSync's free, source-available Open Edition but requires standing up and operating a compute container (reads Supabase's Postgres WAL directly) plus a separate storage backend (MongoDB or Postgres) for sync buckets — real ongoing infrastructure, not a one-time setup.
- Whatever is provisioned connects to Supabase's Postgres via logical replication (reads the WAL) — this needs a replication-enabled connection to the hosted Supabase project, which may itself require a Supabase-side setting/plan check.
- `EXPO_PUBLIC_POWERSYNC_URL` needs to land in both EAS environment variables (for real builds) and a local `.env.local` pattern (documented in `docs/setup/local-environment.md`) for Metro-served dev-client testing — Story 16.4's session showed both paths are used and neither currently has it.

## Cross-Story Dependencies

- Directly opened from Story 16.4's Completion Notes / `deferred-work.md`, which in turn traces to Story 9.1 (Epic 9, already done — this is why the gap became its own epic rather than reopening Epic 9, matching Epic 15's precedent).
- Once live, `ADR-RN-VERSION.md`'s Upgrade Policy requirement ("integration test suite to pass end-to-end" before any future `@powersync/react-native` version change) becomes actually checkable for the first time — relevant context for any future PowerSync SDK bump story.
