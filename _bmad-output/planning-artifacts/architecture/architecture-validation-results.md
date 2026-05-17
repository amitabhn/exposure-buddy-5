# Architecture Validation Results

## Coherence Validation ✅

**Decision Compatibility:**
All 9 ADRs are mutually consistent. Turborepo + Expo SDK 54 + PowerSync `1.34.0` + Supabase + NativeWind `5.0.0-preview.3` form a coherent stack with no version conflicts. MMKV handles auth/navigation state; PowerSync SQLite handles all clinical structured data — no overlap, no memory budget conflict on the 2GB RAM target. Expo Router v4 file-based routing aligns with the screen structure defined in Implementation Patterns. TypeScript strict mode is enforced uniformly across all packages.

**Pattern Consistency:**
Naming conventions (snake_case DB, camelCase TS, PascalCase components, kebab-case non-component files) are consistent across the DB schema, mapper layer, and UI. The bidirectional snake_case↔camelCase transform is exclusively owned by `packages/supabase/src/mappers/` with a round-trip test requirement. Error handling uses `Result<T, AppError>` uniformly; PostgREST and Edge Function errors are handled by separate mappers. Date handling uses ISO 8601 UTC for storage and `local_date` string for calendar operations — no mixing. All patterns align with the chosen technology stack.

**Structure Alignment:**
`packages/core` internal structure matches the declared pattern (`erp/`, `crisis/`, `checkin/`, `progress/`, `validation/`, `crypto/`, `consent/`, `analytics/`, `types/`). Import boundaries are enforced by per-package ESLint configs and CI lint. The `supabase/functions/_shared/` layer prevents monorepo import escape in Deno. Runtime data flows (SUDS write, crisis interrupt, cold start auth) map correctly to the declared package boundaries.

---

## Requirements Coverage Validation ✅

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

## Implementation Readiness Validation ✅

**Decision Completeness:**
All critical technology choices carry pinned versions. All ADRs carry explicit rationale and consequence statements. Conflict prevention is documented at 3 layers: import boundary table (CI-enforced), pattern enforcement (architecture.md + `--no-new-rules` gate), and pre-commit hooks (database.types.ts import check).

**Structure Completeness:**
Full directory tree defined with file-level granularity across all packages and apps. All config files present (`vitest.config.ts`, `.eslintrc.js` per package, `i18n-lint.config.js`, `ci.yml` with dep audit). Integration points defined: 3 runtime data flows, package import boundaries with forbidden paths explicitly named. Requirements mapped to specific file paths.

**Pattern Completeness:**
15 potential AI agent conflict points identified and resolved across naming, structure, format, communication, and process categories. Concrete examples provided (9 correct + 2 anti-patterns). Approved exceptions table present. All critical paths have enforcement mechanisms (ESLint rules, precommit hooks, CI lint gates).

---

## Gap Analysis Results

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

## Architecture Completeness Checklist

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

## Architecture Readiness Assessment

**Overall Status: ARCHITECTURE COMPLETE — INDIA LAUNCH BLOCKED**

| Dimension | Status |
|---|---|
| Architecture decisions | ✅ Complete — all 10 ADRs accepted (see ADR Resolution Registry above) |
| Story-writing readiness | ✅ Unblocked — epics and stories can be written |
| India launch | ⛔ Blocked — four pre-conditions must be satisfied before first user data is processed |
| Implementation start | ✅ Unblocked for Stories 1–N that do not require India launch clearance |

**India Launch Pre-conditions (hard blockers — not parallel-track):**
1. **PowerSync DPA** — signed Data Processing Agreement covering health data transit through PowerSync infrastructure (DPDPA §2(t))
2. **DPDPA consent schema implemented** — `consent_records` + `user_consent_status` tables live with `policy_version`, `locale`, `consent_mechanism` fields; `packages/core/src/consent/dpdpa.ts` types deployed
3. **DPO interface live** — three Supabase Edge Functions (`/dpo/erase-user`, `/dpo/export-user`, `/dpo/audit-log`) + `dpo_audit_log` table + HTML operator panel deployed and tested
4. **Four pending ADRs written** — ADR-ZUSTAND-PANEL, ADR-AUTH-TOKEN-PROVIDER, ADR-NOTIFICATIONS, ADR-DPO-INTERFACE must be formalised before the stories that depend on them are estimated

**Story 1 Pre-conditions (hard blockers for project initialisation):**
- Firebase project created, `google-services.json` in repo, Android package name locked
- Notification channel taxonomy defined (`crisis-alerts`, `reminders`, `check-ins`)
- `eas.json` profiles configured (development/preview/production)

**Confidence Level: High**

**Key Strengths:**
- packages/core as a zero-dependency domain layer makes all clinical logic testable in Vitest without a device — crisis detection, SUDS calculation, consent records, crisis port interface all testable in isolation
- Import boundary table enforced at CI removes entire classes of coupling errors before code review; sibling package imports explicitly prohibited (packages/sync ↔ packages/supabase cross-import resolved via AuthTokenProvider in packages/core)
- Three independent elicitation passes + 15-finding adversarial review hardened the structure before story-writing
- Offline-first and DPDPA compliance are first-class constraints: data flows, consent gate, erasure paths, and DPO interface all defined before a single story is written
- NativeWind pre-release risk bounded: exact pin with upgrade gate

**Resolved by adversarial review (not present in original architecture):**
- SUDS write / consent-record separation: consent gate in packages/core session machine; packages/sync consent-oblivious
- Crisis detection → SyncMode: CrisisPort interface in packages/core/src/ports/crisis-port.ts; apps/mobile is composition root
- DPO interface: three Edge Functions + HTML panel replaces Supabase Studio
- Analytics: deferred to Phase 2; all candidate Phase 1 events are clinical session data — zero analytics writes at MVP
- ExposureThread.situationLabel conflict policy: label_updated_at + label_updated_by_user_id + situation_label_history stub + therapist_patient.conflict_policy column; therapist_wins / flag_for_review gate enforced in code before therapist_patient.enabled can be activated

**Phase 2 activation gates (not MVP blockers):**
- therapist_patient.enabled: requires conflict_policy ≠ last_write_wins + situation_label_history writes active + conflict resolution UI QA'd
- Supabase Realtime: connection budget assessment required before any live therapist-facing views
- Analytics: two-key sign-off (lead clinician + data controller) before any event_name added to analytics_events

---

## Implementation Handoff

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
