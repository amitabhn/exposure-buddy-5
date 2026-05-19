# ADR-DPDPA-WITHDRAWAL-DEFERRAL — Consent Withdrawal Without Deletion: Deferred Post-MVP

**Status:** Accepted  
**Owner:** Product / Legal  
**Required before:** Story 3.5 can be marked complete

---

## Context

DPDPA 2023 grants data principals the right to withdraw consent for data processing. Withdrawal of consent is distinct from account deletion — a user may wish to stop data processing for a specific purpose while retaining their account. exposure-buddy must declare its MVP position on the consent withdrawal-without-deletion right before launch.

---

## Decision

**At MVP launch, withdrawal of consent is handled exclusively through full account deletion (Story 2.4).** A consent withdrawal-without-deletion flow is not provided at MVP.

The MVP consent model is all-or-nothing: a user either consents to data processing (by creating an account) or withdraws fully (by deleting their account). Granular purpose-level withdrawal is deferred to post-MVP.

**The DPDPA 2023 right-to-object and granular withdrawal flow is backlogged as a post-MVP feature.**

---

## Rationale

exposure-buddy at MVP processes data for a single tightly-coupled purpose: delivering ERP therapy sessions and associated progress tracking. The data processing purposes are interdependent — SUDS ratings are inseparable from session records, session records are inseparable from the fear ladder, and the fear ladder defines the therapeutic programme. Meaningful partial withdrawal (e.g. "process my session data but not my SUDS ratings") is clinically incoherent at MVP.

Full account deletion (30-day soft-delete window, permanent purge after 30 days, consent records retained per FR-DPO-03) satisfies the user's right to stop processing entirely. This is the appropriate MVP boundary.

---

## Consequences

- The Privacy Notice (Story 3.5) must accurately describe the MVP consent model: consent covers data processing for ERP therapy delivery; withdrawal is via account deletion.
- The Privacy Notice must not imply granular purpose-level withdrawal is available at launch.
- Post-MVP: when additional processing purposes are added (e.g. analytics, clinical research data sharing), granular consent and withdrawal flows become mandatory before those features launch. This ADR must be revisited at that point.
- Legal team must confirm that the all-or-nothing withdrawal model satisfies DPDPA 2023 obligations for the Indian market and the wellness (non-SaMD) regulatory context before go-live.

---

## Date

2026-05-19
