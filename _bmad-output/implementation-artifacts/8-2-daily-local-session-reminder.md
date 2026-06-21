# Story 8.2: Daily Local Session Reminder

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who sets a preferred reminder time,
I want the app to send me a daily local notification at that time,
so that I am prompted to complete my daily exposure session (FR-NOTIF-03).

This story is entirely client-side local scheduling — no Edge Function, no server round-trip, no migration. It builds on Story 8.1's permission-toggle infrastructure but does not modify it.

## Acceptance Criteria

1. **Given** the user has not previously set a reminder time, **when** the reminder settings screen renders, **then** the default reminder time is displayed as 08:00 in the device's local timezone; no notification is scheduled until the user explicitly saves.
2. **Given** the user saves a reminder time, **when** the save action completes, **then** `Notifications.scheduleNotificationAsync` is called with a **`DailyTriggerInput`** (`type: SchedulableTriggerInputTypes.DAILY, hour, minute`) for the chosen time — **not** `CalendarTriggerInput` as originally drafted; see Dev Notes "AC2 correction: DailyTriggerInput, not CalendarTrigger" for why. The returned notification ID is stored in `KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)`; the chosen time (`HH:mm` string) is stored in `KV_KEYS.SESSION_REMINDER_TIME(userId)`; on successful scheduling, a confirmation message is shown: `t('notifications.reminderSet', { time })` (canonical: "Reminder set for {time} — see you then"). If scheduling is skipped because permission isn't granted (AC5), the chosen time is still persisted to `SESSION_REMINDER_TIME` but no confirmation message is shown and no notification ID is stored — see Dev Notes "AC2 × AC5 interaction".
3. **Given** the user changes their reminder time, **when** the save action completes, **then** the previously scheduled notification (ID from `KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)`) is cancelled via `Notifications.cancelScheduledNotificationAsync` before the new one is scheduled; no orphaned notifications remain.
4. **Given** the device timezone changes (e.g. travel), **when** the app is next foregrounded, **then** if `KV_KEYS.SESSION_REMINDER_TIME(userId)` contains a saved time, the existing notification is cancelled and rescheduled using the same `HH:mm` time. Implementation note: this is satisfied by unconditionally cancel+reschedule on every foreground when a saved time exists — see Dev Notes "AC4 implementation: no timezone-diff tracking needed".
5. **Given** the user has granted notification permission previously but permission has since been revoked in OS settings, **when** the app attempts to schedule a reminder (both the Save action and the AC4 foreground reschedule), **then** `Notifications.getPermissionsAsync()` is checked first; if not granted, the schedule call is skipped and the settings card updates to show permission revoked state; no error is thrown.
6. **Given** `packages/core/src/constants/kvKeys.ts`, **when** this story is implemented, **then** the following entries are added (user-scoped factory functions, consistent with the existing `KV_KEYS` pattern):
   ```typescript
   SESSION_REMINDER_TIME: (userId: string) => `notifications:reminder_time:${userId}`,
   SESSION_REMINDER_NOTIFICATION_ID: (userId: string) => `notifications:reminder_id:${userId}`,
   ```

## Tasks / Subtasks

- [ ] Task 1: `packages/core` — KV key additions (AC: 6)
  - [ ] 1.1 In `packages/core/src/constants/kvKeys.ts`, add `SESSION_REMINDER_TIME` and `SESSION_REMINDER_NOTIFICATION_ID` under the "User-scoped (functions)" section, exactly as specified in AC6. Add a one-line comment noting `SESSION_REMINDER_TIME` stores an `HH:mm` 24-hour string (e.g. `"08:00"`), not a `Date`.

- [ ] Task 2: `packages/supabase` — expose reminder KV getters/setters via `useAuth()` (AC: 2, 3, 4, 5)
  - [ ] 2.1 In `packages/supabase/src/auth/AuthProvider.tsx`, add four inline functions mirroring the existing `getLastUsedTechnique`/`setLastUsedTechnique` pattern at lines 313–328 exactly (closure over `mmkvRef.current` and `authState.userId`, not a separate exported pure function in `session.ts`):
    ```typescript
    function getReminderTime(): string | null {
      const store = mmkvRef.current
      const userId = authState.userId
      if (!store || !userId) return null
      return store.getString(KV_KEYS.SESSION_REMINDER_TIME(userId)) ?? null
    }
    function setReminderTime(time: string): void {
      const store = mmkvRef.current
      const userId = authState.userId
      if (!store || !userId) return
      store.set(KV_KEYS.SESSION_REMINDER_TIME(userId), time)
    }
    function getReminderNotificationId(): string | null {
      const store = mmkvRef.current
      const userId = authState.userId
      if (!store || !userId) return null
      return store.getString(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)) ?? null
    }
    function setReminderNotificationId(id: string): void {
      const store = mmkvRef.current
      const userId = authState.userId
      if (!store || !userId) return
      store.set(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId), id)
    }
    ```
    (Note the signatures take no `fearItemId`-equivalent arg — unlike `getLastUsedTechnique`, there's only one reminder time per user, so `userId` alone is the key.)
  - [ ] 2.2 Add all four to `AuthContextValue` interface, the default `createContext` value (no-op/`null` stubs), and the `<AuthContext.Provider value={{...}}>` object — same three touch points `getLastUsedTechnique`/`setLastUsedTechnique` already have.
  - [ ] 2.3 Add all four to `UseAuthResult` in `packages/supabase/src/auth/useAuth.ts` and the merged return object (these come from `AuthContext`, like `getLastUsedTechnique`, not `OnboardingContext`).

- [ ] Task 3: `apps/mobile` — local notification scheduling helper (AC: 2, 3, 5)
  - [ ] 3.1 Create `apps/mobile/src/notifications/sessionReminder.ts`:
    ```typescript
    export async function scheduleSessionReminder(
      time: string,           // "HH:mm"
      content: { title: string; body: string }
    ): Promise<string | null> // null = permission not granted, nothing scheduled
    export async function cancelSessionReminder(notificationId: string): Promise<void>
    ```
    `scheduleSessionReminder` parses `time` into `hour`/`minute` integers, calls `Notifications.getPermissionsAsync()` first (AC5) — if `status !== 'granted'`, return `null` without calling `scheduleNotificationAsync`. Otherwise call:
    ```typescript
    Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    })
    ```
    and return the resulting identifier. `cancelSessionReminder` calls `Notifications.cancelScheduledNotificationAsync(notificationId)` wrapped in try/catch — log and swallow errors (e.g. an already-fired/already-cancelled ID) rather than throwing, since callers (Task 4, Task 6) treat cancellation as best-effort cleanup before scheduling a replacement.

- [ ] Task 4: `apps/mobile` — reminder time picker screen (AC: 1, 2, 3, 5)
  - [ ] 4.1 Add `@react-native-community/datetimepicker` via `npx expo install @react-native-community/datetimepicker` from `apps/mobile/` (resolves the SDK-54-compatible version automatically, same convention as Story 8.1 Task 3.1 for `expo-notifications`). No time-picker library exists anywhere in this codebase yet — this is new ground, not a deviation.
  - [ ] 4.2 Create `apps/mobile/app/reminder-settings.tsx` as a **root-level file** (sibling to `privacy-notice.tsx` and `ladder.tsx`), **not** nested under `(app)/settings/`. See Dev Notes "File location correction: root-level screen, not `(app)/settings/notifications.tsx`" — every existing pushed sub-screen in this codebase (`privacy-notice.tsx`, `ladder.tsx`, `calm-me/`, `session/`) lives at the app root, never nested inside a `Tabs`-registered directory.
    - On mount: read `getReminderTime()` from `useAuth()`; if `null`, default the picker's working value to `08:00` (AC1). Construct a throwaway `Date` object with those hour/minute components to pass as `DateTimePicker`'s `value` prop (the picker requires a `Date`, the stored format is `HH:mm` — convert both directions).
    - `DateTimePicker` `mode="time"`, `onChange` updates **local draft state only** — does not call `setReminderTime` or schedule anything (AC1's "no notification is scheduled until the user explicitly saves").
    - Save button `onPress`: format the draft `Date` back to a zero-padded `HH:mm` string; if `getReminderNotificationId()` returns a value, call `cancelSessionReminder(id)` first (AC3); call `scheduleSessionReminder(time, content)` (content — see Task 4.3); always call `setReminderTime(time)` regardless of the result (AC2 × AC5 interaction, see Dev Notes); if the result is non-null, call `setReminderNotificationId(result)` and show the confirmation message; if `null`, do not show the confirmation message and instead reflect the permission-revoked state (e.g. reuse the same `derivePermissionState`-style messaging pattern from `settings/index.tsx`, or simply leave the existing Settings screen's "Enable reminders" row as the source of truth for permission state — do not duplicate that logic here, just avoid the false-positive confirmation).
  - [ ] 4.3 Local notification content (title/body) is not specified by any AC — choose content-neutral copy consistent with ADR-008's payload-neutrality *spirit* (no therapy/exposure/fear/anxiety language, even though ADR-008's rule is written for server push payloads, not local notifications — see Dev Notes "Local notification content — ADR-008 doesn't literally apply, but its spirit should"). Add new i18n keys for this (Task 7).
  - [ ] 4.4 Add `<Stack.Screen name="reminder-settings" options={{...}} />` to `apps/mobile/app/_layout.tsx`'s root `<Stack>` (around line 99), copying the exact `privacy-notice`/`ladder` entries' options (`headerShown: true, headerTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: '#ffffff' }, headerLeft: () => <BackButton />, headerBackVisible: false`). **This step is easy to miss and the screen will not render correctly without it** — `privacy-notice.tsx` and `ladder.tsx` both require this registration; a sibling file alone is not sufficient.

- [ ] Task 5: `apps/mobile` — Settings screen navigation row (AC: 1)
  - [ ] 5.1 In `apps/mobile/app/(app)/settings/index.tsx`, add a new row below the existing "Enable reminders" permission row (same `row`/`rowText` `StyleSheet` pattern), labeled via `t('settings.reminders.manageTime')`, `onPress={() => router.push('/reminder-settings')}`. This row is reachable regardless of current permission state — the picker screen itself doesn't require permission to render or select a time, only to actually schedule (AC5 is enforced inside `scheduleSessionReminder`, not at the navigation layer).

- [ ] Task 6: `apps/mobile` — foreground reschedule for timezone changes (AC: 4, 5)
  - [ ] 6.1 Extend the existing `AppState.addEventListener('change', ...)` effect in `apps/mobile/app/(app)/_layout.tsx` (lines 45–52, currently used for session-token refresh per ADR-008 §5b) — in the same `state === 'active'` branch, after the existing `createSupabaseClient().auth.getSession()` call, add: if `userId` and `getReminderTime()` (from `useAuth()`) return a stored time, cancel the existing notification ID (if any, via `cancelSessionReminder`) and call `scheduleSessionReminder` again with the stored time; update `setReminderNotificationId` only if a non-null result is returned (mirrors Task 4.2's Save logic — do not overwrite the stored time itself, only the notification ID).
    - This is the *entire* AC4 implementation — no separate "did the timezone actually change" detection is needed or built. `DailyTriggerInput`'s `hour`/`minute` are resolved against the device's current local timezone at the moment `scheduleNotificationAsync` is called, so cancel+reschedule on every foreground is simplest-correct and fully idempotent (the user notices no difference whether or not the timezone actually changed). See Dev Notes "AC4 implementation" for the full rationale — do not invent a new KV key to track "last known timezone"; none is specified in AC6 and none is needed.
    - This logic lives in `(app)/_layout.tsx`, not in `reminder-settings.tsx` — AC4 requires it on *any* foreground while authenticated, not only while the picker screen happens to be open.

- [ ] Task 7: i18n keys (`en.json` + `hi.json`)
  - [ ] 7.1 `settings.reminders.manageTime` — new nav row label (Task 5.1).
  - [ ] 7.2 New `reminderSettings.*` namespace for the picker screen: `screenTitle`, `saveButton`, and any other UI strings the screen needs (`apps/mobile/.eslintrc.js`'s `i18next/no-literal-string` rule blocks hardcoded JSX text, per the established convention from Story 8.1 Task 5.5).
  - [ ] 7.3 `notifications.reminderSet` — confirmation message, canonical en text: `"Reminder set for {{time}} — see you then"` (AC2). Add the Hindi equivalent to `hi.json` following the existing translation style in that file's `settings.reminders.*` block.
  - [ ] 7.4 `notifications.dailyReminder.title` / `notifications.dailyReminder.body` — the scheduled local notification's own content (Task 4.3), content-neutral per Dev Notes.

- [ ] Task 8: Tests
  - [ ] 8.1 `packages/supabase/__tests__/auth/` — new test file (e.g. `authProvider.reminderSettings.test.ts`) for the four new getter/setters. Follow the existing convention in `authProvider.sessionIntention.test.ts` (a minimal in-memory MMKV stand-in + the same get/set logic exercised directly), not a full `AuthProvider` RTL render — this matches every existing test for this class of KV helper in this codebase.
  - [ ] 8.2 `apps/mobile/src/notifications/sessionReminder.test.ts` — mock `expo-notifications`; cover: successful schedule (assert the trigger object's `type` is `SchedulableTriggerInputTypes.DAILY` with correct `hour`/`minute`, not a `CalendarTriggerInput` shape), permission-not-granted → returns `null`, no `scheduleNotificationAsync` call, no throw; `cancelSessionReminder` swallows a rejected `cancelScheduledNotificationAsync` without throwing.
  - [ ] 8.3 `apps/mobile/app/reminder-settings.test.tsx` (new, co-located) — covers: default 08:00 display when no stored time; Save schedules + persists `SESSION_REMINDER_TIME` + `SESSION_REMINDER_NOTIFICATION_ID` + shows confirmation; changing then saving cancels the old notification ID before scheduling the new one (AC3); Save while permission is revoked persists the chosen time but does **not** store a notification ID and does **not** show the confirmation message (AC2 × AC5).
  - [ ] 8.4 Extend `apps/mobile/app/(app)/settings/index.test.tsx` — new row navigates to `/reminder-settings` on tap.
  - [ ] 8.5 `apps/mobile/app/(app)/_layout.test.tsx` (new — no test file currently exists for this layout) — covers the foreground listener's reminder-reschedule branch: cancels + reschedules when a stored time exists, no-ops when none exists, skips silently (no throw) when permission isn't granted.
  - [ ] 8.6 Run `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` before marking complete.

## Dev Notes

### AC2 correction: `DailyTriggerInput`, not `CalendarTrigger`

The epics AC text says "a `CalendarTrigger`...repeating daily." This is wrong for this app and has been corrected in AC2 above. Checked directly against the installed `expo-notifications@0.32.17` type definitions (`node_modules/.../expo-notifications/build/Notifications.types.d.ts`): `CalendarTriggerInput` is documented `@platform ios` only (it maps to `UNCalendarNotificationTrigger`, an iOS-only API). This app supports both iOS and Android (Story 8.1 established `Platform.OS` detection for `device_push_tokens.platform`). `DailyTriggerInput` (`{ type: SchedulableTriggerInputTypes.DAILY, hour, minute }`) has no platform restriction in the type definitions, requires no `repeats` flag (daily-repeat is its entire purpose), and is the correct cross-platform equivalent. Use `DailyTriggerInput`. Do not use `CalendarTriggerInput`.

### AC4 implementation: no timezone-diff tracking needed

AC4's literal wording ("when the device timezone changes... reschedule") could be read as requiring explicit timezone-change detection (e.g. storing the last-known IANA timezone string and diffing on each foreground). **Do not build that.** AC6 lists only two new KV keys (`SESSION_REMINDER_TIME`, `SESSION_REMINDER_NOTIFICATION_ID`) — no timezone-tracking key is specified, and inventing one is unnecessary scope. `DailyTriggerInput`'s `hour`/`minute` fields are evaluated against the device's *current* local timezone at the moment `scheduleNotificationAsync` runs. Unconditionally cancelling and rescheduling on every foreground (Task 6) is simpler, fully idempotent, and produces the exact same end-state as a "diff and only reschedule if changed" approach — with no user-visible difference and no extra KV key.

### AC2 × AC5 interaction (a gap the literal AC text leaves ambiguous)

AC2 says saving always shows a confirmation message. AC5 says scheduling is silently skipped (no error) when permission is revoked. Read together: if a user without notification permission opens the picker and taps Save, AC2's literal text would have the app claim "Reminder set for 08:00" when nothing was actually scheduled — a false confirmation. This story resolves the ambiguity (Tasks 4.2/8.3): **the chosen time is always persisted** (so the preference survives and Task 6's foreground reschedule will pick it up and succeed automatically once the user later re-enables permission), but **the confirmation message and the notification-ID write are conditional on `scheduleSessionReminder` returning non-null**. This mirrors Story 8.1's precedent of amending an AC's literal wording during story creation when two ACs conflict (see `8-1-push-token-registration-and-shared-push-helper.md` AC2's amendment).

### File location correction: root-level screen, not `(app)/settings/notifications.tsx`

`project-structure-boundaries.md`'s tree diagram shows a planned `apps/mobile/app/(app)/settings/notifications.tsx`. **Do not create it there.** Every pushed sub-screen that currently exists in this codebase — `privacy-notice.tsx`, `ladder.tsx`, `calm-me/*`, `session/*` — lives as a **root-level** file or directory, sibling to the `(app)/` route group, each registered as a `<Stack.Screen>` in `apps/mobile/app/_layout.tsx`'s root `Stack` (lines 97–104). `(app)/_layout.tsx` only declares `Tabs.Screen` entries for `index` and `settings/index` — there is no nested `Stack` under `(app)/settings/` for a sibling file to slot into, and no precedent anywhere in this repo for nesting a pushed (non-tab) screen inside a `Tabs`-registered directory. This is the same class of "aspirational tree diagram vs. real codebase" deviation Story 8.1 already hit and resolved the same way (see that story's Dev Notes, "Settings screen — no card component, no notifications.tsx route") — follow the real codebase, not the diagram.

### Local notification content — ADR-008 doesn't literally apply, but its spirit should

ADR-008's "Notification Payload Rule" (content-neutral, no therapy/clinical content) is written for *server push* payloads (FCM/APNs, sent via `expoPush.ts` in Stories 8.1/8.4) — this story's notification is scheduled entirely client-side via `expo-notifications`'s local scheduler and never touches the server, so ADR-008 doesn't bind it by the letter of the rule. However, the underlying privacy concern — lock-screen visibility of clinical/mental-health content on a potentially shared or glanced-at device — applies identically to a local notification. No AC specifies exact copy. Choose generic, non-clinical title/body (e.g. title: the app name; body: a generic call-to-action that doesn't use words like "exposure," "fear," "anxiety," or "therapy") — consistent with FR-NOTIF-02's tone constraint, which is written for push re-engagement notifications (Story 8.4) but reflects this app's general policy on notification tone, not a push-specific exception.

### KV access pattern — no direct MMKV access from screens, follow the `useAuth()` precedent

There is no generic `useMmkv()` hook and no MMKV instance accessible directly from `apps/mobile` screen code — the single MMKV instance lives behind `AuthProvider`/`OnboardingProvider` context, exposed only through specific named functions merged into `useAuth()` (see `packages/supabase/src/auth/useAuth.ts`). Story 8.1 introduced a separate `PushRegistrationContext` for its more complex `AppState`-driven lifecycle — **do not copy that pattern here**. This story's KV access is a simple read-on-mount/write-on-save shape, which is exactly what `getLastUsedTechnique`/`setLastUsedTechnique` (Story 6.1+, `AuthProvider.tsx` lines 313–328) already establish as the precedent for "simple per-user KV getter/setter exposed via `useAuth()`." Follow that, not a new Context provider.

### Settings screen state-management note (reaffirmed from Story 8.1)

Per `implementation-patterns-consistency-rules.md` State Management Patterns: the picker screen has a small number of independent values (draft time, saved time, loading) — `useState` is correct, not `useReducer`.

### Out of scope — do not build

- `setNotificationHandler` (controls whether a notification banner shows while the app is foregrounded) is not configured anywhere in this codebase yet, and no AC in this story requires it. A reminder firing while the app happens to already be open is an edge case with no specified behavior — do not add foreground-presentation handling as scope creep.
- No Edge Function, no migration, no `device_push_tokens` interaction — this story is unrelated to Story 8.1's push-token plumbing beyond reusing `expo-notifications` (already a dependency) and not duplicating its `AppState` listener pattern unnecessarily.

## Project Structure Notes

- New file: `apps/mobile/app/reminder-settings.tsx` (root-level, see Dev Notes)
- New file: `apps/mobile/app/reminder-settings.test.tsx`
- New file: `apps/mobile/src/notifications/sessionReminder.ts` (+ co-located test)
- New file: `apps/mobile/app/(app)/_layout.test.tsx` (no test file currently exists for this layout)
- New file: `packages/supabase/__tests__/auth/authProvider.reminderSettings.test.ts`
- Modified: `apps/mobile/app/_layout.tsx` (add `Stack.Screen name="reminder-settings"` entry)
- Modified: `apps/mobile/app/(app)/_layout.tsx` (extend existing `AppState` listener)
- Modified: `apps/mobile/app/(app)/settings/index.tsx` (+ existing `index.test.tsx`)
- Modified: `apps/mobile/package.json` (add `@react-native-community/datetimepicker`)
- Modified: `packages/core/src/constants/kvKeys.ts`
- Modified: `packages/supabase/src/auth/AuthProvider.tsx`, `packages/supabase/src/auth/useAuth.ts`
- Modified: `apps/mobile/src/i18n/locales/en.json`, `hi.json`
- **Deviation from architecture tree diagram:** `apps/mobile/app/(app)/settings/notifications.tsx` shown in `project-structure-boundaries.md` is not created — `apps/mobile/app/reminder-settings.tsx` (root-level) is used instead. See Dev Notes "File location correction."

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.2, lines 1709-1744]
- [Source: _bmad-output/implementation-artifacts/8-1-push-token-registration-and-shared-push-helper.md — KV access precedent, AC-amendment precedent, "aspirational tree diagram" precedent]
- [Source: packages/core/src/constants/kvKeys.ts — existing `KV_KEYS` pattern, user-scoped factory functions]
- [Source: packages/supabase/src/auth/AuthProvider.tsx:313-328 — `getLastUsedTechnique`/`setLastUsedTechnique` precedent for simple per-user KV getter/setter exposure]
- [Source: packages/supabase/src/auth/useAuth.ts — merged `UseAuthResult` composition pattern]
- [Source: packages/supabase/__tests__/auth/authProvider.sessionIntention.test.ts — KV-helper test convention]
- [Source: apps/mobile/app/(app)/settings/index.tsx — existing "Enable reminders" row, `sectionTitle`/`row` pattern]
- [Source: apps/mobile/app/(app)/_layout.tsx:45-52 — existing `AppState` foreground listener (session refresh) to extend]
- [Source: apps/mobile/app/_layout.tsx:97-104 — root `Stack` screen registration pattern (`privacy-notice`, `ladder`)]
- [Source: apps/mobile/app/privacy-notice.tsx, apps/mobile/app/ladder.tsx — root-level pushed-screen precedent]
- [Source: node_modules/.../expo-notifications/build/Notifications.types.d.ts — `CalendarTriggerInput` (`@platform ios`) vs `DailyTriggerInput` (cross-platform) type definitions]
- [Source: node_modules/.../expo-notifications/build/scheduleNotificationAsync.d.ts — `scheduleNotificationAsync(request: NotificationRequestInput): Promise<string>` signature]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ADR-008 — Notification Payload Rule (push-specific; spirit applied here, see Dev Notes)]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#State Management Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md — FR-NOTIF-03]
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md — planned (and superseded) `settings/notifications.tsx` location]
- [Source: apps/mobile/src/i18n/locales/en.json, hi.json — existing `settings.reminders.*` namespace from Story 8.1]

## Latest Tech Information

- **Expo SDK 54 / React Native 0.81 (ADR-RN-VERSION, pinned), `expo-notifications@0.32.17`** (already installed, Story 8.1) — `SchedulableTriggerInputTypes.DAILY` and `.CALENDAR` are both present in this exact installed version; no version bump needed for this story.
- **`@react-native-community/datetimepicker`** — not yet installed; run `npx expo install @react-native-community/datetimepicker` from `apps/mobile/` to resolve the SDK-54-compatible version automatically (same convention as Story 8.1's `expo-notifications` install).
- **`CalendarTriggerInput` is `@platform ios` only** in this installed `expo-notifications` version's type definitions — confirmed by direct inspection, not assumed. `DailyTriggerInput` has no platform restriction.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log
