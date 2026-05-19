# ADR-DPDPA-CHILDRENS-DATA — Children's Data Handling Under DPDPA 2023

**Status:** Accepted  
**Owner:** Product / Legal  
**Required before:** Story 3.5 can be marked complete

---

## Context

The Digital Personal Data Protection Act 2023 (DPDPA 2023) imposes specific obligations when personal data of children (under 18) is processed, including obtaining verifiable parental consent before processing and prohibition of behavioural tracking of children. exposure-buddy processes sensitive health data (anxiety ratings, session records, symptom check responses) and must declare its position on children's data handling before launch.

---

## Decision

**exposure-buddy is restricted to users aged 18 and above.** No children's data is processed.

The age restriction is enforced at account creation via Story 2.2's mandatory self-declaration checkbox: "I confirm I am 18 years of age or older." This checkbox is a hard gate — account creation is disabled until it is checked.

**No parental consent flow is implemented at MVP.** The DPDPA 2023 requirement for verifiable parental consent before processing children's data does not apply because no user under 18 is permitted to create an account.

**Behavioural tracking restrictions** for children under DPDPA 2023 are not applicable for the same reason.

---

## Consequences

- The self-declaration checkbox in Story 2.2 is the sole age-gate at MVP. It is a legal declaration, not a verified proof of age (no ID verification, no date-of-birth field).
- Verified age-gating (e.g. document upload, date-of-birth verification) is explicitly deferred post-MVP. If regulatory guidance in the Indian context requires stronger verification before launch, this ADR must be reopened.
- If a user misrepresents their age, liability shifts to the user under the self-declaration mechanism. Legal team must confirm this is acceptable for the Indian market before go-live.
- DPDPA 2023 children's data handling for a potential under-18 feature (e.g. school counsellor integration) is fully out of scope for Phase 1 and Phase 2; requires a separate ADR if ever pursued.

---

## Date

2026-05-19
