# Epic 18 Context: Post-MVP UX Improvements — Wave 1

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic is a curated first wave of post-MVP UX fixes, selected as the highest-impact items not blocked on clinical-advisor review (which currently gates roughly ten other backlog items). It closes real, specific gaps at two moments that matter most for an anxiety-focused app: recovering cleanly from an interrupted exposure session on any device, and hitting fewer dead ends at the distress-support screen and during account creation. Several items originated under Epics 8 and 15, which are already `done`; per this project's standing rule against reopening a completed epic, they are re-homed here rather than un-deferred in place. Note: a "Progress tab" story (SUDS trend/history/arc) was briefly scoped into this epic on 2026-09-29 as Story 18.1, then moved back to `post-mvp-backlog.md` the same day pending design decisions (layout, chart treatment, empty/offline states) — it is **not** part of this epic's active scope.

## Stories

- Story 18.2: Mid-Session Re-Entry — Insta Calm Prompt & Cross-Device Recovery
- Story 18.3: Insta Calm Affirmation Rotation
- Story 18.4: Distinct "Account Already Exists" Message on Password Sign-Up
- Story 18.5: Insta Calm Rename — Screen-Reader Label Parity
- Story 18.6: Interactive 5-4-3-2-1 Grounding — Text Entry Per Sense

## Requirements & Constraints

- A user who leaves the app mid-exposure must be able to return to it, with calming support offered at re-entry, and that recovery must survive a reinstall or device switch — the session's source of truth is server-side, not local device storage.
- The calming-support affirmation shown to a distressed user must vary between visits instead of repeating one fixed line.
- Account sign-up with an already-registered identifier must tell the user that specifically and point them at sign-in, regardless of which of two different backend error shapes produced it.
- Screen-reader users must hear the current product name for the calming-support entry point, not a stale pre-rename name.
- The 5-4-3-2-1 grounding exercise must capture what the user actually notices at each step, not merely instruct them to notice.
- No item in this epic may depend on the clinical-advisor review that gates other backlog work.
- Every user-facing string goes through i18n (CI-lint enforced), with entries added to both the English and Hindi locale files.
- Free-text user input is treated as highly sensitive personal data; persisting any new category of it would trigger DPDPA consent-purpose, RLS, account-erasure, and data-export obligations — default to ephemeral/non-persisted unless a story explicitly records a decision otherwise.
- Changes to launch-time routing must not delay the existing auth/onboarding redirect gate, and must be re-checked against the established cold-start performance budget.
- Any E2E flow asserting on changed accessibility labels or copy must be updated in the same change — stale E2E flows going unnoticed for weeks is a recurring failure mode here.

## Technical Decisions

- "Calm Me" is renamed to "Insta Calm" in user-facing copy only. Code identifiers (route, component names, config file, i18n namespace) intentionally retain the old name and are out of scope for renaming — this mismatch between UI copy and code symbols is deliberate.
- A session-recovery modal already exists, gated by locally-persisted state. The remaining gap is a server-side fallback (via the sync-replica data) for when no local recovery record is present, an actively-offered calming prompt at resume, and a defined staleness threshold beyond which resuming a very old session is no longer offered.
- Re-entry UI copy changes are explicitly deferred to a separate clinical-review pass; existing neutral copy must be retained as-is.
- Affirmation rotation must avoid an immediate repeat on consecutive visits (not pure random-with-replacement) and must handle the single-entry case without failing.
- The duplicate-account-on-signup fix must unify two different backend response shapes (a thrown error vs. a silent no-session resolution) for the same condition into one consistent message, and must explicitly record the enumeration-disclosure tradeoff as a product decision.
- The grounding exercise's per-sense item counts must be driven from a single shared config source rather than duplicated between prompt copy and rendered field count, so the two cannot drift out of sync.
- Grounding text input must never gate advancement — fields stay optional and the advance action stays enabled regardless of input.
- Prefer extending existing, already-built components over rebuilding equivalents.

## UX & Interaction Patterns

- Calming support should be actively prompted at the moment of session resume, not merely passively available — a user returning at peak distress shouldn't have to notice and interpret a small persistent control.
- Accessibility labels must read naturally as speech, not mirror visual formatting (e.g., not shouted all-caps, no visual line breaks).
- Whether a renamed brand term stays in Latin script across all locales or gets a localized rendering is a product decision to make explicitly, not a default left to translation.
- Interactive text-entry screens with an on-screen keyboard need deliberate keyboard-avoidance and scrolling handling; keyboard occlusion of controls is a known failure mode here. Focus order should run prompt → input fields → advance control, and step-change screen-reader announcements must not steal focus from an active input.
- The grounding exercise is reached from two contexts with different emotional stakes — calm/voluntary browsing versus mid-crisis session-stop — whether both get identical interactivity or the crisis path gets a lighter treatment should be decided once, deliberately.
- Verification depth should match risk: a lightweight single-platform spot check suffices for pure copy/label changes; full dual-platform screen-reader verification is required only when focus or announcement behavior actually changes.

## Cross-Story Dependencies

- Story 18.2's cross-device recovery fallback depends on the real-time sync service being live in all environments (delivered by a preceding epic) and must be re-verified against the cold-start performance budget noted above.
- Story 18.6 shares an open design question with unrelated backlog work about differing interactivity for the same exercise reached from two contexts — resolve both together.
- Story 18.1 (Progress tab) is out of scope; do not assume its data-model or UI changes are available to any other story here.
