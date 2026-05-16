# Desired Emotional Response

## Primary Emotional Goals

exposure-buddy is designed around a single emotional arc: users arrive feeling overwhelmed and unseen; they leave feeling transformed and quietly victorious. The product earns the right to that arc by being a trustworthy companion throughout — never a passive content library, never a clinical instrument.

**Understood and empowered** — the emotional baseline from first open. Users must feel the app *gets* what they're dealing with before they're asked to do anything hard.

**Companion trust** — the sustained emotional quality across the journey. The app is something users rely on, not something they consult. This is the feeling that differentiates exposure-buddy from every other anxiety app they downloaded and deleted.

**Victory and transformation** — the emotional destination. Not just relief, not just reduced symptoms — a felt sense of having done something genuinely hard and come out the other side different.

---

## Emotional Journey Mapping

**Discovery / First open (0–30 seconds)**
Relief that something like this exists. Curiosity about what it does differently. Cautious hope that this time might be different. All three simultaneously — the product should honour the complexity of that first moment rather than oversimplifying it into a single pitch.

**During the hard moments** (SPIN score reveal, first ladder view, referral screen)
Encouraged and informed. The user leaves these moments knowing more than they did, feeling that the app handled the moment well — not overwhelmed, not dismissed. Steady is the right word: the app holds its ground so the user doesn't have to.

**When something goes wrong** (stalled exposure, high SUDS, bad session)
The app stays present. Users in distress cannot self-optimise their way out — the emotional job of the app in these moments is to be the companion that hasn't left. "I'm still here" is the primary signal; "let's try again" is secondary and comes only when the user is ready.

**Returning after a break**
Warm welcome back. No guilt, no performance review. Forward-looking — the next step is visible and accessible without ceremony. All three tones simultaneously: warmth, acceptance, momentum.

**The ask to face something hard**
A firm but kind friend who genuinely understands what they're going through, and is quietly confident they can do it. Not cheerleading. Not clinical instruction. The app brings the same energy a good friend would: steady, honest, not minimising — and fundamentally believing in the person in front of it. *Note: the specific tone of this ask is a candidate for future personalisation by user profile.*

---

## Micro-Emotions

The app leans predominantly toward **confident, proud, and momentum-building** — but not uniformly. Deliberate pockets of patience matter.

| Moment | Primary Emotion | Texture |
|--------|-----------------|---------|
| Pre-exposure preparation | Quiet confidence | "You've prepared for this" |
| Technique in progress | Patient, unhurried | "Take all the time you need" |
| Completing an exposure | Pride — understated | Quiet recognition, not high-five |
| Score reveal | Steady, informed | Encouraged, not overwhelmed |
| Setback / stall | Companioned | "We're still here" |
| Re-entry after gap | Warm acceptance | No guilt, forward-looking |
| Mastery achievement | Surprised delight | Moment of unexpected recognition |
| First prediction vs. reality reveal | Curious wonder | Framed as discovery, not evaluation |

---

## Design Implications

**"Understood and empowered" → Precision copy at every trust-critical moment.** The emotional goal requires the words to be exactly right — not warm-but-vague, not clinical-but-accurate. Both. Score reveals, referral screens, and ladder introductions are where this is most load-bearing.

**"Companion trust" → Consistent presence, not intrusive helpfulness.** The app doesn't over-explain or over-prompt. It shows up reliably, holds state across sessions, and remembers what the user told it. Amnesia — the app forgetting context it should know — is the fastest way to break companion trust.

**"Victory and transformation" → Progress must be surfaced, not stored.** Longitudinal progress doesn't live in a tab. It appears at the right moment — re-entry, week 4 review, prediction vs. reality reveal — delivered as narrative, not metrics.

**"Firm but kind friend" → Consistent voice across all copy.** The app's emotional register should be stable. Not warmer in celebration, not cooler in clinical moments. The friend doesn't change personality based on what's happening — and neither does the app.

**"Take all the time you need" pockets → Deliberate pacing design.** Certain screens should have built-in patience: pre-exposure writing (unhurried pause before continue), technique sessions (no time pressure), post-bad-session (no forward nudge). These are explicit design states, not defaults.

**"Quietly confident" → Avoid projection.** The app believes in the user but doesn't project emotions onto them. "You can do this" is a tone, not a line. The copy never tells users how they feel — it reflects what it observes and offers what might help.

---

## Emotional Design Principles

1. **Arc over moment** — Every individual screen serves the larger emotional journey from understood → victorious. No screen is emotionally neutral.

2. **Companion, not coach** — The app is present and reliable, not directive. It offers; users choose. The voice is a friend who has done their research, not a clinician who has a protocol.

3. **Confidence as default, patience as punctuation** — The dominant register is forward-moving and capable. Deliberate pauses are placed at specific moments as punctuation — not as the baseline tone.

4. **Recognition over celebration** — Quiet, specific recognition of what just happened outweighs generic celebration. *"You predicted this would be hard. It was. And you did it anyway."* — not a confetti animation.

5. **Presence over reassurance** — When things go wrong, the emotional job is to stay present, not to reassure. Reassurance that rings false at a hard moment does more damage than silence.

6. **Earned transformation** — The sense of victory at the end of the journey is real because the hard moments were not minimised. The app's emotional honesty during difficulty is what makes the transformation feel true.

---

## Post-MVP Refinements (TBD)

The following areas were surfaced during design review and deferred to post-MVP:

- **Time-aware companion register** — "I'm still here" as a uniform response fails time-pressured pre-event distress (e.g., 8:47am before a presentation). The companion voice needs a stakes-calibrated register: grounding and action-oriented before an imminent event, present and witnessing after. Requires instrumentation to detect time-pressure context.

- **Shame-of-prior-failure as arrival state** — The first-open arc assumes cautious hope. The high-value returning user arrives carrying shame from prior failure. The copy needs to quietly dissolve the specific fear that avoidance is character, not behaviour — before the first question is asked.

- **Re-entry diagnostic branching** — "You were just busy" and "last time was hard" require different companion tones on re-entry. Route on behavioural data (last session length, reflection filed, mid-session abort) before prompting.

- **Witnessed vs. passive presence** — In the 20-minute window after a bad exposure, "I'm still here" is insufficient without specificity. The companion must reference what actually happened: *"You stayed 40 minutes longer than your last exposure. That's real."* Generic presence reads as absence.

- **Adversarial user state** — No current register for "this isn't working after 12 exposures." The companion voice for this moment is: stay curious, not defensive. "Yeah. It's slow. What happened at the last party?" — not reassurance, not preaching.

- **Non-completer emotional design** — 60–80% of users in this category drop off by week 4 without a dramatic incident. The arc has no emotional design for the quietly-sliding user. An *honest checkpoint* pattern is needed: "Here's what your data shows. Here's what we'd expect to see if this is working. You're the one who knows which is true."

- **Therapist-referred first-open arc** — Referred users arrive with a delegated, observed emotional posture — not self-chosen curiosity. A branching first-open tone that signals "you chose to be here" without asking directly.

- **Companion trust at monetisation touchpoints** — Renewal prompts landing during stall/gap periods, especially after a bad exposure, break the companion frame. Gate renewal communications against emotional state.

- **Proxy metrics for "steady"** — Instrument: predicted-vs-rated difficulty delta, re-entry latency after hard exposures, companion prompt dismissal rates correlated with completion rates.

- **Companion's honest limit** — No current design for the moment a user stops believing the product can help them. The companion needs a voice for: *"Some people need more than this app can provide"* — without abandoning them in that moment.

- **Cultural and shame-encoding variance** — "No guilt, forward-looking" encodes individualist recovery norms. Review re-entry copy for collectivist users (South Asian, East Asian, Latin American segments particularly relevant given Indian philosophy framing). Scope: do not actively harm; deep adaptation is a later phase.

- **Acute distress escalation path** — "Presence over reassurance" has no escalation mechanism. The companion needs to know when to step aside: *"I'm here, and I think you should call someone."* Requires clinical advisory and legal boundary definition before implementation.

---
