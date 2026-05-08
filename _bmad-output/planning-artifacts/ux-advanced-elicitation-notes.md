# UX Design — Advanced Elicitation Notes

**Project:** exposure-buddy
**Date:** 2026-05-08
**Phase:** UX Discovery (Step 2 — Project Understanding)

These notes capture three advanced elicitation sessions run during UX discovery to stress-test and deepen the initial project understanding output.

---

## Session 1 — User Persona Focus Group

*Method: Gather product user personas to react to proposed design challenges and opportunities.*

### Personas

**Priya, 26 — Bangalore → London, UX researcher, moderate social anxiety (SPIN ~28)**
*Downloaded three CBT apps. Deleted two within a week. Uses Headspace for sleep only.*

> "The 'trust across the shame barrier' challenge is real — but you've described it as a design system problem. It's actually a copy problem first. I'll forgive an ugly UI that speaks to me like a human. I won't forgive a beautiful UI that sounds like a medical disclaimer. Every screen label, every button, every push notification. That's where trust lives."

> "On the fear ladder as hero feature — yes, but I'd warn you: showing it too early could terrify someone and cause immediate drop-off. There's a pacing question here you haven't addressed. *When* does the user first see the ladder? What does that reveal moment feel like?"

---

**Marcus, 34 — Toronto, freelance developer, severe social anxiety (SPIN ~44), first-time app user**
*Has avoided therapy due to cost and stigma. Heard about the app from a Reddit thread on r/socialanxiety.*

> "I'm your hardest user. When I see a SPIN score of 44 and a mandatory referral screen — even with warm language — my gut reaction is 'the app just told me it can't help me.' You've framed this as clinical safety. I experience it as rejection. What does the screen do with me *after* I acknowledge it? That's the real UX problem."

> "The prediction vs. reality reveal sounds powerful in theory. But what if my prediction was right — what if the exposure *was* as bad as I thought? What does the app show me then? I don't see that edge case addressed in the design opportunities."

---

**Aiko, 22 — Tokyo, student, mild-moderate social anxiety (SPIN ~22), culturally curious**
*No prior therapy. Stumbled on the app via Instagram. Drawn to the 'Indian philosophy' angle as something genuinely different.*

> "I'm interested in the Bhagavad Gita framing but I'm also slightly nervous it'll feel like cultural tourism — content that's exotic rather than useful. The design opportunity here is only realised if the philosophy is *integrated* into technique, not just decorative. If the pranayama screen looks like a wellness stock photo with Sanskrit overlay, I'll skip it. If it actually teaches me something and explains *why* it works, I'll stay."

> "Localisation-ready from day one — good call. But I'd push further: it's not just layout and string length. It's date formats, number formatting, different cultural relationships with expressing distress. Build the abstraction layer for *all* of that now, not just text."

---

**James, 41 — Chicago, manager, performance anxiety variant (SPIN ~31), time-poor**
*Has done brief CBT in the past. Wants tools, not education. Will abandon any onboarding over 3 minutes.*

> "Five phases sounds like a lot. Intake → Psychoeducation → Protocol → Practice → Review. I'm going to drop off somewhere in phase 2. The 8-week roadmap is good — but is there a fast path for someone who just wants the fear ladder and check-ins without sitting through the anxiety cycle diagram? The UX needs an 'I already know this stuff' mode or it'll lose the non-naive user."

> "The rule-based recommendation engine is a design opportunity you've undersold. The fact that it's *not* AI — that it's predictable, transparent logic — could actually be a trust signal if you surface it right. 'Based on your check-in score, we recommend X' with a brief visible reason builds more confidence than a black-box AI recommendation."

---

### Focus Group Synthesis

| Original Content | Persona Challenge | Suggested Refinement |
|---|---|---|
| "Trust across the shame barrier" as design system problem | Priya: it's a copy problem first | Add micro-copy and tone-of-voice as an explicit design constraint, not just system-level |
| Fear ladder as hero feature | Priya: reveal timing matters critically | Add "fear ladder introduction moment" as a distinct UX design challenge |
| Mandatory referral for SPIN ≥40 | Marcus: feels like rejection, not care | What happens *after* acknowledgement is a UX design gap — needs explicit flow |
| Prediction vs. reality reveal as retention hook | Marcus: what if reality matched the fear? | Design for the negative case — "confirmation of fear" needs a recovery UX |
| Cultural philosophy as global USP | Aiko: only works if integrated, not decorative | Integration depth is a design constraint — philosophy must be functional, not aesthetic |
| Localisation-ready | Aiko: broader than layout/strings | Extend to date formats, distress expression norms, number formatting |
| 5-phase journey | James: non-naive users need a fast path | Add experienced-user fast path / skip mode as a design challenge |
| Rule-based engine | James: transparency is an underused trust signal | Surface the recommendation logic to users — "here's why we're suggesting this" |

---

## Session 2 — Challenge from Critical Perspective

*Method: Play devil's advocate to stress-test ideas and find weaknesses in the design challenge framing.*

---

**Challenge 1: "Micro-copy as primary trust mechanism"**

> You've elevated copy to a design constraint — but you're solving the wrong problem. Users with severe social anxiety don't read UI copy carefully. They scan, they misread, they project. A user in a shame spiral will find something to feel judged by no matter how carefully you word it. The real trust mechanism is *momentum* — a flow so smooth that the user never stops long enough to feel self-conscious. You need interaction design solving this, not copywriting.

**Verdict:** Partially valid. Copy matters enormously at high-stakes moments (score reveals, crisis gates, referral screens) where users *do* read carefully. But momentum and frictionless interaction design is an under-named challenge. Both are true — not either/or. Reframe as two parallel trust mechanisms.

---

**Challenge 2: "Fear ladder reveal timing"**

> You're treating the fear ladder as something to protect users from until they're ready. But what if the fear ladder is exactly why someone downloaded the app? They Googled "exposure therapy app," they know what ERP is, they want to get to the ladder. Hiding it behind gates and timing it carefully is paternalistic for that user. You've optimised for the most anxious user and ignored the informed one.

**Verdict:** Valid. The design challenge should not be "when to reveal the fear ladder" but "how to make it accessible to those ready while protecting those who aren't." The gate must feel like a natural threshold, not a locked door.

---

**Challenge 3: "The SPIN ≥40 post-acknowledgement flow"**

> You're treating this as a UX problem to design around. But the real question is: should a severe-SPIN user be in this app at all? If the clinical answer is "app + therapist," and the app can't enforce the therapist part, then no amount of warm post-acknowledgement UX solves the underlying tension.

**Verdict:** Important provocation — but the clinical decision is made. The app does serve severe users, with referral strongly recommended but not enforced. The UX challenge is legitimate; the critique sharpens the framing. Rename: "maintaining therapeutic alliance after a severity gate."

---

**Challenge 4: "Recovery UX for confirmed fear"**

> "Recovery UX for confirmed fear" is named as if it's a screen design problem. It isn't — it's a clinical protocol problem. If post-SUDS equals or exceeds pre-SUDS, the branching logic (EX-3) already defines the response. The UX challenge is making that clinical protocol feel human, not designing a new intervention.

**Verdict:** Fair. Rename from "recovery UX" to "humanising the EX-3 stall protocol." The design job is translating a defined clinical rule into an empathic interaction.

---

**Challenge 5: "Fear ladder as hero feature"**

> You've called the fear ladder the hero feature twice. But what's the actual evidence a first-time user finds it compelling rather than terrifying? Hero features need to be things users *want* to engage with. The prediction vs. reality reveal might be the more compelling hero moment because it's a reward, not a commitment.

**Verdict:** Strong challenge. The fear ladder is the *therapeutic* hero. The prediction vs. reality reveal may be the *product* hero — the moment users feel the app working. Name them separately and elevate the reveal accordingly.

---

### Critical Perspective Synthesis

| Original Framing | Challenge | Sharper Framing |
|---|---|---|
| Copy as primary trust mechanism | Momentum/interaction design equally important | Two parallel trust mechanisms: copy at high-stakes moments; frictionless flow everywhere else |
| Fear ladder reveal timing | Paternalistic for informed users | Gate must feel like a natural threshold — design for both naive and informed users |
| SPIN ≥40 post-acknowledgement | Clinical limitation, not UX problem | Rename: "maintaining therapeutic alliance after a severity gate" |
| Recovery UX for confirmed fear | Scope-creeping UX into clinical | Rename: "humanising the EX-3 stall protocol" |
| Fear ladder as hero feature | Users want rewards, not commitments | Fear ladder = therapeutic hero; prediction vs. reality reveal = product/emotional hero |

---

## Session 3 — What If Scenarios

*Method: Explore alternative realities and edge cases to surface design implications not visible in the nominal flow.*

---

**What if the experienced-user fast path gets abused?**

A user with SPIN 38 skips psychoeducation, skips technique building, taps through the readiness gate claiming completion, and jumps straight to a high-SUDS exposure they're not ready for. The exposure goes badly. SUDS confirmed or worsened. They blame the app.

**Implication:** The fast path can't be an honour system. The readiness gate (D4) must remain a hard gate regardless of how the user got there. The UX design challenge is making that gate feel like an achievement for fast-path users ("you're ready to start your fear ladder") rather than a wall they keep hitting. Fast path = skip education, never skip clinical gates.

---

**What if the rule-based recommendation feels robotic at low anxiety scores?**

User checks in with anxiety score 2. App recommends: "CBT thought record — full 6-step." User thinks: *I just wanted to check in, I feel fine today, why is the app pushing homework at me?* They skip the session. Day 5 nudge fires. They don't come back.

**Implication:** CI-3 (score 1–3 → cognitive challenge) is clinically optimal but experientially tone-deaf for a user having a good day. A good day should feel like a reward, not a missed opportunity. Design opportunity: celebrate low-anxiety check-ins without pushing a session. Add a "rest day" UX state for very low scores.

---

**What if a user's prediction is exactly right — but they show up anyway?**

Pre-exposure: "I predict this will be 9/10 terrible." Post-exposure: "It was 9/10 terrible." By clinical rules (EX-3), the app investigates safety behaviours and holds the rung. But the user did something extraordinary: they showed up. SUDS reduction is a clinical success metric, not a human one.

**Implication:** The post-exposure debrief needs a secondary recognition layer, always shown regardless of SUDS delta: *"You predicted this would be hard. It was. And you did it anyway. That matters."* Courage must be acknowledged independently of clinical outcome.

---

**What if the Indian philosophy framing reads as spiritual, not clinical, to Western users?**

A user in Berlin downloads the app. They see "Bhagavad Gita context" and "lok-bhaya." Their first interpretation: this is a wellness/spirituality app, not a CBT app. They came for clinical tools. One-star review: *"expected science-based, got philosophy."*

**Implication:** Cultural philosophy must be introduced with clinical framing first. The mechanism (vagal activation via Bhramari) leads; the cultural name follows. Hard design constraint: every yogic/philosophy technique must anchor in a clinical mechanism statement before naming the tradition.

---

**What if a user in crisis opens the app during an acute episode but types nothing?**

2am. Panic spiral. User opens app. Check-in: anxiety score 10. CI-1 fires: Bhramari pranayama. User can't concentrate on the animation. Closes app. Crisis screen never triggered — no keywords were typed.

**Implication:** A check-in score of 10 needs a distinct UX path from scores 7–9. Score 10 — or any score accompanied by an immediately abandoned session — could trigger a third state between technique recommendation and crisis screen: *"It sounds like today is really hard. You don't have to do anything right now. We're here when you're ready."* Not a crisis screen. Not a homework push. A welfare pause.

---

### What If Scenarios Synthesis

| Scenario | Design Implication |
|---|---|
| Fast path + abused readiness gate | Fast path skips education, never clinical gates. Gates must feel like achievements, not walls |
| Rule engine robotic on good days | Add "rest day" UX for CI-3 low scores — celebrate good days, don't push homework |
| Courage without SUDS reduction | Post-exposure debrief always acknowledges showing up, independent of SUDS outcome |
| Philosophy reads as spiritual to Western users | Mechanism (clinical) always leads; cultural name follows. Hard design constraint |
| Acute crisis without crisis keywords | Score 10 (or abandoned session) needs a third UX state: welfare pause, not technique push |

---

## Session 4 — SCAMPER Method

*Method: Apply seven creativity lenses (Substitute / Combine / Adapt / Modify / Put to other uses / Eliminate / Reverse) to the design opportunities.*

---

### S — Substitute

*What if we substituted the core metaphors we're using?*

The "fear ladder" metaphor is clinical and accurate — but it implies a direction (up) that frames every exposure as a climb, and every stall as falling back down. **Map metaphor alternative:** a territory you're exploring, not a hierarchy you're ascending. Stalling doesn't mean falling — it means you need more time in this part of the map. The geography metaphor makes the EX-4 step-down rule feel like exploration, not regression.

The "prediction vs. reality reveal" is currently framed as a comparison screen. **Letter-to-self alternative:** written before the exposure, read after. *"Before I went in, I thought..."* / *"What actually happened was..."* The epistolary format makes the reveal a personal narrative moment rather than a data comparison — more emotionally resonant and more shareable.

---

### C — Combine

*What if we combined two separate features into one richer interaction?*

The daily check-in and technique recommendation are currently sequential. **Combined conversational moment:** the check-in *is* the opening of the session — the AI companion asks one question, the user answers, and the recommendation emerges naturally from conversation. The rule-based logic runs invisibly; the experience feels like being heard, not processed.

The mantra/anchor selection (YOGA-2) and pre-exposure prep screen (P3) are currently separate. **Combined ritual:** the user selects or recalls their mantra *as part of* pre-exposure prep, not as a separate configuration step. The anchor becomes inseparable from the moment of preparation.

---

### A — Adapt

*What if we adapted a pattern from another domain entirely?*

**From navigation apps (Google Maps):** Reroutes silently when you go off-course, without judgement. Adapt for the fear ladder: when a user stalls (EX-3) or steps down (EX-4), the app reroutes without announcement — it simply shows the updated path forward as the new optimal route, not a correction. No "you stalled" language. Just: here's where you are, here's what's next.

**From journaling apps (Day One):** "On this day" memory prompts. Adapt for post-exposure debrief: *"3 weeks ago you faced [situation] and predicted 8/10. It was 6/10. This week you're facing something harder."* Longitudinal memory as a motivational pattern — the app becomes a witness to progress, not just a tracker.

---

### M — Modify

*What if we modified the scale, sequence, or intensity of existing features?*

**Adaptive SPIN sequencing:** Start with the 3 highest-signal questions, continue to all 17 only if early answers suggest moderate-to-severe range. Mild users get a shorter intake; clinical accuracy is preserved where it matters most.

**Open-text debrief with NLP extraction:** Replace the four-item post-exposure debrief form with a single open text field — *"Tell me what happened."* The app extracts SUDS, outcome, and learning from natural language, making the debrief feel like reflection rather than a clinical form.

---

### P — Put to other uses

*What if existing features served a purpose beyond their current function?*

**Crisis detection as tone detector:** The keyword detection system, with a much lower sensitivity threshold, could detect unusual distress during a regular session and offer a quieter check: *"It sounds like today feels particularly heavy. Do you want to take a breath before we continue?"* Safety infrastructure repurposed as emotional attunement.

**Fear ladder as progress narrative:** At week 4 and week 8 review, the app reads back the user's own situation descriptions: *"When you started, these were the situations that felt impossible. Here's where you are with each one now."* The ladder becomes a record of courage, not just a clinical instrument.

---

### E — Eliminate

*What if we removed something assumed to be essential?*

**Eliminate pre-exposure SUDS rating:** Asking users to rate predicted anxiety on a numeric scale may amplify anticipatory fear. Replace with: *"What do you think will happen?"* — capturing the prediction as a qualitative statement. Less clinical friction at the moment of highest vulnerability.

**Eliminate push notifications as re-engagement mechanism:** For users with social anxiety, an unsolicited notification from an anxiety app can trigger a shame response. Replace with in-app re-entry design — when the user opens after a gap, the experience is warm and low-pressure enough to do the re-engagement work itself. Pull, not push.

---

### R — Reverse

*What if we reversed the sequence, assumption, or relationship?*

**Lead with technique before assessment:** Start with a single 2-minute breathing exercise before any intake questions. Users experience the app working before they're asked to disclose anything. The SPIN and intake follow once trust is partially established — the app earns the right to ask questions by giving value first.

**Reverse the app-therapist relationship:** Currently the app refers users to therapists when it detects they need more. Reverse: therapists refer patients *to the app* as structured homework, and the app's session data (SUDS scores, technique usage, exposure outcomes) is designed to be readable as a clinical report. The app becomes a therapeutic co-pilot. Doesn't change MVP scope but should influence data structure and export design from day one.

---

### SCAMPER Synthesis

| Lens | Finding | Impact |
|---|---|---|
| **Substitute** | Map metaphor instead of ladder; letter-to-self instead of comparison screen | Reframes stalling; makes the reveal more human |
| **Combine** | Check-in + recommendation as single conversation; mantra woven into pre-exposure prep | Reduces seams; reinforces ritual |
| **Adapt** | Silent rerouting (Maps pattern) for stalls; longitudinal memory (journaling pattern) for debrief | Removes judgement from setbacks; builds narrative |
| **Modify** | Adaptive SPIN sequencing; open-text debrief with NLP extraction | Reduces intake friction; makes debrief feel like reflection |
| **Put to other uses** | Crisis detection as tone detector; fear ladder as progress narrative | Safety infrastructure becomes attunement; ladder becomes witness |
| **Eliminate** | Pre-exposure SUDS rating; push notifications for re-engagement | Reduces anticipatory amplification; avoids shame-triggering |
| **Reverse** | Lead with technique before assessment; design data for therapist readability | Earns trust before asking; positions app as clinical co-pilot |

---

## Session 5 — Pre-mortem Analysis

*Method: Imagine the app launched, gained traction, then failed — work backwards from disaster to find what UX decisions caused it.*

**The Scenario:** 14 months after launch. 180,000 downloads. App Store rating: 3.1 stars. Monthly actives collapsed from 42,000 peak to 11,000. What happened?

---

### Failure Mode 1: The Intake Wall

**What the data showed:** 68% of users who completed onboarding never returned after day 3. Session recordings show users completing the SPIN questionnaire then closing the app at the score reveal.

**What went wrong:** The score reveal was the first emotionally charged moment in the product and hadn't been stress-tested. Moderate users felt labelled; severe users hit the referral screen and felt rejected. The warm language written in a document never survived contact with actual screen design — rendered in small font beneath a large score number that dominated the visual hierarchy. The number was the message, not the copy.

**Root cause:** Score reveal treated as an information screen rather than a therapeutic moment requiring its own dedicated interaction design. Never prototyped with real anxious users.

---

### Failure Mode 2: The Technique Treadmill

**What the data showed:** Users who stayed past day 3 engaged for 2–4 weeks then plateau-dropped. Exit surveys: *"I felt like I was doing the same thing every day."* *"The app kept giving me breathing exercises."*

**What went wrong:** The rule-based engine worked correctly by clinical logic — high anxiety scores route to somatic techniques — but many users had chronically elevated check-in scores (7–8) and received somatic recommendations every session for weeks. Clinically appropriate; experientially monotonous. The engine never introduced variety because anxiety never dropped enough to unlock cognitive work.

**Root cause:** No time-based diversification rule. A user stuck at anxiety 7 for 3 weeks should get a different recommendation than a user whose first check-in was 7.

---

### Failure Mode 3: The Fear Ladder Nobody Climbed

**What the data showed:** Only 23% of users who passed the readiness gate ever built a fear ladder. Of those, 61% never completed a single exposure.

**What went wrong:** The fear ladder builder required users to articulate their full feared situation hierarchy in one sitting — blank input field, drag to rank, SUDS ratings per item. The cognitive and emotional load was too high. Users opened the screen and closed the app.

**Root cause:** Fear ladder designed as a form to complete, not a conversation to have. Entry point too steep. Situations introduced as a full checklist, not gradually.

---

### Failure Mode 4: The Invisible Progress

**What the data showed:** Users who completed exposures rarely returned for a second one. Progress dashboard averaged 0.8 views per user per month.

**What went wrong:** The prediction vs. reality reveal — the intended product hero moment — was a single screen users swiped past after debrief. The longitudinal story of improvement lived in a tab, never surfacing at the right emotional moment.

**Root cause:** Reveal designed as a post-session screen, not a moment demanding pause. No friction, no reason to stop and take it in. Progress stored but never delivered.

---

### Failure Mode 5: The Drop-off We Couldn't Recover

**What the data showed:** Day 2 and Day 5 push notification open rates: 4% and 1.8%. Several 1-star reviews: *"The notifications made my anxiety worse."*

**What went wrong:** Push permission requested at onboarding — before any value was delivered. Most declined. For those who granted it, notifications arrived as reminders of avoided anxiety practice, activating exactly the avoidance pattern the app was trying to interrupt.

**Root cause:** Re-engagement pattern copied from productivity/fitness apps without accounting for shame dynamics specific to mental health. A fitness nudge and an anxiety nudge are not the same interaction.

---

### Pre-mortem Synthesis

| Failure Mode | Root Cause | Pre-launch Fix |
|---|---|---|
| Intake wall at score reveal | Score dominated visual hierarchy; copy was secondary | Design score reveal as dedicated therapeutic moment; prototype with real users; copy drives hierarchy |
| Technique treadmill | No time-based diversification in recommendation engine | After N consecutive same-modality recommendations, introduce variety regardless of check-in score |
| Fear ladder nobody climbed | Entry point too steep; blank form; full hierarchy at once | Introduce ladder conversationally — one situation at a time from intake data; full view after first item placed |
| Invisible progress | Reveal was a swipeable screen, not a moment | Design friction into the reveal; surface longitudinal progress at re-entry, not buried in a tab |
| Unrecoverable drop-off | Push permission too early; shame-triggering framing | Request permission only after first completed technique; invest in in-app re-entry as primary mechanism |

---

## Session 6 — User Persona Focus Group (Round 2)

*Method: Fresh personas reacting to pre-mortem findings, personalised ladder suggestions, SCAMPER opportunities, and the expanded design challenge list.*

---

**Rohan, 19 — Pune, engineering student, first-time help-seeker, SPIN ~35**
*Downloaded the app after a panic attack before a college presentation. Has never discussed anxiety with anyone. Opened the app at 11pm.*

> "The pre-mortem finding about the score reveal — that's going to happen to me. I'm going to see that number and it's going to feel like a diagnosis. What I'd actually want is for the app to tell me what the number *means for me specifically* before it tells me the number. In words, not a score — and then the score is context, not the headline."

> "The personalised ladder idea is the most important thing I've read. If the app shows me my own words back, it feels like it understood me. If it shows me a generic list — 'attending a party,' 'speaking in a meeting' — it feels like it wasn't listening."

> "What if I described my situations badly during intake? I was anxious when I filled it in, I typed fast, I wasn't very articulate. Will the suggestions make sense? Is there a way to refine the situation description before it becomes a ladder item?"

---

**Dr. Sunita, 44 — Delhi, psychiatrist, reviewing for patient recommendation**
*Sees 30+ patients per week. Considering recommending exposure-buddy as between-session homework.*

> "The therapist-readable data opportunity — you've framed it as an export feature. That's too passive. What I actually want is a summary I can glance at in 90 seconds before a session starts. A PDF export I have to open and parse is not that. Think: a structured summary card, not a raw data dump."

> "After 5 somatic sessions, the user knows how to do 4-7-8 breathing. Recommending it again is correct but redundant. There should be a mastery layer — once a technique is demonstrated proficiently, it becomes a quick-access tool, and the engine moves to teaching something new."

> "Every question the AI asks during ladder building should be derivable from a clear clinical reason the user can understand if they ask."

---

**Lena, 28 — Berlin, product designer, SPIN ~26, high design literacy**
*Downloads apps to study them as much as to use them. Will notice every UX pattern.*

> "The map metaphor vs. ladder — I'd push back. Maps imply exploration and freedom, which is the opposite of what ERP is. ERP is deliberate, sequential, structured. The ladder metaphor is clinically honest. What needs fixing isn't the metaphor, it's the language around setbacks. Don't say 'step back.' Say 'spend more time here.'"

> "The letter-to-self format only works if the writing moment before the exposure feels genuinely private and unhurried. The pre-exposure writing needs its own dedicated screen — maybe even a slight delay before the 'I'm ready' button appears. Force the pause."

> "Starting with a breathing exercise before intake could feel manipulative to a design-literate user: 'the app is softening me up before asking questions.' Frame it explicitly: 'Before we learn about you, let's give you something useful right now.'"

---

**Miguel, 37 — São Paulo, sales manager, SPIN ~29, returning user of Woebot and Wysa**
*Knows CBT app patterns. Will compare every interaction to prior apps.*

> "The open-text debrief idea — I've seen this in Wysa and it doesn't work unless the NLP is very good. If I write 'it was awful but I survived' and the app extracts SUDS: 3/10, I'm going to feel misunderstood. Keep a minimal structured capture (one SUDS slider, one outcome tap) and make the open text field *optional* for elaboration."

> "Transparent recommendation logic: the reason has to be honest and specific. 'Because you scored 7' is honest. 'To help you feel better' is not. Users like me will immediately see through vague explanations."

> "Let me edit the situation description before it becomes a ladder item. The act of naming it carefully is itself therapeutic — it's part of the exposure preparation."

---

### Focus Group Round 2 Synthesis

| Persona | Insight | Design Implication |
|---|---|---|
| Rohan | Score reveal: words before number; score is context not headline | Narrative summary leads score reveal; number is secondary in visual hierarchy |
| Rohan | Intake language may be poor under anxiety | Allow situation description refinement before it seeds the ladder |
| Dr. Sunita | Therapist data should be a 90-second summary card, not an export | Design structured session summary card format alongside raw export |
| Dr. Sunita | Mastery layer needed on technique recommendations | Once technique used proficiently N times, retire to quick-access; engine teaches something new |
| Lena | Map metaphor wrong for ERP — keep ladder, change setback vocabulary | Keep ladder; replace "step back" with "spend more time here" throughout all copy |
| Lena | Letter-to-self needs unhurried writing moment | Pre-exposure writing gets its own screen with deliberate pause before continue button |
| Lena | "Technique before assessment" could read as manipulative | Add explicit framing: "Before we learn about you, let's give you something useful right now" |
| Miguel | Open-text debrief fails if NLP wrong — users feel misunderstood | Keep structured capture (SUDS slider + outcome tap); open text is optional elaboration |
| Miguel | Transparent logic must name the actual rule | Recommendation reason must be specific: "because your score was 7" not "to help you feel better" |
| Miguel | Situation naming is therapeutic | Ladder suggestions are editable before acceptance; naming is part of exposure prep |
