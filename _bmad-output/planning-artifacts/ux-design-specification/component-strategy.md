# Component Strategy

## Design System Components (available)

| Layer | Components | Location |
|-------|-----------|----------|
| Primitives | `Button`, `Text`, `Input`, `Card` | `packages/ui/src/primitives/` |
| Composed (specified) | `SudsScale`, `ProgressChart`, `CrisisCard` | `packages/ui/src/composed/` |

---

## Custom Components — MVP (12)

### `BackButton`

**Purpose:** Icon-only back button rendered in the navigation header on any screen with a previous screen in the stack.

**Usage:** All Stack screens where `navigation.canGoBack()` is true. Configured once per Stack layout via `screenOptions.headerLeft`; never imported directly by screen files.

**Anatomy:** Left-pointing chevron — 12×12pt box with `borderTopWidth` + `borderLeftWidth` at 2pt, rotated −45°. No text label.

**States:** Single. Shown only when the enclosing header is visible (header visibility is itself conditional on `navigation.canGoBack()`).

**Tap target:** 44×44pt visual container (`width: 44, height: 44`) — meets the visual-dimension accessibility requirement, not reliant on hitSlop.

**Accessibility:** `accessibilityRole="button"`, `accessibilityLabel="Go back"`.

**Suppression:** Screens reached via `router.replace` where back-navigation is intentionally blocked (e.g. `ladder.tsx` post-assessment) use `<Stack.Screen options={{ headerShown: false }} />` to override the layout default.

---

### `HomeStateCard`

**Purpose:** Renders the contextual home screen for one of 10 discrete states. Layout is invariant across all states; only content changes.

**Usage:** Home screen, all 10 states.

**Anatomy:** Eyebrow + date → Greeting (DM Serif Display) → Illustration (register-matched SVG, `aria-hidden`) → Context card → Primary CTA → Secondary options row

**States:** `first-use` · `empty-ladder` · `morning` · `progressing` · `avoidance` · `mid-exposure` · `return-after-gap` · `completed` *(8 states; `post-exposure`/`expired` removed 2026-06-15 by Story 5.6 — Issue #36)*

**Mode register:** `grounding` for states 4/5/6 · `preparing` for states 3/9/10

**Behavioural contract:** State resolved by `resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState` — pure function, no side effects, lives in `packages/core` (not `packages/ui`). Component receives resolved state as prop; does not resolve internally.

**Accessibility:** Greeting announced first by screen reader. Primary CTA has semantic role. Illustration is decorative (`aria-hidden`).

---

### `LadderItemCard`

**Purpose:** Single fear ladder item — draggable in builder and edit modes. Displays situation name, SUDS badge, and item actions.

**Usage:** F2 builder, ladder edit view.

**Anatomy:** Drag handle → Situation name (editable on tap) → SUDS badge (0–10 with subtext) → Edit icon → Delete icon

**States:** `default` · `dragging` (elevated shadow, haptic: `dragConfirmation`) · `editing` (name field active) · `pending-delete`

**Variants:** `builder` (creation flow — rationale shown for suggested reframe) · `edit` (ladder management — same drag-and-rank view)

**Accessibility:** Drag handle has keyboard alternative (up/down arrow reorder). SUDS badge: `aria-label="SUDS rating X out of 10"`. Delete requires explicit confirmation.

**Open ADR:** Pending-delete mechanism — undo timer vs. confirm dialog — deferred to implementation ADR.

---

### `DragRankList`

**Purpose:** Ordered container for `LadderItemCard` with drag-and-drop reordering. Guard state when `items.length === 1`.

**Usage:** F2.

**Anatomy:** Ordered list of `LadderItemCard` → Soft nudge banner (injected at `items.length === 8`) → Single-item guard (when `items.length === 1`)

**States:** `single-item` (guard — drag hidden, "Add another situation" prompt shown, drag-and-rank hidden) · `multi-item` (default, drag-and-rank visible from item 2) · `dragging-active`

**Soft nudge at item 8:** *"That's a solid ladder — most people find 10–15 items gives enough gradient to work with."* Dismissible. Clinical framing.

**Accessibility:** Keyboard reordering via accessible up/down actions (implementation-defined). Position change announced via `aria-live`.

**Open ADR:** Drag library choice (`react-native-draggable-flatlist` vs. custom Reanimated + Gesture Handler) — deferred to implementation ADR. Keyboard reordering implementation target — deferred to same ADR. Confirm Gesture Handler and Reanimated are in Expo config before build.

---

### `TechniqueCard`

**Purpose:** Selectable card for a single technique. Displays technique name, description, and SUDS-based nudge text when the technique is recommended for the user's current SUDS.

**Usage:** F3 technique selection.

**Anatomy:** Technique icon → Name → Short description → SUDS nudge text (conditional: *"at a SUDS of X, most people start here"*) → Selected state indicator

**States:** `default` · `selected` (teal border + fill) · `recommended` (nudge text visible) · `disabled`

**Variants:** `with-nudge` · `without-nudge`

**Accessibility:** `role="radio"` within a parent `role="radiogroup"` container (owner: consuming screen, not this component). Selected and recommended states announced. Nudge text is supplementary — not the sole means of communication.

---

### `CalmMeButton`

**Purpose:** Persistent floating action button providing zero-navigation access to Calm Me from any screen. Safety requirement — renders above all other JS-layer UI at all times.

**Usage:** All screens.

**Anatomy:** 🌊 icon → "Calm Me" label → Teal pill

**States:** `default` · `pressed` (haptic: `medium`, scale feedback). No loading state — must render instantly.

**Variants:** `pill` (default, icon + label) · `icon-only` (compact or keyboard-obscured screens)

**Mode register:** In-the-moment contract — no mount animation, instant render, zero network dependency. Blocking PR issue if violated.

**Accessibility:** `accessibilityLabel="Open Calm Me support"`. Consistent position top-right across all screens.

**Open ADR:** Rendering strategy — whether `CalmMeButton` must float above native-layer system UI (image picker, share sheet) or only above JS-layer UI determines implementation cost significantly. Options: root `_layout.tsx` absolutely positioned (Option D, MVP-pragmatic if no native modals required above it), or portal-based via `@gorhom/portal`. Decision deferred to implementation ADR.

---

### `SudsArcChart`

**Purpose:** Visualises the SUDS arc for a single exposure session. Renders an irregular time series with a guaranteed minimum of two data points (pre-exposure + debrief).

**Usage:** F3 debrief. Also accessible post-thread from session history. *(F6 state 7 / state 8 usage removed 2026-06-15 by Story 5.6 — Issue #36.)*

**Anatomy:** Y-axis (0–10, subtext anchors) → X-axis (relative) → Data points → Connecting line → Annotations: "Before" (pre-exposure), "After" (debrief) → Area fill (conditional on improvement)

**States:** `two-point` (pre + debrief only) · `multi-point` (in-session logs present) · `no-improvement` (SUDS[debrief] ≥ SUDS[pre-exposure] — muted visual weight, no celebration) · `insufficient-data` (not rendered)

**Mode register:** `reflecting` (motion.reflecting 600ms ease-out). Never animated in grounding or crisis register.

**Accessibility:** Static `accessibilityLabel` on chart container summarising outcome (e.g. *"Your anxiety went from 7 before to 4 after"*). Individual data points have `aria-label` values.

**Open ADRs:**
- Chart library choice (`victory-native` Skia vs. `react-native-gifted-charts` vs. custom `react-native-svg`) — sets post-MVP `LongitudinalSudsChart` strategy; deferred to implementation ADR.
- X-axis definition (wall-clock timestamps vs. ordinal event index vs. elapsed session minutes) — deferred to implementation ADR.
- No-improvement comparison definition (vs. pre-exposure baseline vs. max in-session value) — deferred to implementation ADR.

---

### `LetterToSelfEditor`

**Purpose:** Writing surface for the pre-exposure prediction letter. Includes a deliberate pause mechanism — the continue button does not activate on first render.

**Usage:** F3, optional pre-exposure step (recommended framing for SUDS ≥ 7).

**Anatomy:** Prompt text → Multi-line text input → Pause indicator → Continue button (initially inactive)

**States:** `writing` (continue inactive) · `pause-active` (user has written; continue still inactive) · `ready` (continue active)

**State machine:** `idle → composing → pause_active → ready_to_continue`. Modelled as explicit state, not a boolean or raw timer ref.

**Special behaviour:** Continue button activates only after pause complete. Not negotiable — prevents reflexive tap-through on a therapeutically significant surface.

**Accessibility:** Input `aria-label="Write your prediction"`. Pause state communicated via `aria-live`.

**Open ADR:** Pause mechanism — time-based (timer fires to unlock continue) vs. explicit-tap ("I'm ready" secondary action unlocks continue). Time-based introduces background/foreground edge cases and a WCAG 2.2.1 compliance question (time-limited controls require extension/disable path). Explicit-tap is simpler and therapeutically defensible. Product and clinical decision — deferred to implementation ADR with recommendation toward explicit-tap.

---

### `LetterReveal`

**Purpose:** Displays the pre-exposure prediction letter alongside the post-exposure reality. Surfaces the prediction vs. reality comparison.

**Usage:** F3 debrief (Branch A, letter-written path). Accessible from session history post-thread. *(F6 state 7 usage removed 2026-06-15 by Story 5.6 — Issue #36.)*

**Anatomy:** "Before" card (user's prediction in their own words) → "After" card (SUDS outcome + debrief notes) → SUDS delta summary

**States:** `revealing` (entrance animation, reflecting register) · `revealed`

**Mode register:** `reflecting` (motion.reflecting 600ms ease-out). Entrance is intentional — not instant.

**Accessibility:** Two landmark regions: `aria-label="Before your exposure"` and `aria-label="After your exposure"`.

**Open ADR:** Reveal trigger (swipe vs. tap vs. dedicated button) and relationship between entrance animation and reveal trigger — deferred to implementation ADR.

---

### `AcknowledgementCard`

**Purpose:** Post-exposure acknowledgement for the no-letter path. Warm recognition tied to what actually happened. Conditionally includes `SudsArcChart` if SUDS improved.

**Usage:** F3 debrief (Branch B / Branch C — no-letter paths). First-class experience, not a fallback. *(F6 state 7 / state 8 usage removed 2026-06-15 by Story 5.6 — Issue #36.)*

**Anatomy:** Acknowledgement text (outcome-tied, not generic) → `SudsArcChart` (conditional: SUDS improved only) → Notes prompt (*"Add notes about today"*)

**States:** `with-arc` (SUDS improved) · `without-arc` (no improvement or two-point flat)

**Copy contract:** Text references what actually happened — not generic attendance acknowledgement. Post-MVP: evolves with session count.

**Open ADR:** Notes persistence contract (local state, session store, or discarded on unmount) — deferred to implementation ADR.

---

### `GroundingPrompt`

**Purpose:** Step-by-step 5-4-3-2-1 sensory grounding sequence, one anchor at a time. User-paced.

**Usage:** F4 Calm Me flow (5-4-3-2-1 selection), Stop Exposure grounding screen.

**Anatomy:** Step indicator (e.g. "3 of 5") → Sense label → Prompt text → Acknowledgement tap → Next step

**States:** `step-1` through `step-5` · `complete`

**Mode register:** `grounding` (motion.grounding 400ms ease-in-out). Reduced motion mandatory — no decorative animation. `useReducedMotionConfig()` required; test suite must cover reduced-motion path.

**Interaction:** Tap to advance. No auto-advance. Back-navigation: deliberately omitted — therapeutic decision (forward-only grounding), documented to prevent future regression.

**Last step behaviour:** Completion state shown; callback fires to parent (`onComplete`). No auto-dismiss.

**Accessibility:** Each step announced via `aria-live`. Sense label read before prompt. Tap target minimum 44×44pt.

---

### `HelplineCard`

**Purpose:** Displays regionally-appropriate helpline contacts from remotely-updatable config. Rendered on the SPIN ≥40 referral screen.

**Usage:** F1 referral screen.

**Anatomy:** Helpline name → Phone number (tappable `tel:` link) → Availability label (e.g. "24/7, free")

**States:** `loaded` · `loading` (skeleton) · `empty` (config unavailable — component omits gracefully, no error shown)

**Data contract:** Numbers served from remote config. Component receives data as props — data fetching and ownership live above `packages/ui` (package boundary). Not hardcoded in app binary; updatable without an app release.

**Accessibility:** `accessibilityLabel="Call [helpline name]: [number]"`. Tappable target opens native dialler.

**Open ADR:** Remote config system (Firebase Remote Config, Supabase table, bundled JSON fallback, Expo Updates config) — deferred to implementation ADR.

---

## Custom Components — Post-MVP (3)

| Component | Replaces / Enhances | Deferral rationale |
|-----------|--------------------|--------------------|
| `LongitudinalSudsChart` | Simplified session list in Achievements | Multi-session habituation curves; not required for core loop. Library choice tied to `SudsArcChart` ADR. |
| `OnboardingProgress` | No step indicator in F1 | Cosmetic; onboarding functions without it. |
| `ReEntryOverlay` | Standard `Card` primitive with re-entry copy | App-kill re-entry works with simpler fallback for MVP. |

---

## Component Implementation Strategy

All custom components built using design system tokens from `packages/ui/src/tokens/theme.ts`. Raw Tailwind utility values (`bg-blue-500`, `p-4`) prohibited in composed components — all colour and spacing must reference design tokens. StyleSheet used only as escape hatch (Reanimated worklets, imperative calculations, NativeWind v5 edge cases).

`packages/ui` import boundary: may import from `packages/core` (types only). Forbidden: `packages/sync`, `packages/supabase`, RN platform APIs. Business logic (state resolution, data fetching) lives upstream; components receive data as props.

Evaluate `react-native-reusables` (rn-primitives, NativeWind-native) and `@gorhom/bottom-sheet` in Phase 0 before building scratch primitives. Written decision memo required, time-boxed to 1 day.

---

## Implementation Roadmap

**Phase 1 — Core (nothing ships without these):**
`HomeStateCard` · `LadderItemCard` · `DragRankList` · `TechniqueCard` · `CalmMeButton` · `SudsArcChart`

**Phase 2 — Loop completion:**
`LetterToSelfEditor` · `LetterReveal` · `AcknowledgementCard` · `GroundingPrompt` · `HelplineCard` · `BreathingCoach`

**Post-MVP:**
`LongitudinalSudsChart` · `OnboardingProgress` · `ReEntryOverlay`

---

## Open ADRs — Engineering Phase

The following decisions are flagged for resolution in implementation ADRs before the relevant sprint begins. They are implementation-layer decisions; the UX contracts above are independent of which option is chosen.

| ADR | Component(s) | Decision |
|-----|-------------|---------|
| ADR-CALM-ME-RENDER | `CalmMeButton` | Rendering strategy: root layout absolute position (MVP-pragmatic, JS-layer only) vs. portal-based (`@gorhom/portal`). Gate question: does CalmMeButton need to float above native-layer system UI (image picker, share sheet)? |
| ADR-DRAG-LIBRARY | `DragRankList`, `LadderItemCard` | `react-native-draggable-flatlist` vs. custom Reanimated + Gesture Handler. Includes keyboard reordering implementation target. Verify Gesture Handler + Reanimated in Expo config before build. |
| ADR-CHART-LIBRARY | `SudsArcChart`, `LongitudinalSudsChart` | Chart library choice sets strategy for both MVP and post-MVP. `victory-native` (Skia, Reanimated 3) recommended; confirm Expo SDK compatibility and binary size impact. |
| ADR-SUDS-ARC-XAXIS | `SudsArcChart` | X-axis definition: wall-clock timestamps vs. ordinal event index vs. elapsed session minutes. |
| ADR-SUDS-ARC-NOIMPROVE | `SudsArcChart`, `AcknowledgementCard` | No-improvement comparison: `SUDS[debrief] ≥ SUDS[pre-exposure]` vs. `SUDS[debrief] ≥ SUDS[max in-session]`. |
| ADR-LETTER-PAUSE | `LetterToSelfEditor` | Pause mechanism: time-based timer vs. explicit "I'm ready" tap. Recommendation: explicit-tap (avoids background/foreground edge cases, WCAG 2.2.1 compliance path simpler). |
| ADR-HELPLINE-CONFIG | `HelplineCard` | Remote config system: Firebase Remote Config, Supabase table, bundled JSON fallback, or Expo Updates config. |
| ADR-DELETE-UX | `LadderItemCard` | Pending-delete mechanism: undo timer (with navigation-commit behaviour) vs. confirm dialog. |
| ADR-NOTES-PERSIST | `AcknowledgementCard` | Notes persistence: local component state, session store, or discarded on unmount. |
| ADR-LETTER-REVEAL | `LetterReveal` | Reveal trigger: swipe vs. tap vs. dedicated button. Relationship between mount animation and reveal trigger for reduced-motion testing. |
| ADR-HOME-STATE-RESOLVE | `HomeStateCard`, `packages/core` | Spec `resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState` — define `HomeScreenContext` type, canonical priority ordering for all 10 states, and minimum 5 happy/sad path test cases. Draft at `adrs/ADR-HOME-STATE-RESOLVE.md`. |
| ADR-ONBOARDING-BREATHING | Onboarding screen, `GroundingPrompt` | Option A (accessible somatic alternative via aria-live + haptic) vs. Option B (documented divergent skip path). Owner: lead designer. Decision required before onboarding sprint. Draft at `adrs/ADR-ONBOARDING-BREATHING.md`. |
| ADR-OFFLINE-DEGRADATION | F3, F4, all network-dependent flows | Define offline degradation policy: minimum criteria, degraded states for F3/F4, reconciliation on reconnect. Owner: engineering lead. Shell at `adrs/ADR-OFFLINE-DEGRADATION.md`. |
| ADR-CALMME-KEYBOARD | `CalmMeButton` | Platform constraint: `zIndex: 9999` does not overlay Android native software keyboard. Define per-platform layout strategy (`adjustResize`/`adjustPan` + `KeyboardAvoidingView`) and whether keyboard should dismiss on Calm Me tap. Draft at `adrs/ADR-CALMME-KEYBOARD.md`. |
| ADR-LADDER-SNAPSHOT | `packages/core`, Supabase schema | Ladder stability contract requires creation-date snapshot storage, not only current state. Define snapshot data model, migration strategy, and audit trail requirements. Draft at `adrs/ADR-LADDER-SNAPSHOT.md`. |
| ADR-ERROR-STATES | All 11 MVP components | Define base fallback error state (app-level error boundary copy) and require each component to specify loading, empty, error, and success state variants before sprint sign-off. Draft at `adrs/ADR-ERROR-STATES.md`. |
| ADR-TECHNIQUE-SUDS-FALLBACK | `TechniqueCard` | Define fallback behaviour when no SUDS data exists (first session or skipped gate): proposed fallback is `without-nudge` variant — nudge text hidden, all techniques shown without recommended indicator. Draft at `adrs/ADR-TECHNIQUE-SUDS-FALLBACK.md`. |
| ADR-DARK-MODE-NATIVEWIND | `packages/ui`, all NativeWind components | Dark mode is deferred. Decision: disable `darkMode` in `tailwind.config`, audit third-party component theme hooks, add CI regression test asserting light-mode-only rendering. Draft at `adrs/ADR-DARK-MODE-NATIVEWIND.md`. |

---
