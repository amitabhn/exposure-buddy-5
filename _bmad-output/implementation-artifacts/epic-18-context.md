# Epic 18 Context: Post-MVP UX Improvements — Wave 1

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Beta users can see evidence that they are making progress, recover cleanly from an interrupted session on any device, and hit fewer dead ends in the two moments that matter most — the distress-support screen and account creation. This is a curated first wave of user-experience fixes pulled from the post-MVP backlog, selected specifically because none of them are blocked on clinical-advisor review (which currently gates roughly ten other backlog items). Several stories re-home work discovered against already-`done` epics (8, 15), since this project's convention is to open a new epic rather than reopen a completed one.

## Stories

- Story 18.1: Progress Tab — SUDS Trend, Session History & Arc (deferred back to post-mvp-backlog.md same day it was scoped in; not part of this epic's active scope — reference only)
- Story 18.2: Mid-Session Re-Entry — Insta Calm Prompt & Cross-Device Recovery
- Story 18.3: Insta Calm Affirmation Rotation
- Story 18.4: Distinct "Account Already Exists" Message on Password Sign-Up
- Story 18.5: Insta Calm Rename — Screen-Reader Label Parity
- Story 18.6: Interactive 5-4-3-2-1 Grounding — Text Entry Per Sense
- Story 18.7: Skip Onboarding for Existing Users After Reinstall

## Requirements & Constraints

- Session recovery must work even when on-device state is gone (reinstall, device switch, cleared storage) — the authoritative signal is the server-side record, with local state as a fast-path cache only.
- The Insta Calm affirmation must vary between visits rather than showing the same fixed line every time; no-immediate-repeat is the behavior that matters, not true randomness.
- Every backend shape that means "this identifier is already registered" during sign-up must route to the same clear, actionable copy pointing the user at sign-in — not a generic failure message.
- Screen-reader users must hear the same product name ("Insta Calm") sighted users see; no interactive element may announce a stale pre-rename name.
- The 5-4-3-2-1 grounding exercise must capture what the user actually notices, not just instruct them to notice it — and typing must never gate advancing to the next step.
- A user with existing account data (at least one courage-ladder item) must land on home after sign-in post-reinstall, not be routed back through onboarding.
- Cold start must stay under the existing performance budget (<3s P90 on the 2GB RAM/Android 10+ target profile) — any new fallback check added by this epic must add zero latency to the common case and must never block the existing auth/onboarding redirect gate.
- All interactive elements need accessible labels (WCAG 2.1 AA); accessibility labels read as natural speech, not a transcription of visual formatting (all-caps, line breaks).
- Free-text personal data (grounding-exercise entries) defaults to ephemeral/component-state-only — persisting it would create a new personal-data category requiring RLS, erasure-job, and DPDPA-consent-purpose changes, which this epic does not take on unless a story explicitly decides otherwise.
- Revealing account-existence during sign-up is a deliberate, recorded tradeoff against Supabase's email-enumeration protection — usability wins for this health app, but the tradeoff must be documented, not incidental.
- Clinical-review-gated copy (e.g. the "You're back. That took courage." re-entry line) is explicitly out of scope for this epic; existing neutral copy stays until that review happens.

## Technical Decisions

- Cold-start sequencing (existing ADR): MMKV sync reads (auth state, session-in-progress flag, last route) resolve before PowerSync init completes, so session-recovery/navigation decisions add zero latency to launch. Any new server-side fallback check (cross-device recovery, reinstall detection) must sit *behind* this existing path and never delay it — verified against the same cold-start budget.
- Local-first-with-fallback pattern: when on-device state can't answer a question (recovery, onboarding status), fall back to a live query through the PowerSync replica rather than trusting local-only state; on failure/timeout/offline, fall back to the safer default (show onboarding, don't offer a stale resume) rather than hanging or erroring. One story establishes this pattern (`useActiveSessionRecoveryFallback`); a later story in this epic reuses it rather than reinventing it.
- `packages/core` boundary is hard (CI-enforced): zero `react-native`/`expo-*`/`@supabase/*` imports. Config-driven logic added to `packages/core` (affirmation list, grounding step counts/selection) must stay pure TypeScript, unit-tested in Vitest.
- MMKV access goes only through the typed `KV_KEYS` factory — raw string-literal keys are lint-banned. Any new persisted key (e.g. last-shown-affirmation index) follows this convention.
- `fear_ladder_items` is readable under existing RLS and syncs via PowerSync, so an existence check against it reflects server truth shortly after sign-in without new backend work.
- Every user-facing string goes through `t()` (CI lint enforced) with matching keys added to both `en.json` and `hi.json` — English copy duplicated into `hi.json` where no localization decision has been made yet.
- Graceful-degradation principle applies throughout: never surface an error for incomplete or not-yet-synced data; fall to the safest available UI state instead.

## UX & Interaction Patterns

- Established re-entry pattern: returning to an interrupted exposure surfaces calming support actively at the moment of re-entry, not merely as a passively-available overlay/FAB a distressed user has to notice.
- Zero-navigate safety principle: calming support must remain reachable without menu traversal from any screen, including mid-session.
- Accessibility labels are written as natural speech, matching how a screen reader will say the product name — not a transcription of the visual label's casing or line breaks.
- Verification depth scales with what changed: a pure string change gets a single one-platform screen-reader spot check; a change that alters focus order or introduces new focusable elements requires the fuller dual-platform (VoiceOver + TalkBack) protocol.
- Distress-context inputs (grounding text entry) must never block progression — advance/skip controls stay enabled regardless of whether anything was entered.

## Cross-Story Dependencies

- Story 18.7 reuses the local-first-with-fallback query hook that Story 18.2 establishes for cross-device session recovery — implement or land 18.2's pattern before or alongside 18.7's onboarding-skip fallback.
- Stories 18.3 and 18.4 are small and independent; they can land together but neither depends on the other.
- Stories 18.5 and 18.6 are independent of every other story in this epic and of each other.
- Story 18.1 is deferred out of this epic's active scope — no other story in this epic depends on it, and its `SudsArcChart` reuse note is preserved only for whenever it is re-scoped elsewhere.
