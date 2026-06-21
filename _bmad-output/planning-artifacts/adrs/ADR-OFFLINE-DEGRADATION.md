# ADR-OFFLINE-DEGRADATION — Offline Degradation Policy

**Status:** Accepted (Decisions 1, 3, 4) / Accepted — deferred remediation (Decision 2)
**Owner:** Engineering lead
**Required before:** F3 and F4 implementation sprints (superseded — F3/F4 already shipped in Epics 5–7; this ADR now documents the as-implemented policy, finalized retroactively in Story 9.1)

---

## Context

The UX design specification requires an offline degradation policy before F3 (core exposure loop) and F4 (mid-exposure crisis / Calm Me) implementation begins. The policy must define what the app does when network is unavailable, to ensure clinical safety during high-stakes moments.

Current spec commitment: "Calm Me and grounding techniques functional without network; session state server-persisted with local cache."

This ADR was a shell (checkbox options, no decisions) through Epic 8. Story 9.1 finalizes it against the actual implementation that shipped in Epics 5–7, rather than against a pre-implementation design choice.

---

## Scope

Flows requiring offline policy:

| Flow | Offline risk | Clinical stakes |
|------|-------------|-----------------|
| F3 — Core exposure loop | SUDS logging may fail; session state may not persist | Medium — user can continue, data may be lost |
| F4 — Calm Me / crisis | Grounding techniques must render | **High** — user may be in acute anxiety |
| F5 — Re-engagement | Re-calibration check-in may fail | Low — user can still navigate home |
| F6 — Post-exposure reflection | Debrief save may fail | Medium — data loss risk |

---

## Decisions

### Decision 1 — Queued vs. rejected writes

**Status: Accepted**

All durable writes (`fear_ladder_items`, `exposure_sessions`, `suds_readings`, `user_onboarding_metadata`) go through `getAdapter().enqueue()` → `PowerSyncSyncAdapter.enqueue()` (`packages/sync/src/adapter.ts`) → `db.execute()` against local SQLite → PowerSync's durable outbox (`ps_crud`) → `SupabasePowerSyncConnector.uploadData()` (`packages/sync/src/connector.ts`) on reconnect.

There is no client-side rejection path for any of the 5 synced tables. Every write queues locally first and is delivered durably on reconnect — this matches the original shell ADR's "Recommendation: Option A" for SUDS logging (queue locally, sync on reconnect), and the same pattern was extended to all other durable writes during Epics 5–6.

[Source: `packages/sync/src/adapter.ts`, `packages/sync/src/connector.ts`]

### Decision 2 — User-visible behaviour when a queued write cannot sync within the session window

**Status: Accepted — deferred remediation**

This decision was originally scoped for Epic 6 (the shell ADR's "Recommendation: Option A" implies a "saved locally" indicator) but was **not delivered** — no story in Epics 6–8 implemented the user-visible error/retry path. As of Story 9.1, the as-shipped MVP behaviour is documented here as the accepted state, not presented as a new decision:

**Offline write failures fail silently in MVP.** When `adapter.enqueue()` throws, the call sites catch the error, write to `console.error`, and proceed — no toast, no banner, no retry affordance is shown to the user. Known call sites:

- `apps/mobile/app/(onboarding)/assessment.tsx:handleNext` — onboarding calibration enqueue (`4-2-D2`/`4-2-D4` in `deferred-work.md`): on catch, the function returns early without navigating; `setOnboardingProgressStep(3)` has already been committed to MMKV before the catch, so the next cold start routes to `/(onboarding)/ladder` (step 3) rather than back to assessment. The calibration value is preserved locally in MMKV (offline-first intent honoured) but the server row is absent until the outbox eventually delivers it.
- `apps/mobile/app/session/grounding.tsx:52-56` — session abandonment cleanup (`5-2-W15` in `deferred-work.md`): `clearSessionInProgress()`, `clearSessionIntention()`, and `router.push('/session/abandoned')` run unconditionally, regardless of whether the abandonment enqueue calls succeeded. This is intentional MVP design — the user chose to stop, so local cleanup proceeds either way — but it means an enqueue failure during abandonment is invisible to the user.
- No third silent-failure call site was found during this story's Task 1 schema/sync audit; the two above (both already tracked in `deferred-work.md`) remain the complete known set.

**Tracked follow-up:** `deferred-work.md` entries `4-2-D2`/`4-2-D4` and `5-2-W15` track this gap. Per this ADR, the user-visible error/retry UI (toast/banner + retry affordance for failed enqueues) is owned by **Engineering lead**, with a concrete trigger condition: **the next story that touches the sync mutation queue (e.g. a future outbox/retry-UX story), or before Epic 10 begins, whichever comes first.** No new UI or code changes to the call sites above are made in Story 9.1 — this story is documentation-only for Decision 2, per its scope (schema verification and ADR finalization, not new UI surfaces).

[Source: `_bmad-output/implementation-artifacts/deferred-work.md` — `4-2-D2`, `4-2-D4` (line ~316, ~304), `5-2-W15` (line ~191)]

### Decision 3 — Session state recovery on app re-foreground after a kill mid-session

**Status: Accepted**

Two layers work together, both confirmed active in the current codebase:

1. **`ADR-004`** (Status: Accepted, `core-architectural-decisions.md`) defines a synchronous MMKV read of `session.inProgress` as part of the cold-start dependency graph, routing to a Resume/Discard screen before any other navigation. This is implemented via `KV_KEYS.SESSION_IN_PROGRESS` (`packages/core/src/constants/kvKeys.ts:12`) and its paired type `SessionRecoveryData` (`packages/core/src/types/session-recovery-data.ts`). `packages/supabase/src/auth/AuthProvider.tsx` **reads** the key at line 199, **deletes** it at lines 202 and 299, and **writes** it at line 291 — this is an active, working part of the cold-start flow.
2. **`useActiveExposureSession`** (`apps/mobile/src/hooks/useActiveExposureSession.ts`) queries `exposure_sessions WHERE status = 'started' ORDER BY started_at DESC LIMIT 1` directly against the local PowerSync SQLite replica. This works fully offline because PowerSync's local store is read synchronously once hydrated, and hydrates the actual session state once available.

These two layers are a **deliberate two-layer recovery mechanism**: the MMKV flag drives the fast, synchronous cold-start routing decision (available before PowerSync has hydrated), while the PowerSync query hydrates the authoritative session state once the local replica is ready. `SESSION_IN_PROGRESS` is **not** dead code and must not be removed — it has active read/write/delete call sites in the cold-start path.

[Source: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ADR-004`; `packages/supabase/src/auth/AuthProvider.tsx:199,202,291,299`; `apps/mobile/src/hooks/useActiveExposureSession.ts`]

### Decision 4 — Sync conflict resolution policy

**Status: Accepted**

The policy is **field-class-dependent**, not a single blanket rule:

- **Server-authoritative fields** (session lifecycle): the trigger `trg_session_insert_guard` (migration `0019_session_insert_guard.sql`), which executes function `fn_session_insert_guard()`, forces `status = 'started'` and `expires_at = NULL` on every `INSERT` into `exposure_sessions`, regardless of client payload. The trigger `set_session_expires_at` (migration `0018_set_session_expires_at_trigger.sql`) sets `expires_at` server-side, and only on transition to `status = 'completed'`. Both triggers exist specifically to prevent the client from supplying these values, which the plain RLS `INSERT`/`UPDATE` policies (`auth.uid() = user_id`) would otherwise permit. For these fields, the server always wins — there is no client-side override path at all, not merely a last-write-wins race.
- **All other fields**: `SupabasePowerSyncConnector.uploadData()` (`packages/sync/src/connector.ts`) issues plain `upsert`/`update` (PUT/PATCH) calls with no merge logic — **last-write-wins at the row level**, where "last" means the last write to reach Supabase, not the last write made on-device (a device that reconnects later can overwrite a device that reconnected earlier, with no conflict surfaced to either user).
- **`ON_CONFLICT_OVERRIDES`** (`packages/sync/src/connector.ts`): `user_onboarding_metadata` is registered for `ON CONFLICT (user_id) DO UPDATE`. This exists for **outbox-retry idempotency** (so a retried enqueue of the same row doesn't fail on the `UNIQUE(user_id)` constraint), not for resolving conflicts between concurrent clients.
- **Reorder operations**: `fear_ladder_items` position swaps are special-cased through the `swap_ladder_positions` RPC (migration `0026_swap_ladder_positions_rpc.sql`) for atomic handling, avoiding the unique-position constraint racing against itself during a plain two-row update.

Summary: **server-authoritative** for `exposure_sessions.status`/`expires_at` on insert and completion (enforced by Postgres triggers, no client override possible); **last-write-wins** (by arrival order at Supabase) for everything else, with one idempotency-only conflict override and one atomic RPC carve-out for position reordering.

[Source: `supabase/migrations/0018_set_session_expires_at_trigger.sql`, `supabase/migrations/0019_session_insert_guard.sql`, `supabase/migrations/0026_swap_ladder_positions_rpc.sql`; `packages/sync/src/connector.ts`]

---

## Related Decisions

- `HelplineCard` remote config fallback: see `ADR-HELPLINE-CONFIG`
- Session navigation/recovery cold-start sequencing: `ADR-004` (`core-architectural-decisions.md`)

---

## Status History

- **Shell** (pre-Epic 6): policy decisions outstanding, blocking F3/F4 sprint planning.
- **Accepted** (Story 9.1, 2026-06-21): Decisions 1, 3, and 4 finalized against the as-implemented system. Decision 2 finalized as **Accepted — deferred remediation**: the silent-failure behaviour is the accepted MVP state, with a named owner (Engineering lead) and a concrete trigger condition (next sync-mutation-queue story, or before Epic 10, whichever first) tracked in `deferred-work.md` (`4-2-D2`, `4-2-D4`, `5-2-W15`).
