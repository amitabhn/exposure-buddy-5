# Resolved Work

Log of deferred items that have been fully closed. Entries are ordered most-recent-first.

---

## Calm Me button final icon — RESOLVED 2026-07-02

_Originally a MUST-HAVE-before-MVP UX decision from the 2026-06-18 manual smoke test of Story 7.1. Closed by commit `bd09b58` on branch `pre-mvp-fixes`._

**What was done:**
- Replaced the placeholder Text-glyph icon (`♡` heart outline, later an Ionicons `leaf-outline`) with a custom `IconCalmMe.png` asset.
- Button restyled to a white background with a green (`#2D6A5A`) outline border.

[`packages/ui/src/components/CalmMeButton.tsx`, `packages/ui/src/assets/IconCalmMe.png`]

---

## Calm Me FAB margin/safe-spacing audit — RESOLVED 2026-07-02

_Originally deferred post-MVP on 2026-07-01. Closed by commits `c29c94f` and `3323450` on branch `pre-mvp-fixes`._

**What was done (full audit):**
- `CalmMeFab` now positions itself at `insets.top + 8` via `useSafeAreaInsets`, clearing the Dynamic Island and punch-hole cameras on all devices.
- All headerless screens were updated to replace hardcoded `paddingTop` values with inset-aware equivalents (`insets.top + 16`): home, settings, all session screens (active, briefing, grounding, pause, debrief, abandoned), and calm-me screens.
- Heading text that sits in the top-right quadrant of headerless screens received `paddingRight: 88` to keep it clear of the FAB: home greeting, settings heading, session/active title, onboarding/ladder title.
- Screens with native headers (`ladder.tsx`, `privacy-notice.tsx`, `reminder-settings.tsx`, `session/intent.tsx`, `session/technique.tsx`, onboarding/assessment) were audited: the FAB sits in the right side of the empty header bar area, content text starts at `header_height + paddingTop` (≥68 px below the FAB bottom), no text overlap.
- Onboarding screens with vertically-centred content (`welcome.tsx`, `complete.tsx`) have content in the middle of the screen; FAB is at the top; no overlap risk.

[`apps/mobile/src/components/CalmMeFab.tsx`, `apps/mobile/app/(onboarding)/ladder.tsx`]
