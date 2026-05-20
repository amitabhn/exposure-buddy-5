# ADR-DPDPA-EXPORT-DEFERRAL — User Data Export: Operator-Initiated at MVP

**Status:** Accepted  
**Owner:** Product  
**Required before:** Story 3.5 can be marked complete

---

## Context

DPDPA 2023 grants data principals the right to access their personal data. exposure-buddy must provide a mechanism for users to obtain a copy of their data. The PRD (FR-DPO-02) specifies a user-facing self-service export flow: "Settings → Privacy → Request my data." This ADR records the decision to defer that flow to post-MVP and the operator-initiated alternative in place at launch.

---

## Decision

**At MVP launch, data export requests are handled operator-initiated via the DPO panel (Story 3.4), not via a user-facing self-service UI.**

The workflow at MVP:
1. User contacts the DPO (contact email published in the Privacy Notice per FR-DPO-01) to request their data.
2. The DPO operator uses the self-hosted DPO panel (`/dpo/export-user` Edge Function) to trigger the export.
3. The export is delivered to the user's registered email within 72 hours of the request being received by the DPO.
4. The request and outcome are recorded in the append-only `dpo_audit_log` table (FR-DPO-06).

**User-facing self-service export ("Settings → Privacy → Request my data") is deferred to post-MVP** and tracked in the post-MVP backlog.

---

## Rationale

The DPO panel route is the authoritative implementation for FR-DPO-02 at launch. It satisfies the DPDPA 2023 right of access obligation with a human-in-the-loop process. The self-service UI adds product scope without materially improving compliance — the 72-hour SLA is the binding constraint, not whether the request was submitted via UI or email.

Building the self-service UI at MVP would require:
- An authenticated Settings → Privacy screen
- A "Request my data" form with confirmation
- Notification of request receipt
- A separate async export job system

None of these are blockers for DPDPA compliance at launch and are correctly deferred.

---

## Consequences

- The Privacy Notice (Story 3.5) must include the DPO contact mechanism as the primary export request channel.
- The DPO panel must be operational before any user personal data is processed in production (FR-DPO-07 hard go-live dependency).
- Post-MVP backlog item for self-service export must be prioritised before scaling beyond early-adopter cohort, as manual DPO-mediated exports do not scale.

---

## Date

2026-05-19
