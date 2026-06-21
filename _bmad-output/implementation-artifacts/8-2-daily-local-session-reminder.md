# Story 8.2: Daily Local Session Reminder

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who sets a preferred reminder time,
I want the app to send me a daily local notification at that time,
so that I am prompted to complete my daily exposure session (FR-NOTIF-03).

This story is entirely client-side local scheduling — no Edge Function, no server round-trip, no migration. It builds on Story 8.1's permission-toggle infrastructure but does not modify it.

## Acceptance Criteria

> **Amended 2026-06-21 (UX redesign).** ACs 1, 2, 4 and 5 below were rewritten in place to reflect a post-"done" UX redesign driven by user-supplied mockups (Settings collapsed to a single "Daily reminder" row; the reminder-settings screen rebuilt around a Disable/Enable radio choice). New AC6 and AC8 (12-hour display, permission-denial blocking) did not exist in the original implementation. See Dev Notes "UX redesign (2026-06-21)" and the Change Log entry of the same date for the full rationale. The original AC text these replace is preserved in git history (this file as of commit `90c13e0`).

1. **Given** the user has not previously configured a reminder (or has previously chosen "Disable"), **when** the Settings screen renders, **then** the "Daily reminder" row shows the localized equivalent of "Disabled"; tapping the row navigates to `/reminder-settings`, which renders with "Disable" selected by default and the time picker hidden. No notification is scheduled and no reminder state changes until the user explicitly taps Save with "Enable" selected.
2. **Given** the user selects "Enable", picks a time, and taps Save, **when** OS notification permission is already granted **or** is granted after `Notifications.requestPermissionsAsync()` is called, **then** `Notifications.scheduleNotificationAsync` is called with a **`DailyTriggerInput`** (`type: SchedulableTriggerInputTypes.DAILY, hour, minute`) for the chosen time — **not** `CalendarTriggerInput`, see Dev Notes "AC2 correction: DailyTriggerInput, not CalendarTrigger". The returned notification ID is stored in `KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)`, the chosen time (`HH:mm` string) is stored in `KV_KEYS.SESSION_REMINDER_TIME(userId)`, and `KV_KEYS.SESSION_REMINDER_ENABLED(userId)` is set to `true`. The screen navigates back to Settings immediately on success — **no confirmation toast is shown**; this is a deliberate, user-confirmed UX decision (see Dev Notes "Save is silent by design"), superseding this story's original `notifications.reminderSet` confirmation copy, which has been removed.
3. **Given** the user re-saves with "Enable" selected and a different time (or the same time again), **when** the save action completes, **then** the previously scheduled notification (ID from `KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)`) is cancelled via `Notifications.cancelScheduledNotificationAsync` before the new one is scheduled; cancellation is best-effort (errors are logged and swallowed, see Task 3.1) — under normal operation no orphaned notifications remain, though a genuine OS-level cancellation failure is not guaranteed to be caught.
4. **Given** the app is foregrounded (which covers the device timezone changing, e.g. travel) **and** `KV_KEYS.SESSION_REMINDER_ENABLED(userId)` is `true`, **when** `KV_KEYS.SESSION_REMINDER_TIME(userId)` contains a saved time, **then** the existing notification is cancelled and rescheduled using the same `HH:mm` time, unconditionally on every foreground — not gated on detecting an actual timezone change. If `SESSION_REMINDER_ENABLED` is `false`, the foreground listener no-ops even if a time is still stored (this gate did not exist in the original implementation — it was added specifically so choosing "Disable" isn't silently undone on next app open). See Dev Notes "AC4 implementation: no timezone-diff tracking needed".
5. **Given** the user selects "Disable" and taps Save, **when** the save action completes, **then** any existing scheduled notification (ID from `KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)`) is cancelled best-effort, `KV_KEYS.SESSION_REMINDER_ENABLED(userId)` is set to `false`, and the stored notification ID is cleared. The previously stored `SESSION_REMINDER_TIME` is **left untouched** — re-selecting "Enable" later restores the last-picked time rather than resetting to 08:00 — but this retained value is not surfaced anywhere in the UI while "Disable" is selected (see Dev Notes "Known gap: retained time is invisible while disabled"). The screen navigates back to Settings, which now shows "Disabled".
6. **Given** the user selects "Enable" and taps Save, **when** OS notification permission is still not granted after `Notifications.requestPermissionsAsync()` is called (i.e. it was denied, or remains denied), **then** Save is **blocked**: no notification is scheduled, none of `SESSION_REMINDER_TIME`/`SESSION_REMINDER_NOTIFICATION_ID`/`SESSION_REMINDER_ENABLED` are written, and the screen does **not** navigate back. Inline guidance is shown instead (`t('reminderSettings.permissionRequired')`) alongside an "Open Settings" action that calls `Linking.openSettings()`. This is a deliberate, user-confirmed product decision (block + guide) over the alternative of silently persisting a non-functional enabled state — see Dev Notes "Permission-denial: block, don't silently persist".
7. **Given** the Settings screen's "Daily reminder" row, **when** `SESSION_REMINDER_ENABLED(userId)` is `true` and a time is stored, **then** the row's value is rendered in 12-hour clock format with an AM/PM suffix (e.g. stored `"23:00"` displays as "11:00 PM") via `formatTimeForDisplay` in `apps/mobile/src/notifications/sessionReminder.ts` — not the raw 24-hour `HH:mm` string. This did not exist in the original implementation, which had no row displaying the saved time in this form.
8. **Given** `packages/core/src/constants/kvKeys.ts`, **when** this story (including its 2026-06-21 amendment) is implemented, **then** the following entries are added (user-scoped factory functions, consistent with the existing `KV_KEYS` pattern):
   ```typescript
   SESSION_REMINDER_TIME: (userId: string) => `notifications:reminder_time:${userId}`,
   SESSION_REMINDER_NOTIFICATION_ID: (userId: string) => `notifications:reminder_id:${userId}`,
   SESSION_REMINDER_ENABLED: (userId: string) => `notifications:reminder_enabled:${userId}`,
   ```

## Tasks / Subtasks

- [x] Task 1: `packages/core` — KV key additions (AC: 6)
  - [x] 1.1 In `packages/core/src/constants/kvKeys.ts`, add `SESSION_REMINDER_TIME` and `SESSION_REMINDER_NOTIFICATION_ID` under the "User-scoped (functions)" section, exactly as specified in AC6. Add a one-line comment noting `SESSION_REMINDER_TIME` stores an `HH:mm` 24-hour string (e.g. `"08:00"`), not a `Date`.

- [x] Task 2: `packages/supabase` — expose reminder KV getters/setters via `useAuth()` (AC: 2, 3, 4, 5)
  - [x] 2.1 In `packages/supabase/src/auth/AuthProvider.tsx`, add five inline functions mirroring the existing `getLastUsedTechnique`/`setLastUsedTechnique` pattern at lines 313–328 exactly (closure over `mmkvRef.current` and `authState.userId`, not a separate exported pure function in `session.ts`):
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
    function clearReminderNotificationId(): void {
      const store = mmkvRef.current
      const userId = authState.userId
      if (!store || !userId) return
      store.delete(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId))
    }
    ```
    (Note the signatures take no `fearItemId`-equivalent arg — unlike `getLastUsedTechnique`, there's only one reminder time per user, so `userId` alone is the key. `clearReminderNotificationId` exists so callers can drop a stale ID after a permission-gated schedule attempt returns `null` — see Task 4.2/6.1 — rather than leaving a dangling pointer to an already-cancelled notification.)
  - [x] 2.2 Add all five to `AuthContextValue` interface, the default `createContext` value (no-op/`null` stubs), and the `<AuthContext.Provider value={{...}}>` object — same three touch points `getLastUsedTechnique`/`setLastUsedTechnique` already have.
  - [x] 2.3 Add all five to `UseAuthResult` in `packages/supabase/src/auth/useAuth.ts` and the merged return object (these come from `AuthContext`, like `getLastUsedTechnique`, not `OnboardingContext`).

- [x] Task 3: `apps/mobile` — local notification scheduling helper (AC: 2, 3, 5)
  - [x] 3.1 Create `apps/mobile/src/notifications/sessionReminder.ts`:
    ```typescript
    export async function scheduleSessionReminder(
      time: string,           // "HH:mm"
      content: { title: string; body: string }
    ): Promise<string | null> // null = permission not granted, nothing scheduled
    export async function cancelSessionReminder(notificationId: string): Promise<void>
    ```
    `scheduleSessionReminder` parses `time` into `hour`/`minute` integers, clamping/validating to `0–23`/`0–59` before use (the `HH:mm` string is always produced by this story's own picker, but defend against a malformed value reaching this function regardless). Wrap the `Notifications.getPermissionsAsync()` call (AC5) in try/catch as well — it can itself reject, not just resolve with a non-granted status; treat a thrown error the same as a non-granted status and return `null`. If `status !== 'granted'`, return `null` without calling `scheduleNotificationAsync`. Otherwise call:
    ```typescript
    Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    })
    ```
    and return the resulting identifier. `cancelSessionReminder` calls `Notifications.cancelScheduledNotificationAsync(notificationId)` wrapped in try/catch — log the caught error itself (its message, not just a generic "failed to cancel") and swallow it rather than throwing (e.g. an already-fired/already-cancelled ID is the expected case, but distinct logging lets production telemetry tell that apart from a genuine failure), since callers (Task 4, Task 6) treat cancellation as best-effort cleanup before scheduling a replacement.

- [x] Task 4: `apps/mobile` — reminder time picker screen (AC: 1, 2, 3, 5)
  - [x] 4.1 Add `@react-native-community/datetimepicker` via `npx expo install @react-native-community/datetimepicker` from `apps/mobile/` (resolves the SDK-54-compatible version automatically, same convention as Story 8.1 Task 3.1 for `expo-notifications`). No time-picker library exists anywhere in this codebase yet — this is new ground, not a deviation.
  - [x] 4.2 Create `apps/mobile/app/reminder-settings.tsx` as a **root-level file** (sibling to `privacy-notice.tsx` and `ladder.tsx`), **not** nested under `(app)/settings/`. See Dev Notes "File location correction: root-level screen, not `(app)/settings/notifications.tsx`" — every existing pushed sub-screen in this codebase (`privacy-notice.tsx`, `ladder.tsx`, `calm-me/`, `session/`) lives at the app root, never nested inside a `Tabs`-registered directory.
    - On mount: read `getReminderTime()` from `useAuth()`; if `null`, default the picker's working value to `08:00` (AC1). Construct a throwaway `Date` object with those hour/minute components to pass as `DateTimePicker`'s `value` prop (the picker requires a `Date`, the stored format is `HH:mm` — convert both directions).
    - `DateTimePicker` `mode="time"`, `onChange` updates **local draft state only** — does not call `setReminderTime` or schedule anything (AC1's "no notification is scheduled until the user explicitly saves").
    - Guard against concurrent taps with an in-flight ref (same `isHandlingReminderPressRef` pattern already used for the permission-request button in `settings/index.tsx`) — ignore a Save tap while a previous one is still in flight.
    - Save button `onPress`: format the draft `Date` back to a zero-padded `HH:mm` string; if `getReminderNotificationId()` returns a value, call `cancelSessionReminder(id)` first (AC3); call `scheduleSessionReminder(time, content)` (content — see Task 4.3); re-read `userId` from `useAuth()` immediately before the writes below and abort them (without throwing) if it no longer matches the `userId` this Save started with — guards against a sign-out/sign-in-as-different-user race during the awaits above; always call `setReminderTime(time)` regardless of the schedule result (AC2 × AC5 interaction, see Dev Notes); if the result is non-null, call `setReminderNotificationId(result)` and show the confirmation message; if `null`, call `clearReminderNotificationId()` (the old ID was already cancelled above, so this drops the now-stale pointer rather than leaving it stored) and do not show the confirmation message — instead reflect the permission-revoked state (e.g. reuse the same `derivePermissionState`-style messaging pattern from `settings/index.tsx`, or simply leave the existing Settings screen's "Enable reminders" row as the source of truth for permission state — do not duplicate that logic here, just avoid the false-positive confirmation).
  - [x] 4.3 Local notification content (title/body) is not specified by any AC — choose content-neutral copy consistent with ADR-008's payload-neutrality *spirit* (no therapy/exposure/fear/anxiety language, even though ADR-008's rule is written for server push payloads, not local notifications — see Dev Notes "Local notification content — ADR-008 doesn't literally apply, but its spirit should"). Add new i18n keys for this (Task 7).
  - [x] 4.4 Add `<Stack.Screen name="reminder-settings" options={{...}} />` to `apps/mobile/app/_layout.tsx`'s root `<Stack>` (insert after the existing `ladder` entry, inside the `<Stack>` block spanning lines 97–104 — line 99 is the `privacy-notice` entry itself, not an insertion point), copying the exact `privacy-notice`/`ladder` entries' options (`headerShown: true, headerTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: '#ffffff' }, headerLeft: () => <BackButton />, headerBackVisible: false`). **This step is easy to miss and the screen will not render correctly without it** — `privacy-notice.tsx` and `ladder.tsx` both require this registration; a sibling file alone is not sufficient.

- [x] Task 5: `apps/mobile` — Settings screen navigation row (AC: 1, 5)
  - [x] 5.1 In `apps/mobile/app/(app)/settings/index.tsx`, add a new row below the existing "Enable reminders" permission row (same `row`/`rowText` `StyleSheet` pattern), labeled via `t('settings.reminders.manageTime')`, `onPress={() => router.push('/reminder-settings')}`. This row is reachable regardless of current permission state — the picker screen itself doesn't require permission to render or select a time, only to actually schedule (AC5 is enforced inside `scheduleSessionReminder`, not at the navigation layer).

- [x] Task 6: `apps/mobile` — foreground reschedule for timezone changes (AC: 4, 5)
  - [x] 6.1 Extend the existing `AppState.addEventListener('change', ...)` effect in `apps/mobile/app/(app)/_layout.tsx` (lines 45–52, currently used for session-token refresh per ADR-008 §5b) — in the same `state === 'active'` branch, after the existing `createSupabaseClient().auth.getSession()` call, add: guard with an in-flight ref so overlapping `'active'` events (rapid app-switching) don't run this concurrently; if `userId` and `getReminderTime()` (from `useAuth()`) return a stored time, cancel the existing notification ID (if any, via `cancelSessionReminder`) and call `scheduleSessionReminder` again with the stored time; re-read `userId` immediately before the write below and abort it (without throwing) if it no longer matches the `userId` this cycle started with — guards against a sign-out/sign-in-as-different-user race during the awaits above; if the result is non-null, `setReminderNotificationId(result)`; if `null`, call `clearReminderNotificationId()` (mirrors Task 4.2's Save logic — do not overwrite the stored time itself, only the notification ID).
    - This is the *entire* AC4 implementation — no separate "did the timezone actually change" detection is needed or built. `DailyTriggerInput`'s `hour`/`minute` are resolved against the device's current local timezone at the moment `scheduleNotificationAsync` is called, so cancel+reschedule on every foreground is simplest-correct and fully idempotent (the user notices no difference whether or not the timezone actually changed). See Dev Notes "AC4 implementation" for the full rationale — do not invent a new KV key to track "last known timezone"; none is specified in AC6 and none is needed.
    - This logic lives in `(app)/_layout.tsx`, not in `reminder-settings.tsx` — AC4 requires it on *any* foreground while authenticated, not only while the picker screen happens to be open.

- [x] Task 7: i18n keys (`en.json` + `hi.json`)
  - Note: `notifications.*` (7.3, 7.4) is a brand-new top-level namespace — unlike `settings.reminders.*` (7.1), which already exists from Story 8.1, there is no existing `notifications` key in either locale file to add to; it must be created from scratch in both `en.json` and `hi.json`.
  - [x] 7.1 `settings.reminders.manageTime` — new nav row label (Task 5.1).
  - [x] 7.2 New `reminderSettings.*` namespace for the picker screen: `screenTitle`, `saveButton`, and any other UI strings the screen needs (`apps/mobile/.eslintrc.js`'s `i18next/no-literal-string` rule blocks hardcoded JSX text, per the established convention from Story 8.1 Task 5.5).
  - [x] 7.3 `notifications.reminderSet` — confirmation message, canonical en text: `"Reminder set for {{time}} — see you then"` (AC2). Add the Hindi equivalent to `hi.json` following the existing translation style in that file's `settings.reminders.*` block.
  - [x] 7.4 `notifications.dailyReminder.title` / `notifications.dailyReminder.body` — the scheduled local notification's own content (Task 4.3), content-neutral per Dev Notes.

- [x] Task 8: Tests
  - [x] 8.1 `packages/supabase/__tests__/auth/` — new test file (e.g. `authProvider.reminderSettings.test.ts`) for the four new getter/setters. Follow the existing convention in `authProvider.sessionIntention.test.ts` (a minimal in-memory MMKV stand-in + the same get/set logic exercised directly), not a full `AuthProvider` RTL render — this matches every existing test for this class of KV helper in this codebase.
  - [x] 8.2 `apps/mobile/src/notifications/sessionReminder.test.ts` — mock `expo-notifications`; cover: successful schedule (assert the trigger object's `type` is `SchedulableTriggerInputTypes.DAILY` with correct `hour`/`minute`, not a `CalendarTriggerInput` shape), permission-not-granted → returns `null`, no `scheduleNotificationAsync` call, no throw; `cancelSessionReminder` swallows a rejected `cancelScheduledNotificationAsync` without throwing.
  - [x] 8.3 `apps/mobile/app/reminder-settings.test.tsx` (new, co-located) — covers: default 08:00 display when no stored time; Save schedules + persists `SESSION_REMINDER_TIME` + `SESSION_REMINDER_NOTIFICATION_ID` + shows confirmation; changing then saving cancels the old notification ID before scheduling the new one (AC3); Save while permission is revoked persists the chosen time but does **not** store a notification ID and does **not** show the confirmation message (AC2 × AC5); the same is true when permission was never requested at all, not just revoked after being granted — both `status !== 'granted'` paths behave identically.
  - [x] 8.4 Extend `apps/mobile/app/(app)/settings/index.test.tsx` — new row navigates to `/reminder-settings` on tap.
  - [x] 8.5 `apps/mobile/app/(app)/_layout.test.tsx` (new — no test file currently exists for this layout) — covers the foreground listener's reminder-reschedule branch: cancels + reschedules when a stored time exists, no-ops when none exists, skips silently (no throw) when permission isn't granted; asserts `SESSION_REMINDER_TIME` is unchanged after the reschedule cycle (only the notification ID is updated).
  - [x] 8.6 Run `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` before marking complete.

- [x] Task 9: UX redesign — single Settings row + Disable/Enable radio screen (2026-06-21, post-"done")
  - [x] 9.1 `packages/core/src/constants/kvKeys.ts` — add `SESSION_REMINDER_ENABLED` (AC8).
  - [x] 9.2 `packages/supabase/src/auth/AuthProvider.tsx` / `useAuth.ts` — add `getReminderEnabled`/`setReminderEnabled`, mirroring the existing `getReminderTime`/`setReminderTime` closure pattern (same three touch points: `AuthContextValue`, default context stub, provider value object; plus `UseAuthResult` and the merged return in `useAuth.ts`).
  - [x] 9.3 `apps/mobile/app/(app)/settings/index.tsx` — collapse the old two-row layout (permission-status row + "manage time" row) into one "Daily reminder" row. Value reads `getReminderEnabled() && getReminderTime() ? formatTimeForDisplay(...) : t('settings.reminders.disabledValue')`. Removed: `expo-notifications` import, `ReminderPermissionState` derivation, the `AppState` permission-refresh listener, and the direct `usePushRegistrationContext()` call (permission requesting moved to Task 9.4). The removed `AppState` listener's job — picking up state changes made elsewhere (i.e. on `reminder-settings.tsx`) — is replaced by a new `useFocusEffect` that re-reads `getReminderEnabled()`/`getReminderTime()` on every navigation-focus transition, **plus** a redundant mount-time `useEffect` fallback: `useFocusEffect` only fires on a genuine focus transition, not when the `useAuth()` getters' identity changes, and `authState.userId` hydrates asynchronously after mount — so the very first focus can fire before MMKV/userId are ready. The plain `useEffect` re-reads once `AuthProvider` settles, catching that gap. Both effects are idempotent (same read-only re-sync), so redundant firing is harmless.
  - [x] 9.4 `apps/mobile/app/reminder-settings.tsx` — rebuilt around two radio rows ("Disable"/"Enable"); `DateTimePicker` renders only when "Enable" is selected. `handleSave` branches on selection (AC2, AC5, AC6). Permission requesting and the push-token `registerNow()` call moved here from the old `settings/index.tsx` row — but `usePushRegistration(userId)` is called **directly** (not via `usePushRegistrationContext()`), because this screen is a root-level `Stack.Screen` outside the `(app)` route group and is not a React-tree descendant of `PushRegistrationProvider` (which only wraps `(app)/_layout.tsx`'s `Tabs`/`Modal`). This is a new architectural note not present in the original Task 4 — see Dev Notes "Push-token registration moved screens — context vs. direct hook call". **Behavior change from the original Task 4.2:** `registerNow()` is no longer awaited — it's called fire-and-forget (`registerNow().catch(...)`) so a slow/failing push-token registration can't block or delay Save's own writes/navigation. This is intentional: push-token registration (remote FCM/APNs delivery) is an orthogonal concern from local notification scheduling — `scheduleSessionReminder` has already completed by the time `registerNow()` is invoked, so the local reminder fires regardless of `registerNow()`'s outcome.
  - [x] 9.5 `apps/mobile/app/(app)/_layout.tsx` — gated `rescheduleSessionReminder` on `getReminderEnabled()` (AC4); without this gate, choosing "Disable" would be silently undone on the next app foreground, since the foreground listener previously rescheduled off `getReminderTime()` alone.
  - [x] 9.6 `apps/mobile/src/notifications/sessionReminder.ts` — added `formatTimeForDisplay(time, amLabel, pmLabel)` (AC7).
  - [x] 9.7 i18n — removed `settings.reminders.{notYetRequested,enabled,disabled,manageTime,manageTimeWithValue}` and `notifications.reminderSet`; added `settings.reminders.{rowLabel,disabledValue,am,pm}` and `reminderSettings.{disableOption,enableOption,permissionRequired,openSettings}` to both `en.json` and `hi.json`.
  - [x] 9.8 Tests rewritten/extended: `settings/index.test.tsx`, `reminder-settings.test.tsx`, `(app)/_layout.test.tsx`, `authProvider.reminderSettings.test.ts` (new `getReminderEnabled`/`setReminderEnabled` coverage). `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` pass clean (319 mobile tests, 40 supabase tests).
  - [x] 9.9 UX review of the redesign conducted via BMad party-mode roundtable (Sally/John/Amelia, 2026-06-21) before commit. Two open questions raised were resolved by direct user confirmation: (a) Save intentionally stays silent, no confirmation toast — see Dev Notes "Save is silent by design"; (b) the static "Enable" radio label with the picker appearing below it (rather than the time baked into the label, e.g. "Enable — 08:00 AM") is the correct reading of this story's UX spec. One finding from that review was **not** addressed and is tracked as deferred work, not fixed: an in-progress (unsaved) time-picker selection is lost if permission is denied (AC6) and the user navigates away without resolving it — see `deferred-work.md`.

### Review Findings

- [x] [Review][Patch] AC4's "Given the device timezone changes" framing is misleading — the actual implementation triggers unconditionally on every foreground, not on a detected timezone change. Reword AC4's Given clause to reflect the real trigger condition.
- [x] [Review][Patch] Stale `SESSION_REMINDER_NOTIFICATION_ID` is never cleared when a save returns `null` (permission not granted) but a previous valid ID existed — leaves a dangling pointer to an already-cancelled notification. Add guidance to clear/null the stored ID after a successful cancel when the new schedule attempt fails.
- [x] [Review][Patch] AC2's opening sentence reads as if scheduling is unconditional on save; only the trailing clause and Dev Notes walk it back. Tighten AC2's phrasing so the conditionality (permission-gated) is visible at a skim.
- [x] [Review][Patch] Task 6.1's "do not overwrite the stored time, only the ID" constraint has no corresponding test in Task 8.5. Add an explicit assertion bullet to 8.5.
- [x] [Review][Patch] AC5 promises "no error is thrown" but only `cancelSessionReminder` is specified with try/catch — `Notifications.getPermissionsAsync()` itself can reject and isn't guarded. Add try/catch (or equivalent) around the permission check in `scheduleSessionReminder`.
- [x] [Review][Patch] Task 5 is tagged "(AC: 1)" but its justification ("AC5 is enforced inside `scheduleSessionReminder`, not at the navigation layer") actually cites AC5. Retag Task 5 as "(AC: 1, 5)".
- [x] [Review][Patch] "Latest Tech Information" bullet ("`SchedulableTriggerInputTypes.DAILY` and `.CALENDAR` are both present") reads as endorsing `.CALENDAR`, contradicting the Dev Notes' "do not use `CalendarTriggerInput`" guidance. Reword to clarify the enum member existing is not an endorsement of using it.
- [x] [Review][Patch] AC5 says "the settings card updates," but everywhere else the document says "row" (`row`/`rowText` pattern). Fix terminology to "row" for consistency.
- [x] [Review][Patch] "Around line 99" for the new `Stack.Screen` insertion point is imprecise — line 99 is the `privacy-notice` entry itself, not a gap. Clarify the insertion point (e.g. "after the `ladder` entry, before the `<Stack>` closes"). [apps/mobile/app/_layout.tsx:99]
- [x] [Review][Patch] References/Project Structure Notes imply a `notifications.*` i18n namespace similar to the existing `settings.reminders.*`, but `notifications.*` doesn't exist at all yet — it's a wholly new top-level key. Clarify this distinction so a developer doesn't go looking for a partial namespace that isn't there.
- [x] [Review][Patch] No in-flight/debounce guard is specified for the Save button (Task 4.2) or the foreground reschedule listener (Task 6.1) — both can race against each other or against rapid repeated triggers, risking an orphaned notification ID or a stale overwrite. This codebase already has a precedent for this exact pattern (`isHandlingReminderPressRef` in `apps/mobile/app/(app)/settings/index.tsx`). Add guidance to use the same in-flight-guard pattern in both Task 4.2 and Task 6.1.
- [x] [Review][Patch] Stale `authState.userId` across an await boundary: if a user signs out and a different user signs in while a Save or foreground-reschedule async chain is in flight, the resulting notification ID write could land under the new user's KV key. Add guidance to re-check `userId` immediately before the final write and abort if it has changed.
- [x] [Review][Patch] `cancelSessionReminder`'s blanket try/catch swallows all errors indistinguishably, masking real bugs as the documented "already-fired" case. Add a one-line note to log the actual error object/message when caught, not just "log and swallow."
- [x] [Review][Patch] Task 8.3's test list covers "permission revoked" but not "permission never requested" explicitly, even though the implementation's `status !== 'granted'` check already covers both correctly. Add an explicit test bullet for the never-requested case.
- [x] [Review][Patch] No bounds-checking or try/catch is specified around `scheduleNotificationAsync`'s `hour`/`minute` parsing in `scheduleSessionReminder` — out-of-range values throw per the type defs, and the spec doesn't say how that's handled. Add a one-line note on validating/clamping `hour`/`minute` or wrapping the call in try/catch.
- [x] [Review][Patch] AC3's "no orphaned notifications remain" is stated as an absolute guarantee, but `cancelSessionReminder`'s best-effort swallow-all-errors design means a genuine (non-"already cancelled") cancellation failure would leave the old notification live alongside the new one — silently violating AC3. Soften AC3's wording to reflect best-effort intent, or add a reconciliation note.
- [x] [Review][Defer] "Fully idempotent" claim re: OS-level snooze invalidation on every foreground reschedule — speculative engineering tradeoff, already deliberate, low impact — deferred, pre-existing design choice
- [x] [Review][Defer] Permission-revoked UI messaging left as an either/or non-decision in Task 4.2 — genuinely requires a UX/product decision, not a mechanical patch — deferred, needs product input
- [x] [Review][Defer] `apps/mobile/app/(app)/_layout.test.tsx` doesn't exist yet despite pre-existing AppState session-refresh logic — pre-existing test debt this story inherits, not introduced by it — deferred, pre-existing
- [x] [Review][Defer] DST-while-asleep gap (timezone changes without a foreground event in between) — explicitly already a deliberate scope decision in Dev Notes ("do not build timezone-diff tracking") — deferred, reaffirms existing decision
- [x] [Review][Defer] Existing test convention (`authProvider.sessionIntention.test.ts`) requires re-implementing KV-helper logic inline in the test rather than testing real exported functions — pre-existing pattern in the codebase, not introduced by this story — deferred, pre-existing
- [x] [Review][Defer] `mmkvRef.current` going degraded/null mid-flow between screen mount and Save tap — deep, low-probability edge case tied to a broader storage-degradation pattern not addressed elsewhere in the codebase either — deferred, pre-existing

### Review Findings — implementation diff (2026-06-21)

- [x] [Review][Patch] Unguarded `scheduleNotificationAsync` rejection causes silent total reminder loss [apps/mobile/src/notifications/sessionReminder.ts] — `scheduleSessionReminder` only wraps `Notifications.getPermissionsAsync()` in try/catch; `Notifications.scheduleNotificationAsync` itself is unguarded. Both callers (`reminder-settings.tsx` Save, `(app)/_layout.tsx` foreground reschedule) cancel the old notification first, then schedule — if the schedule call throws, the exception propagates unhandled, the old notification is already cancelled, and the stored notification ID is never updated (neither set nor cleared), leaving a stale ID with no live notification and no error surfaced. Wrap `scheduleNotificationAsync` in try/catch, mirroring `cancelSessionReminder`'s log-and-swallow pattern, returning `null` on failure.
- [x] [Review][Patch] Orphaned OS notification leak when the userId race-guard fires after a successful schedule [apps/mobile/app/reminder-settings.tsx:61-63, apps/mobile/app/(app)/_layout.tsx:77-87] — In both `handleSave` and `rescheduleSessionReminder`, when `scheduleSessionReminder` resolves with a new notification ID but the post-await `userIdRef.current !== startUserId` check then fires, the function returns immediately without storing or cancelling the just-created notification — it leaks as a live, untracked OS-level notification with no KV pointer to recover it. Cancel the newly-created notification before returning early in this race path.
- [x] [Review][Patch] Duplicated HH:mm parsing with inconsistent malformed-input handling [apps/mobile/src/notifications/sessionReminder.ts (`parseTime`), apps/mobile/app/reminder-settings.tsx (`timeStringToDate`)] — `parseTime` clamps out-of-range `hour`/`minute` to valid bounds (0–23/0–59); `timeStringToDate` has no clamping and silently produces midnight (`00:00`) on a malformed/corrupted stored value instead of falling back to the screen's own documented `DEFAULT_TIME` (`08:00`). Same logical parse implemented twice with two different failure behaviors. Share one parsing function, or at minimum align `timeStringToDate`'s fallback with `DEFAULT_TIME`.
- [x] [Review][Patch] Potential setState-after-unmount in `handleSave` [apps/mobile/app/reminder-settings.tsx:42-77] — If the screen unmounts (back navigation) while the cancel/schedule awaits in `handleSave` are in flight, the `finally` block still calls `setIsSaving`/`setConfirmation` on an unmounted component. Guard with a mounted ref checked before the post-await state updates.
- [x] [Review][Defer] Foreground reschedule has no debounce beyond the in-flight mutex, so rapid app-switching triggers repeated cancel+reschedule churn [apps/mobile/app/(app)/_layout.tsx] — already an explicit, deliberate tradeoff per this story's own Dev Notes ("cancel+reschedule on every foreground is simplest-correct and fully idempotent") and already recorded in deferred-work.md — deferred, reaffirms existing design choice
- [x] [Review][Defer] `cancelSessionReminder`'s swallow-all-errors design can leave a live OS notification orphaned if the underlying OS cancel silently fails while the KV ID is still cleared [apps/mobile/src/notifications/sessionReminder.ts] — already explicitly accepted via this story's own applied patch ("Soften AC3's wording to reflect best-effort intent") — deferred, reaffirms existing decision
- [x] [Review][Defer] No `requestPermissionsAsync` call and no in-screen messaging when permission status is `undetermined`/revoked [apps/mobile/app/reminder-settings.tsx] — explicitly left as a non-decision requiring product input in this story's own Task 4.2 / Dev Notes — deferred, needs product input (reaffirmed) — **Resolved 2026-06-21 (UX redesign, Task 9.4 / AC6):** `requestPermissionsAsync()` is now called on Save when permission isn't already granted; if it remains denied, Save blocks and shows inline guidance + an "Open Settings" action rather than persisting a non-functional state.
- [x] [Review][Defer] `AuthProvider`'s five new reminder methods are not memoized with `useCallback` [packages/supabase/src/auth/AuthProvider.tsx] — pre-existing pattern shared by every other AuthProvider helper (e.g. `getLastUsedTechnique`); this story was explicitly instructed to mirror that exact pattern — deferred, pre-existing
- [x] [Review][Defer] No data-layer invariant enforcing `setReminderTime` and `setReminderNotificationId`/`clearReminderNotificationId` are updated atomically [packages/supabase/src/auth/AuthProvider.tsx] — pre-existing characteristic of this KV-getter/setter pattern, not unique to this story — deferred, pre-existing
- [x] [Review][Defer] AC5's "settings row updates to show permission revoked state" relies entirely on the unmodified Story 8.1 "Enable reminders" row; this diff adds no new test coverage verifying that path still holds [apps/mobile/app/(app)/settings/index.tsx] — pre-existing coverage gap, not introduced by this diff — deferred, pre-existing — **Resolved 2026-06-21 (UX redesign):** moot — that row (and Story 8.1's live-permission-status display in Settings) no longer exists. The Settings row now reflects the persisted `SESSION_REMINDER_ENABLED` flag, not live OS permission status. Note this does introduce a new, narrower gap of its own — see Dev Notes "Known gap: Settings row doesn't re-verify OS permission" — tracked as new deferred work, not the same issue.
- [x] [Review][Defer] `userIdRef`-mirroring race-guard pattern is duplicated verbatim across `(app)/_layout.tsx` and `reminder-settings.tsx` with no shared hook [apps/mobile/app/(app)/_layout.tsx, apps/mobile/app/reminder-settings.tsx] — both copies are currently correct; a reuse/maintainability observation, not a bug — deferred, low priority

### Review Findings — UX redesign code review (2026-06-21)

_Multi-layer review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) of the `90c13e0..04d7338` diff — the UX-redesign implementation commit, isolated from the docs-only follow-up commit. 0 AC violations found; AC1–AC8 independently verified as substantively implemented._

- [x] [Review][Patch] `Notifications.requestPermissionsAsync()` is unguarded against rejection in `handleSave`'s "enable" path — only `getPermissionsAsync()` is wrapped in try/catch, despite both being equally capable of throwing (native module issues). An uncaught rejection skips `setPermissionError`, leaving the user with `isSaving` silently reset and zero feedback instead of the inline guidance AC6 specifies. [apps/mobile/app/reminder-settings.tsx] — fixed: wrapped in try/catch, treats a thrown error as `'denied'` so `permissionError` is surfaced like any other denial.
- [x] [Review][Patch] Disable/Enable radio rows have no `disabled={isSaving}` guard — only the Save button itself does. A user can flip their selection while a save is in flight; the in-flight save's branch decision is already locked in and "wins," silently discarding the user's later choice and navigating them to a state they didn't end up choosing. [apps/mobile/app/reminder-settings.tsx] — fixed: both radio `TouchableOpacity`s now take `disabled={isSaving}` plus a dimmed `radioRowDisabled` style, mirroring the existing Save-button pattern.
- [x] [Review][Patch] The two radio rows each declare `accessibilityRole="radio"` independently with no enclosing `accessibilityRole="radiogroup"` — screen readers won't announce them as a mutually exclusive set. [apps/mobile/app/reminder-settings.tsx] — fixed: both rows now wrapped in a `View accessibilityRole="radiogroup"`.
- [x] [Review][Patch] Task 9.3 doesn't document the new `useFocusEffect` + fallback `useEffect` mechanism added to `settings/index.tsx` to replace the removed `AppState` listener as the means of refreshing displayed reminder state — a real architectural addition, invisible in both the subtask text and Dev Notes. [Task 9.3, this file] — fixed: Task 9.3 amended in place with the full mechanism description.
- [x] [Review][Patch] Task 9.4 / Dev Notes don't disclose that `registerNow()` changed from awaited (original implementation) to fire-and-forget (`.catch()`-only) in the redesign — a defensible choice (push-token registration is orthogonal to local notification scheduling, which already completes before this call) but undisclosed. [Task 9.4, this file] — fixed: Task 9.4 amended in place with the behavior-change disclosure and rationale.
- [x] [Review][Defer] `getReminderEnabled`/`setReminderEnabled` MMKV calls lack try/catch — mirrors every other existing `AuthProvider` KV getter/setter (`getReminderTime`, `getLastUsedTechnique`, etc.), none of which have try/catch either; pre-existing pattern across the whole helper family, already captured in `deferred-work.md`'s "no atomic data-layer invariant" entry. [packages/supabase/src/auth/AuthProvider.tsx] — deferred, pre-existing pattern
- [x] [Review][Defer] The userId race-guard early-return in `handleSave`'s "enable" path doesn't resync `selection`/`draftDate`/`permissionError` to the new (switched-to) user's actual state after a mid-save sign-out/sign-in-as-different-user race — narrow edge case mirroring the pre-existing, already-accepted race-guard pattern from the original Story 8.2 review. [apps/mobile/app/reminder-settings.tsx] — deferred, pre-existing pattern
- [x] [Review][Defer] `router.back()` is called unconditionally with no `canGoBack()` guard — currently unreachable as a problem since this screen has exactly one entry point (`router.push` from Settings) and no deep-link/notification-action routing exists anywhere in this codebase yet. [apps/mobile/app/reminder-settings.tsx] — deferred, speculative future entry point
- [x] [Review][Defer] Hindi locale's `am`/`pm` keys are set to literal "AM"/"PM", identical to English, rather than a Hindi-specific rendering — plausibly an intentional, common Indian-app convention rather than an oversight, but unconfirmed; this project already has an established "needs translator pass" backlog pattern for partial Hindi coverage. [apps/mobile/src/i18n/locales/hi.json] — deferred, needs translator/product input

## Dev Notes

### UX redesign (2026-06-21): single Settings row + Disable/Enable radio screen

Post-"done," the user supplied two mockup screenshots showing the Settings screen with a single "Daily reminder" row (value: "Disabled" or a 12-hour time like "11:00 AM") rather than this story's original two-row layout (a live permission-status row + a separate "Set reminder time" nav row). The brief for the destination screen was one line: "open a screen with 2 radio button options - Disable, the time configuration element. There should be a save button at the end." Implemented as: a "Disable"/"Enable" radio pair, with the existing `DateTimePicker` rendered under "Enable" only, and a Save button. See Task 9 for the full file-by-file breakdown.

This required introducing real persisted user intent (`SESSION_REMINDER_ENABLED`) where none existed before — the original implementation inferred "enabled" live from `Notifications.getPermissionsAsync()` on every Settings mount, with no way to express "the user chose to turn this off" independent of OS permission state. Two clarifying questions were asked and answered by the user before implementation: (1) on Save with "Enable" selected, if permission is denied, **block Save and show inline guidance** (vs. silently persisting a non-functional enabled state) — this is AC6; (2) the Settings row time **does** switch to 12-hour AM/PM display — this is AC7.

### Save is silent by design

The original `notifications.reminderSet` confirmation toast ("Reminder set for {time} — see you then") was removed; Save now navigates back to Settings with no toast/confirmation on either the Enable or Disable path. Raised as a UX concern in a post-implementation party-mode review (Sally, 2026-06-21) and explicitly confirmed by the user as intentional minimalism, not an oversight — do not re-add a confirmation toast without a fresh product decision.

### Permission-denial: block, don't silently persist

Considered and rejected: silently persisting `SESSION_REMINDER_ENABLED=true` and the chosen time even when permission is denied (matching the original implementation's AC2×AC5 behavior, which always persisted the time regardless of permission outcome). User's explicit choice (2026-06-21): block Save entirely on denial, show inline guidance + "Open Settings," and persist nothing until permission is actually granted. This is a deliberate behavior change from this story's original Save semantics — the "time persists even when permission is denied, so a later permission grant + foreground reschedule silently recovers it" property no longer exists for first-time Enable. It still exists for Disable→Enable with an already-stored time (see "Known gap" below).

### Known gap: retained time is invisible while disabled

Disabling does not clear `SESSION_REMINDER_TIME` (AC5) — re-selecting "Enable" later restores the last-picked time in the picker rather than resetting to 08:00. However nothing in the UI surfaces this while "Disable" is selected; a user has no way to see "7:30 AM is still remembered" without tapping "Enable" first. Raised in the same party-mode review (John); not fixed, left as a minor known gap.

### Known gap: Settings row doesn't re-verify OS permission

The original implementation re-checked `Notifications.getPermissionsAsync()` live every time the Settings screen mounted or the app foregrounded, so a permission revoked externally (in OS Settings) was reflected in the UI promptly. The redesigned Settings row no longer imports `expo-notifications` at all — its value is driven purely by the persisted `SESSION_REMINDER_ENABLED` flag and `SESSION_REMINDER_TIME`. If a user enables the reminder and then revokes notification permission from OS Settings (outside the app), the "Daily reminder" row keeps showing the previously saved time as if active. The next app foreground's reschedule cycle (AC4/Task 6) will silently fail to reschedule (permission check inside `scheduleSessionReminder` returns `null`) and clear the stored notification ID, but `SESSION_REMINDER_ENABLED`/`SESSION_REMINDER_TIME` are left untouched and the row's displayed value does not change — the user sees no indication their reminder has stopped firing. Not fixed in this pass; tracked in `deferred-work.md`.

### Push-token registration moved screens — context vs. direct hook call

The original `settings/index.tsx` called `usePushRegistrationContext().registerNow()` after the user granted permission via the old permission-status row. That row is gone; permission requesting now happens in `reminder-settings.tsx`'s Save handler instead. `reminder-settings.tsx` is a root-level `Stack.Screen` (per this story's original "File location correction" Dev Note below) — it is **not** a descendant of `PushRegistrationProvider`, which is only mounted inside `(app)/_layout.tsx`'s `Tabs`/`Modal` subtree. Calling `usePushRegistrationContext()` from `reminder-settings.tsx` would silently receive the default no-op stub. Fix: call the underlying `usePushRegistration(userId)` hook directly in `reminder-settings.tsx` instead of via context — this gives an independent, correctly-scoped `registerNow`, at the cost of a second hook instance (its own mount-effect registration attempt and `AppState` listener) running alongside the one already mounted under `(app)/_layout.tsx`. Both calls are idempotent server-side (`registerPushToken` upserts), so the duplication is wasteful but not harmful.

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

**UX redesign (2026-06-21, Task 9) — additional files touched, all already-existing files modified (no new files):**

- `packages/core/src/constants/kvKeys.ts` (modified — `SESSION_REMINDER_ENABLED` added)
- `packages/supabase/src/auth/AuthProvider.tsx`, `packages/supabase/src/auth/useAuth.ts` (modified — `getReminderEnabled`/`setReminderEnabled`)
- `packages/supabase/__tests__/auth/authProvider.reminderSettings.test.ts` (modified — new describe block)
- `apps/mobile/app/(app)/settings/index.tsx` (modified — collapsed to single row; rewritten)
- `apps/mobile/app/(app)/settings/index.test.tsx` (modified — rewritten)
- `apps/mobile/app/reminder-settings.tsx` (modified — rebuilt around Disable/Enable radios; rewritten)
- `apps/mobile/app/reminder-settings.test.tsx` (modified — rewritten)
- `apps/mobile/app/(app)/_layout.tsx` (modified — foreground reschedule gated on `getReminderEnabled()`)
- `apps/mobile/app/(app)/_layout.test.tsx` (modified — new no-op-when-disabled test)
- `apps/mobile/src/notifications/sessionReminder.ts` (modified — `formatTimeForDisplay` added)
- `apps/mobile/src/i18n/locales/en.json`, `apps/mobile/src/i18n/locales/hi.json` (modified — keys replaced, see Task 9.7)

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

- **Expo SDK 54 / React Native 0.81 (ADR-RN-VERSION, pinned), `expo-notifications@0.32.17`** (already installed, Story 8.1) — `SchedulableTriggerInputTypes.DAILY` is the trigger type this story uses; no version bump needed for this story. (The enum also has a `.CALENDAR` member, present in this version but **not** used here — it corresponds to the iOS-only `CalendarTriggerInput` shape this story explicitly avoids; its existence in the enum is not an endorsement of using it, see Dev Notes "AC2 correction.")
- **`@react-native-community/datetimepicker`** — not yet installed; run `npx expo install @react-native-community/datetimepicker` from `apps/mobile/` to resolve the SDK-54-compatible version automatically (same convention as Story 8.1's `expo-notifications` install).
- **`CalendarTriggerInput` is `@platform ios` only** in this installed `expo-notifications` version's type definitions — confirmed by direct inspection, not assumed. `DailyTriggerInput` has no platform restriction.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — no blocking issues. Two typecheck errors (`noUncheckedIndexedAccess` on `time.split(':')` destructuring in `sessionReminder.ts` and `reminder-settings.tsx`) and one lint error (missing `i18next/no-literal-string` disable comment on `DateTimePicker`'s `mode="time"` prop) were caught and fixed during Task 8.6 validation.

### Completion Notes List

- Implemented all 8 tasks per the story spec, including all Review Findings patches already folded into the AC/Dev Notes text (no separate rework needed — the story file already reflected the patched version).
- KV getters/setters (Task 2) follow the `getLastUsedTechnique`/`setLastUsedTechnique` precedent exactly — closures over `mmkvRef.current` and `authState.userId`, wired through `AuthContextValue` → `useAuth()`.
- `scheduleSessionReminder`/`cancelSessionReminder` (Task 3) clamp `hour`/`minute` to valid ranges, wrap `getPermissionsAsync()` in try/catch (treating a thrown error as not-granted), and log-and-swallow cancellation errors with the actual error object.
- `reminder-settings.tsx` (Task 4) is a root-level screen registered in `app/_layout.tsx`'s root `Stack` (not nested under `(app)/settings/`, per Dev Notes). Save guards concurrent taps with an in-flight ref and re-checks `userId` via a ref (not a closured variable, which would be a no-op check) after the async schedule/cancel calls to abort writes on a sign-out/sign-in race.
- Settings nav row (Task 5) added below the existing "Enable reminders" row, navigating to `/reminder-settings` regardless of permission state.
- Foreground reschedule (Task 6) extends the existing `(app)/_layout.tsx` `AppState` listener. `rescheduleSessionReminder` is wrapped in `useCallback` (not a plain function closed over by an empty-deps effect) so it always sees the current `useAuth()` getters/setters; the effect depends on it so the listener resubscribes when those identities change. An in-flight ref guards overlapping `'active'` events, and the same `userIdRef`-based race guard as Task 4.2 protects the final write.
- Local notification content (Task 4.3/7.4) is content-neutral per ADR-008's spirit: title is the app name, body is a generic, non-clinical call-to-action.
- All 8.x test subtasks written and passing: 7 new tests in `authProvider.reminderSettings.test.ts`, 7 in `sessionReminder.test.ts`, 6 in `reminder-settings.test.tsx`, 1 new test extending `settings/index.test.tsx`, and 3 in the new `(app)/_layout.test.tsx`.
- `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` all pass clean (310 mobile tests, full monorepo).

### Completion Notes — UX redesign (2026-06-21, Task 9)

- Settings screen (`(app)/settings/index.tsx`) collapsed from two rows (live permission-status row + "manage time" row) to a single "Daily reminder" row driven by the new persisted `getReminderEnabled()`/`getReminderTime()`, formatted 12-hour via `formatTimeForDisplay` (AC7). No longer imports `expo-notifications`.
- `reminder-settings.tsx` rebuilt around Disable/Enable radio rows (AC1, AC5, AC2/AC6); permission requesting and the `registerNow()` push-token call moved here from the old Settings row, calling `usePushRegistration(userId)` directly rather than via `PushRegistrationContext` (see Dev Notes — this screen sits outside `PushRegistrationProvider`'s subtree).
- New `SESSION_REMINDER_ENABLED` KV key + `getReminderEnabled`/`setReminderEnabled` on `AuthProvider`/`useAuth` (Task 9.1/9.2) — first explicit persisted "user disabled this" signal; previously inferred live from OS permission status with no way to express user intent independent of it.
- `(app)/_layout.tsx`'s foreground reschedule effect gated on `getReminderEnabled()` (Task 9.5) — closes a real bug: without this, choosing "Disable" would have been silently undone the next time the app was foregrounded, since the old effect rescheduled off a stored time alone.
- Confirmation toast (`notifications.reminderSet`) removed; Save is now silent on both paths — confirmed intentional via a post-implementation party-mode UX review (Sally/John/Amelia), not an oversight.
- One UX finding from that review was deliberately left unfixed and moved to `deferred-work.md`: an in-progress, unsaved time-picker selection is lost if permission is denied (AC6) and the user backs out without resolving it.
- All tests rewritten/extended accordingly; `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` pass clean (319 mobile tests, 40 supabase tests).

### File List

- `packages/core/src/constants/kvKeys.ts` (modified)
- `packages/supabase/src/auth/AuthProvider.tsx` (modified)
- `packages/supabase/src/auth/useAuth.ts` (modified)
- `packages/supabase/__tests__/auth/authProvider.reminderSettings.test.ts` (new)
- `apps/mobile/src/notifications/sessionReminder.ts` (new)
- `apps/mobile/src/notifications/sessionReminder.test.ts` (new)
- `apps/mobile/app/reminder-settings.tsx` (new)
- `apps/mobile/app/reminder-settings.test.tsx` (new)
- `apps/mobile/app/_layout.tsx` (modified — registered `reminder-settings` Stack.Screen)
- `apps/mobile/app/(app)/_layout.tsx` (modified — extended foreground `AppState` listener)
- `apps/mobile/app/(app)/_layout.test.tsx` (new)
- `apps/mobile/app/(app)/settings/index.tsx` (modified — new nav row)
- `apps/mobile/app/(app)/settings/index.test.tsx` (modified — new test + `expo-router` mock)
- `apps/mobile/app.config.ts` (modified — added `@react-native-community/datetimepicker` plugin)
- `apps/mobile/package.json` (modified — added `@react-native-community/datetimepicker@8.4.4`)
- `pnpm-lock.yaml` (modified — dependency install)
- `apps/mobile/src/i18n/locales/en.json` (modified — `settings.reminders.manageTime`, `reminderSettings.*`, `notifications.*`)
- `apps/mobile/src/i18n/locales/hi.json` (modified — same keys, Hindi)

## Change Log

- 2026-06-21 — Story 8.2 implemented end-to-end (Tasks 1–8). All ACs satisfied; full validation suite (`typecheck`, `lint`, `test`) passes clean. Status: ready-for-dev → review.
- 2026-06-21 — Code review of implementation diff (Blind Hunter + Edge Case Hunter + Acceptance Auditor): 0 AC violations, 4 patches applied, 7 deferred. Patches: guarded `scheduleNotificationAsync` against rejection, fixed an orphaned-notification leak on the userId race-guard path (both `reminder-settings.tsx` and `(app)/_layout.tsx`), unified HH:mm parsing/fallback between `sessionReminder.ts` and `reminder-settings.tsx`, guarded `handleSave` against setState-after-unmount. Added regression tests for each; full validation suite passes clean (314 mobile tests). Status: review → done.
- 2026-06-21 — **UX redesign, post-"done"** (Task 9): user supplied mockup screenshots showing a single "Daily reminder" Settings row (Disabled / 12-hour time) and a one-line spec for a Disable/Enable radio destination screen. Settings collapsed from two rows to one; `reminder-settings.tsx` rebuilt around Disable/Enable radios with the time picker shown only under Enable. Added a real persisted `SESSION_REMINDER_ENABLED` flag (previously inferred live from OS permission status) and gated the foreground reschedule on it. Save on Enable now requests OS permission and **blocks** (inline guidance + "Open Settings") rather than silently persisting on denial — AC1/2/4/5 amended, AC6/7 added, AC8 (KV keys) extended with the new key. Confirmation toast removed (confirmed intentional via party-mode UX review, not a regression). ACs, Tasks, Dev Notes, File List amended in place; two stale `[Review][Defer]` findings annotated resolved; one new known gap documented (Settings row no longer re-verifies live OS permission status — see Dev Notes). Full validation suite passes clean (319 mobile tests, 40 supabase tests). Status: done (unchanged).
- 2026-06-21 — Code review of the UX-redesign diff (`90c13e0..04d7338`, Blind Hunter + Edge Case Hunter + Acceptance Auditor): 0 AC violations, 5 patches applied, 4 deferred, 8 dismissed. Patches: guarded `requestPermissionsAsync()` against rejection (mirroring the existing `getPermissionsAsync()` guard), disabled the Disable/Enable radio rows while a save is in flight (previously only the Save button was guarded, so a mid-save selection flip was silently discarded), added an `accessibilityRole="radiogroup"` wrapper around the two radio rows, and amended Task 9.3/9.4 to document the new `useFocusEffect` refresh mechanism and the `registerNow()` await→fire-and-forget behavior change, both of which were undisclosed in the original redesign write-up. Added 2 regression tests. Full validation suite passes clean (321 mobile tests, 40 supabase tests). Status: done (unchanged).
