---
stepsCompleted: ["step-01-document-discovery", "step-02-prd-analysis", "step-03-epic-coverage-validation", "step-04-ux-alignment", "step-05-epic-quality-review", "step-06-final-assessment"]
documentsIncluded:
  prd: "_bmad-output/planning-artifacts/prd.md"
  architecture: "_bmad-output/planning-artifacts/architecture/ (sharded — 7 sections + index)"
  epics: "_bmad-output/planning-artifacts/epics.md"
  ux: "_bmad-output/planning-artifacts/ux-design-specification/ (sharded — 13 sections + index)"
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-17
**Project:** exposure-buddy

---

## PRD Analysis

### Functional Requirements (from PRD)

| ID | Area | Summary |
|---|---|---|
| FR-AUTH-01 | Auth | Email/phone OTP |
| FR-AUTH-02 | Auth | Logged-out preview challenges (3); progress not persisted unless account created |
| FR-SAFE-01 | Sign-up | Two mandatory checkboxes (18+ and medico-legal disclaimer) |
| FR-ONBOARD-01 | Onboarding | 17-item SPIN questionnaire; referral screen at ≥40 |
| FR-ONBOARD-02 | Onboarding | Symptom check (3–4 Q) + 15-item safety behaviour checklist |
| FR-ONBOARD-03 | Onboarding | Inline psychoeducation before first exposure; avoidance explainer at safety behaviour selection |
| FR-GATE-01 | Readiness Gate | Hierarchy locked until ≥1 thought record OR somatic session completed |
| FR-HIER-01 | Hierarchy | Template-based hierarchy builder; SUDS 0–10 per item |
| FR-HIER-02 | Hierarchy | Custom items with same SUDS + stall tracking |
| FR-HIER-03 | Hierarchy | Stall logic: 2 stalled sessions → step-down prompt |
| FR-ERP-01 | ERP Session | Three sequential phases; no skip/reorder |
| FR-ERP-02 | ERP Session | Self-initiated SUDS logging during active phase |
| FR-ERP-03 | ERP Session | Debrief with SUDS arc graph + structured reflection |
| FR-ERP-04 | ERP Session | Abort logged without negative framing; all SUDS entries retained |
| FR-CBT-01 | CBT | Thought record — 6 fields in sequence |
| FR-CBT-02 | CBT | Cognitive distortion library; tagging on thought record |
| FR-CBT-03 | CBT | Behavioural experiment — 5 fields |
| FR-SOM-01 | Somatic | 6 techniques: 4-7-8, box, Bhramari, Nadi Shodhana, 5-4-3-2-1, body scan |
| FR-SOM-02 | Somatic | Animated visual guide; no audio required |
| FR-CHECKIN-01 | Check-In | Daily SUDS check-in; routing: ≥7 somatic / 4–6 grounding / 1–3 cognitive/exposure |
| FR-PROG-01 | Progress | SUDS trend graph (weekly + monthly) |
| FR-PROG-02 | Progress | Chronological exposure history log |
| FR-NOTIF-01 | Notifications | Re-engagement on Day 2 + Day 5; no further in window |
| FR-NOTIF-02 | Notifications | No punitive language, no streak mechanics |
| FR-NOTIF-03 | Notifications | User timing control + per-type opt-out |
| FR-CRISIS-01 | Crisis | On-device keyword detection; hardcoded crisis contacts displayed without network |
| FR-CRISIS-02 | Crisis | English + Hindi keyword list; updated via app release only |
| FR-CRISIS-03 | Crisis | Persistent SOS button during active session; overlay without session termination |
| FR-I18N-01 | i18n | All strings externalised; English-only at launch |
| FR-I18N-02 | i18n | RTL support implemented at MVP |
| FR-ANALYTICS-01 | Analytics | Day 1 metrics: core loop retention + SUDS cadence |
| FR-ANALYTICS-02 | Analytics | No health data to third-party services |

**Total PRD FRs: 32**

### Non-Functional Requirements (from PRD)

| ID | Area | Summary |
|---|---|---|
| NFR-PERF-01 | Performance | <3s load at P90 on target device |
| NFR-PERF-02 | Performance | <500ms SUDS log write |
| NFR-PERF-03 | Performance | <1s check-in routing |
| NFR-OFFLINE-01 | Offline | Full ERP session offline without data loss |
| NFR-OFFLINE-02 | Offline | Auto-sync within 30s of connectivity restoration |
| NFR-OFFLINE-03 | Offline | Crisis contacts on-device always |
| NFR-REL-01 | Reliability | 99.5% uptime 06:00–24:00 IST |
| NFR-REL-02 | Reliability | Crash recovery: all pre-crash SUDS entries recoverable |
| NFR-SEC-01 | Security | AES-256 at rest, TLS 1.3 in transit |
| NFR-SEC-02 | Security | RLS on all health data tables |
| NFR-SEC-03 | Compliance | DPDPA consent records: 4 required fields; retained account lifetime + 2 years |
| NFR-SEC-04 | Compliance | HIPAA/GDPR activation at Phase 2 without data migration |
| NFR-SEC-05 | Compliance | DPO appointed + contact in privacy notice before India launch |
| NFR-SEC-06 | Security | On-device crisis detection; no text to external service |
| NFR-DEVICE-01 | Compatibility | All FRs met on Android 10+, 2GB RAM |
| NFR-DEVICE-02 | Compatibility | All FRs met on iOS 16+ and last 2 major browsers |
| NFR-ACCESS-01 | Accessibility | WCAG 2.1 AA; 44×44dp tap targets |
| NFR-SCALE-01 | Scalability | 10,000 concurrent users at India launch |

**Total PRD NFRs: 18**

### PRD Completeness Assessment

PRD is structurally complete. Three intentional post-PRD product decisions exist in epics.md that diverge from PRD text — these are known, tracked changes:
1. FR-ONBOARD-01: PRD specifies 17-item SPIN ≥40; epics.md updated to 3-item mini-SPIN with 3-tier system (product decision made in planning)
2. FR-GATE-01: PRD specifies readiness gate; epics.md marks it REMOVED (product decision)
3. FR-AUTH-02: PRD describes simple non-persistence; epics.md has full device-local merge contract (architecture elaboration)

PRD should be updated to reflect these decisions before implementation starts.

---

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Summary | epics.md | Status |
|---|---|---|---|
| FR-AUTH-01 | Email/phone OTP | Present | ✓ Covered |
| FR-AUTH-02 | Preview challenge access | Present (expanded with device-local merge) | ✓ Covered |
| FR-SAFE-01 | Two mandatory checkboxes | Present | ✓ Covered |
| FR-ONBOARD-01 | SPIN questionnaire | Present — updated to mini-SPIN 3-tier | ⚠️ PRD divergence (deliberate) |
| FR-ONBOARD-02 | Symptom check + checklist | Present | ✓ Covered |
| FR-ONBOARD-03 | Inline psychoeducation | Present | ✓ Covered |
| FR-GATE-01 | Readiness gate | Present — marked REMOVED | ⚠️ PRD divergence (deliberate) |
| FR-HIER-01 | Template hierarchy | Present | ✓ Covered |
| FR-HIER-02 | Custom items | Present | ✓ Covered |
| FR-HIER-03 | Stall logic | Present | ✓ Covered |
| FR-ERP-01 | Three ERP phases | Present | ✓ Covered |
| FR-ERP-02 | SUDS logging | Present | ✓ Covered |
| FR-ERP-03 | Debrief + arc graph | Present | ✓ Covered |
| FR-ERP-04 | Abort logging | Present | ✓ Covered |
| FR-CBT-01 | Thought record | Present | ✓ Covered |
| FR-CBT-02 | Distortion library | Present | ✓ Covered |
| FR-CBT-03 | Behavioural experiment | Present | ✓ Covered |
| FR-SOM-01 | Six somatic techniques | Present | ✓ Covered |
| FR-SOM-02 | Animated visual guide | Present | ✓ Covered |
| FR-CHECKIN-01 | Daily check-in routing | Present | ✓ Covered |
| FR-PROG-01 | SUDS trend graph | Present | ✓ Covered |
| FR-PROG-02 | Exposure history log | Present | ✓ Covered |
| FR-NOTIF-01 | Re-engagement Day 2 + Day 5 | Present | ✓ Covered |
| FR-NOTIF-02 | No punitive language | Present | ✓ Covered |
| FR-NOTIF-03 | User timing + opt-out | Present | ✓ Covered |
| FR-CRISIS-01 | On-device keyword detection | Present | ✓ Covered |
| FR-CRISIS-02 | English + Hindi list | Present | ✓ Covered |
| FR-CRISIS-03 | SOS button | Present | ✓ Covered |
| FR-I18N-01 | String externalisation | Present | ✓ Covered |
| FR-I18N-02 | RTL support | Present | ✓ Covered |
| FR-ANALYTICS-01 | Day 1 metrics | Present | ✓ Covered |
| FR-ANALYTICS-02 | No third-party health data | Present | ✓ Covered |

### Additional FRs in epics.md (not in PRD — added during planning)

| ID | Area |
|---|---|
| FR-ANALYTICS-BOUNDARY-01 | Phase 1 analytics zero-writes + field classification |
| FR-SUDS-ANCHOR-01 | Static SUDS anchor labels on every interaction |
| FR-ADVERSE-01 | SUDS ≥8 mid-session escalation + debrief crisis contacts |
| FR-ADVERSE-02 | Check-in SUDS ≥8 inline crisis contacts |
| FR-DPO-01 through FR-DPO-07 | DPO system actor (elaboration of NFR-SEC-05) |

### Missing Requirements

None. All 32 PRD FRs are present in epics.md.

**Note — Epic decomposition not yet complete:** The "FR Coverage Map" and "Epic List" sections in epics.md are placeholders. The epics creation workflow completed only Step 1 (requirements inventory); Step 2 (epic design) has not been run. Actual epic/story decomposition is pending.

### Coverage Statistics

- Total PRD FRs: 32
- FRs present in epics.md: 32 (30 unchanged + 2 deliberate divergences)
- Coverage: 100%
- PRD-to-epics divergences requiring PRD update: 2 (FR-ONBOARD-01, FR-GATE-01)

---

## UX Alignment Assessment

### UX Document Status

Found — `ux-design-specification/` (13 sections, sharded). 27 UX Design Requirements (UX-DR1–UX-DR27) captured in epics.md.

### UX ↔ PRD Alignment

| Area | Status | Notes |
|---|---|---|
| User journeys | ✓ Aligned | JU-01/03/04 map to UX flows F1–F6 |
| Debrief return paths | ✓ Elaboration | UX-DR11 (5 paths + welfare_flag) extends PRD FR-ERP-03 |
| Naming — "courage ladder" | ✓ No conflict | UX-DR9 adds specificity not in PRD |
| Accessibility | ✓ Extended | UX extends NFR-ACCESS-01 with register-specific touch targets |
| Adverse event UX | ✓ Aligned | UX-DR11 "Rather not say" → welfare_flag aligns with FR-ADVERSE-01 |

### UX ↔ Architecture Alignment

| Area | Status | Notes |
|---|---|---|
| NativeWind v5 | ✓ Aligned | UX spec and architecture both specify v5.0.0-preview.3 |
| ExposureThread state machine | ✓ Aligned | UX-DR12 ↔ ARC-014 match exactly |
| AnimationContext at root | ✓ Aligned | Sprint-0 pre-condition in both UX and architecture |
| CalmMeButton rendering | ⚠️ ADR missing | UX-DR8 flags ADR needed (root layout absolute vs @gorhom/portal) before in-the-moment sprint; ADR not yet authored |
| HelplineCard remote config | ⚠️ ADR missing | UX-DR24 requires config strategy ADR (Firebase RC vs Supabase table vs bundled JSON) before onboarding sprint; ADR not yet authored |

### Warnings

1. **ADR-CALMME-RENDERING** — Not yet authored. Blocks in-the-moment sprint. Must be written and referenced in the CalmMeButton story before that story enters sprint.
2. **ADR-HELPLINE-CONFIG** — Not yet authored. Blocks onboarding sprint (HelplineCard). Must be written before the onboarding story enters sprint.

---

## Epic Quality Review

### 🔴 Critical: Epic List Not Created

`epics.md` contains a complete **requirements inventory** (32 FRs, 18 NFRs, 14 ARC items, SPIKE-001, 27 UX-DRs) but the **Epic List** and **FR Coverage Map** sections are placeholder text: `_To be completed in Step 2 (epic design)_`.

The `bmad-create-epics-and-stories` workflow completed only Step 1 (requirements extraction). Step 2 (epic design — grouping requirements into epics, decomposing into stories, writing ACs) has not been run.

**No stories exist to review for:**
- User value vs. technical milestone alignment
- Story independence and sizing
- Forward dependency violations
- Given/When/Then acceptance criteria
- FR traceability

**This is the single blocking gap for implementation readiness.**

### What IS Present and Positively Assessed

The requirements inventory is implementation-grade quality:
- All 32 PRD FRs present and correctly specified
- 12 additional FRs added during planning (adverse events, DPO, SUDS anchoring, analytics boundary)
- All 14 architecture requirements specific and testable (e.g. ARC-001 specifies exact command, ARC-005 specifies exact interface pattern)
- SPIKE-001 has 4 concrete acceptance criteria and 2 defined exit outcomes
- All 4 previously unresolved ADRs now have resolution text in ARC-010
- 27 UX Design Requirements specify concrete implementable constraints

### Greenfield Pre-Conditions Check

| Pre-condition | Status |
|---|---|
| Starter template specified | ✓ ARC-001: `npx create-turbo@latest exposure-buddy --package-manager pnpm` |
| Package name locked (Firebase) | ✓ ARC-002: Firebase project + `google-services.json` + Android package name |
| EAS Build profiles required | ✓ ARC-003: Story 1 deliverable |
| Monorepo boundaries CI gate | ✓ ARC-011: packages/core import boundary CI gate |
| Phase 0 validation spike | ✓ SPIKE-001: 3-day time-box, 5 ACs, PASS/FALLBACK exit outcomes |
| Epic List | ❌ Not yet created |

### Best Practices Compliance

| Criterion | Status |
|---|---|
| Requirements complete and traceable | ✓ Pass |
| Architecture supports all FRs | ✓ Pass |
| UX aligned with architecture | ✓ Pass (2 ADRs pending) |
| Epic structure with user value | ❌ Not yet created |
| Story independence validated | ❌ Not yet created |
| Acceptance criteria (BDD) | ❌ Not yet created |
| FR → Story traceability | ❌ Not yet created |

---

## Summary and Recommendations

### Overall Readiness Status

**NEEDS WORK** — Planning artifacts are strong; epic decomposition has not been done.

### Critical Issues Requiring Immediate Action

1. **Epic List not created** — `bmad-create-epics-and-stories` Step 2 (epic design) must be run before any implementation can begin. No stories, no ACs, no sprint plan is possible without it.

2. **PRD not updated** — Two deliberate product decisions (mini-SPIN replacing 17-item SPIN; FR-GATE-01 removal) exist in epics.md but not yet reflected in prd.md. The PRD is the authoritative requirements source; it should match the implementation intent.

3. **ADR-CALMME-RENDERING not authored** — Blocks in-the-moment sprint stories (CalmMeButton). Must be written before those stories enter sprint.

4. **ADR-HELPLINE-CONFIG not authored** — Blocks onboarding sprint (HelplineCard remote config strategy). Must be written before onboarding stories enter sprint.

### High Priority — Resolve Before Sprint Planning

5. **mini-SPIN clinical sign-off pending** — FR-ONBOARD-01 flags "≥6 threshold pending clinical sign-off for Indian urban adult population." Sprint planning for onboarding is blocked until this sign-off is obtained.

6. **In-the-moment and avoidance-moment PM prototype gate** — UX-DR25 requires a PM-signed tested prototype before those screens enter an implementation sprint. Not a blocker for epic design, but must be on the sprint-entry checklist.

### What Is Ready

| Area | Status |
|---|---|
| PRD completeness | ✓ 32 FRs, 18 NFRs — complete |
| Architecture | ✓ All decisions made; 4 pending ADRs resolved in text |
| UX Design Spec | ✓ 27 UX-DRs; aligned with architecture |
| Requirements inventory | ✓ epics.md has 44 FRs (32 PRD + 12 new) + 27 UX-DRs + 14 ARC items |
| SPIKE-001 defined | ✓ Ready to be written as a story in sprint 0 |
| Phase 0 pre-conditions | ✓ ARC-001 through ARC-004 specify greenfield setup precisely |

### Recommended Next Steps

1. **Run `[CE] bmad-create-epics-and-stories` Step 2** — Continue from `stepsCompleted: ["step-01-validate-prerequisites"]` in epics.md to produce the Epic List, story decomposition, and FR coverage map. This is the single action that unblocks sprint planning.

2. **Update prd.md** — Sync the two deliberate divergences (FR-ONBOARD-01 mini-SPIN, FR-GATE-01 removed) so PRD and epics.md are consistent.

3. **Author ADR-CALMME-RENDERING and ADR-HELPLINE-CONFIG** — These can be written during epic design and assigned as pre-conditions on the stories that depend on them.

4. **Secure mini-SPIN clinical sign-off** — Contact clinical partner with the specific question: "Is a 3-item mini-SPIN score ≥6 an appropriate referral threshold for a self-directed wellness app in urban Indian adults aged 18+?"

### Final Note

This assessment identified **4 critical issues** and **2 high-priority items** across 3 categories (epic decomposition, PRD sync, 2 missing ADRs). The planning foundation — PRD, Architecture, UX Design, and requirements inventory — is thorough and implementation-grade. The only thing standing between the current state and sprint 1 is the epic design step and the four items listed above.

---
*Assessed: 2026-05-17 | Assessor: Claude Code (Implementation Readiness)*
