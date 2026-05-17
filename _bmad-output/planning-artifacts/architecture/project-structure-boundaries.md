# Project Structure & Boundaries

## Complete Project Directory Structure

```
exposure-buddy/
├── package.json                         # workspace root
├── turbo.json                           # pipeline config
├── tsconfig.base.json                   # shared TS baseline
├── .env.example
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                           # includes: packages/core dep audit (no RN/Supabase even as devDep)
│       └── release.yml
├── apps/
│   ├── mobile/                          # Expo SDK 54, Expo Router v4
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── eas.json
│   │   ├── metro.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app/                         # Expo Router file-system routes
│   │   │   ├── _layout.tsx              # root navigator (fonts, auth gate)
│   │   │   ├── +not-found.tsx
│   │   │   ├── (auth)/                  # unauthenticated routes
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── sign-in.tsx
│   │   │   │   ├── sign-up.tsx
│   │   │   │   └── forgot-password.tsx
│   │   │   └── (app)/                   # authenticated routes (auth-gated by layout)
│   │   │       ├── _layout.tsx          # tab navigator
│   │   │       ├── _error.tsx           # error boundary (Expo Router error slot)
│   │   │       ├── index.tsx            # home / daily check-in entry
│   │   │       ├── hierarchy/
│   │   │       │   ├── index.tsx        # hierarchy list
│   │   │       │   ├── [id].tsx         # item detail / edit
│   │   │       │   └── new.tsx
│   │   │       ├── session/
│   │   │       │   ├── index.tsx        # session list
│   │   │       │   ├── new.tsx
│   │   │       │   └── [id]/
│   │   │       │       ├── index.tsx    # session runner
│   │   │       │       └── debrief.tsx
│   │   │       ├── techniques/
│   │   │       │   ├── index.tsx
│   │   │       │   └── [id].tsx
│   │   │       ├── progress/
│   │   │       │   └── index.tsx
│   │   │       ├── crisis/
│   │   │       │   └── index.tsx        # crisis safety card (on-device contacts)
│   │   │       └── settings/
│   │   │           ├── index.tsx
│   │   │           ├── notifications.tsx
│   │   │           └── data-rights.tsx  # DPDPA erasure / portability flows
│   │   ├── src/
│   │   │   ├── components/              # screen-level compositions
│   │   │   │   ├── session/
│   │   │   │   │   ├── SudsSlider.tsx
│   │   │   │   │   ├── SudsSlider_reducer.ts    # co-located reducer
│   │   │   │   │   ├── SudsSlider.test.tsx
│   │   │   │   │   └── ExposureTimer.tsx
│   │   │   │   ├── hierarchy/
│   │   │   │   ├── check-in/
│   │   │   │   └── progress/
│   │   │   ├── hooks/
│   │   │   │   ├── useSessionFlow.ts
│   │   │   │   ├── useSessionFlow_reducer.ts    # useReducer for multi-step flow
│   │   │   │   ├── useHierarchy.ts
│   │   │   │   ├── useCheckIn.ts
│   │   │   │   └── useCrisisDetect.ts
│   │   │   ├── analytics/
│   │   │   │   ├── index.ts             # analytics facade (PostHog, no PHI) — all calls must use typed events from @exposure-buddy/core/analytics/events; never pass raw domain objects
│   │   │   │   └── events.ts            # event name registry
│   │   │   ├── error-handler.ts         # global.ErrorUtils.setGlobalHandler — catches async/hook rejections
│   │   │   └── i18n/
│   │   │       ├── index.ts
│   │   │       └── locales/
│   │   │           ├── en.json          # MVP launch locale
│   │   │           └── hi.json          # placeholder — add locale files as <BCP-47>.json
│   │   ├── i18n-lint.config.js          # CI-enforced: fails build on hardcoded UI strings in JSX
│   │   └── __tests__/
│   │       └── e2e/
│   │           └── session-flow.test.ts
│   └── web/                             # Phase 2 placeholder — not yet active
│       ├── package.json
│       ├── tsconfig.json
│       ├── .eslintrc.js                 # load-bearing: extends workspace boundary rules, enforces no packages/sync import
│       └── README.md
├── packages/
│   ├── core/                            # pure TS domain logic (zero RN/Supabase deps)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts             # test deps must not include RN, Supabase, or MMKV — core must remain Node-runnable
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── erp/                     # ERP protocol group (hierarchy + session + SUDS + debrief)
│   │   │   │   ├── hierarchy.ts         # HierarchyItem, scoring
│   │   │   │   ├── hierarchy.test.ts
│   │   │   │   ├── session.ts           # session state machine
│   │   │   │   ├── session.test.ts
│   │   │   │   ├── suds.ts              # SUDS calculation, trend
│   │   │   │   ├── suds.test.ts
│   │   │   │   ├── debrief.ts
│   │   │   │   └── debrief.test.ts
│   │   │   ├── crisis/
│   │   │   │   ├── detector.ts          # keyword matching (embedded binary)
│   │   │   │   ├── detector.test.ts
│   │   │   │   ├── keywords-manifest.ts # keyword list version + last-updated date
│   │   │   │   └── contacts.ts          # on-device emergency contacts
│   │   │   ├── checkin/
│   │   │   │   ├── router.ts            # routing decision logic
│   │   │   │   ├── router.test.ts
│   │   │   │   └── thresholds.ts
│   │   │   ├── progress/
│   │   │   │   ├── streak.ts            # streak calculation
│   │   │   │   ├── streak.test.ts
│   │   │   │   └── summary.ts           # progress summary
│   │   │   ├── validation/
│   │   │   │   ├── hierarchy.ts         # hierarchy validation rules
│   │   │   │   └── hierarchy.test.ts
│   │   │   ├── crypto/
│   │   │   │   ├── aes.ts               # AES-256 utilities (key derivation via Expo SecureStore)
│   │   │   │   └── aes.test.ts
│   │   │   ├── consent/
│   │   │   │   ├── consent.ts           # DPDPA consent record builder
│   │   │   │   └── dpdpa.ts             # DPDPA 2023 field definitions
│   │   │   ├── analytics/
│   │   │   │   └── events.ts            # event schema definitions (no PHI)
│   │   │   └── types/
│   │   │       └── index.ts             # shared domain types
│   │   └── __tests__/
│   │       └── integration/             # cross-module integration tests only — unit tests co-located in src/
│   ├── sync/                            # PowerSync SyncAdapter + schema (shared)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── schema.ts                # PowerSync SQLite schema
│   │   │   ├── adapter.ts               # SyncAdapter (sudsWriter)
│   │   │   ├── client.ts                # PowerSyncDatabase factory
│   │   │   └── utils/
│   │   │       ├── outbox.ts            # durable outbox helpers
│   │   │       ├── outbox-schema.ts     # Zod schema for outbox entry — validates before write and replay
│   │   │       └── conflict.ts          # conflict resolution
│   │   └── __tests__/
│   │       └── adapter.test.ts
│   ├── supabase/                        # Supabase client, auth, mappers, RLS
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── client.ts                # createSupabaseClient()
│   │   │   ├── auth/
│   │   │   │   ├── AuthProvider.tsx     # React context provider
│   │   │   │   ├── useAuth.ts           # hook (userId, signOut, etc.)
│   │   │   │   └── session.ts           # MMKV session persistence (react-native-mmkv direct dep)
│   │   │   ├── functions/               # Edge Function wrappers — one file per function
│   │   │   │   ├── index.ts
│   │   │   │   ├── call-edge-fn.ts      # typed invoker (verb-first kebab-case)
│   │   │   │   ├── consent-record.ts
│   │   │   │   ├── export-data.ts
│   │   │   │   └── crisis-alert.ts
│   │   │   ├── mappers/                 # Supabase row ↔ domain type mappers
│   │   │   │   ├── session.mapper.ts
│   │   │   │   ├── hierarchy.mapper.ts
│   │   │   │   └── check-in.mapper.ts
│   │   │   └── errors/
│   │   │       ├── postgrest.ts         # PostgREST → AppError mapper
│   │   │       └── edge-fn.ts           # Edge Function non-2xx Deno Response → AppError mapper
│   │   └── __tests__/
│   │       ├── mappers/
│   │       └── rls/
│   │           └── harness/             # RLS test infrastructure (not shipped in src/)
│   └── ui/                              # NativeWind v5 primitives
│       ├── package.json
│       ├── tsconfig.json
│       ├── .eslintrc.js                 # bans @supabase/*, packages/sync, packages/supabase imports — prevents hoisted-dep escape
│       ├── vitest.config.ts
│       ├── src/
│       │   ├── index.ts
│       │   ├── primitives/
│       │   │   ├── Button.tsx
│       │   │   ├── Text.tsx
│       │   │   ├── Input.tsx
│       │   │   └── Card.tsx
│       │   ├── composed/
│       │   │   ├── SudsScale.tsx
│       │   │   ├── ProgressChart.tsx
│       │   │   └── CrisisCard.tsx
│       │   └── tokens/
│       │       └── theme.ts
│       └── __tests__/
│           └── primitives/
├── supabase/                            # Supabase backend (CLI-managed)
│   ├── config.toml
│   ├── seed.sql
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   ├── 0003_consent.sql
│   │   ├── 0004_analytics.sql
│   │   └── 0005_crisis.sql
│   └── functions/
│       ├── _shared/                     # shared Deno utilities — Edge Functions must NOT import from packages/
│       │   ├── cors.ts                  # CORS headers
│       │   ├── auth.ts                  # JWT validation helper
│       │   └── types.ts                 # Deno-safe re-exports of domain interface shapes (no monorepo imports)
│       ├── consent-record/
│       │   └── index.ts
│       ├── export-data/
│       │   └── index.ts
│       └── crisis-alert/
│           └── index.ts
└── docs/
    └── ANXIETY_APP_PRODUCT_SPEC.md
```

> **DPO Admin Panel:** Not in the monorepo. The Data Protection Officer dashboard is served directly from Supabase Studio (with restricted IAM role) at MVP. A dedicated web admin interface is a post-launch decision tracked separately.

> **Notifications delivery layer:** Location TBD. `settings/notifications.tsx` covers preferences UI only. The scheduling / FCM / APNs token layer is an open structural decision to be resolved before implementing FR-NOTx stories.

## Requirements → Structure Mapping

| Functional Area | Primary Location | Supporting Packages |
|---|---|---|
| Auth / Identity | `packages/supabase/src/auth/` | `supabase/migrations/0002_rls.sql` |
| Onboarding / Readiness Gate | `apps/mobile/app/(auth)/` | `packages/core/src/erp/` |
| Hierarchy Builder | `apps/mobile/app/(app)/hierarchy/` | `packages/core/src/erp/hierarchy.ts` |
| ERP Session Flow | `apps/mobile/app/(app)/session/[id]/index.tsx` | `packages/core/src/erp/session.ts`, `packages/sync/src/adapter.ts` |
| Session Debrief | `apps/mobile/app/(app)/session/[id]/debrief.tsx` | `packages/core/src/erp/debrief.ts` |
| SUDS Tracking | `apps/mobile/src/components/session/SudsSlider.tsx` | `packages/core/src/erp/suds.ts`, `packages/sync/src/adapter.ts` |
| CBT / Somatic Techniques | `apps/mobile/app/(app)/techniques/` | _(static content, no core logic)_ |
| Daily Check-in Routing | `apps/mobile/app/(app)/index.tsx` | `packages/core/src/checkin/` |
| Progress Visualisation | `apps/mobile/app/(app)/progress/` | `packages/ui/src/composed/ProgressChart.tsx` |
| Crisis Detection | `apps/mobile/src/hooks/useCrisisDetect.ts` | `packages/core/src/crisis/detector.ts` |
| Crisis Safety Card | `apps/mobile/app/(app)/crisis/index.tsx` | `packages/core/src/crisis/contacts.ts`, `packages/supabase/src/functions/crisis-alert.ts` |
| Notifications | `apps/mobile/app/(app)/settings/notifications.tsx` (prefs UI) | _(delivery layer: location TBD)_ |
| Localisation (i18n) | `apps/mobile/src/i18n/locales/<BCP-47>.json` | _(all UI strings externalised here)_ |
| Analytics (no PHI) | `apps/mobile/src/analytics/` | `packages/core/src/analytics/events.ts` |
| DPDPA / Data Rights | `apps/mobile/app/(app)/settings/data-rights.tsx` | `packages/core/src/consent/`, `packages/supabase/src/functions/consent-record.ts`, `packages/supabase/src/functions/export-data.ts` — **consent writes MUST go via `supabase/functions/consent-record` only; no other write path is valid for DPDPA audit trail** |
| Offline Sync / Outbox | `packages/sync/src/` | `supabase/migrations/0001_init.sql` |

## Package Import Boundaries

Each package may only import from packages listed in its **Allowed** column. Native npm modules (e.g. `react-native-mmkv`, PowerSync SDK) are direct dependencies of the package that needs them — they are not subject to this table. Violations of internal package imports fail CI lint.

| Package | Allowed to import | Forbidden |
|---|---|---|
| `packages/core` | _(none — zero internal deps)_ | All internal packages |
| `packages/ui` | `packages/core` (types only) | `packages/sync`, `packages/supabase`, RN platform APIs |
| `packages/supabase` | `packages/core` | `packages/sync`, `packages/ui` |
| `packages/sync` | `packages/core`, `packages/supabase/src/auth/session` (token reads only — no other supabase imports) | `packages/ui`, direct Supabase SQL, all other `packages/supabase` paths |
| `apps/mobile` | All four packages | Direct Supabase client (must go via `packages/supabase`); direct `PowerSyncDatabase.execute()` (must go via `packages/sync/src/adapter.ts`) |
| `apps/web` | `packages/core`, `packages/supabase`, `packages/ui` | `packages/sync` (web uses Supabase Realtime, not PowerSync) |

## Runtime Data Flow

**Normal path (session SUDS write):**
```
SudsSlider.tsx (UI event)
  → useSessionFlow hook (useReducer, serialised to MMKV)
    → packages/core/src/erp/suds.ts (domain calculation)
      → packages/sync/src/adapter.ts (PowerSync durable write)
        → PowerSync cloud relay
          → supabase/functions/consent-record (audit trail)
            → PostgreSQL (supabase/migrations/)
```

**Crisis interrupt path:**
```
Any screen (keyword detected in free-text input)
  → apps/mobile/src/hooks/useCrisisDetect.ts
    → packages/core/src/crisis/detector.ts (on-device match, no network required)
    → packages/core/src/crisis/keywords-manifest.ts (version checked at app start, not here)
      → navigate to apps/mobile/app/(app)/crisis/index.tsx (safety card)
        → packages/core/src/crisis/contacts.ts (on-device contacts, no network required)
          ↳ (background, best-effort) packages/supabase/src/functions/crisis-alert.ts → Edge Function
              → if offline: alert is silently dropped — safety card is fully on-device, no alert queuing
```

**Cold start auth path:**
```
apps/mobile/app/_layout.tsx
  → apps/mobile/src/error-handler.ts (registered first — catches async rejections globally)
  → packages/supabase/src/auth/AuthProvider.tsx
    → packages/supabase/src/auth/session.ts (MMKV synchronous read — zero network)
      → if MMKV uninitialised / throws (e.g. first install after factory reset): treat as no session → (auth)/
      → if valid token: render (app)/ immediately
      → if expired: onAuthStateChange listener triggers refresh → re-render (app)/
```

---
