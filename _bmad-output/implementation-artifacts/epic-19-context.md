# Epic 19 Context: Beta Feedback Fixes — Onboarding Ladder, Practice Relaxation & Courage Ladder

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Fix the problems beta users reported in the first build: an onboarding ladder step that goes back correctly, a Practice Relaxation flow that opens the technique the user chose instead of an exposure session, a courage ladder that clearly separates finished from unfinished items, a first-launch pointer to Insta Calm, and a reviewed SUDS input. The epic also holds the defects, verification gaps and tech debt found while verifying Story 19.1 on a device and in CI (sync upload ordering and stalls, a sign-in flash, a slow-first-sync fallback hole, a red Maestro suite on `main`).

## Stories

- Story 19.1: Onboarding Courage Ladder — "Do this later" Label & Back Navigation (done, merged in PR #100)
- Story 19.2: Practice Relaxation Opens the Selected Technique (merged in PR #101)
- Story 19.3: Courage Ladder — Completed Items Sink and Grey Out (merged in PR #102)
- Story 19.4: Highlight Insta Calm on First Launch After Install
- Story 19.5: Review SUDS Input — Numbered Boxes vs. Slider
- Story 19.6: Sync Upload Applies a Reorder After the Inserts It Depends On
- Story 19.7: Upload Queue Does Not Stall on a Write the Server Will Never Accept
- Story 19.8: No Sign-In Flash on Cold Start for a Signed-In User
- Story 19.9: An Existing Account Reinstalling Is Not Sent Through Onboarding Again When the First Sync Is Slow
- Story 19.10: Complete Story 19.1's Remaining Device and Automation Verification
- Story 19.11: Local RLS Test Suite Passes on a Fresh Postgres 17 Stack
- Story 19.12: Maestro Core and Session Shards Pass Again

## Requirements & Constraints

- "Practice Relaxation" is a relaxation entry point, never an exposure entry point: choosing a technique opens that technique and creates no exposure session. Techniques not yet built say so plainly and give a way back.
- Completed ladder items stay visible but are separated visually and positionally from unfinished ones, with a non-colour cue; the next-step selection on Home must keep working.
- The app is a non-therapeutic self-help tool: copy stays neutral and never reads as clinical advice. All user-facing text is localised (`en.json`, with `hi.json` per the existing convention of mirroring English where untranslated), and every interactive element has an accessible label that reads as natural speech.
- India-focused: personal-data handling follows DPDPA 2023; free-text user data is not newly persisted or sent to error tracking without the consent and erasure work that implies.
- Cold start stays inside the existing performance budget; nothing in this epic may add latency to the common path.

## Technical Decisions

- Domain logic that can be pure (for example the ladder sort) lives in `packages/core` with unit tests, and `packages/core` imports nothing from React Native, Expo or Supabase (CI-enforced). The Supabase types file is never imported outside `packages/supabase`.
- Data is offline-first: the app reads and writes a local PowerSync database and a connector uploads writes. Load the PowerSync guidance before touching data, schema or sync. A 4xx from the upload path blocks the whole queue, so an upload must not throw for a permanently rejected write.
- Stack navigation in onboarding uses `push`, not `replace`, so OS back returns one step; screens stay mounted under a pushed one, so per-screen state that must track the visible screen is written on focus, not on mount.
- Onboarding completion is device-local, so a reinstall wipes it; the reinstall fallback holds the redirect for up to 10 s while the first sync runs and then lets the user through.
- Schema and RLS changes ship as a numbered migration under `supabase/migrations/` with an RLS integration test; hosted is migrated separately and deliberately.
- Android Expo dev client does not download PowerSync data (uploads still work), so anything that depends on synced server data is verified on an EAS `preview` or production build, not the dev client.
- CI: Maestro E2E on a pull request runs only when the PR carries the `run-e2e` label (about 70 minutes); it always runs on `main`.

## Cross-Story Dependencies

- 19.2 should land before 19.3 (both touch how Home and the ladder choose and show items).
- 19.6 (reorder after inserts) and 19.7 (queue stall) both change the connector's `uploadData` ordering and error handling and should be designed together.
- 19.9 (slow first sync) interacts with 19.7: the position collision that follows a mis-routed onboarding is a stalled write.
- 19.10 closes 19.1's remaining verification; 19.12 is independent of every other story and is about `main` CI health.
