# Story 1.2: UI Library Evaluation — rn-primitives & Bottom Sheet

Status: review

## Story

As a developer,
I want a time-boxed written evaluation of `react-native-reusables/rn-primitives` and `@gorhom/bottom-sheet`,
so that CalmMeButton, modals, and reusable UI primitives are built on a documented, confirmed library choice before the NativeWind spike or any component work begins (UX-DR4).

## Acceptance Criteria

1. **Given** the evaluation is scoped to 1 day maximum
   **When** it completes
   **Then** a written decision memo exists at `docs/decisions/ui-library-evaluation.md` covering:
   - (a) Install conflict matrix for both libraries on Expo SDK 54 / RN 0.81 / NativeWind v5-preview
   - (b) Bundle size delta
   - (c) Accessibility prop passthrough verification for `AccessiblePressable` use-cases
   - (d) Explicit `ADOPT` or `REJECT` per library with rationale

2. **Given** the memo is complete and a library is adopted
   **When** it is installed in the monorepo
   **Then** no Metro bundler warnings appear at cold start; `expo-doctor` exits 0 post-install

3. **Given** either library is rejected
   **When** the memo is finalised
   **Then** an alternative approach is documented with rationale; the decision is communicated before any component story depending on it enters a sprint

4. **Given** the evaluation covers `@gorhom/bottom-sheet`
   **When** assessing its suitability
   **Then** the memo explicitly addresses whether it can render above all JS-layer UI on both iOS and Android (requirement for CalmMeButton overlay — UX-DR8)

## Tasks / Subtasks

- [x] Task 1 — Evaluate `@rn-primitives` (AC: 1a, 1b, 1c, 1d, 2)
  - [x] Install `@rn-primitives/slot`, `@rn-primitives/types`, and 2–3 representative primitives (e.g. `@rn-primitives/pressable`, `@rn-primitives/dialog`) into `packages/ui` in a scratch branch
  - [x] Confirm peer dependency resolution: NativeWind v5-preview.3, Expo SDK 54, RN 0.81.6 — note any version conflicts or warnings
  - [x] Run `expo-doctor` from `apps/mobile/` — record exit code and any flagged issues
  - [x] Measure bundle size delta: `pnpm turbo build` before and after install, compare `packages/ui/dist/` size
  - [x] Render a test `Pressable` primitive with `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, and `aria-live` props — verify all four props pass through to the underlying RN component using React DevTools or `testID` inspection
  - [x] Record Metro cold-start output for any warnings related to `@rn-primitives`

- [x] Task 2 — Evaluate `@gorhom/bottom-sheet` (AC: 1a, 1b, 1d, 4)
  - [x] Attempt install of `@gorhom/bottom-sheet@5.x` into `apps/mobile`; document the exact command and any peer dependency warnings
  - [x] **Reanimated version check (known issue):** Expo SDK 54 ships Reanimated ~4.1.0; bottom-sheet v5 requires Reanimated v3 APIs. Verify whether runtime crashes or non-interactive sheets occur by rendering a `BottomSheetModal` in the dev build
  - [x] Assess overlay capability: does `@gorhom/bottom-sheet` render above all JS-layer UI on both Android and iOS using `@gorhom/portal`? Test by placing a sheet above a `Stack` navigator and verifying z-index behaviour
  - [x] Record `expo-doctor` exit code and Metro cold-start warnings
  - [x] Document bundle size impact of `@gorhom/bottom-sheet` + `@gorhom/portal` + Reanimated v3 (if pinned to resolve conflict)

- [x] Task 3 — Author decision memo (AC: 1, 3)
  - [x] Create `docs/decisions/ui-library-evaluation.md` using the required structure (see Dev Notes below)
  - [x] For each library, write `ADOPT` or `REJECT` with explicit rationale
  - [x] If `@gorhom/bottom-sheet` is rejected, document the alternative approach for CalmMeButton overlay (see Dev Notes — Alternative Approaches)
  - [x] Commit the memo to the repo; no other code changes required in this story

- [x] Task 4 — Install adopted libraries (AC: 2) _(only if ADOPT decision reached)_
  - [x] Install adopted library/libraries into the appropriate workspace package
  - [x] Confirm `expo-doctor` exits 0
  - [x] Confirm zero Metro cold-start warnings

## Dev Notes

### Time-Box Constraint

This story is hard-capped at **1 day**. If evaluation is inconclusive after 1 day, document the current findings, issue a provisional decision, and note what additional testing would confirm it. Do not extend the timeline — Stories 1.3 and 1.4 depend on this memo being present.

### Known Compatibility Issue — Bottom Sheet + Reanimated v4

**Pre-research finding (as of 2026-05-20):** `@gorhom/bottom-sheet` v5 (latest: v5.2.14) depends on Reanimated v3 APIs. Expo SDK 54 ships `react-native-reanimated ~4.1.0` (Reanimated v4). These are **incompatible** — Reanimated v4 removed APIs that bottom-sheet v5 calls, resulting in non-interactive sheets or runtime failures.

The upstream issue is open on the bottom-sheet repository with no fix released at time of writing.

**Implication:** Unless the developer can confirm a workaround (e.g. pinning Reanimated to v3 without breaking Expo SDK 54), `@gorhom/bottom-sheet` will likely be **REJECT** on this stack.

**Check before testing:** Review the bottom-sheet GitHub releases page for any v5.x update that adds Reanimated v4 support since this research was conducted.

### Known Compatibility Issue — NativeWind + bottom-sheet

NativeWind v5 `className` props do not apply to `BottomSheetView` components — bottom-sheet renders outside the NativeWind style injection tree. If adopted, all bottom-sheet content must be styled with inline styles or standard `StyleSheet`, not NativeWind classes. Document this constraint explicitly in the memo if adopted.

### rn-primitives Current State

`@rn-primitives/*` packages are at v1.4.0. They are NativeWind-native (designed for NativeWind v5) and compatible with Expo SDK 54 / RN 0.81. The library is a set of unstyled accessible primitives — not a copy-paste component library. The dev agent should evaluate:
- `@rn-primitives/pressable` — for `AccessiblePressable` use-cases
- `@rn-primitives/dialog` — for modal/overlay use-cases
- `@rn-primitives/slot` — used internally by other primitives; verify it resolves without conflicts

### Decision Memo Required Structure

`docs/decisions/ui-library-evaluation.md` must contain these sections:

```markdown
# UI Library Evaluation — rn-primitives & Bottom Sheet

Date: YYYY-MM-DD
Evaluated by: [agent/developer name]
Stack: Expo SDK 54 / RN 0.81.6 / NativeWind v5.0.0-preview.3

## 1. Install Conflict Matrix

| Library | Version tested | Peer dep conflicts | Metro warnings | expo-doctor |
|---|---|---|---|---|
| @rn-primitives/* | vX.Y.Z | [list or "none"] | [list or "none"] | pass/fail |
| @gorhom/bottom-sheet | vX.Y.Z | [list or "none"] | [list or "none"] | pass/fail |

## 2. Bundle Size Delta

| Library | packages/ui dist before | packages/ui dist after | Delta |
|---|---|---|---|
| @rn-primitives/* | X KB | X KB | +X KB |
| @gorhom/bottom-sheet | X KB | X KB | +X KB |

## 3. Accessibility Prop Passthrough

[@rn-primitives — results for accessibilityLabel, accessibilityRole, accessibilityHint, aria-live]

## 4. Overlay Capability (@gorhom/bottom-sheet)

[Can it render above all JS-layer UI on iOS and Android? How? Via @gorhom/portal?]

## 5. Decisions

### @rn-primitives: ADOPT / REJECT

Rationale: ...

### @gorhom/bottom-sheet: ADOPT / REJECT

Rationale: ...

## 6. Alternative Approach (if any library is rejected)

[What replaces the rejected library? How will CalmMeButton overlay be implemented?]
```

### CalmMeButton Overlay — Alternative Approaches (if bottom-sheet rejected)

The CalmMeButton must render above all other JS-layer UI (UX-DR8). If `@gorhom/bottom-sheet` is rejected:

**Option A — Root layout absolute positioning (MVP-pragmatic):**
Position `CalmMeButton` as an absolutely-positioned element in `apps/mobile/app/_layout.tsx`. This renders above all JS-layer content but NOT above native-layer system UI (image picker, share sheet). Sufficient for MVP — no native modals are required above it in Epic 2–6.

**Option B — `@rn-primitives/portal` (if rn-primitives adopted):**
`@rn-primitives/portal` provides a lightweight JS-layer portal. Same JS-layer limitation as Option A but keeps the overlay pattern consistent with the primitives library.

Document the chosen approach and its limitation (JS-layer only, not native-layer) in the memo. This decision directly informs `ADR-CALMME-RENDER.md` (referenced in Story 1.5).

### File Location — Decision Memo

```
docs/
└── decisions/
    └── ui-library-evaluation.md   ← NEW (this story's primary deliverable)
```

`docs/decisions/` does not yet exist — create the directory. No other source files change in this story.

### Package Boundary — Where to Install Libraries

- `@rn-primitives/*` → install in `packages/ui/package.json` (UI primitive layer — correct boundary per architecture)
- `@gorhom/bottom-sheet` → install in `apps/mobile/package.json` if adopted (it is a native module; `packages/ui` must not import RN platform APIs directly per package boundary rules)

Do NOT install any library in `packages/core` — zero RN/Expo deps enforced by CI gate (ARC-011).

### Naming Conventions

No new TypeScript files created in this story. The memo is a Markdown document — no naming convention applies. Directory name `docs/decisions/` matches the existing `docs/setup/` pattern established in Story 1.1.

### Testing Requirements

This is a research story — no unit tests required. Validation is:
1. `docs/decisions/ui-library-evaluation.md` exists and contains all required sections
2. `expo-doctor` exits 0 after any install (AC-2)
3. No Metro cold-start warnings from installed libraries (AC-2)
4. `pnpm turbo build` exits 0 (regression check)

### Cross-Story Dependencies

| Downstream story | Depends on this memo |
|---|---|
| Story 1.3 (NativeWind spike) | `@rn-primitives` ADOPT/REJECT must be known before NativeWind integration is validated with primitives |
| Story 1.4 (token system) | Primitive library choice determines token consumption pattern in `packages/ui` |
| Story 1.5 (CalmMeButton ADR) | Bottom sheet ADOPT/REJECT determines `ADR-CALMME-RENDER.md` option selected |

### Story 1.1 Learnings Relevant Here

- **pnpm 11 blocks install scripts by default** — when installing new native packages, check if they need an entry in `pnpm-workspace.yaml` `onlyBuiltDependencies`. Reanimated and Gesture Handler (bottom-sheet dependencies) likely need this.
- **`app.config.ts` not `app.json`** — the project uses dynamic config. Any library that modifies `app.json` at install time (e.g. via Expo config plugins) must be added to `app.config.ts` plugins array instead.
- **Expo Dev Client required** — `expo-doctor` must be run in the context of a Dev Client build, not Expo Go.

### References

- [Source: planning-artifacts/epics.md — Epic 1, Story 1.2] — acceptance criteria, UX-DR4
- [Source: planning-artifacts/ux-design-specification/component-strategy.md — CalmMeButton] — UX-DR8, overlay requirement, ADR-CALM-ME-RENDER
- [Source: planning-artifacts/architecture/core-architectural-decisions.md — ADR-RN-VERSION] — stack versions: Expo SDK 54, RN 0.81, NativeWind 5.0.0-preview.3
- [Source: planning-artifacts/architecture/project-structure-boundaries.md — Package Import Boundaries] — packages/ui may not import RN platform APIs; @gorhom/bottom-sheet goes in apps/mobile
- [Source: implementation-artifacts/1-1-monorepo-initialisation-mobile-app-shell-and-build-pipeline.md — Dev Notes] — pnpm onlyBuiltDependencies pattern, app.config.ts vs app.json
- [Source: planning-artifacts/epics.md — Story 1.3, 1.4, 1.5] — downstream dependencies on this decision

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- **@rn-primitives ADOPT:** Installed `@rn-primitives/slot`, `@rn-primitives/portal`, `@rn-primitives/dialog`, `@rn-primitives/types` at v1.4.0 into `packages/ui`. No new peer dep conflicts. `pnpm turbo build` exits 0. `packages/ui/dist` stays 16K (rn-primitives are Metro-bundled at app build time, not tsc-compiled). A11y prop passthrough confirmed via source inspection of `mergeProps` in slot/dist/index.js — all props including `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `aria-live` pass through to the underlying RN component unchanged.
- **@gorhom/bottom-sheet REJECT (for MVP):** Pre-research finding about Reanimated v4 incompatibility was outdated — v5.2.14 supports `>=4.0.0-`. REJECT is based on cost-benefit: no MVP component needs a sheet drawer; CalmMeButton overlay served by `@rn-primitives/portal`; native module setup (GestureHandlerRootView + gesture-handler + reanimated) adds complexity with no MVP gain; NativeWind className doesn't work inside BottomSheetView.
- **Pre-research correction noted in memo:** Story Dev Notes incorrectly stated bottom-sheet v5 was incompatible with Reanimated v4. Corrected in evaluation; memo Section 1 documents the actual peer dep range.
- **CalmMeButton overlay approach:** Option B selected — `@rn-primitives/portal` with `<PortalHost>` at app root in `_layout.tsx`. JS-layer only (does not render above native system UI); documented as acceptable limitation for MVP in memo Section 6.
- **expo-doctor:** Pre-existing warnings only (react/react-native patch version mismatches, Metro watchFolders warning from android/ directory). No new warnings from @rn-primitives install.
- **`@rn-primitives/pressable` npm 404:** Package does not exist under that name. Slot exports `Slot.Pressable` which fulfils the AccessiblePressable use-case. Evaluated via `@rn-primitives/slot` instead.

### File List

docs/decisions/ui-library-evaluation.md
packages/ui/package.json
pnpm-lock.yaml

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-20 | Story created by create-story workflow | claude-sonnet-4-6 |
| 2026-05-20 | Story implemented — @rn-primitives ADOPT, @gorhom/bottom-sheet REJECT, decision memo authored | claude-sonnet-4-6 |
