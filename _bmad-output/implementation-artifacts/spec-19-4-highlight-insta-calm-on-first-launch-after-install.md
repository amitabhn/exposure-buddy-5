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

**Problem:** Beta users did not notice the Insta Calm button or know what it is for (feedback item 5). Nothing introduces it.

**Approach:** The first time the app runs after an install, the first screen that shows the button also shows a short, dismissible callout under it saying what it is and when to use it. "Seen" is a device-local MMKV flag, so it is shown once per install.

## Boundaries & Constraints

**Always:** Callout never covers or intercepts the button, crisis or helpline access. Copy is neutral, non-clinical, in `en.json` and `hi.json` (Hindi mirrors English where untranslated). Announced to screen readers; "Got it" and the button keep accessible labels. The seen flag is device-scoped (user is unknown on the sign-in screen), a constant `KV_KEYS` entry, not cleared on sign-out. Seen is written on dismiss, or when the user taps Insta Calm itself.

**Never:** No new route or modal. No change to where the FAB is hidden (`/calm-me` subtree, resume banner). No server, schema or PowerSync change. No per-user key; no clearing the flag on sign-out. Not shown when MMKV is unavailable (degraded mode) or before MMKV has loaded.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First launch after install | flag unset, FAB visible | callout under the button | N/A |
| Dismissed | tap "Got it" | callout hides, flag stored, never shown again | write failure: hide for this session |
| Tapped the button | tap Insta Calm while callout shown | flag stored, callout hides, navigates to `/calm-me` as before | N/A |
| Relaunch / sign-out / sign-in | flag set | no callout | N/A |
| Reinstall | MMKV wiped | callout shown again (accepted, incl. existing account) | N/A |
| FAB hidden | `/calm-me*` or resume banner | no callout, flag untouched | N/A |
| MMKV null / still loading | no store | no callout | N/A |

</frozen-after-approval>

## Code Map

- `packages/core/src/constants/kvKeys.ts` -- add device-scoped constant `INSTA_CALM_INTRO_SEEN: 'calm_me:intro_seen'` beside `PREVIEW_CHALLENGES` (same sign-out-must-not-clear note)
- `packages/supabase/src/auth/OnboardingProvider.tsx` -- add `instaCalmIntroSeen` (context default and initial state `true` so nothing flashes) and `markInstaCalmIntroSeen`; read once when `mmkv` is ready via its OWN effect keyed on `[mmkv]` (not the existing `[userId]` effect — `_layout.tsx` loads `mmkv` async, so a `[userId]`-keyed read would never re-run and the callout would never show), independent of `userId`; sign-out reset block must NOT touch it; null store keeps `true`; `markInstaCalmIntroSeen` sets local state BEFORE the MMKV write, inside try/catch, so a write failure still hides it for the session
- `packages/supabase/src/auth/useAuth.ts` -- expose both fields beside `firstHomeVisitSeen`
- `apps/mobile/src/components/CalmMeFab.tsx` -- render callout under the button when `!instaCalmIntroSeen`; `handlePress` marks seen first; reuse hidden-state returns (`:30-31`)
- `apps/mobile/src/components/InstaCalmIntroCallout.tsx` -- new presentational callout (text, "Got it"), `accessibilityLiveRegion="polite"` (Android only) PLUS `AccessibilityInfo.announceForAccessibility(title + body)` on mount for iOS VoiceOver; `pointerEvents` so only its own card is touchable; capped max width so it stays clear of top-right controls
- `apps/mobile/src/i18n/locales/en.json`, `hi.json` -- `calmMe.intro.{title,body,dismiss}`
- `apps/mobile/src/components/CalmMeFab.test.tsx`, provider tests (`packages/supabase`) -- cover the matrix; existing mocks of `useAuth` need the new fields
- Do not modify: `packages/ui` `CalmMeButton`, `app/calm-me/*`

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/constants/kvKeys.ts` -- device-scoped key -- survives sign-out, wiped on reinstall
- [ ] `OnboardingProvider.tsx`, `useAuth.ts` + tests -- flag read/write, default `true`, not reset on sign-out
- [ ] `InstaCalmIntroCallout.tsx`, `CalmMeFab.tsx`, `en.json`, `hi.json` + tests -- callout, dismissal, tap-marks-seen, a11y announcement
- [ ] Rebuild `packages/core` and `packages/supabase` `dist` so mobile resolves the new exports

**Acceptance Criteria:**
- Given a fresh install, when the first screen showing Insta Calm appears, then the callout shows once, below the button, and the button stays tappable
- Given the callout is shown, when "Got it" or the button is tapped, then it hides and does not return after relaunch, sign-out or sign-in
- Given a screen reader is on (Android TalkBack and iOS VoiceOver), when the callout appears, then its text is announced and "Got it" is reachable
- Given the callout is shown on the sign-in or any onboarding screen, then it does not cover any tappable control on that screen (including with the keyboard up); before building, list the top-right controls within ~120pt of the FAB on those screens and check each
- Given MMKV finishes loading after first render, when the flag is unset, then the callout still appears (provider test: `mmkv` prop transitions `undefined` → store)
- Given sign-out, then `instaCalmIntroSeen` is unchanged (provider test)
- Given `pnpm turbo typecheck lint test`, then all pass (core boundary and i18n/a11y gates intact)

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Default-`true` is deliberate: until MMKV has loaded (or if it is unavailable) the safe state is "do not show", so a signed-in user never sees a flash on every cold start and cold-start latency is untouched. Existing account reinstalling sees the callout again; accepted per the epic (Story 18.7 interplay).

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green

**Manual checks (if no CLI):**
- Android dev client: clear app data, launch; callout appears on first screen with the FAB; "Got it" hides it; relaunch and sign-out/in do not bring it back
