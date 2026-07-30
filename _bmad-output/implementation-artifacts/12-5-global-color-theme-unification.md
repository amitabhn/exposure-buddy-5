# Story 12.5: Global Color Theme Unification (Palette-Only)

**Status:** done

## Story

As a user moving between any two screens in the app,
I want a consistent visual palette everywhere,
So that the app reads as one coherent product instead of a patchwork of an old grey/black theme and the new warm redesign (FR-UXENH-01).

*Requested directly as a cross-cutting consistency pass, not sourced from a Claude Design mockup. Distinct from Stories 12.3 (Ladder) and 12.4 (Exposure Flow), which remain open placeholders for their own future full UX redesigns — this story only changes colour values, not layout, copy, or component structure, on any screen including the ones 12.3/12.4 will eventually redesign more deeply.*

---

## Acceptance Criteria

See the full Given/When/Then acceptance criteria under Story 12.5 in `_bmad-output/planning-artifacts/epics.md` (Epic 12). Summary:

1. Palette-only: zero layout/copy/component/logic changes on any of the 21 files touched. Stories 12.3/12.4 are not closed or superseded by this story.
2. 21 screen files migrated from the pre-redesign grey/black palette onto `packages/ui`'s 8 semantic tokens.
3. A uniform mapping table applied across all files (see below) — collapsing the old 3-tier grey system onto the token system's 2 content tiers, converting the one leftover accent-blue CTA to brand green, leaving disabled-grey/error-red/crisis-semantic colours untouched as established exceptions.
4. No test changes required — confirmed no existing test asserts on a colour value.

**Colour mapping applied:**

| From | To | Notes |
|---|---|---|
| `#ffffff` (background) | `color.surface.primary` | text-on-dark unchanged |
| `#111827` | `color.content.primary` | |
| `#374151`, `#6b7280` | `color.content.secondary` | both collapse to the one secondary tier |
| `#f9fafb`, `#f3f4f6`, `#e5e7eb` | `color.surface.secondary` | bordered cards → borderless filled cards where that matches Home/Sign-in |
| `#d1d5db` | `color.content.primary` (input underlines) / `color.surface.secondary` (elsewhere) | |
| `#1d4ed8` | `color.accent.courage` | leftover pre-redesign accent blue, `ladder.tsx`'s "Start session" button |
| `#9ca3af`, `#ef4444` | unchanged | established Story 12.1 exceptions (disabled grey, error red) |
| crisis/destructive/success semantics | unchanged | out of scope — safety/status colours, not general UI palette |

---

## Tasks / Subtasks

### T1 — Survey (AC: 2)

- [x] Repo-wide grep for pre-redesign hex colours across `apps/mobile/app/**/*.tsx` (excluding `.test.tsx`)
- [x] Confirm no test file asserts on colour values (only `minHeight` assertions found in 3 calm-me tests, unaffected)

### T2 — Migrate onboarding + auth + misc screens (AC: 2, 3)

- [x] `apps/mobile/app/(onboarding)/{assessment,complete,ladder,welcome}.tsx`
- [x] `apps/mobile/app/(auth)/otp-verification.tsx`
- [x] `apps/mobile/app/(app)/settings/index.tsx`
- [x] `apps/mobile/app/privacy-notice.tsx`
- [x] `apps/mobile/app/reminder-settings.tsx`

### T3 — Migrate Calm Me screens (AC: 2, 3)

- [x] `apps/mobile/app/calm-me/{index,breathing,grounding,helplines}.tsx`

### T4 — Migrate session (exposure flow) screens (AC: 2, 3)

- [x] `apps/mobile/app/session/{intent,briefing,technique,active,pause,grounding,debrief,abandoned}.tsx`

### T5 — Migrate full ladder screen (AC: 2, 3)

- [x] `apps/mobile/app/ladder.tsx` — includes the `#1d4ed8` → `color.accent.courage` "Start session" button fix

### T6 — Verify (AC: 4)

- [x] `pnpm turbo typecheck lint test` green across all packages/apps with zero test file changes

---

## Dev Notes

- **Explicitly not a redesign.** This story's entire job is swapping colour values for tokens. No screen's layout, copy, spacing, or component tree changes. Where a bordered card converts to a borderless filled `color.surface.secondary` card, that's the one visual-language choice this story makes uniformly (matching what Stories 12.1/12.2 already shipped) — everything else about that card (padding, radius, text) is untouched.
- **The 3-tier-to-2-tier grey collapse loses a small amount of hierarchy nuance** (`#374151` and `#6b7280` both become `color.content.secondary`) but there's no third token to preserve it with, and this exact collapse was already made by Stories 12.1/12.2 — this story just applies it consistently everywhere else.
- **`#9ca3af` and `#ef4444` are deliberately NOT touched**, matching the precedent explicitly documented in Story 12.1 (disabled-state grey, validation-error red — neither is part of the 8-token palette).
- **Crisis-banner and destructive/success colours are out of scope on purpose.** These carry safety/status meaning (e.g. the crisis-keyword banner in `ladder.tsx`, the destructive "Remove item" red) that is orthogonal to general UI theming — conflating them with the brand palette would be a scope and, more importantly, a safety-communication mistake.
- **Implementation was parallelized across 4 background agents** (onboarding+auth+misc, calm-me, session flow, full ladder screen), each given the same mapping table and the two exemplar files (`(app)/index.tsx`, `(auth)/sign-in.tsx`) to model from, to keep interpretation consistent across agents. Final verification and any cross-file consistency fixes were done directly afterward.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

None — no blocking issues. `pnpm turbo typecheck lint test` passed clean after implementation, with zero test file changes required.

### Completion Notes List

- T1: Survey found 21 files, ~175 individual hex colour declarations, across onboarding, auth, calm-me, session, settings, privacy, reminders, and the full ladder screen.
- T2–T5: Migrated per the mapping table; see the branch diff for the full per-file changes.
- T6: Full monorepo `pnpm turbo typecheck lint test` green.

### File List

- `apps/mobile/app/(onboarding)/assessment.tsx` (modified)
- `apps/mobile/app/(onboarding)/complete.tsx` (modified)
- `apps/mobile/app/(onboarding)/ladder.tsx` (modified)
- `apps/mobile/app/(onboarding)/welcome.tsx` (modified)
- `apps/mobile/app/(auth)/otp-verification.tsx` (modified)
- `apps/mobile/app/(app)/settings/index.tsx` (modified)
- `apps/mobile/app/privacy-notice.tsx` (modified)
- `apps/mobile/app/reminder-settings.tsx` (modified)
- `apps/mobile/app/calm-me/index.tsx` (modified)
- `apps/mobile/app/calm-me/breathing.tsx` (modified)
- `apps/mobile/app/calm-me/grounding.tsx` (modified)
- `apps/mobile/app/calm-me/helplines.tsx` (modified)
- `apps/mobile/app/session/intent.tsx` (modified)
- `apps/mobile/app/session/briefing.tsx` (modified)
- `apps/mobile/app/session/technique.tsx` (modified)
- `apps/mobile/app/session/active.tsx` (modified)
- `apps/mobile/app/session/pause.tsx` (modified)
- `apps/mobile/app/session/grounding.tsx` (modified)
- `apps/mobile/app/session/debrief.tsx` (modified)
- `apps/mobile/app/session/abandoned.tsx` (modified)
- `apps/mobile/app/ladder.tsx` (modified)
- `_bmad-output/planning-artifacts/epics.md` (modified — Story 12.5 ACs, Epic 12 summary)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

### Change Log

- 2026-07-30 — Implemented Story 12.5: global colour theme unification across 21 remaining screens, migrating the pre-redesign grey/black palette onto `packages/ui`'s semantic tokens. Palette-only — no layout, copy, or logic changes. Status: done.
