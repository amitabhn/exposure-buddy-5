---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-05-08'
step5Supplemented: true
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/product-brief-exposure-buddy.md'
  - '_bmad-output/planning-artifacts/milestone-features-exposure-buddy.md'
  - '_bmad-output/planning-artifacts/research/technical-react-native-vs-flutter-mobile-mental-health-app-research-2026-05-05.md'
  - '_bmad-output/planning-artifacts/research/technical-backend-architecture-real-time-anxiety-tracking-app-research-2026-05-05.md'
  - '_bmad-output/planning-artifacts/research/market-exposure-therapy-apps-anxiety-consumer-research-2026-05-05.md'
  - 'docs/ANXIETY_APP_PRODUCT_SPEC.md'
workflowType: 'architecture'
project_name: 'exposure-buddy'
user_name: 'Cooper'
date: '2026-05-07'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
32 FRs across 14 functional areas covering the full ERP clinical protocol (onboarding, readiness gate, hierarchy builder, session flow, debrief), CBT and somatic technique libraries, daily check-in routing, progress visualisation, crisis detection, notifications, i18n, and first-party analytics. No epics or user stories yet — FRs are the primary implementation input. UX design is not yet produced; screen-level patterns will be inferred from user journeys and FRs.

**Non-Functional Requirements:**
18 NFRs with specific measurable thresholds defining three hard architectural constraints:
- Performance envelope: <3s cold start, <500ms SUDS write, <1s check-in route on 2GB RAM / Android 10+ / 4G
- Offline reliability: full ERP session offline, 30s sync SLA, zero data loss, on-device crisis contacts
- Compliance: AES-256 at rest, TLS 1.3 in transit, RLS on all health tables, DPDPA consent records (4 fields), DPO published before launch, HIPAA/GDPR-compatible data model at MVP without migration at Phase 2

**Scale & Complexity:**
- Primary domain: Mobile-first full-stack (React Native Android-primary + iOS, React web, Supabase backend)
- Complexity level: High
- Estimated architectural components: ~10 (Auth/Identity, Clinical Data Layer, Consent Middleware, ERP Session Engine, Offline Sync/Outbox, Crisis Safety, Analytics Boundary, Notification, Localisation, Data Governance)

### Technical Constraints & Dependencies

- React Native (Android-primary, iOS 16+) + React web (last 2 major Chrome/Firefox/Safari)
- Supabase backend (PostgreSQL + RLS + Auth + Realtime)
- Mid-range Android target: 2GB RAM, Android 10+, 4G with intermittent drops
- No health data to any third-party analytics, advertising, or data-broker service
- DPDPA 2023 mandatory before India go-live; HIPAA/GDPR-compatible schema mandatory at MVP
- Crisis keyword list embedded in client binary; updated via app release cycle only
- All UI strings externalised; RTL layout support from day one even with no RTL launch locale
- Monorepo with shared `packages/core` (pure TypeScript, zero framework deps) to prevent logic duplication across RN and web surfaces

### Cross-Cutting Concerns Identified

#### Data & Compliance Concerns

1. **Offline/online state machine** — ERP session, crisis resources, notifications, and sync all branch on connectivity; a single consistent state model must govern all surfaces

2. **Durable outbox pattern** *(surfaced: Failure Mode Analysis)* — offline writes must go to a durable outbox before any in-memory state is accepted as committed; idempotent sync with client-generated UUIDs required to prevent duplicates on reconnect; app kills between write and sync must not cause data loss

3. **Session state recovery** *(surfaced: Failure Mode Analysis)* — if app opens with an abandoned in-progress ERP session (OS-killed during active exposure), a Resume / Discard screen is required; session state machine must be persisted to durable storage at every state transition, not only on SUDS log events

4. **Encryption layer** — health data encrypted at rest (AES-256) and in transit (TLS 1.3) across all three surfaces and the backend; local device storage requires explicit encryption (MMKV with keychain-derived key or SQLCipher) — OS-level encryption on Android 10+ is not a sufficient guarantee for app-private health data *(gap: NFR-SEC-01 covers backend only; local store not covered)*

5. **Row Level Security with test suite** — enforced at database layer on all health data tables; automated test suite with positive and negative assertions required for every RLS policy before merge; RLS policies must be written with extensibility for the therapist-patient access model (Phase 2)

6. **Consent state as middleware** *(surfaced: Party Mode — Mary)* — consent state is a cross-cutting concern injected into every data-emitting component, including the offline outbox; consent withdrawal must suppress queued outbox events for the withdrawn purpose; every data processor (crash reporter, analytics) requires a validated deletion API before vendor selection; not a settings screen — a middleware layer

7. **Analytics data boundary** — first-party event pipeline only; crash/error reporting tool configured with `beforeSend` scrubbing rules excluding SUDS fields, session content, and health-adjacent screen state; production builds strip all health-data logging; analytics events use session-scoped pseudonymous IDs, not `user_id`

8. **Crisis detection security surface** — on-device keyword list is a decompilable asset; obfuscation or hash verification at update time is an explicit architecture decision; keyword matching runs on a background thread, not the UI thread

9. **Crash recovery** — SUDS log entries must survive app termination; local write is durable via outbox before any in-memory state is accepted as committed

10. **Localisation** — zero hardcoded UI strings in application code; RTL layout system active from MVP

#### System & Operational Concerns

11. **Runtime memory/CPU envelope** *(surfaced: Party Mode — Winston)* — SQLCipher/MMKV, durable outbox, offline state machine, session timer, and RN bridge all compete for the 2GB RAM budget on the target device; component-level memory analysis required before finalising the encryption and sync approach; target device profiling must precede component design, not follow it

12. **RN ↔ Web surface parity and role model** *(surfaced: Party Mode — Winston)* — the web surface may serve clinicians (Phase 2) rather than patients, implying a different RLS pattern, consent flow, and data access model; this must be decided before schema design; not a styling concern — a data boundary concern

13. **Android OEM background execution variance** *(surfaced: Party Mode — Winston)* — MIUI, One UI, and Realme UI aggressively kill background processes; WorkManager deferred job execution on Indian-market OEMs cannot guarantee the 30s sync SLA; the architecture must define graceful SLA-breach behaviour (user notification, next-foreground sync fallback) rather than assuming OS compliance

14. **Cold start sequencing as a gated concern** *(surfaced: Party Mode — Winston)* — SQLCipher/MMKV key derivation, outbox queue replay, and offline state machine init all run on the startup path; without a named startup dependency graph with enforced sequencing, the <3s cold start budget will be consumed by death-by-a-thousand-milliseconds as each team ships their own init independently

15. **Consent revocation state machine** *(surfaced: Party Mode — Winston)* — consent architecture must model grant and revocation; revocation must propagate to queued outbox events, third-party deletion APIs, and the local store; backend must handle retroactive suppression of rows collected under a now-revoked purpose

16. **Client-server API versioning under rolling mobile upgrades** *(surfaced: Party Mode — Winston)* — at any post-launch moment, users on v1.0 and v1.2 run against the same Supabase backend; outbox written by v1.0 must be processable by v1.2 backend; RLS policies and API contracts must be backward-compatible under version skew; Supabase does not provide API versioning by default

17. **Crisis flow degradation contract** *(surfaced: Party Mode — Winston)* — explicit documented behaviour required for each crisis sub-path under offline, partial connectivity, and full connectivity conditions; undefined behaviour during crisis is a healthcare liability; hardcoded phone contacts work offline; digital escalation paths (Phase 2) are connectivity-dependent and must degrade gracefully

18. **Database connection budget** *(surfaced: Party Mode — Winston)* — at 10,000 concurrent users, PostgreSQL connection pooling via PgBouncer is a hard constraint; Supabase Realtime subscriptions hold persistent connections; the API layer design (PostgREST vs Edge Functions vs Realtime) must account for connection budget, not treat it as a deployment detail

#### Schema & Data Model Concerns

19. **User Data Map as schema artifact** *(surfaced: Party Mode — Mary)* — every Supabase table tagged with: data category, retention period, erasure cascade behaviour, and portability export inclusion; DPDPA §11-13 data principal rights (access, correction, erasure, portability) require that every personal data row be attributable to a `user_id` with cascade-delete semantics; personal data must not appear as a natural key in any junction table

20. **HIPAA pseudonymisation and audit logging from day one** *(surfaced: Party Mode — Mary)* — clinical layer (SUDS, hierarchy, journal, session logs) must link to identity layer exclusively via internal UUIDs, never via PII columns; HIPAA §164.312(b) requires an access audit trail for every PHI read — RLS enforcement alone is insufficient; building this retroactively with real user data in production is a painful migration

21. **Therapist-patient relationship table stub** *(surfaced: Party Mode — Mary)* — Phase 2 introduces a therapist accessing patient data under a different RLS pattern; if RLS is written with `auth.uid() = user_id` assumptions only, every policy requires rewriting at Phase 2; add a stub `therapist_patient` relationship table today so RLS policies are extensible without a full schema rewrite

22. **DPO operational interface as go-live dependency** *(surfaced: Party Mode — Mary)* — a DPO responding to DPDPA §11-13 data principal rights requests (48-hour acknowledgment SLA) via ad-hoc engineering support is not sustainable; a minimum viable Data Governance Admin Panel (user lookup by ID, export trigger, erasure trigger, consent audit view) is a go-live dependency, not a Phase 3 feature

23. **SDK dependency audit gate in CI/CD** *(surfaced: Party Mode — Mary)* — the "zero third-party health data transmission" privacy moat is independently auditable via Exodus Privacy, mitmproxy, and App Store privacy label audits; a CI gate that flags new dependencies and requires explicit sign-off on transmitted data categories is a recurring architectural control, not a one-time audit

### Architecture Gaps Requiring Decisions Before Story-Writing

These gaps must be resolved as Architecture Decision Records (ADRs) before epics and stories can be accurately estimated or authored:

| ADR | Decision Required | Blocks |
|---|---|---|
| ADR-001 | Monorepo structure + `packages/core` / `packages/sync` boundary definitions | All stories |
| ADR-002 | Local state management: Zustand+WatermelonDB vs Legend-State vs Redux+redux-persist | SUDS write, offline session stories |
| ADR-003 | Encrypted local storage: MMKV+keychain vs SQLCipher; key derivation strategy | NFR-SEC-01 stories |
| ADR-004 | Navigation persistence (MMKV sync read vs AsyncStorage) + session recovery screen pattern | Cold start, session recovery stories |
| ADR-005 | Offline test strategy: WatermelonDB Jest preset, MSW offline handler conventions, fake timer patterns for sync SLA tests | Any offline acceptance criteria |
| ADR-006 | RLS policy test harness: location, ownership, positive/negative assertion requirements | All data layer stories |
| ADR-007 | Android background sync: WorkManager configuration + graceful SLA-breach behaviour for OEM battery management | NFR-OFFLINE-02 stories |
| ADR-008 | Supabase API layer: PostgREST vs Edge Functions vs Realtime for each data flow; connection budget per flow | Backend stories, load test |
| ADR-009 | apps/web role (Phase 2 clinician surface) + dual-role RLS posture | All RLS stories, clinician epic |
| ADR-RN-VERSION | React Native / Expo SDK version pin: RN 0.81, Expo SDK 54, Expo Router v4, NativeWind 5.0.0-preview.3, PowerSync 1.34.0 | Story 1 (project initialisation), all mobile stories |

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack mobile-first: React Native (Expo, Android-primary) + React Web + Supabase backend. Self-help app supplementing therapy (no direct clinician touchpoint at MVP). Offline-first health data with DPDPA/HIPAA-compatible compliance.

### Starter Options Considered

| Option | Stack | Fit |
|---|---|---|
| supabase-community/create-t3-turbo | Expo + Next.js + tRPC + Drizzle + Supabase + NativeWind + Turborepo | Eliminated — tRPC/Drizzle conflict with Supabase-native approach; removal cost exceeds clean scaffold |
| Custom Turborepo + Expo (custom sync) | Turborepo + Expo SDK 54 + RN 0.81 + custom durable outbox in packages/sync | Viable but requires building packages/sync from scratch — 2–3 sprint epic before offline works |
| Custom Turborepo + Expo + PowerSync | Turborepo + Expo SDK 54 + RN 0.81 + PowerSync SDK as packages/sync implementation | **Selected** — eliminates sync epic complexity; DPA assessment required before India launch |

### Comparative Analysis

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

### Selected Starter: Custom Turborepo + Expo + PowerSync

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

**ADRs Resolved by PowerSync Selection:**

| ADR | Status | Resolution |
|---|---|---|
| ADR-002 | **Resolved** | PowerSync owns local SQLite store — WatermelonDB/Legend-State/Redux decision superseded |
| ADR-005 | **Resolved** | PowerSync test patterns replace custom offline test strategy |
| ADR-007 | **Resolved** | PowerSync handles WorkManager + OEM battery management + graceful SLA-breach fallback |

**ADRs Remaining:** ADR-001, ADR-003, ADR-004, ADR-006, ADR-008, ADR-009

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

## Core Architectural Decisions

### ADR-001 — packages/core Boundary (Status: Accepted)

**Decision:** Full domain layer — Option C.

packages/core owns: domain types (Hierarchy, ExposureItem, SUDScore, CheckInResult), ERP session state machine, crypto module (AES-256), check-in routing state machine, SUDS threshold rules, crisis detection algorithm (not keyword list), progress/streak calculations, hierarchy validation rules.

**Rationale:** Clinical logic is the product's core value, not app-specific behaviour. Full domain layer maximises testability (Vitest, zero RN deps), prevents Phase 2 duplication, and makes crisis detection testable in isolation — critical for a safety feature. "Extract later" rarely happens cleanly on a health app with accumulated coupling.

**Consequence:** All clinical logic stories are scoped to packages/core first, consumed by apps/mobile. 80%+ of clinical logic testable in Vitest without a device.

---

### ADR-002 — Local State Management (Status: Resolved by PowerSync)

PowerSync owns the local SQLite store. WatermelonDB/Legend-State/Redux decision superseded.

---

### ADR-003 — Encrypted Local Storage (Status: Accepted)

**Decision:** MMKV + PowerSync's SQLite — no separate SQLCipher instance.

- MMKV: auth tokens, navigation state, user preferences, session recovery flag
- PowerSync SQLite: all clinical structured data (SUDS logs, ERP sessions, hierarchy)
- Encryption key: derived via Expo SecureStore (Android Keystore API 23+, iOS Keychain)
- iOS file protection: NSFileProtectionCompleteUntilFirstUserAuthentication (accessible after first unlock, background sync safe)
- No second SQLite instance — prevents memory budget conflict on 2GB RAM target device

---

### ADR-004 — Navigation Persistence + Session Recovery (Status: Accepted)

**Decision:** MMKV sync read for both navigation persistence and session recovery detection.

**Startup sequence (cold start dependency graph):**
1. MMKV key derivation (Expo SecureStore)
2. MMKV sync reads: [auth state] [session.inProgress] [last route]
3. PowerSync init (parallel to step 2 where possible)
4. Route decision: session recovery screen OR last route OR onboarding

**Session state machine:** Writes current state to MMKV at every transition (not only on SUDS log events). On cold start, session.inProgress: true routes to Resume / Discard screen before any other navigation.

**Rationale:** MMKV sync read adds zero latency to cold start path. AsyncStorage async gap conflicts with <3s cold start NFR on 2GB RAM device.

---

### ADR-005 — Offline Test Strategy (Status: Resolved by PowerSync)

PowerSync test patterns replace custom offline test strategy.

---

### ADR-006 — RLS Policy Test Harness (Status: Accepted)

**Decision:** TypeScript integration tests in packages/supabase/__tests__/rls/. Vitest. Runs against local Supabase instance via supabase start.

**Pattern per policy (four assertions minimum):**
```
[+] authenticated user can read their own data
[-] authenticated user cannot read another user's data
[-] unauthenticated request is rejected
[stub] clinician path returns empty (therapist_patient.enabled = false)
```

Each policy file in packages/supabase/src/rls/ has a corresponding test file in packages/supabase/__tests__/rls/. Progress/streak view test explicitly validates SECURITY INVOKER behaviour (RLS not bypassed).

---

### ADR-007 — Android Background Sync (Status: Resolved by PowerSync)

PowerSync handles WorkManager configuration + OEM battery management (MIUI, One UI, Realme UI) + graceful SLA-breach fallback behaviour.

---

### ADR-008 — Supabase API Layer (Status: Accepted)

#### Data Flow Mapping

| Data Flow | Mechanism | Data Classification | Third-Party Processors | DPA Status |
|---|---|---|---|---|
| SUDS log writes | PowerSync → PostgREST | Health | PowerSync, Supabase | PENDING — blocks India launch |
| ERP session data | PowerSync → PostgREST | Health | PowerSync, Supabase | PENDING — blocks India launch |
| Check-in read | PostgREST | Health | Supabase | PENDING — blocks India launch |
| Progress/streak calculations | PostgREST view (SECURITY INVOKER) | Pseudonymous | Supabase | PENDING — blocks India launch |
| Crisis detection | On-device only (packages/core) | Health | None | Not required |
| Push notification triggers | Edge Function → FCM/APNs | Non-personal (payload rule enforced) | Supabase, Google FCM, Apple APNs | PENDING — blocks India launch |
| DPDPA export / erasure | Edge Function | Health | Supabase | PENDING — blocks India launch |
| First-party analytics events | PostgREST | Pseudonymous | Supabase | PENDING — blocks India launch |
| Auth | Supabase Auth | Pseudonymous (linkage key) | Supabase | PENDING — blocks India launch |
| Real-time sync status | Not needed (Phase 1) | N/A | None | Not required |

#### Design Rules

**Notification Payload Rule:** All push notification payloads must be content-neutral — app name, badge count, or generic call-to-action only. No therapy-context, session state, or clinical content in the payload. All personalization rendered client-side from local PowerSync data after notification is tapped. FCM and APNs require DPA entries regardless of payload content.

**SUDS Write Idempotency:** All SUDS log inserts use client-generated UUIDs with ON CONFLICT DO NOTHING. PowerSync offline queue replay cannot produce duplicate SUDS entries. Canonical ordering column is server-side inserted_at (not client-supplied timestamp) — prevents clock skew corrupting streak calculations. Mandatory integration test: offline write → reconnect → assert single row in suds_logs.

**PowerSync Flush Guarantee:** Verify PowerSync SDK flushes queue entry to local SQLite before returning success to the UI layer. If not guaranteed by default, wrap every SUDS write in an explicit flush-before-ack call.

**Progress/Streak View:** SECURITY INVOKER (RLS enforced at querying user's privilege level). Streak calculation uses user-local local_date field on check-in rows (not UTC timestamp) — prevents timezone boundary false streak breaks. View logic kept thin for Phase 2 Edge Function replaceability.

**Check-In Offline Fallback:** Check-in read must degrade gracefully when offline — default to safe state ("not yet completed today") rather than error. Never cache check-in state across calendar days.

**Push Notification Idempotency:** Edge Function checks notifications_sent log table before calling FCM/APNs. Insert idempotency key before FCM call; skip if already present. FCM/APNs invalid-token responses trigger device_tokens status update; app refreshes token on next foreground.

**Crisis Detection Priority:** Crisis interrupt is a top-priority state machine transition in packages/core — preempts all other state mutations including the PowerSync outbox queue. Crisis detection accepts testMode: boolean flag — disabled in test environments, never in production builds.

**Staged Erasure:** DPDPA erasure runs as a staged, idempotent process. Each table erasure is an atomic transaction logged to erasure_jobs table with per-table status. Resume from last successful table on retry. Erasure flow includes push command to user's device triggering WIPE_LOCAL_DATA for PowerSync local SQLite. If device offline: job remains in pending_device_wipe state until next foreground.

**Realtime — Phase 1:** Not implemented. Revisit trigger: if Phase 2 introduces therapist-facing views or multi-device live sync, Realtime connection budget and RLS policy gaps must be assessed before implementation.

#### Critical Failure Mode Preventions

| FM | Flow | Prevention |
|---|---|---|
| FM-2 | SUDS write | Verify PowerSync SQLite flush-before-ack |
| FM-3 | SUDS write | server-side inserted_at as canonical ordering column |
| FM-5 | Crisis detection | Crisis interrupt preempts outbox queue in state machine |
| FM-14 | DPDPA erasure | Staged idempotent erasure with per-table status log |
| FM-15 | DPDPA erasure | Device-side wipe via push command + pending_device_wipe state |
| FM-10 | Progress/streak | local_date field on check-in rows |
| FM-12 | Push notifications | Idempotency key before FCM/APNs call |
| FM-8 | Check-in read | Offline fallback to safe default state |

---

### ADR-009 — apps/web Role and Dual-Role RLS Posture (Status: Accepted)

See Starter Template Evaluation section above.

---

### ADR-RN-VERSION — React Native / Expo SDK Version Pin (Status: Accepted)

**Decision:** Expo SDK 54 / React Native 0.81 / Expo Router v4. React Native version is Expo-managed — no independent `react-native` overrides permitted.

| Component | Version | Pin strategy |
|-----------|---------|--------------|
| React Native | `0.81` | Expo SDK 54 managed — do not upgrade independently |
| Expo SDK | `54` | Pinned; upgrade only as a coordinated stack bump |
| Expo Router | `v4` | Tied to Expo SDK 54 |
| NativeWind | `5.0.0-preview.3` | Pre-release; exact version pin (`no ^`) |
| PowerSync SDK | `@powersync/react-native@1.34.0` | Exact version pin (`no ^`) |
| Node runtime | `20+` | LTS minimum |

**Rationale:** NativeWind v5 preview, PowerSync 1.34.0, and MMKV's New Architecture requirement are all verified against RN 0.81 / Expo SDK 54. NativeWind and PowerSync are exact-pinned because pre-release patch bumps and SQLite schema changes respectively make `^` unsafe. Expo manages the RN version — coordinated stack bumps only.

See `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` for full upgrade policy and consequences.

---

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified: 7
Naming, structure, data transform, error handling, dates, loading states, event naming

---

### Naming Patterns

**Database (snake_case throughout):**
- Tables: plural snake_case — suds_logs, erp_sessions, check_ins, erasure_jobs, notifications_sent, device_tokens, therapist_patient
- Columns: snake_case — user_id, inserted_at, local_date, suds_score
- Foreign keys: {singular_table}_id — user_id, session_id, hierarchy_id
- Indexes: idx_{table}_{columns} — idx_suds_logs_user_id_inserted_at

**TypeScript code:**
- Variables/functions: camelCase — userId, getSudsScore, calculateStreak
- Types/Interfaces: PascalCase — SUDScore, ERPSession, CheckInResult, SyncAdapter
- Enums: PascalCase name, camelCase values — SessionStatus.inProgress
- Constants: SCREAMING_SNAKE_CASE — MAX_SUDS_VALUE, CRISIS_THRESHOLD
- Non-component files: kebab-case — session-state-machine.ts, crisis-detection.ts
- React component files: PascalCase — SUDSlider.tsx, ExposureHierarchy.tsx
- Hook files: camelCase — useSessionState.ts, useSyncStatus.ts

**ESLint enforcement:** `@typescript-eslint/naming-convention` with file-level matchers for hooks/components. Convention alone is insufficient — monorepo builds fail subtly on wrong casing.

**packages/supabase transform rule (CRITICAL):**
Bidirectional — snake_case→camelCase on all PostgREST query results; camelCase→snake_case on all PostgREST write inputs. Both directions owned exclusively by packages/supabase. Generated DB types (database.types.ts) never imported outside packages/supabase.

**New entity transform checklist** (one new DB entity = update all 4):
1. `packages/supabase/src/database.types.ts` (generated)
2. `packages/supabase/src/mappers/{entity}.mapper.ts` (transform)
3. `packages/core/src/types/{entity}.ts` (domain type)
4. `packages/supabase/__tests__/mappers/{entity}.mapper.test.ts` (round-trip test)

Round-trip test requirement: read→transform→write→read must return identical camelCase shape.

Anti-pattern: importing database.types.ts from apps/mobile or packages/core — precommit hook blocks this:
`grep -r "from.*database.types" packages/core` fails build.

---

### Structure Patterns

**Test co-location:**
- packages/core: co-located .test.ts alongside source files
- packages/core/__tests__/integration/: cross-module integration tests only
- packages/supabase/__tests__/rls/: RLS integration tests (Vitest + local Supabase)
- packages/ui/__tests__/: RTL and interaction tests
- apps/mobile: co-located .test.tsx for component tests

**packages/core internal structure:**
```
packages/core/src/
  types/       — domain types (Hierarchy, ExposureItem, SUDScore)
  erp/         — ERP protocol group: hierarchy, session state machine, SUDS calculation, debrief
  crisis/      — crisis detection algorithm + tests (co-located)
  checkin/     — check-in routing state machine + tests (co-located)
  progress/    — streak and progress calculations + tests (co-located)
  validation/  — hierarchy validation rules + tests (co-located)
  crypto/      — AES-256 utilities + tests (co-located)
  consent/     — DPDPA consent record builder
  analytics/   — event schema definitions (no PHI)
```

Unit tests are co-located as `{file}.test.ts` alongside each source file. `__tests__/integration/` is for cross-module integration tests only.

**apps/mobile screen structure (Expo Router file-based):**
```
apps/mobile/app/
  (auth)/         — sign-in, sign-up, onboarding
  (app)/
    index.tsx     — daily check-in / home
    session/      — ERP session flow
    hierarchy/    — hierarchy builder
    progress/     — streaks and progress
    settings/     — consent, preferences, account
  _layout.tsx
```

**Prohibited imports (ESLint + precommit):**
- packages/core: no react-native, expo-*, or @supabase/* imports
- database.types.ts: not imported outside packages/supabase
- apps/web: no @supabase/supabase-js (ADR-009 CI gate)

---

### Format Patterns

**Dates (two conventions, never mixed):**
- Supabase storage: ISO 8601 UTC — TIMESTAMPTZ (inserted_at)
- Calendar dates: 'YYYY-MM-DD' string in local_date column — device-reported, never server-computed
- Server guard: CHECK (local_date <= CURRENT_DATE + INTERVAL '1 day') — one day tolerance for timezone variance. Note: constraint is timezone-naive server-side; TZ handling strategy must be documented before enabling multi-timezone users.
- TypeScript: strings internally; Date objects only at UI display layer

**Error handling — Result type:**
```typescript
type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

type AppError = {
  code: string
  message: string
  context?: {
    failedField?: string
    retryCount?: number
    [key: string]: string | number | undefined  // scalar values only — no objects, no functions
  }
}
```
All packages/core domain functions return Result — never throw. apps/mobile catches at the boundary. AppError context is audited quarterly for PII leakage.

**API responses (via packages/supabase):**
- Success: typed camelCase value directly — no wrapper
- Error: throw typed SupabaseError (extends Error, includes code field)

**Analytics event schema:**
```typescript
{
  eventType: string,   // domain.verb — 'session.completed'
  sessionId: string,   // generated on session.started, disposed on session.completed or session.abandoned
  timestamp: string,   // ISO 8601 UTC
  // NO userId, NO therapy content
}
```

---

### Communication Patterns

**State machine events (packages/core):**
- Naming: domain.verb past tense — session.started, session.completed, crisis.detected, checkin.submitted
- Payload: sessionId (ephemeral, per ERP session) + timestamp. Never userId or PII.

**Crisis interrupt — SyncMode state machine:**
```typescript
enum SyncMode {
  NORMAL,
  CRISIS_PAUSED,       // no new enqueues accepted
  CRISIS_WRITE_WINDOW  // in-flight write completing; UI not yet shown
}
```
Transition: NORMAL → CRISIS_PAUSED (immediate on detection) → CRISIS_WRITE_WINDOW (in-flight write drains) → crisis UI rendered. SyncAdapter in apps/mobile is the single owner of SyncMode state.

**SyncAdapter boundary:** Only apps/mobile calls SyncAdapter — never packages/core.

**Consent middleware:** Consent state consumed from packages/supabase helpers only — never app-local state.

---

### Process Patterns

**Loading states:** Per-component local state. PowerSync usePowerSync hook for sync status — never duplicated in component state. No loading skeleton for cached PowerSync data.

**Error recovery:** Network errors — silent retry via PowerSync. Domain errors — actionable plain-language message; never raw error strings. Crisis — no error state; always succeeds on-device.

**Logging:** packages/core: no console.log — return Result. Any field sourced from packages/core domain types is health-adjacent — never log. Production: debug logging stripped at build time.

---

### All AI Agents MUST:
- Import packages/core types — never database.types.ts
- Return Result<T> from all packages/core domain functions
- Use local_date for calendar/streak logic, inserted_at for ordering
- Call SyncAdapter only from apps/mobile
- Check consent via packages/supabase helpers before any data write
- Name events as domain.verb past tense
- Follow SyncMode transitions for crisis interrupt

### All AI Agents MUST NOT:
- Import react-native or expo-* from packages/core
- Log any field sourced from packages/core domain types
- Use AsyncStorage for state covered by MMKV or PowerSync
- Create a new SQLite instance
- Add @supabase/supabase-js to apps/web
- Put objects or functions in AppError.context

---

### API Naming Patterns

**Edge Functions (custom-named — not auto-derived like PostgREST):**
- Path: verb-first kebab-case — `send-push-notification`, `export-user-data`, `erase-user-data`
- Request body fields: camelCase — `{ userId, sessionId }`
- Response body fields: camelCase — `{ exportUrl, createdAt }`
- All Edge Function calls made exclusively from `packages/supabase` — never from `apps/mobile` or `apps/web` directly

**SQL function names (internal Supabase):**
- snake_case, consistent with DB convention — `calculate_streak`, `get_user_exposure_hierarchy`
- Never exposed to TypeScript directly — always wrapped by `packages/supabase`

---

### State Management Patterns

**Local UI state (transient: form values, validation errors, loading flags, modal visibility):**
- `useState` — any value that transitions independently: modal visibility, single toggle, transient UI flag
- `useReducer` — multi-step product flows where two or more values must stay consistent: ERP session, onboarding, hierarchy builder
- Decision boundary: if the reducer's state object must serialize to MMKV for crash recovery, use `useReducer`; a bag of `useState` calls does not serialize cleanly
- Zustand: not introduced; revisit only when a concrete cross-component sharing problem exists that `useReducer` + React context cannot solve

**Reducer extraction rule:** Any `useReducer` that grows beyond trivial complexity must have its reducer function extracted to `packages/core` — keeps clinical state testable with Vitest, consistent with ADR-001.

**Derived state (PowerSync data requiring transformation):**
- PowerSync query lives in a custom hook in `apps/mobile`
- Derivation logic lives in `packages/core` as a pure function — testable with Vitest using a plain array, no device required
- Hook composes them: query → raw data → `packages/core` function → return result
- `useMemo` is an implementation detail of the hook, not the primary strategy
- Hook naming: `useCheckInStatus()`, `useCurrentStreak()` — symmetric with core functions `deriveCheckInStatus()`, `calculateStreak()`

---

### Validation Patterns

**Authority:** `packages/core` is authoritative. DB constraints (CHECK, NOT NULL) duplicate core rules as a safety net — they do not define what is valid. PostgREST rejections are anomalies, not the primary enforcement path. Required for offline-first correctness (core runs on-device, always available).

**Validation functions:** live in `packages/core/src/validation/`. Return `Result<T, ValidationError[]>`. Called by both the UI layer and the `packages/supabase` write path.

**UI validation timing:**
- Multi-step flows (ERP session, onboarding, hierarchy builder): silent until first submit attempt, then live on blur
  - `hasAttemptedSubmit: boolean` is a required field in `useReducer` state for all multi-step flows
  - Validation fires on blur only when `hasAttemptedSubmit === true`
- Exception: SUDS score inputs during an active session validate on blur immediately — single-field, in-the-moment capture; immediate feedback is clarifying, not aversive
- Single-screen flows (daily check-in, settings): on blur

**Layer disagreement handling (PostgREST constraint violation after offline sync):**
- `packages/supabase/src/errors.ts` maps known PostgreSQL error codes to typed `AppError` variants
- Every new DB constraint ships with a corresponding entry in `errors.ts` + fixture test in `packages/supabase/__tests__/errors.test.ts` — CI fails if missing
- Recoverable with user action (e.g. duplicate name not caught offline): inline message in the context of the field — never a toast or modal
- Not recoverable with user action (transient sync failure): optimistic UI stays; async non-blocking notification only — never "Error", never red
- Sync failures must be transactional — all-or-nothing per session record (DPDPA data integrity requirement)
- Failed outbox writes must be logged with timestamp and session ID — silent discard is a compliance event

---

### Auth Flow Patterns

**Auth state at runtime (5a):**
- Cold start: read `{ userId, accessToken, expiresAt }` from MMKV synchronously (ADR-004 startup sequence)
- Runtime: `onAuthStateChange` listener (owned by `packages/supabase`) is the correction layer — on each event, write updated state to MMKV atomically, then dispatch to React context
- Rule: after cold start, read auth state from context only — never read MMKV for auth again until the next cold start
- `packages/supabase` instantiates the Supabase client and owns the listener; auth context provider lives in `apps/mobile`

**Auth recheck during runtime (5b):**
- `AppState` change to `active` → call `supabase.auth.getSession()` in the root layout's `useEffect`
- Rationale: OS can suspend the app long enough for a token to expire while backgrounded; the listener does not fire for time passing, only for Supabase-initiated events
- If session expired: listener fires with `SIGNED_OUT` event; root layout routes to `(auth)/`
- PowerSync resync shares this same foreground trigger

**Screen access to auth identity (5c):**
- All screen components call `useAuth()` — never `supabase.auth.getUser()` directly
- `useAuth()` exported from `packages/supabase/src/hooks/useAuth.ts`; returns a typed `AuthState` object (not the raw Supabase session)
- `(app)/_layout.tsx` is the sole enforcement point — checks `userId` and redirects to `(auth)/` if absent
- Screens trust the layout gate; they consume `userId` from `useAuth()` without re-validating

---

### Pattern Enforcement

**Violation documentation:**
Approved exceptions are recorded in the `## Approved Exceptions` table at the end of this document. Format per row: exception (what was allowed), location (file/package), rationale, sunset condition. An agent reading this document must check that table before concluding a prohibited pattern applies to their case.

**Pattern update process:**
Any change to an implementation pattern requires a single PR that updates both: (1) the relevant section in this document, and (2) the corresponding ESLint rule or precommit hook. Both must change together — a pattern described in the doc but not enforced by tooling, or enforced by tooling but not described in the doc, is a broken contract.

**Pattern health signal:**
If any single rule accumulates more than 3 approved exceptions, that is a signal the rule needs revision under the update process above — not more exceptions.

---

### Concrete Examples

Examples are ordered in implementation sequence: entity → state → derived state → auth access → validation → data layer → sync → error handling.

**Example 1 — New entity (CheckIn): all 4 required files**

```typescript
// 1. packages/core/src/types/checkIn.ts — domain type (camelCase, zero Supabase deps)
export type CheckIn = {
  id: string
  userId: string
  localDate: string           // 'YYYY-MM-DD', device-reported
  completedAt: string         // ISO 8601 UTC
  routingResult: CheckInRoutingResult
}

// 2. packages/supabase/src/mappers/checkIn.mapper.ts — bidirectional transform
import type { Database } from '../database.types'
import type { CheckIn } from '@exposure-buddy/core'

type Row = Database['public']['Tables']['check_ins']['Row']

export function toCheckIn(row: Row): CheckIn {
  return {
    id: row.id,
    userId: row.user_id,
    localDate: row.local_date,
    completedAt: row.completed_at,
    routingResult: row.routing_result as CheckInRoutingResult,
  }
}

export function fromCheckIn(checkIn: CheckIn): Omit<Row, 'inserted_at'> {
  return {
    id: checkIn.id,
    user_id: checkIn.userId,
    local_date: checkIn.localDate,
    completed_at: checkIn.completedAt,
    routing_result: checkIn.routingResult,
  }
}

// 3. packages/supabase/src/database.types.ts — generated, never hand-edited
// Run: supabase gen types typescript --local > packages/supabase/src/database.types.ts

// 4. packages/supabase/__tests__/mappers/checkIn.mapper.test.ts — round-trip test
it('round-trips CheckIn without data loss', () => {
  const original: CheckIn = { id: 'abc', userId: 'u1', localDate: '2026-05-08', completedAt: '...', routingResult: 'session' }
  expect(toCheckIn(fromCheckIn(original) as Row)).toEqual(original)
})
```

---

**Example 2 — useReducer for ERP session (multi-step flow)**

```typescript
// apps/mobile/app/(app)/session/_reducer.ts
type ERPSessionState = {
  currentStep: 'hierarchy' | 'exposure' | 'debrief'
  selectedItemId: string | null
  sudsLog: Array<{ timestamp: string; score: number }>
  hasAttemptedSubmit: boolean   // validation fires on blur only when true
  isPaused: boolean
}

type ERPSessionAction =
  | { type: 'ITEM_SELECTED'; itemId: string }
  | { type: 'SUDS_LOGGED'; score: number; timestamp: string }
  | { type: 'SESSION_PAUSED' }
  | { type: 'SESSION_RESUMED' }
  | { type: 'SUBMIT_ATTEMPTED' }

export function erpSessionReducer(
  state: ERPSessionState,
  action: ERPSessionAction,
): ERPSessionState {
  switch (action.type) {
    case 'SUDS_LOGGED':
      return { ...state, sudsLog: [...state.sudsLog, { timestamp: action.timestamp, score: action.score }] }
    case 'SESSION_PAUSED':
      return { ...state, isPaused: true }
    case 'SUBMIT_ATTEMPTED':
      return { ...state, hasAttemptedSubmit: true }
    default:
      return state
  }
}
// Reducer extracted to packages/core if it grows beyond trivial complexity
```

---

**Example 3 — Derived state hook**

```typescript
// apps/mobile/src/hooks/useCheckInStatus.ts
import { usePowerSync } from '@powersync/react-native'
import { useMemo } from 'react'
import { deriveCheckInStatus } from '@exposure-buddy/core'  // explicit import — never inline the logic here

const CHECK_IN_TODAY_QUERY = `SELECT * FROM check_ins WHERE local_date = ? LIMIT 1`

export function useCheckInStatus(today: string) {
  const db = usePowerSync()
  const results = db.useQuery(CHECK_IN_TODAY_QUERY, [today])
  return useMemo(() => deriveCheckInStatus(results.data ?? []), [results.data])
  // deriveCheckInStatus is tested in packages/core with a plain array — no hook, no device required
}
```

---

**Example 4 — useAuth() in a protected screen**

```typescript
// apps/mobile/app/(app)/session/index.tsx
import { useAuth } from '@exposure-buddy/supabase'
// ❌ never: import { supabase } from '@supabase/supabase-js'  — no supabase import in screen files

export default function SessionScreen() {
  const { userId } = useAuth()
  // userId is always defined here — (app)/_layout.tsx redirected to (auth)/ if absent
}
```

---

**Example 5 — Validation with hasAttemptedSubmit**

```typescript
// apps/mobile/app/(app)/hierarchy/HierarchyItemForm.tsx
import { validateHierarchyItem } from '@exposure-buddy/core'

function HierarchyItemField({ state, dispatch, value, onChange }) {
  // Silent until first submit attempt; live on blur thereafter
  const error = state.hasAttemptedSubmit
    ? validateHierarchyItem({ name: value })
    : null

  return (
    <>
      <TextInput value={value} onChangeText={onChange} />
      {!error.ok && <Text>{error.error[0].message}</Text>}
    </>
  )
}
```

---

**Example 6 — Edge Function call from packages/supabase**

```typescript
// packages/supabase/src/functions/notifications.ts
import { supabase } from '../client'
import { mapFunctionError } from '../errors'

export async function sendPushNotification(params: {
  userId: string          // camelCase request body — always
  notificationType: string
}): Promise<void> {
  const { error } = await supabase.functions.invoke('send-push-notification', {
    body: params,
  })
  if (error) throw mapFunctionError(error)
}

// apps/mobile usage:
// import { sendPushNotification } from '@exposure-buddy/supabase'
// never: supabase.functions.invoke(...) from apps/mobile directly
```

---

**Example 7 — PowerSync offline write (writes do not fail offline)**

```typescript
// apps/mobile/src/sync/sudsWriter.ts
async function logSudsScore(db: PowerSyncDatabase, entry: SudsEntry) {
  await db.execute(
    'INSERT INTO suds_logs (id, user_id, suds_score, local_date) VALUES (?, ?, ?, ?)',
    [entry.id, entry.userId, entry.score, entry.localDate]
  )
  // ✅ returns immediately whether online or offline
  // PowerSync outbox queues the write and flushes to Supabase on reconnect
  // ❌ do NOT await a network confirmation or treat a missing network as an error
}
```

---

**Example 8 — SyncMode crisis interrupt (ordered transitions)**

```typescript
// apps/mobile/src/sync/SyncAdapter.ts
// Crisis interrupt always preempts the outbox queue

function onCrisisDetected() {
  setSyncMode(SyncMode.CRISIS_PAUSED)          // 1. no new enqueues accepted immediately
  waitForInflightWrite().then(() => {
    setSyncMode(SyncMode.CRISIS_WRITE_WINDOW)  // 2. in-flight write draining
    renderCrisisUI()                           // 3. crisis UI shown
  })
}
// Transition order is invariant: NORMAL → CRISIS_PAUSED → CRISIS_WRITE_WINDOW → crisis UI
// SyncAdapter in apps/mobile is the sole owner of SyncMode state
```

---

**Example 9 — AppError display cycle (PostgREST error → typed AppError → screen)**

```typescript
// packages/supabase/src/errors.ts
export function mapPostgRESTError(raw: { code: string }): AppError {
  switch (raw.code) {
    case '23514': return { code: 'CONSTRAINT_VIOLATION', message: 'Invalid value', context: {} }
    case '23502': return { code: 'NULL_VIOLATION', message: 'Required field missing', context: {} }
    default:      return { code: 'UNKNOWN_DB_ERROR', message: 'Something went wrong', context: {} }
  }
}
// packages/supabase/__tests__/errors.test.ts must cover every known PG code above

// apps/mobile/src/hooks/useSubmitCheckIn.ts
export function useSubmitCheckIn() {
  const [error, setError] = useState<AppError | null>(null)
  async function submit(data: CheckInInput) {
    const result = await submitCheckIn(data)  // packages/supabase returns Result<T, AppError>
    if (!result.ok) setError(result.error)    // typed — never parse raw error strings
  }
  return { submit, error }
}

// Screen reads typed fields — never switches on raw message strings
{error?.code === 'CONSTRAINT_VIOLATION' && <ErrorText>{error.message}</ErrorText>}
```

---

### Anti-Patterns

**8a — Importing database.types.ts outside packages/supabase**

```typescript
// ❌ packages/core/src/session/session-state-machine.ts
import type { Database } from '../../packages/supabase/src/database.types'
// Precommit fails: grep -r "from.*database.types" packages/core → MATCH — build blocked

// ✅ correct — import the domain type from packages/core
import type { ERPSession } from '../types/erpSession'
```

**8b — Calling supabase.auth.getUser() in a screen component**

```typescript
// ❌ apps/mobile/app/(app)/session/index.tsx
const { data: { user } } = await supabase.auth.getUser()  // network call in component, bypasses context

// ✅ correct — read from context via hook, zero network call
import { useAuth } from '@exposure-buddy/supabase'
const { userId } = useAuth()
```

---

## Approved Exceptions

Pattern exceptions approved for this project. Each row records a bounded, time-limited deviation from a rule above. If any single rule accumulates more than 3 exceptions, the rule requires revision — not more exceptions.

| Exception | Location | Rationale | Sunset Condition |
|---|---|---|---|

---

## Project Structure & Boundaries

### Complete Project Directory Structure

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

### Requirements → Structure Mapping

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

### Package Import Boundaries

Each package may only import from packages listed in its **Allowed** column. Native npm modules (e.g. `react-native-mmkv`, PowerSync SDK) are direct dependencies of the package that needs them — they are not subject to this table. Violations of internal package imports fail CI lint.

| Package | Allowed to import | Forbidden |
|---|---|---|
| `packages/core` | _(none — zero internal deps)_ | All internal packages |
| `packages/ui` | `packages/core` (types only) | `packages/sync`, `packages/supabase`, RN platform APIs |
| `packages/supabase` | `packages/core` | `packages/sync`, `packages/ui` |
| `packages/sync` | `packages/core`, `packages/supabase/src/auth/session` (token reads only — no other supabase imports) | `packages/ui`, direct Supabase SQL, all other `packages/supabase` paths |
| `apps/mobile` | All four packages | Direct Supabase client (must go via `packages/supabase`); direct `PowerSyncDatabase.execute()` (must go via `packages/sync/src/adapter.ts`) |
| `apps/web` | `packages/core`, `packages/supabase`, `packages/ui` | `packages/sync` (web uses Supabase Realtime, not PowerSync) |

### Runtime Data Flow

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

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All 9 ADRs are mutually consistent. Turborepo + Expo SDK 54 + PowerSync `1.34.0` + Supabase + NativeWind `5.0.0-preview.3` form a coherent stack with no version conflicts. MMKV handles auth/navigation state; PowerSync SQLite handles all clinical structured data — no overlap, no memory budget conflict on the 2GB RAM target. Expo Router v4 file-based routing aligns with the screen structure defined in Implementation Patterns. TypeScript strict mode is enforced uniformly across all packages.

**Pattern Consistency:**
Naming conventions (snake_case DB, camelCase TS, PascalCase components, kebab-case non-component files) are consistent across the DB schema, mapper layer, and UI. The bidirectional snake_case↔camelCase transform is exclusively owned by `packages/supabase/src/mappers/` with a round-trip test requirement. Error handling uses `Result<T, AppError>` uniformly; PostgREST and Edge Function errors are handled by separate mappers. Date handling uses ISO 8601 UTC for storage and `local_date` string for calendar operations — no mixing. All patterns align with the chosen technology stack.

**Structure Alignment:**
`packages/core` internal structure matches the declared pattern (`erp/`, `crisis/`, `checkin/`, `progress/`, `validation/`, `crypto/`, `consent/`, `analytics/`, `types/`). Import boundaries are enforced by per-package ESLint configs and CI lint. The `supabase/functions/_shared/` layer prevents monorepo import escape in Deno. Runtime data flows (SUDS write, crisis interrupt, cold start auth) map correctly to the declared package boundaries.

---

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
All 14 functional areas mapped to specific file locations in the Requirements → Structure Mapping table. All 32 FRs are architecturally supported: ERP protocol (hierarchy, session, SUDS, debrief) via `packages/core/src/erp/` + Expo Router session routes; crisis safety via on-device `packages/core/src/crisis/` + safety card screen; DPDPA data rights via `packages/core/src/consent/` + Edge Functions + `settings/data-rights.tsx`; offline sync via `packages/sync/` PowerSync adapter.

**Non-Functional Requirements Coverage:**

| NFR | Requirement | Architectural Response |
|---|---|---|
| Performance — cold start | <3s | ADR-004: MMKV sync read + startup dependency graph; error-handler registered first |
| Performance — SUDS write | <500ms | PowerSync flush-before-ack + client-generated UUIDs (FM-2) |
| Performance — check-in route | <1s on 2GB/4G | PowerSync local SQLite read; offline fallback to safe default |
| Offline | Full ERP session offline | PowerSync durable outbox; crisis detection fully on-device |
| Offline | Zero data loss | Outbox-schema.ts validates before write + replay; PowerSync SQLite WAL |
| Security | AES-256 at rest | `packages/core/src/crypto/aes.ts` + Expo SecureStore key derivation (Android Keystore API 23+) |
| Security | TLS 1.3 in transit | Supabase default; enforced at infrastructure level |
| Security | RLS on all health tables | ADR-006 harness: 4 assertions per policy; `packages/supabase/__tests__/rls/harness/` |
| Compliance | DPDPA consent records (4 fields) | `packages/core/src/consent/dpdpa.ts` + `supabase/functions/consent-record/` |
| Compliance | DPO published before launch | Supabase Studio dashboard (restricted IAM role); go-live gate documented |
| Compliance | HIPAA/GDPR-compatible schema | UUID-only clinical↔identity linkage; audit trail via Edge Function; stub therapist_patient table |

---

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical technology choices carry pinned versions. All ADRs carry explicit rationale and consequence statements. Conflict prevention is documented at 3 layers: import boundary table (CI-enforced), pattern enforcement (architecture.md + `--no-new-rules` gate), and pre-commit hooks (database.types.ts import check).

**Structure Completeness:**
Full directory tree defined with file-level granularity across all packages and apps. All config files present (`vitest.config.ts`, `.eslintrc.js` per package, `i18n-lint.config.js`, `ci.yml` with dep audit). Integration points defined: 3 runtime data flows, package import boundaries with forbidden paths explicitly named. Requirements mapped to specific file paths.

**Pattern Completeness:**
15 potential AI agent conflict points identified and resolved across naming, structure, format, communication, and process categories. Concrete examples provided (9 correct + 2 anti-patterns). Approved exceptions table present. All critical paths have enforcement mechanisms (ESLint rules, precommit hooks, CI lint gates).

---

### Gap Analysis Results

**Critical Gaps:** None.

**Important Gaps:**

| Gap | Impact | Status |
|---|---|---|
| NativeWind `5.0.0-preview.3` is pre-release | API surface may change between preview bumps; breaking changes possible before stable | Accepted risk — version pinned exactly; review gate added to decisions |
| PowerSync DPA not yet signed | Blocks India launch (DPDPA §2(t)) | Tracked as compliance gate in ADR-008; parallel legal action item |
| Notifications delivery layer (FCM/APNs token management) | Location TBD — must resolve before FR-NOTx stories | Explicitly flagged in structure; not a blocker for non-notification stories |

**Nice-to-Have Gaps:**

| Gap | Notes |
|---|---|
| EAS Build env var schema not specified | Defer to Story 1 (EAS Build deliverable) |
| Supabase Postgres version not pinned | Managed by Supabase — not directly controllable |
| Detailed per-component memory budget | Defer to device profiling in sprint 1 |

---

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed — 23 cross-cutting concerns identified and documented
- [x] Scale and complexity assessed — 10 architectural components, 2GB RAM / Android 10+ / 4G envelope profiled
- [x] Technical constraints identified — DPDPA/HIPAA, AES-256, offline-first, RTL, MMKV/Expo SecureStore
- [x] Cross-cutting concerns mapped — offline state machine, consent middleware, analytics boundary, crisis detection, cold start sequencing, RLS test suite all addressed

**Architectural Decisions**

- [x] Critical decisions documented with versions — ADR-001–009 resolved; Expo SDK 54, RN 0.81, PowerSync 1.34.0, NativeWind 5.0.0-preview.3, Node 20+
- [x] Technology stack fully specified — all packages, tools, and versions recorded
- [x] Integration patterns defined — API boundary (packages/supabase sole Supabase call site), 3 runtime data flows, Edge Function wrapper pattern
- [x] Performance considerations addressed — ADR-004 cold start graph, PowerSync flush guarantee, SUDS idempotency, local_date timezone handling

**Implementation Patterns**

- [x] Naming conventions established — DB (snake_case), TS (camelCase/PascalCase), files (kebab-case/PascalCase), enforced by ESLint
- [x] Structure patterns defined — packages/core internal structure, apps/mobile screen structure, test co-location rule
- [x] Communication patterns specified — event naming (domain.verb past tense), state management (useReducer for multi-step, useState for single-screen), auth flow (MMKV + onAuthStateChange)
- [x] Process patterns documented — error handling (Result<T, AppError>), loading states, validation timing (blur-after-first-submit), auth flow, concrete examples with anti-patterns

**Project Structure**

- [x] Complete directory structure defined — file-level granularity across all apps, packages, and supabase/ directory
- [x] Component boundaries established — import boundary table with CI enforcement, per-package .eslintrc.js
- [x] Integration points mapped — 3 runtime data flows; package boundary table with exact forbidden imports
- [x] Requirements to structure mapping complete — 16-row table covering all 14 FR areas with primary locations and supporting packages

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

All 16 checklist items confirmed. No critical gaps. Important gaps are either accepted risks with mitigations (NativeWind pre-release, version pinned) or parallel-track non-blockers (PowerSync DPA, notifications TBD).

**Confidence Level: High**

**Key Strengths:**
- Packages/core as a zero-dependency domain layer makes all clinical logic testable in Vitest without a device — highest-risk features (crisis detection, SUDS calculation, consent records) are testable in isolation
- Import boundary table enforced at CI removes entire classes of agent drift errors before they reach code review
- Three independent elicitation passes (failure mode analysis, pre-mortem, red team) hardened the structure with 15 concrete fixes before this validation
- Offline-first and DPDPA compliance are first-class architectural constraints, not retrofits — data flows and erasure paths are defined before a single story is written
- NativeWind pre-release risk is bounded: pinned to exact version with upgrade gate; if v5 stable ships, migration is a styling-layer change only

**Areas for Future Enhancement:**
- Notifications delivery layer — FCM/APNs token management and scheduling architecture (resolve before FR-NOTx sprint)
- Phase 2 activation gates — therapist_patient.enabled migration + DPO sign-off path + HIPAA §164.312(b) audit log story
- Supabase Realtime connection budget assessment — required if Phase 2 introduces live therapist-facing views
- Android OEM battery management telemetry — WorkManager graceful-breach behaviour validated by device profiling in sprint 1

---

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all ADR decisions exactly — no unilateral stack changes without an ADR update
- All Supabase calls go through `packages/supabase` only — never direct client calls from `apps/mobile`
- All durable writes go through `packages/sync/src/adapter.ts` — never direct `PowerSyncDatabase.execute()` from apps
- All consent writes go through `supabase/functions/consent-record` — only valid DPDPA audit trail path
- Unit tests co-located as `{file}.test.ts`; `__tests__/integration/` for cross-module tests only
- Named events from `@exposure-buddy/core/analytics/events` only — never pass raw domain objects to analytics facade
- `packages/core` must remain Node-runnable — no RN, Supabase, or MMKV imports even as devDeps

**UX-Derived Implementation Guidance (from UX Design Workflow — 2026-05-08):**

The following implementation constraints were established during UX design and must be
honoured in story-writing. They complement but do not override existing ADRs.

**Thread State Management:**
- Thread state is **local-first** (expo-sqlite via PowerSync). Supabase is sync target,
  not source of truth. Thread must be fully functional offline — the critical moments
  (pre-exposure, in-the-moment) occur when network reliability is worst.
- Sync aggressively on every state transition, not just on app close.
- Store `created_at` locally at thread creation; include in sync payload so Supabase
  honours the local timestamp, not the insertion timestamp (avoids clock skew on
  48hr expiry calculation).
- Run the 48hr expiry check at **prompt fire time**, not submission time. Once the
  reflection prompt surfaces, lock thread state locally until dismissed or submitted.
- **One active thread at a time (v1, soft-enforced).** Data model supports multiple
  threads; the constraint is UI policy. When a user starts prep with an open thread,
  surface: *"You still have [situation] in progress. Want to close that first, or
  start fresh?"* Relax this constraint only with user behaviour data.

**Thread Data Model (in `packages/core`):**
```typescript
type ThreadStatus =
  | 'preparing'
  | 'active'
  | 'pending_reflection'
  | 'completed'
  | 'expired';

interface ExposureThread {
  id: string;                    // uuid
  userId: string;
  situationId: string;           // FK to ladder item
  situationLabel: string;        // denormalized — ladder changes must not affect history
  status: ThreadStatus;
  createdAt: string;             // ISO timestamp, set locally
  activatedAt: string | null;    // when "I'm going now" fired
  reflectionPromptedAt: string | null;
  completedAt: string | null;
  expiresAt: string;             // createdAt + 48hrs, computed at creation
  predictionScore: number | null;
  realityScore: number | null;
  notes: string | null;
}
```

**Persistent Quick-Access Panel (navigation architecture):**
- Panel lives in `app/_layout.tsx` (root layout), not in any tab or stack layout.
  This guarantees it persists across all route changes without remounting.
- Panel communicates with screens via shared state (Zustand store at root level).
  Do NOT use route params for panel state.
- Panel has two UI states — **standby** (thread open, user hasn't gone yet) and
  **active** (user is mid-exposure). These are state machine values in the thread
  store, not route changes.
- Watch for conflicts with `KeyboardAvoidingView` and `SafeAreaView` on both
  platforms — test early. Consider expo-router's `<Slot />` pattern over raw
  absolute positioning for cleaner inset handling.
- In-the-moment components must be **pure React Native with no web polyfill
  dependencies**. The panel renders identically on airplane mode.

**First Implementation Priority:**

```bash
npx create-turbo@latest exposure-buddy --package-manager pnpm
```

Then: scaffold `packages/core`, `packages/sync` (PowerSync `1.34.0`), `packages/supabase`, `packages/ui` (NativeWind `5.0.0-preview.3`), configure EAS Build profiles — this is Story 1.
