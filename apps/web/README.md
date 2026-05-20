# exposure-buddy-web

**Phase 2 placeholder — not active in Phase 1.**

This package is a placeholder for the Phase 2 clinician surface. It intentionally has no implementation.

## Activation Gate (ADR-009)

`apps/web` activates when:
1. The HIPAA §164.312(b) audit log story is merged
2. `therapist_patient.enabled` migration is approved by DPO
3. `@supabase/supabase-js` is added via approved PR

## Package Boundaries

- Allowed: `@exposure-buddy/core`, `@exposure-buddy/supabase`, `@exposure-buddy/ui`
- Forbidden: `@exposure-buddy/sync` (web uses Supabase Realtime, not PowerSync)
- Forbidden until gate: `@supabase/supabase-js` direct imports
