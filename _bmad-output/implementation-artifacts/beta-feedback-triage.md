# Beta Feedback Triage

Epic 11 (structured in-app feedback collection) is **deferred post-MVP** (see `sprint-status.yaml` and the FR-BETA-01/02 decision record in `epics.md`'s FR Coverage Map). Until it's picked back up, beta feedback arrives through informal channels (email, WhatsApp, chat) with no auto-tagging. This file is the single place to log it first, so nothing gets lost before it's routed somewhere durable.

**Rule: every piece of feedback gets logged in Inbox the moment it arrives — before triage, before judging whether it's important.** Triage happens second, as a separate pass.

---

## Intake paths

There are two ways feedback enters this process — both end up triaged against the same severity ladder below, they just start differently:

1. **Informal channel (email, WhatsApp, chat, verbal).** Log it directly in [Inbox](#inbox-untriaged) per "How to use this file" below — this file *is* the capture point.
2. **GitHub issue via the "Beta tester feedback" template** (`.github/ISSUE_TEMPLATE/beta-feedback.yml`). Filing the issue *is* the Capture step — its severity dropdown mirrors this ladder 1:1, so no separate Inbox entry is needed. Go straight to Triage: confirm/adjust the reporter's severity guess, route it, then add one line under [Routed](#routed) referencing the issue number (e.g. `Source: GitHub #123`) so there's a single paper trail across both paths.

**Either path, severities 1 and 6 (crash/data-loss/security, DPDPA/privacy) get escalated immediately** — don't wait for a scheduled triage pass just because the report arrived as a filed issue instead of a chat message. If a GitHub issue exists for it (or one is filed as part of escalating), tag it with the `beta-feedback-urgent` label so it's visible in the issue list without reading every body.

**Cadence:** the Inbox is reviewed at least weekly — severities 1 and 6 are the exception and get handled the moment they're logged, not on the weekly pass.

---

## How to use this file

1. **Capture.** New feedback goes at the top of [Inbox](#inbox-untriaged) with source, date, reporter, and screen — copy/paste the raw report, don't summarize yet.
2. **Triage.** Assign a severity (below) and a routing destination. Do the actual routing (create the story, append to the backlog file, etc.).
3. **Move it.** Cut the entry from Inbox, paste it into [Routed](#routed) with the destination reference (story key, backlog item number, deferred-work.md entry, etc.) and the date routed.

## Severity ladder (most to least urgent)

| # | Severity | Meaning | Destination |
|---|---|---|---|
| 1 | Crash / data loss / security | Breaks the app or loses/exposes user data | Fast-follow story now — create via `create-story`, skip the queue |
| 2 | Broken core flow | A primary path (onboarding, ERP session, ladder) doesn't work but doesn't lose data | Fast-follow story, next available slot |
| 3 | Confusing but workable (UX friction) | Screen-specific usability complaint on a working flow | Epic 12 (UI/UX Enhancements & Polish) |
| 4 | Cosmetic / nice-to-have | Visual polish, non-blocking | `post-mvp-backlog.md` |
| 5 | New feature request | Not in current MVP scope | `post-mvp-backlog.md` |
| 6 | DPDPA / privacy-sensitive | Consent, data export/deletion, or any personal-data-handling concern | Escalate to the DPO flow (Epic 3) — **do not leave in this file after escalation**, route immediately regardless of how minor it looks |

## Routing destinations — how to actually route

- **Fast-follow story (severities 1–2):** run `create-story`; reference the Inbox entry's date/reporter in the story's Dev Notes so the origin isn't lost.
- **Epic 12 (severity 3):** `epics.md`'s Epic 12 section follows a screen-scoped placeholder convention — check whether the screen is already covered by an existing 12.x story before adding a new one; append/update ACs there, then reflect the story status in `sprint-status.yaml`.
- **`post-mvp-backlog.md` (severities 4–5):** append a new numbered item under the relevant section, following the existing `### N.M Title` / `**What:**` / `**Source:**` / `**Notes:**` format already used throughout that file.
- **DPO escalation (severity 6):** follow the FR-DPO-0x process (Epic 3) — do not attempt to resolve a privacy-sensitive report through this triage file's normal routes.

---

## Inbox (untriaged)

_Empty — log new feedback here as it arrives, newest at the top._

<!--
- **[YYYY-MM-DD] Source: <channel> — Reporter: <name/anon> — Screen: <screen/route>**
  Feedback: <raw report, unedited>
  Triage: pending
-->

---

## Routed

_Empty — entries move here once triaged and routed, most recent first._

<!--
- **[YYYY-MM-DD logged / YYYY-MM-DD routed] Source: <channel> — Screen: <screen/route>**
  Feedback: <raw report>
  Severity: <1-6> — Routed to: <story key / backlog item # / deferred-work.md entry>
-->
