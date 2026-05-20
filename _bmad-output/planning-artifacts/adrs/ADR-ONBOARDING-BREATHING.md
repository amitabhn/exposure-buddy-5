# ADR-ONBOARDING-BREATHING — Accessible Onboarding Breathing Exercise

**Status:** Open — decision required  
**Owner:** Lead designer  
**Required before:** Onboarding sprint kickoff  
**Decision deadline:** To be set at sprint planning

---

## Context

The onboarding breathing exercise is `aria-hidden` in its animation form. Its clinical purpose is trust-building before vulnerability — delivering something useful before asking anything difficult. For screen reader users, the animation is silent. The clinical intent is not served if the experience is stripped entirely.

Two options have been identified. One must be selected and recorded before the onboarding screen enters implementation.

---

## Options

### Option A — Accessible Somatic Alternative (preferred)

Deliver breathing timing via text-based breath count (`aria-live="assertive"`) with optional haptic pulse. The animation remains decorative (`aria-hidden`). Screen reader users receive a different but therapeutically equivalent somatic experience.

**Implementation:**
- `aria-live="assertive"` region updates with breath cues: *"Breathe in... 2... 3... 4"*, *"Hold... 2"*, *"Breathe out... 2... 3... 4... 5... 6"*
- Haptic: single pulse on inhale cue, double pulse on exhale cue (requires haptic infrastructure — confirm available in Phase 0 spike)
- Animation plays in parallel for sighted users; screen reader users hear the text sequence instead
- No separate code path — same component, different sensory output

**Pros:**
- Clinically equivalent somatic experience for all users
- Maintains therapeutic sequence integrity
- WCAG 2.1 AA compliant

**Cons:**
- Requires haptic infrastructure confirmed in Phase 0
- `aria-live="assertive"` interrupts other VoiceOver announcements — must be tested to confirm no conflict with onboarding screen labels

### Option B — Documented Divergent Path

Screen reader users skip the breathing exercise and proceed directly to the trust-framing text. Clinical sequence differs; explicitly documented as an accepted trade-off.

**Implementation:**
- Detect screen reader active (`AccessibilityInfo.isScreenReaderEnabled()`)
- If true: render trust-framing text directly, skip breathing component
- If false: render standard animated breathing exercise

**Pros:**
- No haptic dependency
- Simpler implementation

**Cons:**
- Screen reader users receive a clinically shorter onboarding — trust-building step is absent
- Creates a divergent path that must be maintained as onboarding evolves
- Accepted clinical trade-off must be documented and approved

---

## Recommendation

Option A, conditional on haptic infrastructure being available in Phase 0. If haptic is not available at onboarding sprint time, implement Option A without haptic (text-only `aria-live` sequence) and add haptic as an enhancement in the post-MVP pass.

---

## Decision

[ ] Option A — accessible somatic alternative  
[ ] Option B — documented divergent skip path  

**Decided by:** _______________  
**Date:** _______________  
**Notes:** _______________
