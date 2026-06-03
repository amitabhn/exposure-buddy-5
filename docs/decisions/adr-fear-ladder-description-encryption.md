# ADR: Fear Ladder Description Field Encryption

**Status:** Accepted  
**Date:** 2026-06-02  
**Story:** 4.3 — Initial Fear Ladder Setup

## Context

Fear ladder item descriptions contain sensitive personal content — users describe the situations and stimuli they fear. This raises a question: should descriptions be encrypted at the field level before storage?

## Decision

Descriptions are stored **unencrypted at rest** in the `fear_ladder_items.description` column.

## Rationale

- Supabase provides at-rest disk encryption for all hosted databases, covering the data at the storage layer.
- Row Level Security (RLS) is strictly enforced: only the owning user can SELECT or INSERT their own rows; there is no cross-user read path at MVP.
- Field-level encryption via `pgcrypto` would: (a) require encrypting/decrypting on every read, adding latency; (b) break any future full-text or substring search within descriptions; (c) add key management complexity disproportionate to the threat model at MVP scale.
- The threat model at MVP is primarily one of authorisation failure (wrong user reads the data), which RLS addresses. Disk-level encryption covers the infrastructure breach case.

## Mitigation

- Strict RLS policies (`fear_ladder_items_select_own`, `fear_ladder_items_insert_own`, `fear_ladder_items_update_own`) enforce own-row access only.
- No application-layer analytics or logging emits description field values.
- The `COMMENT ON TABLE` in migration `0013_fear_ladder_items.sql` records this decision in the schema.

## Post-MVP Backlog

Field-level encryption via `pgcrypto` is explicitly backlogged. If the threat model changes (e.g. multi-tenancy with a shared DB, clinician access, regulatory audit of field-level controls), this decision should be revisited. A migration adding `pgcrypto` encryption would require a one-time re-encryption of existing rows and a key rotation strategy.
