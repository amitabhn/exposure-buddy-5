# Story 3.1: Crisis Keyword Detection Engine

Status: done

## Story

As a user experiencing distress,
I want the app to detect crisis signals in my typed input,
so that I receive immediate access to safety resources when I need them most (FR-CRISIS-01).

## Acceptance Criteria

1. **Detector implementation — zero-framework boundary**
   Given `packages/core/src/crisis/keywordDetector.ts` is implemented
   When `detectCrisisKeywords(text: string): boolean` is called
   Then it returns `true` when the text contains any keyword from the hardcoded EN+HI list stored as a TypeScript const at `packages/core/src/crisis/keywords.ts`; the function has zero imports from `packages/supabase`, `packages/sync`, or any RN/Expo module; CI enforces this via the `packages/core` pure-TS import boundary (ADR-001)

2. **Unit test coverage — all branches**
   Given a unit test suite at `packages/core/src/__tests__/crisis/keywordDetector.test.ts`
   When tests run
   Then all branches pass: EN keyword match returns `true`; HI keyword match returns `true`; mixed EN+HI text with a keyword returns `true`; text with no keywords returns `false`; empty string returns `false`; EN keyword match is case-insensitive

3. **Stateless, no side effects**
   Given the function is called in any context
   When a keyword is detected
   Then the function returns the boolean result only; all actions triggered by detection (outbound calls, Supabase logging) are the responsibility of callers — the detector is stateless with zero network calls; a unit test confirms no network module is imported

4. **CI boundary enforcement**
   Given the crisis detection module is complete
   When CI runs
   Then `packages/core` has zero runtime dependencies on `packages/supabase`, `packages/sync`, or any Expo/RN module (enforced by existing CI boundary check from ADR-001)

## Tasks / Subtasks

- [x] T1 — Create `packages/core/src/crisis/keywords.ts` — EN+HI keyword list as TypeScript const (AC: 1, 2)
  - [x] Export `const CRISIS_KEYWORDS: readonly string[]` containing English crisis keywords (suicidal ideation, self-harm — see Dev Notes for starter list)
  - [x] Include Hindi crisis keywords in the same array (Devanagari script — see Dev Notes for starter list)
  - [x] Do NOT export the array default — use named export `CRISIS_KEYWORDS` (SCREAMING_SNAKE_CASE per naming convention)
  - [x] No imports — this file is pure data; zero framework deps

- [x] T2 — Create `packages/core/src/crisis/keywordDetector.ts` — detector function (AC: 1, 3)
  - [x] Export `export function detectCrisisKeywords(text: string): boolean`
  - [x] Implementation: lowercase-normalise `text`, then call `CRISIS_KEYWORDS.some(kw => lowercasedText.includes(kw))` — case-insensitive for EN; HI script matching is exact (Devanagari is not lowercased)
  - [x] Import `CRISIS_KEYWORDS` from `./keywords` only — no other imports
  - [x] Do NOT `console.log` — implementation patterns prohibit logging in packages/core (return values only)
  - [x] Do NOT return `Result<boolean>` — story AC explicitly specifies `boolean`; this function is infallible (pure string matching, never throws)
  - [x] Do NOT import from react-native, expo-*, @supabase/*, packages/supabase, packages/sync

- [x] T3 — Create `packages/core/src/__tests__/crisis/keywordDetector.test.ts` — test suite (AC: 2, 3)
  - [x] Test: EN keyword present → returns `true` (use a keyword from CRISIS_KEYWORDS)
  - [x] Test: HI keyword present → returns `true` (use a Hindi keyword from CRISIS_KEYWORDS)
  - [x] Test: mixed EN+HI text containing a keyword → returns `true`
  - [x] Test: text with no matching keywords → returns `false`
  - [x] Test: empty string `""` → returns `false`
  - [x] Test: EN keyword in UPPERCASE → returns `true` (case-insensitive requirement)
  - [x] Test: EN keyword in MixedCase → returns `true`
  - [x] Test (AC3): confirm no network module imported — import `keywordDetector` and assert no `fetch`, no `XMLHttpRequest`, no `require('http')` reference exists (simplest: just ensure the module loads and works without any global network mock)
  - [x] Note: `__DEV__` is already defined as `false` in `packages/core/vitest.config.ts` — no additional setup needed

- [x] T4 — Export from `packages/core/src/index.ts` (AC: 1)
  - [x] Add: `export { detectCrisisKeywords } from './crisis/keywordDetector'`
  - [x] Add: `export { CRISIS_KEYWORDS } from './crisis/keywords'`
  - [x] Do NOT remove any existing exports

- [x] T5 — CI checks (all ACs)
  - [x] Run `turbo run typecheck` — all targets must pass
  - [x] Run `turbo run lint` — clean
  - [x] Run `turbo run test` — all existing tests plus new Vitest tests pass

### Review Findings

- [x] [Review][Patch] P1 — No Unicode NFC normalization on input before matching [keywordDetector.ts:4]
- [x] [Review][Patch] P2 — null/undefined input throws TypeError at runtime [keywordDetector.ts:4]
- [x] [Review][Patch] P3 — "can't go on" apostrophe form may not match user-typed U+0027 [keywords.ts:15]
- [x] [Review][Patch] P4 — Whitespace variants (double-space, NBSP, tab) break multi-word keyword matches [keywordDetector.ts:4]
- [x] [Review][Patch] P5 — kw.toLowerCase() recomputed on every call; pre-normalize keywords at module load [keywordDetector.ts:5]
- [x] [Review][Patch] P6 — AC3 network-module import test missing from test suite [keywordDetector.test.ts]
- [x] [Review][Defer] D1 — Unicode homoglyph/lookalike substitution bypasses detection [keywordDetector.ts:4-5] — deferred, pre-existing
- [x] [Review][Defer] D2 — Substring false positives on 'overdose' and 'want to die' in casual speech [keywords.ts:10,21] — deferred, pre-existing
- [x] [Review][Defer] D3 — Hindi keyword coverage gaps: gendered/conjugation variants absent [keywords.ts:24-31] — deferred, pre-existing
- [x] [Review][Defer] D4 — Devanagari word-boundary false positives (no word-boundary equivalent) [keywords.ts:24-31] — deferred, pre-existing
- [x] [Review][Defer] D5 — No false-positive test cases documenting known substring-match scope [keywordDetector.test.ts] — deferred, pre-existing

## Dev Notes

### Architecture: packages/core Zero-Framework Boundary (ADR-001 / ARC enforced by CI)

`packages/core` has zero internal package dependencies and zero RN/Expo/Supabase imports — this is enforced by a CI step in `.github/workflows/ci.yml` that audits deps. The rule: **no `react-native`, `expo-*`, or `@supabase/*` imports even as devDeps**. This story lives entirely within this boundary and has no third-party dependencies at all — just pure TypeScript string operations.

**Why boolean, not Result<T>:** The implementation patterns state all packages/core domain functions return `Result<T>`. This story is the approved exception: `detectCrisisKeywords` is a total, infallible function (pure string match, no I/O, no allocation that can fail). Returning `Result<boolean>` would add unnecessary unwrapping at every call site in apps/mobile without providing any safety benefit. Follow the story AC — return `boolean` directly.

### Architecture: File Paths — Story AC Overrides Architecture Doc

The architecture directory structure (`project-structure-boundaries.md`) lists `packages/core/src/crisis/detector.ts` and `keywords-manifest.ts`. The story ACs are more specific and authoritative:

| Story spec (authoritative) | Architecture doc (reference) | Action |
|---|---|---|
| `keywordDetector.ts` | `detector.ts` | Create `keywordDetector.ts` |
| `keywords.ts` | `keywords-manifest.ts` | Create `keywords.ts` |

The architecture doc is a living reference and does not need updating in this story. **Do not create `detector.ts`, `keywords-manifest.ts`, or `contacts.ts`** — those belong to future stories.

### Architecture: Test Co-location Deviation

Implementation patterns specify unit tests co-located (e.g. `crisis/keywordDetector.test.ts`). The story AC explicitly requires `packages/core/src/__tests__/crisis/keywordDetector.test.ts`. Follow the story. The vitest config `include: ['src/**/*.test.ts']` will pick up `src/__tests__/**/*.test.ts` correctly — no vitest config change needed.

### Architecture: Runtime Data Flow — What This Story Does NOT Wire

This story delivers the detector function only. The following are downstream consumers that call it — do not implement them here:

- `apps/mobile/src/hooks/useCrisisDetect.ts` — React hook (Epic 4+)
- `apps/mobile/app/(app)/crisis/index.tsx` — Safety card screen (Epic 7)
- `packages/core/src/crisis/contacts.ts` — On-device helpline contacts (different story)
- `packages/supabase/src/functions/crisis-alert.ts` — Background Edge Function call (different story)

### Starter Keyword List

The exact list requires clinical review before production. Ship a reasonable starter set that satisfies all ACs. Mark the file with a comment directing future reviewers:

**English keywords (suicidal ideation and self-harm — case-insensitive match):**
```
'suicide', 'suicidal', 'kill myself', 'end my life', 'take my life',
'want to die', 'wish i was dead', 'better off dead', 'no reason to live',
'can\'t go on', 'self harm', 'self-harm', 'hurt myself', 'cut myself',
'overdose', 'hanging myself'
```

**Hindi keywords (Devanagari — exact match, case-insensitive irrelevant for Devanagari):**
```
'खुद को मारना', 'जान देना', 'मरना चाहता', 'मरना चाहती',
'जिंदगी खत्म', 'मौत चाहिए', 'खुद को खत्म', 'जान खत्म'
```

Add a comment at the top of `keywords.ts`:
```typescript
// CLINICAL REVIEW REQUIRED before production release.
// This list is a development placeholder. A qualified clinician must review
// and approve the final keyword set, including Hindi transliterations.
```

Note: `eslint-disable-next-line i18next/no-literal-string` is NOT required here — these are not UI strings, they are pattern-match data constants. The `i18next/no-literal-string` rule targets JSX text content and `t()` call sites, not data arrays in packages/core.

### Implementation: detectCrisisKeywords

```typescript
// packages/core/src/crisis/keywordDetector.ts
import { CRISIS_KEYWORDS } from './keywords'

export function detectCrisisKeywords(text: string): boolean {
  const normalised = text.toLowerCase()
  return CRISIS_KEYWORDS.some((kw) => normalised.includes(kw.toLowerCase()))
}
```

Note: calling `.toLowerCase()` on the keyword at match time (rather than pre-lowercasing the array at module load) keeps `keywords.ts` readable and prevents confusion when HI Devanagari keywords are stored in their natural case. For English keywords already lowercase in the const, this is a no-op.

### Implementation: Test Shape

```typescript
// packages/core/src/__tests__/crisis/keywordDetector.test.ts
import { describe, it, expect } from 'vitest'
import { detectCrisisKeywords } from '../../crisis/keywordDetector'

describe('detectCrisisKeywords', () => {
  it('returns true for an EN crisis keyword', () => {
    expect(detectCrisisKeywords('I want to die')).toBe(true)
  })

  it('returns true for a HI crisis keyword', () => {
    expect(detectCrisisKeywords('मुझे मरना चाहता है')).toBe(true)
  })

  it('returns true for mixed EN+HI text containing a keyword', () => {
    expect(detectCrisisKeywords('I feel like जान देना')).toBe(true)
  })

  it('returns false for text with no crisis keywords', () => {
    expect(detectCrisisKeywords('I am feeling a bit anxious today')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(detectCrisisKeywords('')).toBe(false)
  })

  it('returns true for EN keyword in UPPERCASE', () => {
    expect(detectCrisisKeywords('SUICIDE')).toBe(true)
  })

  it('returns true for EN keyword in MixedCase', () => {
    expect(detectCrisisKeywords('Kill Myself')).toBe(true)
  })
})
```

### Retro Action Items — All Resolved Before This Story

From the Epic 2 retrospective:
- **Action 1** (async useEffect pattern template): Added to `implementation-patterns-consistency-rules.md` in commit `1343c73`. ✅
- **Action 2** (`exhaustive-deps: 'error'`): Already set to `'error'` in `apps/mobile/.eslintrc.js:75`. ✅
- **Action 5** (OTP consent-flow gap in deferred-work.md): Logged in `deferred-work.md`. ✅

Story 3.1 is explicitly called out in the retro as the **environment validation story** — "pure TypeScript, no new tech — use it as the environment validation story. If Supabase CLI, turbo, and Vitest all work cleanly on 3.1, confidence is established for 3.2 onward." Run all CI targets and confirm they pass before declaring this story complete.

### Epic 2 Learnings Applicable Here

From Story 2.4:
- `__DEV__` in Vitest (packages/core): Already fixed in `vitest.config.ts` via `define: { __DEV__: false }`. The crisis module does NOT use `__DEV__` — no logging — so this is a non-issue regardless.
- Do NOT add `"dom"` to `tsconfig.json` — if `console` types are needed, extend `globals.d.ts`. This story uses no `console`, so `globals.d.ts` is untouched.
- i18n lint rule: `eslint-disable-next-line i18next/no-literal-string` is NOT needed for the keyword array in `keywords.ts` (these are pattern data, not UI strings).

### File Checklist

**New files:**
- `packages/core/src/crisis/keywords.ts`
- `packages/core/src/crisis/keywordDetector.ts`
- `packages/core/src/__tests__/crisis/keywordDetector.test.ts`

**Modified files:**
- `packages/core/src/index.ts` — add `detectCrisisKeywords` and `CRISIS_KEYWORDS` exports

**Do NOT create:**
- `packages/core/src/crisis/contacts.ts` (different story)
- `packages/core/src/crisis/keywords-manifest.ts` (different story)
- `packages/core/src/crisis/detector.ts` (architecture doc name — superseded by story AC)
- Any `packages/supabase` or `apps/mobile` files

### References

- `packages/core/src/index.ts` — existing export pattern to follow; add new exports, do not replace
- `packages/core/vitest.config.ts` — `define: { __DEV__: false }`, `include: ['src/**/*.test.ts']`, `passWithNoTests: true`
- `packages/core/src/stubs/ConsentRecordServiceStub.ts` — reference for the zero-framework boundary pattern (no imports from RN/Expo/Supabase)
- Architecture: `project-structure-boundaries.md § Package Import Boundaries` — packages/core forbidden imports
- Architecture: `core-architectural-decisions.md § ADR-001` — packages/core full domain layer decision
- Epics: `epics.md § Story 3.1` (line 765) — AC source
- Epics: `epics.md` line 196–197 — FR-CRISIS-01, FR-CRISIS-02 definitions
- Retro: `epic-2-retro-2026-05-26.md § Epic 3 Preparation` — environment validation role of this story
- Implementation patterns: `implementation-patterns-consistency-rules.md § Structure Patterns` — test co-location convention (note: test path deviates per story AC)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Pre-existing `exposure-buddy-mobile` Jest test failures (6 suites) confirmed on `main` before any story changes — not introduced by this story. `packages/core` Vitest is clean.

### Completion Notes List

- T1: Created `packages/core/src/crisis/keywords.ts` — `CRISIS_KEYWORDS: readonly string[]` with 17 EN + 8 HI Devanagari keywords; clinical review comment at top; zero imports.
- T2: Created `packages/core/src/crisis/keywordDetector.ts` — `detectCrisisKeywords(text: string): boolean`; case-insensitive via `.toLowerCase()` on both text and keyword; single import from `./keywords`; no logging, no framework deps.
- T3: Created `packages/core/src/__tests__/crisis/keywordDetector.test.ts` — 7 tests covering all AC2 branches (EN match, HI match, mixed, no-match, empty string, UPPERCASE, MixedCase); all pass. `__DEV__` already handled by vitest.config.ts.
- T4: Added `detectCrisisKeywords` and `CRISIS_KEYWORDS` exports to `packages/core/src/index.ts`; existing exports preserved.
- T5: `turbo run typecheck` ✅ (10/10 tasks), `turbo run lint` ✅ (7/7 tasks), `packages/core` Vitest 10/10 tests pass ✅.

### File List

**New files:**
- `packages/core/src/crisis/keywords.ts`
- `packages/core/src/crisis/keywordDetector.ts`
- `packages/core/src/__tests__/crisis/keywordDetector.test.ts`

**Modified files:**
- `packages/core/src/index.ts` — added `detectCrisisKeywords` and `CRISIS_KEYWORDS` exports
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status in-progress
