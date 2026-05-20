# UX Consistency Patterns

## Pattern 7 — Mode Register Transitions

**Entry transition ("Let's do this" → in-the-moment):**
Cross-fade, ~250–300ms, `Easing.inOut(Easing.quad)`. Driven by `useFocusEffect` inside `InTheMomentScreen` — not router-level animation config (brittle on Android 10 + RN 0.74). The cross-fade constitutes the "moment of witness." No sound. Haptic: single pulse at fade-in completion — on/off user setting, post-MVP. NativeWind must not own `opacity` on animated elements; keep animated properties out of the CSS custom property pipeline.

**Return transition (in-the-moment → reflection):**
Asymmetric. Departure: ~250–300ms ease-in. Return: ~500–600ms ease-out, warmer and slower. If the reflection register uses a different background colour, the colour transition is part of the animation — not a snap after it. Encapsulated in `useModeTransition({ direction: 'enter' | 'exit' })` so the asymmetry is a named, auditable decision. Reduced-motion gated via `AnimationContext` (AC: ANIM-001) — `packages/ui/src/contexts/AnimationContext.tsx`, exported from `packages/ui/index.ts`. Duration collapses to `0` when `reduceMotion: true`.

**CalmMe interrupt:**
Dim overlay. `CalmMeOverlay` rendered in root `_layout.tsx` above `<Stack>` with `position: 'absolute', zIndex: 9999`. State: `useCalmMeStore` (Zustand) — `{ isOpen: boolean, open: () => void, close: () => void }`. `CalmMeButton` calls `open()` — no router involvement. Underlying screen never unmounts; prior state is fully preserved by construction. MVP dim: fixed 40–50% opacity. Overlay dismisses with 200–300ms ease-out lift. Reduced-motion: dim appears/disappears instantly. Full-screen router push explicitly rejected — `router.back()` does not preserve scroll position, partial form state, or mid-transition animation state. `@gorhom/bottom-sheet` deferred to Phase 1 (upgrade condition: both it and NativeWind v5 stable).

**Post-MVP CalmMe enhancements:**
- Mode-conditional dim: 80–90% opacity when invoked from in-the-moment mode; 40–50% from preparation/reflection
- Blur: iOS `UIVisualEffectView` + Android 12+ `RenderEffect` when Android 10 floor drops
- Haptic on/off toggle in settings

---

## Pattern 8 — Recommendation Transparency

**Register:** Personal-causal. The app speaks to the user's current state and connects it to the recommendation.

**Formula:** `"You're [state] — [recommendation] is [connector]."`

**Structure rules:**
- Opens with "You're" or "You've" — personal anchor first
- Em-dash connects state to recommendation; never "because" or "therefore"
- Recommendation named before rationale
- Hard cap: ~15 words. If the rule needs more words, it is too complex to surface
- Never mentions algorithm, engine, or system
- Recommendations do not incorporate dissent history — suggestions are not adjusted based on whether the user previously ignored them. The UI always offers equal-weight access to alternatives so the formula is never perceived as a gate.

**SUDS literacy:** SUDS scale displays the full static anchor set at all times — not just the extremes (FR-SUDS-ANCHOR-01): 0 = completely calm, 2 = very mild, 4 = mild, 6 = moderate, 8 = severe, 10 = worst imaginable. Anchors are inline subtext visible during rating entry, never behind a tooltip or expandable. This is the mechanism for building SUDS literacy — not interpolated copy in the recommendation formula. Further SUDS education is post-MVP.

**In-the-moment exception:** On in-the-moment surfaces, the formula collapses to an imperative. Drop the state descriptor entirely; lead with the recommendation. The personal-causal register applies to check-in results, technique selection screens, and ladder nudges — not in-the-moment surfaces where every word is cognitive overhead.

**By recommendation type:**

| Type | Standard formula | In-the-moment |
|---|---|---|
| Technique (SUDS-based) | *"You're at a 7 — breathing is the right starting point."* | *"Start with breathing."* |
| Technique (mastery-based) | *"You've used box breathing five times — let's try something new."* | *"Try something new."* |
| Ladder position | *"You're ready for the next step — this situation is within reach."* | — |
| Re-entry | *"You've been away a few days — a grounding exercise is a good way back in."* | — |

---

## Pattern 9 — Progress Delivery

**Principle:** Progress is delivered, not stored. It surfaces at re-entry moments — not in a stats tab the user must seek out.

**Frame order:**
1. Action-anchored acknowledgement — always present, unconditional
2. Outcome-anchored data — opt-in; only surfaced when meaningful data exists

**Action frame invariant:** Action acknowledgement is never conditional on outcome. It appears regardless of SUDS delta, letter presence, or session completeness.

**Outcome frame:** Always accompanied by an interpretive sentence — permanently, not first-use only. The number alone is never surfaced. Example: *"Your anxiety predicted an 8. It reached 5. Lower than you expected — that's the pattern exposure therapy works on."*

**Outcome opt-in:** After the action frame, a single prompt: *"Want to see how your prediction compared?"* Tapping reveals the outcome frame. Dismissing returns home. This applies to post-exposure debrief. The outcome frame is an invitation, not a consequence — particularly important for users whose session was hard.

**Ladder stability contract:** Week 4/8 review reads from the ladder's creation-date snapshot — not the current ladder state. The copy references the user's verbatim first-entry situation descriptions, not any renamed or reorganised items. This is a data-model contract, not only a copy rule.

**By moment:**

| Moment | Action frame | Outcome frame (opt-in) |
|---|---|---|
| Post-exposure debrief | *"You showed up for [situation]."* | *"Your anxiety predicted X. It reached Y. [Interpretive sentence]."* |
| Prediction vs. reality reveal | *"You wrote this before you went in."* | *[User's own words → SUDS delta → interpretive sentence]* |
| Week 4/8 ladder review | *"When you started, these felt impossible."* | *"Here's where you are now."* (not opt-in — review context makes outcome expected) |
| Technique graduation | *"You've used [technique] enough to trust it."* | *"We're adding something new."* |

**Post-MVP review trigger:** At 6-week data review, segment users who saw both frames vs. action-only. Evaluate whether outcome data changes re-engagement or produces comparison anxiety. Adjust frame order or optionality based on findings.

---
