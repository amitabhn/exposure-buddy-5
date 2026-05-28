# exposure-buddy — Claude Code context

## Quick orientation

Expo + React Native mobile app — a non-therapeutic self-help tool that helps users gradually face and overcome their fears. Not a replacement or substitute for ERP, CBT, or any form of professional therapy. India-focused — DPDPA 2023 compliance is a hard requirement.

**Monorepo layout:**
- `apps/mobile` — Expo Router app (Metro/Jest)
- `packages/core` — pure TypeScript domain logic (Vitest, zero RN/Expo deps — CI enforced)
- `packages/supabase` — Supabase client, auth, Edge Function wrappers (Vitest)
- `packages/ui` — shared React Native UI primitives (Vitest, passWithNoTests)
- `packages/sync` — PowerSync adapter (Vitest)
- `supabase/functions/` — Deno Edge Functions (deployed to Supabase)

## Essential reading before touching a story

| Resource | What it covers |
|----------|---------------|
| `docs/setup/local-environment.md` | Local setup, runtime map, Supabase CLI, Deno, known gotchas |
| `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` | Naming, structure, async patterns, Edge Function security checklist, auth patterns, anti-patterns |
| `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` | ADRs — ARC-011 boundary rules, ADR-001, ADR-004, ADR-006 |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Current sprint state |
| `_bmad-output/implementation-artifacts/deferred-work.md` | Deferred items |

## Key rules (enforced by CI)

- `packages/core` has zero imports of `react-native`, `expo-*`, or `@supabase/*` — CI boundary check blocks violations
- `database.types.ts` is never imported outside `packages/supabase` — precommit blocks this
- `apps/web` has no `@supabase/supabase-js` — CI gate

## Running the project

```bash
pnpm install                # install workspace deps
supabase start              # start local Supabase (requires Docker)
pnpm turbo typecheck        # all packages + apps
pnpm turbo lint             # all packages + apps
pnpm turbo test             # Vitest (packages) + Jest (apps/mobile)
```

See `docs/setup/local-environment.md` for the full runtime map and Deno/Edge Function setup.

## Edge Functions

All Edge Functions are Deno TypeScript under `supabase/functions/`. They cannot import from the monorepo. Shared utilities live in `supabase/functions/_shared/`. Before implementing a new Edge Function, run through the security pre-flight checklist in `implementation-patterns-consistency-rules.md § Edge Function Security Pre-Flight Checklist`.

## Workflow

This project uses the BMad Method. Sprint status and story files are in `_bmad-output/implementation-artifacts/`. Planning artifacts (PRD, architecture, epics, UX spec) are in `_bmad-output/planning-artifacts/`.
