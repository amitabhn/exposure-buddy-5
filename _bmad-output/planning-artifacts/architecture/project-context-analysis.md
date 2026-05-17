# Project Context Analysis

## Requirements Overview

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

## Technical Constraints & Dependencies

- React Native (Android-primary, iOS 16+) + React web (last 2 major Chrome/Firefox/Safari)
- Supabase backend (PostgreSQL + RLS + Auth + Realtime)
- Mid-range Android target: 2GB RAM, Android 10+, 4G with intermittent drops
- No health data to any third-party analytics, advertising, or data-broker service
- DPDPA 2023 mandatory before India go-live; HIPAA/GDPR-compatible schema mandatory at MVP
- Crisis keyword list embedded in client binary; updated via app release cycle only
- All UI strings externalised; RTL layout support from day one even with no RTL launch locale
- Monorepo with shared `packages/core` (pure TypeScript, zero framework deps) to prevent logic duplication across RN and web surfaces

## Cross-Cutting Concerns Identified

### Data & Compliance Concerns

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

### System & Operational Concerns

11. **Runtime memory/CPU envelope** *(surfaced: Party Mode — Winston)* — SQLCipher/MMKV, durable outbox, offline state machine, session timer, and RN bridge all compete for the 2GB RAM budget on the target device; component-level memory analysis required before finalising the encryption and sync approach; target device profiling must precede component design, not follow it

12. **RN ↔ Web surface parity and role model** *(surfaced: Party Mode — Winston)* — the web surface may serve clinicians (Phase 2) rather than patients, implying a different RLS pattern, consent flow, and data access model; this must be decided before schema design; not a styling concern — a data boundary concern

13. **Android OEM background execution variance** *(surfaced: Party Mode — Winston)* — MIUI, One UI, and Realme UI aggressively kill background processes; WorkManager deferred job execution on Indian-market OEMs cannot guarantee the 30s sync SLA; the architecture must define graceful SLA-breach behaviour (user notification, next-foreground sync fallback) rather than assuming OS compliance

14. **Cold start sequencing as a gated concern** *(surfaced: Party Mode — Winston)* — SQLCipher/MMKV key derivation, outbox queue replay, and offline state machine init all run on the startup path; without a named startup dependency graph with enforced sequencing, the <3s cold start budget will be consumed by death-by-a-thousand-milliseconds as each team ships their own init independently

15. **Consent revocation state machine** *(surfaced: Party Mode — Winston)* — consent architecture must model grant and revocation; revocation must propagate to queued outbox events, third-party deletion APIs, and the local store; backend must handle retroactive suppression of rows collected under a now-revoked purpose

16. **Client-server API versioning under rolling mobile upgrades** *(surfaced: Party Mode — Winston)* — at any post-launch moment, users on v1.0 and v1.2 run against the same Supabase backend; outbox written by v1.0 must be processable by v1.2 backend; RLS policies and API contracts must be backward-compatible under version skew; Supabase does not provide API versioning by default

17. **Crisis flow degradation contract** *(surfaced: Party Mode — Winston)* — explicit documented behaviour required for each crisis sub-path under offline, partial connectivity, and full connectivity conditions; undefined behaviour during crisis is a healthcare liability; hardcoded phone contacts work offline; digital escalation paths (Phase 2) are connectivity-dependent and must degrade gracefully

18. **Database connection budget** *(surfaced: Party Mode — Winston)* — at 10,000 concurrent users, PostgreSQL connection pooling via PgBouncer is a hard constraint; Supabase Realtime subscriptions hold persistent connections; the API layer design (PostgREST vs Edge Functions vs Realtime) must account for connection budget, not treat it as a deployment detail

### Schema & Data Model Concerns

19. **User Data Map as schema artifact** *(surfaced: Party Mode — Mary)* — every Supabase table tagged with: data category, retention period, erasure cascade behaviour, and portability export inclusion; DPDPA §11-13 data principal rights (access, correction, erasure, portability) require that every personal data row be attributable to a `user_id` with cascade-delete semantics; personal data must not appear as a natural key in any junction table

20. **HIPAA pseudonymisation and audit logging from day one** *(surfaced: Party Mode — Mary)* — clinical layer (SUDS, hierarchy, journal, session logs) must link to identity layer exclusively via internal UUIDs, never via PII columns; HIPAA §164.312(b) requires an access audit trail for every PHI read — RLS enforcement alone is insufficient; building this retroactively with real user data in production is a painful migration

21. **Therapist-patient relationship table stub** *(surfaced: Party Mode — Mary)* — Phase 2 introduces a therapist accessing patient data under a different RLS pattern; if RLS is written with `auth.uid() = user_id` assumptions only, every policy requires rewriting at Phase 2; add a stub `therapist_patient` relationship table today so RLS policies are extensible without a full schema rewrite

22. **DPO operational interface as go-live dependency** *(surfaced: Party Mode — Mary)* — a DPO responding to DPDPA §11-13 data principal rights requests (48-hour acknowledgment SLA) via ad-hoc engineering support is not sustainable; a minimum viable Data Governance Admin Panel (user lookup by ID, export trigger, erasure trigger, consent audit view) is a go-live dependency, not a Phase 3 feature

23. **SDK dependency audit gate in CI/CD** *(surfaced: Party Mode — Mary)* — the "zero third-party health data transmission" privacy moat is independently auditable via Exodus Privacy, mitmproxy, and App Store privacy label audits; a CI gate that flags new dependencies and requires explicit sign-off on transmitted data categories is a recurring architectural control, not a one-time audit

## Architecture Gaps Requiring Decisions Before Story-Writing

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
