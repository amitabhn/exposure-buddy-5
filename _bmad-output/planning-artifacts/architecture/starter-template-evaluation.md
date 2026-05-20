# Starter Template Evaluation

## Primary Technology Domain

Full-stack mobile-first: React Native (Expo, Android-primary) + React Web + Supabase backend. Self-help app supplementing therapy (no direct clinician touchpoint at MVP). Offline-first health data with DPDPA/HIPAA-compatible compliance.

## Starter Options Considered

| Option | Stack | Fit |
|---|---|---|
| supabase-community/create-t3-turbo | Expo + Next.js + tRPC + Drizzle + Supabase + NativeWind + Turborepo | Eliminated — tRPC/Drizzle conflict with Supabase-native approach; removal cost exceeds clean scaffold |
| Custom Turborepo + Expo (custom sync) | Turborepo + Expo SDK 54 + RN 0.81 + custom durable outbox in packages/sync | Viable but requires building packages/sync from scratch — 2–3 sprint epic before offline works |
| Custom Turborepo + Expo + PowerSync | Turborepo + Expo SDK 54 + RN 0.81 + PowerSync SDK as packages/sync implementation | **Selected** — eliminates sync epic complexity; DPA assessment required before India launch |

## Comparative Analysis

| Criterion | Weight | T3 Turbo | Custom (no PowerSync) | PowerSync |
|---|:---:|:---:|:---:|:---:|
| Offline-first (ADR-002/005/007) | 5 | 1 | 4 | 5 |
| Privacy/compliance (zero 3rd-party health data, DPDPA) | 5 | 3 | 5 | 3 |
| Package boundaries (packages/core + packages/sync) | 4 | 2 | 5 | 5 |
| Supabase-native RLS + API (ADR-006/008) | 4 | 2 | 5 | 4 |
| Long-term maintenance / tech debt | 4 | 2 | 5 | 3 |
| Cold start performance (ADR-004) | 3 | 2 | 4 | 4 |
| Android OEM background execution (ADR-007) | 3 | 1 | 4 | 4 |
| Dev velocity | 2 | 4 | 3 | 4 |
| **Weighted Total /150** | | **61 (41%)** | **135 (90%)** | **130 (87%)** |

PowerSync scores 87% vs custom sync's 90% — the gap is the compliance uncertainty (DPA gate). With DPA secured, these are effectively equal. PowerSync is selected because it eliminates ADR-002, ADR-005, and ADR-007 as open decisions, reducing the ADR resolution burden before story-writing.

## Selected Starter: Custom Turborepo + Expo + PowerSync

**Rationale:** Turborepo monorepo provides the clean package boundary structure the architecture requires. PowerSync as the `packages/sync` implementation eliminates the sync epic complexity (durable outbox, conflict resolution, WatermelonDB/SQLite choice, WorkManager OEM variance) at the cost of a compliance assessment before India launch. The SyncAdapter interface keeps PowerSync as a contained implementation detail — swappable without touching apps/mobile if needed.

**Initialization Command:**

```bash
npx create-turbo@latest exposure-buddy --package-manager pnpm
```

**Target Package Structure:**

```
apps/mobile       — Expo SDK 54 (React Native 0.81, Expo Router v4)
apps/web          — Phase 2 clinician surface placeholder
                    CI lint gate: no @supabase/supabase-js imports until
                    HIPAA §164.312(b) audit log story merged
packages/core     — Pure TypeScript business logic, zero framework deps
                    Owns: domain types (Hierarchy, ExposureItem, SUDScore),
                    session state machine
  └ src/crypto    — AES-256 at-rest encryption; key derivation via Expo
                    SecureStore (Android Keystore, API 23+ minimum)
packages/sync     — Offline sync layer
  └ src/index.ts  — SyncAdapter interface:
                      enqueue(record: SyncRecord): Promise<void>
                      flush(): Promise<SyncResult>
                      getPendingCount(): number
  └ src/powersync.ts — PowerSyncAdapter implements SyncAdapter
                    PowerSync SDK owns: SQLite local store, durable outbox,
                    conflict resolution, WorkManager background sync + OEM
                    graceful fallback
packages/ui       — Shared component primitives (NativeWind v5)
  └ __tests__/
    rtl.test.tsx  — I18nManager.forceRTL(true) + ERP hierarchy and SUD
                    slider interaction assertions
packages/supabase — Supabase client, dual-role RLS helpers, type-safe queries
                    patient_access policies (active at MVP)
                    clinician_access policies (stubbed, gated by
                    therapist_patient.enabled = false DEFAULT)
```

**ADR Resolution Registry — All ADRs:**

| ADR | Status | Resolution |
|---|---|---|
| ADR-001 | **Accepted** | packages/core boundary: full domain layer (Option C) — session state machine, crisis detection, consent records, SUDS logic, all zero-dep |
| ADR-002 | **Resolved by PowerSync** | PowerSync owns local SQLite store — WatermelonDB/Legend-State/Redux decision superseded |
| ADR-003 | **Accepted** | MMKV + PowerSync SQLite, no separate SQLCipher — key derivation via Expo SecureStore (Android Keystore API 23+) |
| ADR-004 | **Accepted** | MMKV sync read for navigation persistence + session recovery; startup sequence: MMKV key derivation → MMKV sync reads → PowerSync init |
| ADR-005 | **Resolved by PowerSync** | PowerSync test patterns replace custom offline test strategy |
| ADR-006 | **Accepted** | RLS policy test harness: TypeScript integration tests in packages/supabase/__tests__/rls/, Vitest, four-assertion minimum per policy |
| ADR-007 | **Resolved by PowerSync** | PowerSync handles WorkManager + OEM battery management + graceful SLA-breach fallback |
| ADR-008 | **Accepted** | Data flow mapping + design rules: PostgREST for SUDS/session reads, Edge Functions for DPDPA export/erasure + notifications; see ADR-008 section |
| ADR-009 | **Accepted** | apps/web: Phase 2 clinician surface placeholder; dual-role RLS from day one (patient_access active, clinician_access stubbed behind therapist_patient.enabled = false) |
| ADR-RN-VERSION | **Accepted** | RN 0.81 / Expo SDK 54 / Expo Router v4 / NativeWind 5.0.0-preview.3 / PowerSync 1.34.0 — all exact-pinned; see ADR-RN-VERSION.md |

**ADRs Remaining:** None — all original ADRs (ADR-001 through ADR-009, ADR-RN-VERSION) are resolved. See Core Architectural Decisions section below.

**ADRs Pending from Adversarial Review (must be written before story-writing):**

| ADR | Decision | Required before |
|---|---|---|
| ADR-ZUSTAND-PANEL | Zustand minimal scope for CalmMe/panel coordination only; Zustand must not be used for clinical data state | Any panel/overlay story |
| ADR-AUTH-TOKEN-PROVIDER | `AuthTokenProvider` interface in `packages/core`; `packages/sync` must not import `packages/supabase`; `apps/mobile` is the composition root | packages/sync stories |
| ADR-NOTIFICATIONS | Expo Push Service abstraction (→ FCM/APNs); notifications are architecture-critical, not nice-to-have; push = best-effort nudge, PowerSync = authoritative delivery for crisis alerts | Story 1 (Firebase project + package name must be locked) |
| ADR-DPO-INTERFACE | Three Supabase Edge Functions (`/dpo/erase-user`, `/dpo/export-user`, `/dpo/audit-log`) + append-only `dpo_audit_log` table + self-hosted HTML operator panel; replaces Supabase Studio as DPO interface | Before any personal data is processed in production |

**Architectural Decisions Established:**

- Language: TypeScript strict mode, pnpm workspaces
- Runtime: Node 20+, Expo SDK 54 (React Native 0.81)
- Styling: NativeWind `5.0.0-preview.3` (Tailwind CSS v4) — ⚠️ pre-release; pin to exact version, review at each preview bump before upgrading
- Offline sync: `@powersync/react-native@1.34.0` — pin to exact version
- Build: Turborepo parallel task graph with remote caching
- Dev tooling: Expo Dev Client required (MMKV incompatible with Expo Go)
- EAS Build: eas.json profiles (development/preview/production) + app.config.ts for env injection — Story 1 deliverable
- Navigation: Expo Router v4 (file-based, typed routes)
- Testing: Jest + Expo preset (mobile), Vitest (packages/core), PowerSync test patterns (packages/sync)
- Minimum Android API: 23 (Android Keystore-backed key derivation)

**Pre-mortem Prevention Controls:**

1. Story 1 includes EAS Build CI/CD for Expo Dev Client, validated on a clean 2GB RAM Android device before sprint 2 (2–4 day effort — must be in Story 1 estimate, not assumed infrastructure)
2. packages/sync epic scoped to PowerSync integration — ADR-006/008 must be resolved before sync epic is estimated
3. NativeWind v5 pinned to minor version at init; RTL smoke test in CI covers ERP hierarchy and SUD slider interactions
4. apps/web contains no Supabase queries until ADR-009 activation gate met
5. Data classification decision (what counts as "health data") documented before the first RLS policy is written

**Compliance Gate:**

PowerSync is a third-party managed sync service. Health data (SUDS logs, session content) passes through their infrastructure. Before India launch:
- PowerSync DPA must be reviewed and signed (DPDPA §2(t) — third-party data processor)
- PowerSync deletion API must be validated against DPDPA §12 (erasure right)
- DPA assessment is a legal action item, not a sprint blocker — begin in parallel with development

**Product Clarification:**

MVP is a self-help app. No direct clinician touchpoint at MVP. Clinician summary (highs/lows report) is a Phase 2 feature. HIPAA §164.312(b) audit trail is therefore a Phase 2 story. DPDPA, AES-256, and zero third-party health data transmission apply at MVP in full.

Note for UX design step: Local encrypted storage is a user trust signal and retention driver — must be surfaced in the product UI, not buried in the privacy policy.

**ADR-009 — apps/web Role and Dual-Role RLS Posture (Status: Accepted)**

| Field | Decision |
|---|---|
| apps/web role | Phase 2 clinician surface — decided now, scaffolded as placeholder |
| RLS posture | Dual-role from day one: patient_access (active) + clinician_access (stubbed, gated by therapist_patient.enabled = false DEFAULT) |
| CI gate | no-restricted-imports in apps/web/.eslintrc.js blocking @supabase/supabase-js until HIPAA audit log story merged |
| Package boundary | apps/web consumes packages/supabase only — no direct Supabase calls |
| Activation gate | therapist_patient.enabled requires migration + DPO sign-off |
| Blocks | All RLS stories (ADR-006), clinician epic (Phase 2) |

**Note:** Project initialization, monorepo scaffolding, and PowerSync integration is the first implementation story.

---
