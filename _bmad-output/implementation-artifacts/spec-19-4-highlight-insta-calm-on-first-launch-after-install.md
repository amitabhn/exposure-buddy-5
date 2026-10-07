---
title: 'Highlight Insta Calm on First Launch After Install'
type: 'feature'
created: '2026-10-07'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Beta users did not notice the Insta Calm button or know what it is for (feedback item 5). Nothing introduces it. A small callout beside the button was tried first and rejected after a device check: it covered controls on sign-in, onboarding and the SUDS rating screen, grew over the form at 200% font, and appeared on the "stop this session" screen.

**Approach:** The first time the app runs after an install, the first screen that shows the button dims the whole screen with an overlay that spotlights the Insta Calm button and shows a short explanation card under it saying what it is and when to use it. The overlay is dismissed with "Got it" or by tapping the button itself. "Seen" is a device-local MMKV flag, so it is shown once per install.

## Boundaries & Constraints

**Always:** The Insta Calm button stays above the overlay, tappable and unobstructed, so crisis and helpline access is one tap away throughout. The overlay is rendered in place by `CalmMeFab` as part of the existing global overlay, not as a route. The explanation card is the only other touchable element. Copy is neutral, non-clinical, in `en.json` and `hi.json` (Hindi mirrors English where untranslated). Announced to screen readers; "Got it" and the button keep accessible labels. The seen flag is device-scoped (user is unknown on the sign-in screen), a constant `KV_KEYS` entry, not cleared on sign-out. Seen is written on dismiss, or when the user taps Insta Calm itself. The overlay is not shown on any `/session/*` route. Android hardware back dismisses the overlay and counts as seen, instead of navigating underneath it.

**Never:** No new route, no navigation modal, no tap-outside-to-dismiss. No change to where the FAB is hidden (`/calm-me` subtree, resume banner). No server, schema or PowerSync change. No per-user key; no clearing the flag on sign-out. Not shown when MMKV is unavailable (degraded mode) or before MMKV has loaded. Never shown during a session (SUDS rating, active, stop, pause, debrief); the flag stays unset there so it appears on the next screen outside a session.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First launch after install | flag unset, FAB visible, not a `/session/*` route | screen dimmed, button spotlighted above the dim, card under it | N/A |
| Dismissed | tap "Got it" | overlay hides, flag stored, never shown again | write failure: hide for this session |
| Tapped the button | tap Insta Calm while overlay shown | flag stored, overlay hides, navigates to `/calm-me` as before | N/A |
| Android hardware back | back pressed while overlay shown | overlay hides, flag stored, back is consumed (no navigation) | N/A |
| Tapped elsewhere | tap anywhere on the dimmed area | nothing happens (touch swallowed, no dismiss) | N/A |
| Relaunch / sign-out / sign-in | flag set | no overlay | N/A |
| Reinstall | MMKV wiped | overlay shown again (accepted, incl. existing account) | N/A |
| FAB hidden | `/calm-me*` or resume banner | no overlay, flag untouched | N/A |
| Session screen | any `/session/*` route | no overlay, flag untouched; shown on the next non-session screen | N/A |
| MMKV null / still loading | no store | no overlay | N/A |
| 200% font | system font scale 2.0 | card text scaling capped, overlay still covers the full screen, "Got it" reachable | N/A |

</frozen-after-approval>

## Code Map

- `packages/core/src/constants/kvKeys.ts` -- add device-scoped constant `INSTA_CALM_INTRO_SEEN: 'calm_me:intro_seen'` beside `PREVIEW_CHALLENGES` (same sign-out-must-not-clear note)
- `packages/supabase/src/auth/OnboardingProvider.tsx` -- add `instaCalmIntroSeen` (context default and initial state `true` so nothing flashes) and `markInstaCalmIntroSeen`; read once when `mmkv` is ready via its OWN effect keyed on `[mmkv]` (not the existing `[userId]` effect — `_layout.tsx` loads `mmkv` async, so a `[userId]`-keyed read would never re-run and the overlay would never show), independent of `userId`; sign-out reset block must NOT touch it; null store keeps `true`; `markInstaCalmIntroSeen` sets local state BEFORE the MMKV write, inside try/catch, so a write failure still hides it for the session
- `packages/supabase/src/auth/useAuth.ts` -- expose both fields beside `firstHomeVisitSeen`
- `apps/mobile/src/components/CalmMeFab.tsx` -- when `!instaCalmIntroSeen` and not on a `/session/*` route, render a full-screen scrim as a SIBLING placed before the button container so the button paints above it; the scrim swallows touches (`onStartShouldSetResponder`) and is hidden from accessibility; size it from `useWindowDimensions` (the parent has no height, so `top/bottom: 0` collapses to 0 on Android); `handlePress` marks seen first; reuse the existing hidden-state returns. Give the scrim a `testID` for tests. While the overlay shows, register a `BackHandler` `hardwareBackPress` listener that marks seen and returns `true`; remove it when the overlay hides (read the handler through a ref, `markInstaCalmIntroSeen` is not memoized).
- `apps/mobile/src/components/InstaCalmIntroCallout.tsx` -- presentational explanation card (title, body, "Got it") rendered under the button: `accessibilityLiveRegion="polite"` (Android only) PLUS `AccessibilityInfo.announceForAccessibility(title + body)` on mount for iOS VoiceOver; text scaling capped (`maxFontSizeMultiplier` 1.2); only its own card is touchable (`pointerEvents="box-none"` wrapper)
- `apps/mobile/src/i18n/locales/en.json`, `hi.json` -- `calmMe.intro.{title,body,dismiss}`
- `apps/mobile/.maestro/setup/dismissInstaCalmIntro.yaml` (new), `setup/ensureOnboarded.yaml`, `onboarding.yaml` -- the scrim blocks every tap and scroll, and these flows cold-start with a cleared install; run an optional "Got it" tap right after launch
- `apps/mobile/src/components/CalmMeFab.test.tsx`, provider tests (`packages/supabase`) -- cover the matrix; existing mocks of `useAuth` need the new fields
- Do not modify: `packages/ui` `CalmMeButton`, `app/calm-me/*`

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/constants/kvKeys.ts` -- device-scoped key -- survives sign-out, wiped on reinstall
- [x] `OnboardingProvider.tsx`, `useAuth.ts` + tests -- flag read/write, default `true`, not reset on sign-out
- [x] `InstaCalmIntroCallout.tsx`, `CalmMeFab.tsx`, `en.json`, `hi.json` + tests -- card, dismissal, tap-marks-seen, a11y announcement, session-route suppression
- [x] `CalmMeFab.tsx` scrim + tests -- scrim present when unseen, absent when seen, on `/session/*`, on `/calm-me*` and with the resume banner; scrim swallows touches
- [x] `.maestro` flows -- dismiss helper wired into the two cold-start entry points
- [x] Rebuild `packages/core` and `packages/supabase` `dist` so mobile resolves the new exports

**Acceptance Criteria:**
- Given a fresh install, when the first screen showing Insta Calm appears, then the screen is dimmed, the button is visible and tappable above the dim, and the explanation card shows once under it
- Given the overlay is shown, when "Got it" or the button is tapped, then it hides and does not return after relaunch, sign-out or sign-in
- Given the overlay is shown, when the user taps the dimmed area, then nothing happens and the overlay stays
- Given the overlay is shown, when the user taps the button, then Insta Calm opens as before and the overlay is gone on return
- Given the overlay is shown on Android, when hardware back is pressed, then the overlay hides, the flag is stored and no navigation happens
- Given any `/session/*` screen, then no overlay shows and the flag stays unset
- Given a screen reader is on (Android TalkBack and iOS VoiceOver), when the overlay appears, then the card text is announced and "Got it" and the button are reachable
- Given system font scale 200%, then the card stays a small card (capped scaling) and "Got it" is reachable
- Given MMKV finishes loading after first render, when the flag is unset, then the overlay still appears (provider test: `mmkv` prop transitions `undefined` → store)
- Given sign-out, then `instaCalmIntroSeen` is unchanged (provider test)
- Given the Maestro cold-start flows, then they dismiss the overlay before their first tap and still reach their existing screens
- Given `pnpm turbo typecheck lint test`, then all pass (core boundary and i18n/a11y gates intact)

## Implementation Notes

- Device check of the overlay (Android dev client, this branch served from its own Metro): fresh install dims the whole screen with the button lit above it and the card under it; tapping the dim does nothing (no field focus, no keyboard); Android back dismisses it and the app stays open; "Got it" dismisses and it stays gone after a force-close and relaunch; tapping the button opens Insta Calm and the overlay is gone on return; at 200% font the card grows (capped scaling) but "Got it" stays visible and reachable. The scrim shows a ~30px darker edge band (left, right, top) from its elevation shadow, cosmetic only; every pixel is dimmed.
- Not checked: iOS, TalkBack and VoiceOver, `/session/*` suppression on the device (covered by unit tests), the Maestro dismiss helper.
- Process note: an earlier pass of this check ran the wrong build because port 8081 was held by another session's dev server (from the `installation-overlay-insta-calm-e8aefd` worktree); its old overlay code had no back handler and back exited the app. Re-run on a free port with this branch.

## Spec Change Log

- 2026-10-07 — Party-mode review of the overlay draft added one behaviour to the frozen block: Android hardware back dismisses the overlay and counts as seen (Always, matrix row, AC). Reason: back otherwise navigates underneath a still-dimmed screen. Open and left as drafted: showing it on the very first screen (Sally and Winston prefer a calm moment; John and Mary back the spotlight) and no tap-outside-to-dismiss.
- 2026-10-07 — Renegotiated by the human after a device check of the original callout design: small card replaced by a dimmed full-screen overlay with a spotlighted button. Triggering findings: card covered the SUDS rating boxes, the sign-in Phone tab and email field at 200% font, and appeared on the stop-session screen. Amended the frozen block: removed "callout never covers or intercepts … crisis or helpline access" (the overlay deliberately intercepts all touches except the button and card, so the button stays the crisis route) and removed "no new route or modal" in favour of "no new route, no navigation modal, no tap-outside-to-dismiss". KEEP: device-scoped flag read in its own `[mmkv]` effect, default `true`, set-local-before-write, `/session/*` suppression, font-scale cap, iOS announcement.

## Review Triage Log

Overlay review (3 layers, combined diff against main).

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | hi.json carries English intro strings | false | rejected | Spec: "Hindi mirrors English where untranslated". |
| 2 | VoiceOver/TalkBack can reach the screen behind the scrim | medium | patch (iOS) / defer (Android) | Confirmed: scrim only swallows touches. iOS patched: `accessibilityViewIsModal={showIntro}` on the button+card container (the app's `Stack` is its sibling in `_layout.tsx`), with tests. Android has no equivalent; deferred, unchecked on device. |
| 3 | Another back handler registered later wins over the intro's | low | rejected | The intro handler registers when the overlay appears, after the navigator's, so it runs first; a later modal handler winning is an edge case with no named harm. |
| 4 | Intro marked seen before `router.push`; a throw leaves it seen | low | rejected | `router.push` throwing is not a reachable path; fix reorders without a demonstrated failure. |
| 5 | Scrim sized from `useWindowDimensions` may leave an uncovered strip (edge-to-edge) | maybe-false | defer | Needs an Android device check of the overlay (never run). |
| 6 | Maestro optional "Got it" tap may time out before the async-loaded scrim appears; text match not scoped | maybe-false | defer | Needs the Maestro shards run; already deferred. Helper only runs right after launch on two flows. |
| 7 | Scrim layering and touch blocking not observable in Jest | maybe-false | defer | Not testable in Jest; settle with a device check or a Maestro `assertVisible: "Got it"` flow. |
| 8 | Announcement re-fires on remount; Android may announce twice (live region plus explicit) | low | rejected | Cosmetic, rare, unproven. |
| 9 | `mmkv` store -> null leaves the flag false; markSeen with null ref | false | rejected | `mmkv` is set once (tri-state in `_layout.tsx`); degraded mode is null from the start. |
| 10 | Hardcoded `#ffffff` / `rgba(0,0,0,0.65)` instead of tokens | false | rejected | Matches `CalmMeButton`, which uses `#ffffff`. |
| 11 | Other `clearState` flows not updated | false | rejected | Only `ensureOnboarded.yaml` clears state (others reuse it); `onboarding.yaml` is a plain launch on a fresh install. |
| 12 | No telemetry for intro shown/dismissed | false | rejected | Out of scope; no server or analytics change in the spec. |
| 13 | Overlay can appear before the user has context (sign-in screen) | maybe-false | defer | Product timing question, raised in the spec review round (calm moment vs spotlight); logged in deferred-work. |

## Design Notes

Default-`true` is deliberate: until MMKV has loaded (or if it is unavailable) the safe state is "do not show", so a signed-in user never sees a flash on every cold start and cold-start latency is untouched. Existing account reinstalling sees the callout again; accepted per the epic (Story 18.7 interplay).

The overlay trades some access for attention: while it is up, every control except the Insta Calm button and "Got it" is blocked, including the onboarding "Feeling overwhelmed?" link. The Insta Calm button is the crisis route and stays above the dim, so crisis access is one tap away. Android hardware back dismisses it (agreed in the spec review round) so the dim can never trap the user.

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green

**Manual checks (if no CLI):**
- Android dev client: clear app data, launch; screen is dimmed with the button spotlighted and the card under it; tapping the dim does nothing; "Got it" hides it; relaunch and sign-out/in do not bring it back
- Start a session on a fresh install: no overlay on any `/session/*` screen; it appears on the next non-session screen
- 200% font: card stays small, "Got it" reachable
