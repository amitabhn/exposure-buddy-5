# ADR-LADDER-SNAPSHOT — Ladder Stability Snapshot Data Model

**Status:** Draft — for review  
**Owner:** Engineering lead  
**Required before:** Achievements / week-4-review sprint

---

## Context

Pattern 9 (Progress Delivery) in the UX spec includes the following ladder stability contract:

> "Week 4/8 review reads from the ladder's creation-date snapshot — not the current ladder state. The copy references the user's verbatim first-entry situation descriptions, not any renamed or reorganised items. This is a data-model contract, not only a copy rule."

This means the system must store a snapshot of the ladder at creation time, separately from the current (mutable) ladder state. Without this, the week-4/8 review feature cannot be built as specified.

---

## Data Model

### Current ladder (mutable)

The current ladder lives in a `ladder_items` table (or equivalent). Items can be renamed, reordered, deleted, and added by the user at any time.

### Ladder snapshot (immutable at creation)

A snapshot is taken at ladder creation (when the user completes F2 — hierarchy builder) and stored in a separate `ladder_snapshots` table. The snapshot is never mutated.

**Proposed schema:**

```sql
-- Supabase / Postgres

CREATE TABLE ladder_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  ladder_id   uuid NOT NULL,                          -- FK to the ladder being snapshotted
  created_at  timestamptz NOT NULL DEFAULT now(),     -- UTC; snapshot creation time = ladder creation time
  items       jsonb NOT NULL                          -- array of { situation: string, suds: int, order: int }
);
```

**`items` JSONB structure:**

```json
[
  { "situation": "Asking a cashier for change", "suds": 3, "order": 1 },
  { "situation": "Making a phone call to a stranger", "suds": 6, "order": 2 },
  { "situation": "Speaking in a small group meeting", "suds": 8, "order": 3 }
]
```

**Snapshot trigger:** Created once when the user exits the hierarchy builder (F2) having confirmed at least one item. Never updated after creation.

---

## Usage in Week 4/8 Review

The week-4/8 review feature reads `ladder_snapshots.items` for the user's oldest snapshot (or ladder-specific snapshot) and renders situation descriptions verbatim. It does not read from the current `ladder_items` table for copy purposes.

The current SUDS progress (for comparison) is read from session history, not from either table directly.

---

## Migration Considerations

- Users who completed F2 before this table is created will have no snapshot
- Migration options: (1) backfill from current ladder state with a `migrated_at` flag; (2) treat pre-migration users as snapshot-unavailable and handle gracefully in the week-4/8 review UI
- Recommendation: option (2) — treat pre-snapshot users as a graceful fallback; don't backfill with mutable data and present it as the original

---

## Consequences

- The snapshot write must be atomic with ladder creation — if the snapshot write fails, the ladder creation should roll back (or retry)
- Ladder deletion by the user does not delete the snapshot (audit trail for progress review)
- GDPR / data deletion: user account deletion must include snapshot deletion — ensure `ladder_snapshots` is included in the data deletion procedure

---

## Open Questions

- Should a new snapshot be taken if the user rebuilds their ladder entirely (deletes all items and starts over)? Current spec is silent on this.
- Should multiple ladders per user be supported? If yes, snapshots are per-ladder.

**Decided by:** _______________  
**Date:** _______________
