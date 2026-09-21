---
title: 'Restore missing launchApp step in onboarding E2E flow'
type: 'bugfix'
created: '2026-09-21'
status: 'done'
route: 'one-shot'
---

# Restore missing launchApp step in onboarding E2E flow

## Intent

**Problem:** Commit `831f637` accidentally deleted the only `- launchApp` step in `apps/mobile/.maestro/onboarding.yaml` while removing an unrelated stale tap in the same diff hunk, causing `E2E Smoke (onboarding)` to fail on every CI run since (the app is installed but never started — confirmed via logcat showing zero `ReactNativeJS`/`ActivityTaskManager: START` lines). Previously mischaracterized in `deferred-work.md` as an unconfirmed flake.

**Approach:** Restore a bare `- launchApp` step to its original position in `onboarding.yaml`, correct the tracking-doc entry in `deferred-work.md` to reflect the true (deterministic, self-inflicted) root cause, and carry the supporting investigation case file along so the doc's citation resolves.

## Suggested Review Order

- The one-line fix — restores the deleted launch step at the exact spot it was removed from.
  [`onboarding.yaml:19`](../../apps/mobile/.maestro/onboarding.yaml#L19)

- Comment above the fix, corrected to describe what's now below it (also fixes a stray unclosed parenthesis caught in review).
  [`onboarding.yaml:15`](../../apps/mobile/.maestro/onboarding.yaml#L15)

- Tracking-doc correction — replaces the "possible flake" writeup with the confirmed root cause and fix reference.
  [`deferred-work.md:14`](deferred-work.md#L14)

- Full evidence trail (diff, CI run correlation, logcat contrast) backing the root-cause claim above.
  [`investigations/onboarding-e2e-launchapp-flake-investigation.md:1`](investigations/onboarding-e2e-launchapp-flake-investigation.md#L1)
