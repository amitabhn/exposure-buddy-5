# Core Architectural Decisions

## ADR-001 — packages/core Boundary (Status: Accepted)

**Decision:** Full domain layer — Option C.

packages/core owns: domain types (Hierarchy, ExposureItem, SUDScore, CheckInResult), ERP session state machine, crypto module (AES-256), check-in routing state machine, SUDS threshold rules, crisis detection algorithm (not keyword list), progress/streak calculations, hierarchy validation rules.

**Rationale:** Clinical logic is the product's core value, not app-specific behaviour. Full domain layer maximises testability (Vitest, zero RN deps), prevents Phase 2 duplication, and makes crisis detection testable in isolation — critical for a safety feature. "Extract later" rarely happens cleanly on a health app with accumulated coupling.

**Consequence:** All clinical logic stories are scoped to packages/core first, consumed by apps/mobile. 80%+ of clinical logic testable in Vitest without a device.

---

## ADR-002 — Local State Management (Status: Resolved by PowerSync)

PowerSync owns the local SQLite store. WatermelonDB/Legend-State/Redux decision superseded.

---

## ADR-003 — Encrypted Local Storage (Status: Accepted)

**Decision:** MMKV + PowerSync's SQLite — no separate SQLCipher instance.

- MMKV: auth tokens, navigation state, user preferences, session recovery flag
- PowerSync SQLite: all clinical structured data (SUDS logs, ERP sessions, hierarchy)
- Encryption key: derived via Expo SecureStore (Android Keystore API 23+, iOS Keychain)
- iOS file protection: NSFileProtectionCompleteUntilFirstUserAuthentication (accessible after first unlock, background sync safe)
- No second SQLite instance — prevents memory budget conflict on 2GB RAM target device

---

## ADR-004 — Navigation Persistence + Session Recovery (Status: Accepted)

**Decision:** MMKV sync read for both navigation persistence and session recovery detection.

**Startup sequence (cold start dependency graph):**
1. MMKV key derivation (Expo SecureStore)
2. MMKV sync reads: [auth state] [session.inProgress] [last route]
3. PowerSync init (parallel to step 2 where possible)
4. Route decision: session recovery screen OR last route OR onboarding

**Session state machine:** Writes current state to MMKV at every transition (not only on SUDS log events). On cold start, session.inProgress: true routes to Resume / Discard screen before any other navigation.

**Rationale:** MMKV sync read adds zero latency to cold start path. AsyncStorage async gap conflicts with <3s cold start NFR on 2GB RAM device.

---

## ADR-005 — Offline Test Strategy (Status: Resolved by PowerSync)

PowerSync test patterns replace custom offline test strategy.

---

## ADR-006 — RLS Policy Test Harness (Status: Accepted)

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

## ADR-007 — Android Background Sync (Status: Resolved by PowerSync)

PowerSync handles WorkManager configuration + OEM battery management (MIUI, One UI, Realme UI) + graceful SLA-breach fallback behaviour.

---

## ADR-008 — Supabase API Layer (Status: Accepted)

### Data Flow Mapping

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

### Design Rules

**Notification Payload Rule:** All push notification payloads must be content-neutral — app name, badge count, or generic call-to-action only. No therapy-context, session state, or clinical content in the payload. All personalization rendered client-side from local PowerSync data after notification is tapped. FCM and APNs require DPA entries regardless of payload content.

**SUDS Write Idempotency:** All SUDS log inserts use client-generated UUIDs with ON CONFLICT DO NOTHING. PowerSync offline queue replay cannot produce duplicate SUDS entries. Canonical ordering column is server-side inserted_at (not client-supplied timestamp) — prevents clock skew corrupting streak calculations. Mandatory integration test: offline write → reconnect → assert single row in suds_logs.

**PowerSync Flush Guarantee:** Verify PowerSync SDK flushes queue entry to local SQLite before returning success to the UI layer. If not guaranteed by default, wrap every SUDS write in an explicit flush-before-ack call.

**Progress/Streak View:** SECURITY INVOKER (RLS enforced at querying user's privilege level). Streak calculation uses user-local local_date field on check-in rows (not UTC timestamp) — prevents timezone boundary false streak breaks. View logic kept thin for Phase 2 Edge Function replaceability.

**Check-In Offline Fallback:** Check-in read must degrade gracefully when offline — default to safe state ("not yet completed today") rather than error. Never cache check-in state across calendar days.

**Push Notification Idempotency:** Edge Function checks notifications_sent log table before calling FCM/APNs. Insert idempotency key before FCM call; skip if already present. FCM/APNs invalid-token responses trigger device_tokens status update; app refreshes token on next foreground.

**Crisis Detection Priority:** Crisis interrupt is a top-priority state machine transition in packages/core — preempts all other state mutations including the PowerSync outbox queue. Crisis detection accepts testMode: boolean flag — disabled in test environments, never in production builds.

**Staged Erasure:** DPDPA erasure runs as a staged, idempotent process. Each table erasure is an atomic transaction logged to erasure_jobs table with per-table status. Resume from last successful table on retry. Erasure flow includes push command to user's device triggering WIPE_LOCAL_DATA for PowerSync local SQLite. If device offline: job remains in pending_device_wipe state until next foreground.

**Realtime — Phase 1:** Not implemented. Revisit trigger: if Phase 2 introduces therapist-facing views or multi-device live sync, Realtime connection budget and RLS policy gaps must be assessed before implementation.

### Critical Failure Mode Preventions

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

## ADR-009 — apps/web Role and Dual-Role RLS Posture (Status: Accepted)

See Starter Template Evaluation section above.

---

## ADR-RN-VERSION — React Native / Expo SDK Version Pin (Status: Accepted)

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
