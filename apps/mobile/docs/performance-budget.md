# Performance Budget — Low-End Device Validation

Story: 9.7 | NFR-PERF-01, UX-DR8

## Reference Device Profile

| Field | Value |
|---|---|
| Platform | Android |
| RAM | 2 GB |
| CPU class | Snapdragon 439 equivalent (Redmi 9A / Samsung Galaxy M02 tier) |
| Android version | Android 10+ (API 29+) |
| Build type | Release APK (`eas build --profile preview`) |

### Emulator fallback

If a physical device is not available, create an AVD in Android Studio:

1. Create a Pixel 4a or "Medium Phone" AVD — Target: Android 10 (API 29), RAM: 2048 MB.
2. Apply 2× CPU throttle: emulator toolbar → Extended Controls → Settings → Throttling → select "2×". Alternatively launch with `emulator @AVD_NAME -prop persist.cpu.throttle=2`.
3. **GPU caveat**: 2× CPU throttle does not affect GPU. Modal animation fps measured in the emulator reflects the host GPU, not Snapdragon 439 + Mali-G31. Physical device is preferred for fps measurement.

## Auth Profiles

| Profile | Setup | P0 gate |
|---|---|---|
| **Profile A** (first-install baseline) | `adb shell pm clear com.exposurebuddy` → `adb shell am start -W -n com.exposurebuddy/.MainActivity` | Reference only |
| **Profile B** (returning user, valid token) | Sign in → force-stop → `adb shell am force-stop com.exposurebuddy` → `adb shell am start -W -n com.exposurebuddy/.MainActivity` | **Yes** |
| Profile C (expired token) | Excluded from P0 gating — variable is network round-trip latency in `supabase.auth.refreshSession()`, not app code | Excluded |

## Budget Targets

| Metric | Budget | P0 threshold | P1 zone | NFR reference |
|---|---|---|---|---|
| (1a) Cold start — TotalTime (`am start -W`), Profile B | ≤ 2 s | > 2 s | — | NFR-PERF-01 |
| (1b) Cold start — content-visible (all spinners gone, home list rendered), Profile B | ≤ 3.5 s | > 3.5 s | — | NFR-PERF-01 |
| (2a) SUDS Modal slide-in fps (`animationType="slide"`) | ≥ 55 fps | < 45 fps | 45–55 fps | UX rendering quality |
| (2b) SUDS button tap-to-selection-highlight | ≤ 100 ms | > 100 ms | — | UX JS-thread responsiveness |
| (3) Calm Me tap-to-mount (`onPress` → first `onLayout`/mount in `calm-me/index.tsx`) | ≤ 200 ms | > 200 ms | — | UX-DR8 (instant render) |

Note: NFR-PERF-01 specifies < 3 s at P90. Story 9.7 adopts ≤ 2 s TotalTime + ≤ 3.5 s content-visible to give Story 9.9 (India launch) headroom.

## Measurement Tools

| Metric | Primary tool | Fallback |
|---|---|---|
| Cold start TotalTime | `adb shell am start -W` | — |
| Cold start content-visible | Stopwatch on 60 fps screen recording | — |
| SUDS Modal slide-in fps | Flashlight CLI (`npx @perf-tools/flashlight`) against release APK | 60 fps screen recording + frame count via VLC or `ffprobe` |
| SUDS tap-to-highlight | 60 fps screen recording, frame-counting | — |
| Calm Me tap-to-mount | Flashlight CLI or 60 fps screen recording | — |

## Results

_All measurements taken on release APK. Run each measurement 3 times and record the median._

| Metric | Budget | Result — Profile A | Result — Profile B | Tool used | Build type | Pass/Fail |
|---|---|---|---|---|---|---|
| (1a) Cold start TotalTime | ≤ 2 s | — | — | `adb shell am start -W` | Release APK | — |
| (1b) Cold start content-visible | ≤ 3.5 s | — | — | Stopwatch / 60 fps recording | Release APK | — |
| (2a) SUDS Modal slide-in fps | ≥ 55 fps | N/A | — | Flashlight CLI | Release APK | — |
| (2b) SUDS tap-to-highlight | ≤ 100 ms | N/A | — | 60 fps recording | Release APK | — |
| (3) Calm Me tap-to-mount | ≤ 200 ms | N/A | — | Flashlight CLI / 60 fps recording | Release APK | — |

_Note: Profile A column is N/A for metrics 2a, 2b, 3 — these are session/interaction metrics, not cold-start flows._

## Measurement Procedure

### Cold start (Tasks 2.1–2.5)

**Setup:**
```bash
# Confirm adb
adb version

# Sideload release APK
adb install <path-to-preview.apk>
```

**Profile A (first-install baseline) — run 3 times, record median TotalTime:**
```bash
adb shell pm clear com.exposurebuddy
adb shell am start -W -n com.exposurebuddy/.MainActivity
```

**Profile B (returning user, valid token) — run 3 times, record median TotalTime:**
```bash
# Sign in once in the app to ensure valid token, then:
adb shell am force-stop com.exposurebuddy
adb shell am start -W -n com.exposurebuddy/.MainActivity
```

Record `TotalTime` (from `am start -W` output). Record content-visible time via stopwatch on 60 fps screen recording (tap → all ActivityIndicator spinners gone, home list rendered).

**If TotalTime or content-visible exceeds budget:** Add `console.time`/`console.timeEnd` markers in `apps/mobile/app/_layout.tsx` at: `initErrorHandler()`, MMKV key derivation, PowerSync init, route decision point. Remove all markers after diagnosis (`grep -r "console.time" apps/mobile/app/_layout.tsx` must return no results).

### SUDS Modal fps (Task 3a)

```bash
# Install Flashlight if not present
npm install -g @perf-tools/flashlight
npx @perf-tools/flashlight --version

# Measure — navigate to an active ERP session first
flashlight measure --bundleId com.exposurebuddy
# Open the SUDS logging Modal; Flashlight records frame timeline during slide-in
```

Repeat 3 times; record median. If fps < 45 (P0): add `useCallback` on `setPendingSuds` in `active.tsx`.

**Fallback if Flashlight unavailable:** `adb shell screenrecord --bit-rate 8000000 /sdcard/suds-fps.mp4` during modal open. Analyse with `ffprobe -v quiet -show_frames suds-fps.mp4 | grep pkt_duration_time`.

### SUDS tap-to-highlight (Task 3b)

Record screen at 60 fps. Tap a `SudsScale` button at least 5 times across the 0–10 range. For each tap: count frames from tap-event frame to frame where button's selected visual state is visible. Latency = frames × (1000 ms ÷ fps). Record median across 5 taps.

If > 100 ms (P0): guard `onChange` prop with `useCallback` in the parent component.

### Calm Me tap-to-mount (Task 4)

From the home screen, tap the Calm Me FAB. Measure `onPress` in `CalmMeFab.handlePress` → first `onLayout`/`useEffect` mount in `apps/mobile/app/calm-me/index.tsx`. Navigation `animation: 'none'` is already applied (Story 9.7, Task 4.3).

Run 3 taps; record median.

If > 200 ms after animation removal: consider `router.prefetch('/calm-me')` from `CalmMeFab` or the root layout.

## Findings

_Fill in after measurement. List any P0 or P1 violations and their resolution status._

| Violation | Metric | Measured value | Severity | Resolution | Status |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## Tooling Availability (measured 2026-06-29)

| Tool | Status | Note |
|---|---|---|
| `adb` | **Not installed** on dev machine | Required for Tasks 2, 3, 4. Install Android SDK Platform Tools. |
| `@perf-tools/flashlight` | **Not available** on npm (404) | Package may have been renamed/deprecated. |
| `@bamlab/flashlight` | **Not available** on npm (404) | Original maintainer package also unavailable. |

**Consequence:** Tasks 2 (cold start), 3 (SUDS fps/latency), and 4 (Calm Me latency) must be run on a machine with Android SDK installed and a connected device or running emulator. The code change in Task 4.3 (`animation: 'none'` in `calm-me/index.tsx`) has been applied and is testable without a device.

For fps measurement, use the 60 fps screen recording fallback (see Measurement Procedure above).

## Known Limitations

- **Profile C (expired token)** is excluded from P0 gating. The variable is network round-trip latency in `supabase.auth.refreshSession()`, not app startup code.
- **Emulator GPU**: the 2× CPU throttle does not affect GPU. Modal animation fps in the emulator reflects host GPU performance, not Snapdragon 439 + Mali-G31. Physical device is preferred for fps measurement.
- **P90 vs median methodology**: NFR-PERF-01 specifies < 3 s at P90; this story measures 3-run medians (~P50 on one device). Accepted MVP limitation.
- **Achievements tab** (Story 8.5): deferred post-MVP 2026-06-21. Budget row retained as reference for when the tab ships.
- **iOS**: iOS performance at this tier is expected to be sufficient and is not a primary validation target for MVP.
- **No automated regression gate**: all measurement is manual/local. No automated performance regression CI gate exists. Deliberate for MVP.
