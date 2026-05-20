# Responsive Design & Accessibility

## Responsive Strategy

**Mobile (primary — all clinical modes):**
375pt minimum screen width (iPhone SE floor). All component layouts tested at
`screenWidth: 375`. Flexbox single-column. Horizontal padding: 16pt each side
(343pt content width at floor). No component may break or clip at 375pt.
Portrait orientation primary — landscape is not a supported layout target for MVP.

**Web (document-oriented, Phase 2):**
`apps/web` is a placeholder at MVP with no active stack. Web breakpoint strategy
is a Phase 2 decision made in the context of the chosen web framework. Default
when Phase 2 activates: 375 / 768 / 1280 (mobile / tablet / desktop).

**Shared tokens — resolution-agnostic now:**
All spacing, typography, and colour tokens in `packages/ui/src/tokens/theme.ts`
must be resolution-agnostic — no hardcoded breakpoint values in shared tokens.
Zero effort at MVP; unblocks Phase 2 web stack adoption.

---

## Accessibility Strategy

**Formal compliance target: WCAG 2.1 AA**
The product commits to WCAG 2.1 AA for MVP. Stated formally — not implied by
individual component decisions. AA is the right floor for clinical credibility
and the trust contract with users managing a health condition. Cited in the a11y
test plan. WCAG 2.2 AA (target spacing 48×48pt) is a named post-MVP capability.

**Colour contrast audit — pre-sprint-1 gate:**
Owner: lead designer. Tool: Stark (design tool plugin) or automated token
contrast check in CI against `packages/ui/src/tokens/theme.ts`. All colour
tokens tested at 4.5:1 (normal text) and 3:1 (large text / UI components).
Known risk: `accent.grounding: #8B6F47` on white — verify or replace before
sprint 1.

Decision tree when a token fails:
1. Adjust token value to nearest passing hue (designer decision, <1 hour)
2. If hue adjustment breaks therapeutic intent — escalate to design review
   with clinical context
3. If no passing value preserves therapeutic intent — redesign component
   interaction so the element carries no text contrast obligation (decorative
   use only)

Gate sign-off: designer + QA async approval. No component enters sprint 1
without written sign-off on this audit. The formal WCAG 2.1 AA commitment is
unsupported until this audit is complete and signed off. When dark mode ships
post-MVP, all contrast ratios require re-audit against dark backgrounds.

**NativeWind v5 a11y contract — Phase 0 validation:**
Add to the existing NativeWind v5 Phase 0 spike: verify that `accessibilityLabel`,
`accessibilityRole`, `accessibilityHint`, and `aria-live` props resolve correctly
through NativeWind's class-to-prop mapping on both iOS and Android 10. Silent
failures here propagate across all `packages/ui` components. If NativeWind v5
preview.3 does not surface a11y props cleanly, `StyleSheet`-based components
with explicit a11y props are the approved fallback — flag in code review.

**Touch targets:**
- 44×44pt: all standard interactive elements (visual dimension, not hitSlop)
- 56×56px: all in-the-moment interactive elements (visual dimension, not hitSlop)

Touch target size is specified via visual dimensions. PR reviewers must verify
visual size — not assumed hit area from `hitSlop`.

**In-the-moment two-CTA layout contract:**
The in-the-moment home screen (state 6) carries two CTAs: "I can keep going"
(primary) and "I need to stop" (secondary). At 375pt floor, side-by-side
56×56px elements are not viable. Resolution: vertical stack. Primary CTA
full-width teal; secondary CTA full-width below, soft styling. This is a
layout contract for `HomeStateCard` state 6 — not optional.

**Screen reader:**
VoiceOver (iOS) and TalkBack (Android) support required across the full app.
Semantic roles, `accessibilityLabel`, and `aria-live` regions specified per
component in the Component Strategy section.

**Reduced motion:**
`AnimationContext` (`packages/ui/src/contexts/AnimationContext.tsx`) reads
`AccessibilityInfo.isReduceMotionEnabled()` at app boot AND subscribes to
`AccessibilityInfo.addEventListener('reduceMotionChanged', handler)` for
mid-session preference changes. The stored `reduceMotion` value updates live —
not only at boot. Boot-only implementation is incorrect. All animation durations
collapse to `0` when `reduceMotion: true`.

**Post-transition focus management (reduced motion):**
When `reduceMotion: true`, all mode-transition screens must explicitly place
focus on the first interactive element after transition completes. Instant (0ms)
transitions cause TalkBack on Android 10 to lose focus context. Implementation:
call `AccessibilityInfo.setAccessibilityFocus()` on the primary interactive
element ref in `useFocusEffect`, gated by `reduceMotion`. Required for
in-the-moment screens; recommended for all mode transitions.

**Dark mode:**
`colorScheme="light"` locked at app root. Dark mode is a named post-MVP
capability. No `dark:` NativeWind classes active until dark token variants are
designed, implemented, and contrast-audited.

---

## Onboarding Accessibility

**Breathing exercise — accessible alternative required:**
The onboarding breathing exercise is `aria-hidden` in its animation form. The
clinical intent is trust-building before vulnerability — delivering something
useful before asking anything difficult. Stripping this for screen reader users
removes therapeutic scaffolding while keeping the clinical ask. A design
decision is required before the onboarding screen enters implementation:

**Option A — Accessible somatic alternative (preferred):**
Deliver breathing timing via text-based breath count (*"Breathe in... 2... 3...
4"*) with `aria-live="assertive"` and optional haptic pulse. Animation remains
decorative (`aria-hidden`). Screen reader users receive a different but
therapeutically equivalent somatic experience.

**Option B — Documented divergent path:**
Screen reader users skip the breathing exercise and proceed directly to the
trust-framing text. Clinical sequence differs; explicitly documented as an
accepted trade-off — not an oversight.

Option A is preferred if haptic infrastructure is in place. This decision must
be recorded before the onboarding sprint begins.

**Clinical flag — SPIN serialisation:**
Seventeen social anxiety questions heard in sequence by a screen reader user
may increase symptom salience beyond the visual intake experience (auditory
repetition vs. visual scan and agency). Flag for clinical partner review before
launch. Not an implementation blocker — a required pre-launch clinical sign-off
item.

---

## Accessibility Testing Gate

**Launch gate — in-the-moment screens (hard block):**
VoiceOver and TalkBack manual pass required before shipping on physical devices
— simulator VoiceOver is not sufficient for launch gate sign-off.

**Written pass criteria:**

1. `CalmMeButton` tapped from every screen type → overlay opens → focus lands
   on first grounding element (not underlying screen)
2. `GroundingPrompt`: each step announced correctly; "step X of 5" read before
   prompt text; tap-to-advance confirmed by screen reader
3. Mode transition (preparation → in-the-moment): focus lands on primary CTA
   of state 6 after transition; underlying nav not reachable
4. Mode transition with reduced motion enabled: same as above with
   `reduceMotion: true`; focus placement confirmed after 0ms transition
5. CalmMe dismiss → focus returns to the element focused before `CalmMeButton`
   was tapped

Pass: all five flows complete without focus loss, unexpected announcements, or
silent elements. Tested on physical iOS (VoiceOver) and Android 10 (TalkBack).

**Full app — compatibility requirement (not a launch gate):**
Semantic labels, roles, and reading order required across all screens. Validated
via `jest-native` `testID` assertions at CI. Exhaustive VoiceOver/TalkBack
manual pass for non-in-the-moment screens committed to roadmap — shipped in a
point release post-launch.

**AC mapping:**
- `RESP-001`: All layouts verified at screenWidth ≥ 375pt (portrait)
- `RESP-002`: Shared tokens resolution-agnostic; web breakpoints Phase 2
- `A11Y-001`: WCAG 2.1 AA; colour contrast pre-sprint-1 audit gate with owner/tool/decision tree
- `A11Y-002`: In-the-moment two-CTA vertical stack at 375pt floor
- `A11Y-003`: AnimationContext live `reduceMotionChanged` listener
- `A11Y-004`: Post-transition focus placement when `reduceMotion: true`
- `A11Y-005`: NativeWind v5 a11y prop resolution in Phase 0 validation spike
- `A11Y-006`: Onboarding breathing exercise — Option A or B decision before sprint
- `A11Y-GATE`: Written 5-flow VoiceOver/TalkBack pass on in-the-moment screens

