# Story 3.5: DPO Appointment, Privacy Notice & Analytics Boundary

Status: done

## Story

As a user or regulator,
I want to access the Privacy Notice before creating an account and know who the DPO is,
so that informed consent is possible and DPDPA accountability obligations are met (FR-DPO-01, FR-DPO-02).

*Depends on: Story 3.4 merged to main (DPO identity established before Privacy Notice can name them).*

## Acceptance Criteria

1. **Privacy Notice screen — content and auth behaviour**
   Given the Privacy Notice screen exists at `(auth)/privacy-notice.tsx`
   When an unauthenticated user navigates to it (via auth-screen link or deep link)
   Then the screen renders without requiring auth; it displays: app name, data controller identity, DPO name and contact email (`t('legal.dpo.contactEmail')`), list of data processing purposes, retention periods, DPDPA rights summary, and last-updated date; all strings are via `t()` keys with EN+HI translations; no auth redirect occurs; the back button returns the user to the originating screen

2. **Privacy Notice link on auth screens**
   Given a user taps "Privacy Notice" on the sign-in screen or the OTP verification screen
   When navigation executes
   Then the Privacy Notice screen opens without triggering an auth redirect; the back button returns them to the originating screen

3. **`analytics_events` schema stub**
   Given migration `0011_analytics_events_stub.sql` is applied
   When the schema is inspected
   Then the `analytics_events` table exists; a CHECK constraint on `event_type` enforces the approved list (empty at MVP — `CHECK (false)` — no inserts permitted at Phase 1); no health data, SUDS, session content, or PII fields are present in the schema; the migration comment documents that adding an event type requires a separate migration with explicit DPO (DPDPA purpose limitation test) + lead clinician (clinical necessity test) approval (FR-ANALYTICS-BOUNDARY-01)

4. **Children's data ADR**
   Given this story is marked complete
   When the ADR directory is checked
   Then `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-CHILDRENS-DATA.md` exists with Status: Accepted, documenting: 18+ restriction enforced by Story 2.2 self-declaration checkbox; no parental consent flow at MVP; verified age-gating deferred

5. **Export deferral ADR**
   Given this story is marked complete
   When the ADR directory is checked
   Then `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-EXPORT-DEFERRAL.md` exists with Status: Accepted, documenting: MVP export is operator-initiated via DPO panel; user-facing self-service export ("Settings → Privacy → Request my data") deferred post-MVP

6. **Consent withdrawal deferral ADR**
   Given this story is marked complete
   When the ADR directory is checked
   Then `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-WITHDRAWAL-DEFERRAL.md` exists with Status: Accepted, documenting: DPDPA withdrawal-without-deletion is backlogged; MVP covers full account deletion only (Story 2.4)

## Tasks / Subtasks

- [x] T0 — Verify all three required ADRs exist and are Accepted (AC: 4, 5, 6)
  - [x] `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-CHILDRENS-DATA.md` — **already exists, Status: Accepted**
  - [x] `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-EXPORT-DEFERRAL.md` — **already exists, Status: Accepted**
  - [x] `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-WITHDRAWAL-DEFERRAL.md` — **already exists, Status: Accepted**
  - [x] All three ADRs are present and accepted — ACs 4/5/6 pre-satisfied; no file changes required

- [x] T1 — Create `supabase/migrations/0011_analytics_events_stub.sql` (AC: 3)
  - [x] Full migration SQL:
    ```sql
    CREATE TABLE IF NOT EXISTS public.analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL,
      session_token TEXT,        -- SHA-256(session_id), irreversible; no raw session_id
      user_pseudonym TEXT,       -- SHA-256(user_id), irreversible; enables user-level Day-1 retention
                                 -- queries in Phase 2 (FR-ANALYTICS-01) without storing raw user_id
      device_context JSONB,      -- device type, OS version, app version only; no PII
      created_at TIMESTAMPTZ DEFAULT now(),
      -- MVP: no event_type values are approved (FR-ANALYTICS-BOUNDARY-01).
      -- Phase 1 analytics_events table is a schema stub only — no writes permitted.
      -- To add an approved event_type in Phase 2, create a new migration replacing
      -- this constraint; requires explicit approval from:
      --   (a) lead clinician (clinical necessity test)
      --   (b) data controller / DPO (DPDPA purpose limitation test)
      -- Phase 2 candidate types (NOT yet approved): 'screen_view', 'feature_used', 'error'
      CONSTRAINT analytics_events_event_type_mvp_stub CHECK (false)
    );

    -- Deny all access to authenticated and anon roles.
    -- service_role bypasses RLS (Supabase default) and is unaffected.
    -- No SELECT policy is intentional: there is nothing to read at MVP and
    -- Phase 2 analytics reads will be service_role only anyway.
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

    COMMENT ON TABLE public.analytics_events IS 'Phase 1 schema stub. No inserts permitted (CHECK false). RLS enabled, no policies — deny-all for authenticated/anon. See FR-ANALYTICS-BOUNDARY-01 for Phase 2 approval process.';
    ```
  - [x] Add `ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;` — no policies; deny-all for non-service_role (Supabase `service_role` bypasses RLS by convention and is unaffected)
  - [x] Do NOT create any indexes yet — table has zero rows at MVP

- [x] T2 — Create `apps/mobile/src/constants/legal.ts` (resolves deferred W2 from Story 2.4 CR)
  - [x] File content:
    ```typescript
    // DPO_EMAIL is the canonical value for all DPO contact references.
    // Used for t() interpolation at:
    //   settings.deletion.dpoContact → DeleteAccountModal.tsx
    //   auth.deletion.accountPendingDeletion → otp-verification.tsx
    // Displayed directly (not via t()) in: PrivacyNoticeScreen (T4)
    // eslint-disable-next-line i18next/no-literal-string
    export const DPO_EMAIL = 'privacy@exposure-buddy.com'

    // Update whenever Privacy Notice content changes — DPDPA §7 compliance obligation.
    // eslint-disable-next-line i18next/no-literal-string
    export const PRIVACY_NOTICE_LAST_UPDATED = '2026-05-28'
    ```
  - [x] Update `apps/mobile/src/components/settings/DeleteAccountModal.tsx`:
    - Remove: `// eslint-disable-next-line i18next/no-literal-string\nconst DPO_EMAIL = 'privacy@exposure-buddy.com'`
    - Add: `import { DPO_EMAIL } from '../../constants/legal'`
    - The `t('settings.deletion.dpoContact', { dpoEmail: DPO_EMAIL })` call is unchanged
  - [x] Update `apps/mobile/app/(auth)/otp-verification.tsx`:
    - Add: `import { DPO_EMAIL } from '../../src/constants/legal'`
    - Change: `t(state.errorKey, { dpoEmail: 'privacy@exposure-buddy.com' })` → `t(state.errorKey, { dpoEmail: DPO_EMAIL })`

- [x] T3 — Add Privacy Notice i18n keys (AC: 1)
  - [x] Add to `apps/mobile/src/i18n/locales/en.json` — **APPEND** new `legal` and update `settings.privacy` keys; do NOT replace existing content:
    ```json
    "legal": {
      "dpo": {
        "title": "Data Protection Officer",
        "contactLabel": "Contact"
      },
      "privacyNotice": {
        "title": "Privacy Notice",
        "screenTitle": "Privacy Notice",
        "accessibilityHint": "Opens the Privacy Notice screen",
        "lastUpdated": "Last updated: {{date}}",
        "dataController": {
          "title": "Data Controller",
          "details": "Exposure Buddy is the data controller for personal data processed through this app."
        },
        "dpoSection": {
          "title": "Data Protection Officer",
          "details": "Our DPO can be contacted at:"
        },
        "purposes": {
          "title": "How We Use Your Data",
          "details": "We process your personal data solely to deliver ERP (Exposure and Response Prevention) therapy sessions and associated progress tracking. Data processing purposes: account authentication, ERP session delivery, SUDS (distress level) tracking, fear ladder management, and session progress visualisation."
        },
        "retention": {
          "title": "Data Retention",
          "details": "Personal data is retained for the duration of your account. Consent records are retained for the account lifetime plus 2 years after deletion, as required by DPDPA 2023 §8(7). Account deletion enters a 30-day window, after which all personal data is permanently deleted."
        },
        "rights": {
          "title": "Your Rights Under DPDPA 2023",
          "details": "As a data principal under India's Digital Personal Data Protection Act 2023, you have the right to: access your personal data (contact the DPO to request an export); correction of inaccurate data; erasure of your personal data (via Settings → Privacy → Delete my account); and to withdraw consent (withdrawal is via full account deletion at MVP)."
        },
        "withdrawal": {
          "title": "Withdrawing Consent",
          "details": "You may withdraw consent by deleting your account from Settings → Privacy → Delete my account. A 30-day window applies before permanent deletion."
        },
        "thirdParty": {
          "title": "Third-Party Processors",
          "details": "Your data is processed by Supabase (database and authentication) and PowerSync (offline sync). No health data, SUDS records, session content, or PII is transmitted to any third-party analytics, advertising, or data-broker service."
        }
      }
    }
    ```
  - **Why two title keys?** `legal.privacyNotice.screenTitle` goes to `Stack.Screen` options (the OS navigation bar). `legal.privacyNotice.title` goes to the in-document heading rendered inside the ScrollView. They are identical in English and Hindi at MVP. Kept separate because nav bar titles often need to be shorter than document headings in some locales. If they ever diverge, update both intentionally — do not collapse them into one key, which would require a component change.
  - [x] Add `settings.privacy.privacyNotice` key to the existing `settings.privacy` block in `en.json`:
    ```json
    "privacy": {
      "title": "Privacy",
      "privacyNotice": "Privacy Notice",
      "deleteAccount": "Delete my account"
    }
    ```
  - [x] Create `apps/mobile/src/i18n/locales/hi.json` with the full `legal` namespace and updated `settings.privacy` key (Hindi stubs — must be replaced with reviewed translations before production launch):
    ```json
    {
      "legal": {
        "dpo": {
          "title": "डेटा संरक्षण अधिकारी",
          "contactLabel": "संपर्क"
        },
        "privacyNotice": {
          "title": "गोपनीयता सूचना",
          "screenTitle": "गोपनीयता सूचना",
          "accessibilityHint": "गोपनीयता सूचना स्क्रीन खोलता है",
          "lastUpdated": "अंतिम अपडेट: {{date}}",
          "dataController": {
            "title": "डेटा नियंत्रक",
            "details": "Exposure Buddy इस ऐप के माध्यम से संसाधित व्यक्तिगत डेटा का डेटा नियंत्रक है।"
          },
          "dpoSection": {
            "title": "डेटा संरक्षण अधिकारी",
            "details": "हमारे डीपीओ से यहाँ संपर्क किया जा सकता है:"
          },
          "purposes": {
            "title": "हम आपका डेटा कैसे उपयोग करते हैं",
            "details": "हम आपके व्यक्तिगत डेटा को केवल ERP थेरेपी सत्र और संबंधित प्रगति ट्रैकिंग प्रदान करने के लिए संसाधित करते हैं।"
          },
          "retention": {
            "title": "डेटा प्रतिधारण",
            "details": "व्यक्तिगत डेटा आपके खाते की अवधि के लिए बनाए रखा जाता है। DPDPA 2023 §8(7) के अनुसार, सहमति रिकॉर्ड खाता जीवनकाल और हटाने के 2 वर्ष बाद तक बनाए रखे जाते हैं।"
          },
          "rights": {
            "title": "DPDPA 2023 के तहत आपके अधिकार",
            "details": "भारत के डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम 2023 के तहत एक डेटा प्राधिकारी के रूप में, आपको अपने व्यक्तिगत डेटा तक पहुँचने, सुधार, मिटाने और सहमति वापस लेने का अधिकार है।"
          },
          "withdrawal": {
            "title": "सहमति वापस लेना",
            "details": "आप Settings → Privacy → Delete my account से अपना खाता हटाकर सहमति वापस ले सकते हैं।"
          },
          "thirdParty": {
            "title": "तृतीय-पक्ष प्रोसेसर",
            "details": "आपका डेटा Supabase और PowerSync द्वारा संसाधित किया जाता है। कोई भी स्वास्थ्य डेटा, SUDS रिकॉर्ड, या PII किसी भी तृतीय-पक्ष एनालिटिक्स या विज्ञापन सेवा को नहीं भेजा जाता है।"
          }
        }
      },
      "settings": {
        "privacy": {
          "privacyNotice": "गोपनीयता सूचना"
        }
      }
    }
    ```
  - [x] Register `hi` in `apps/mobile/src/i18n/index.ts`:
    - Add: `import hi from './locales/hi.json'`
    - Add `hi: { translation: hi }` to the `resources` object
    - **IMPORTANT**: The import must be placed in the existing imports block, alongside the `en` import, before the `i18n.use(initReactI18next).init(...)` call

- [x] T4 — Create `apps/mobile/app/(auth)/privacy-notice.tsx` (AC: 1, 2)
  - [x] Route file: `apps/mobile/app/(auth)/privacy-notice.tsx`
  - [x] No auth check — this file must NOT import `useAuth` or check `isAuthenticated`; it must NOT call `router.replace('/(app)/')` under any condition
  - [x] Use `<Stack.Screen options={{ headerShown: true, title: t('legal.privacyNotice.screenTitle') }} />` inside the component — this overrides the layout's `headerShown: false` for this screen specifically, providing a native back button without custom implementation. Do NOT implement a custom back button using `router.back()` or a `t('common.back')` key.
  - [x] Screen structure (ScrollView with StyleSheet, no NativeWind — consistent with all other auth screens):
    ```tsx
    import { ScrollView, Text, StyleSheet } from 'react-native'
    import { Stack } from 'expo-router'
    import { useTranslation } from 'react-i18next'
    import { DPO_EMAIL, PRIVACY_NOTICE_LAST_UPDATED } from '../../src/constants/legal'

    export default function PrivacyNoticeScreen() {
      const { t } = useTranslation()
      return (
        <>
          <Stack.Screen options={{ headerShown: true, title: t('legal.privacyNotice.screenTitle') }} />
          <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* legal.privacyNotice.screenTitle → Stack.Screen nav bar; .title → in-document h1 below */}
            <Text style={styles.h1}>{t('legal.privacyNotice.title')}</Text>
            <Text style={styles.meta}>{t('legal.privacyNotice.lastUpdated', { date: PRIVACY_NOTICE_LAST_UPDATED })}</Text>
            {/* Data Controller */}
            <Text style={styles.h2}>{t('legal.privacyNotice.dataController.title')}</Text>
            <Text style={styles.body}>{t('legal.privacyNotice.dataController.details')}</Text>
            {/* DPO */}
            <Text style={styles.h2}>{t('legal.privacyNotice.dpoSection.title')}</Text>
            <Text style={styles.body}>{t('legal.privacyNotice.dpoSection.details')}</Text>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <Text style={styles.email}>{DPO_EMAIL}</Text>
            {/* Processing purposes */}
            <Text style={styles.h2}>{t('legal.privacyNotice.purposes.title')}</Text>
            <Text style={styles.body}>{t('legal.privacyNotice.purposes.details')}</Text>
            {/* Retention */}
            <Text style={styles.h2}>{t('legal.privacyNotice.retention.title')}</Text>
            <Text style={styles.body}>{t('legal.privacyNotice.retention.details')}</Text>
            {/* Rights */}
            <Text style={styles.h2}>{t('legal.privacyNotice.rights.title')}</Text>
            <Text style={styles.body}>{t('legal.privacyNotice.rights.details')}</Text>
            {/* Withdrawal */}
            <Text style={styles.h2}>{t('legal.privacyNotice.withdrawal.title')}</Text>
            <Text style={styles.body}>{t('legal.privacyNotice.withdrawal.details')}</Text>
            {/* Third-party processors */}
            <Text style={styles.h2}>{t('legal.privacyNotice.thirdParty.title')}</Text>
            <Text style={styles.body}>{t('legal.privacyNotice.thirdParty.details')}</Text>
          </ScrollView>
        </>
      )
    }
    ```
  - [x] `PRIVACY_NOTICE_LAST_UPDATED` is imported from `constants/legal` — not a JSX literal, no i18next lint issue; the constant is the DPDPA §7-tracked date and is maintained there, not inline in this component
  - [x] `DPO_EMAIL` is rendered directly with `{/* eslint-disable-next-line i18next/no-literal-string */}` — it is a configuration constant, not a translatable string; email addresses do not change per locale
  - [x] StyleSheet: follow the same visual style as `sign-in.tsx` (white background #ffffff, #111827 headings, #6b7280 secondary text, padding 24); `email` style should be a `mailto`-linkable `Text` with color `#111827` and `textDecorationLine: 'underline'`
  - [x] DO NOT use `Linking.openURL` — the email is displayed as text per AC; the AC says "displays" not "links to". This avoids Linking permission requirements.
  - [x] Accessibility: each section heading `Text` should have `accessibilityRole="header"`

- [x] T5 — Add Privacy Notice link to auth screens (AC: 2)
  - [x] Update `apps/mobile/app/(auth)/sign-in.tsx`:
    - After the "Send code" button (and the DEV button if present), add a `TouchableOpacity` row:
      ```tsx
      <TouchableOpacity
        style={styles.privacyLink}
        onPress={() => router.push('/(auth)/privacy-notice')}
        accessibilityRole="link"
        accessibilityLabel={t('legal.privacyNotice.title')}
        accessibilityHint={t('legal.privacyNotice.accessibilityHint')}
      >
        <Text style={styles.privacyLinkText}>{t('legal.privacyNotice.title')}</Text>
      </TouchableOpacity>
      ```
    - Add `privacyLink` and `privacyLinkText` styles:
      ```ts
      privacyLink: { marginTop: 24, alignSelf: 'center' },
      privacyLinkText: { fontSize: 13, color: '#6b7280', textDecorationLine: 'underline' },
      ```
  - [x] Update `apps/mobile/app/(auth)/otp-verification.tsx`:
    - **NOTE**: The `import { DPO_EMAIL } from '../../src/constants/legal'` import is already added in T2 above — do NOT add it again here
    - Add Privacy Notice link below the Verify button using identical markup to the sign-in.tsx link, including `accessibilityRole="link"`, `accessibilityLabel={t('legal.privacyNotice.title')}`, and `accessibilityHint={t('legal.privacyNotice.accessibilityHint')}`
    - The link is always visible (not conditional on mode)

- [x] T6 — Add Privacy Notice link to Settings screen (FR-DPO-01: DPO contact accessible from app settings)
  - [x] Update `apps/mobile/app/(app)/settings/index.tsx`:
    - Add a "Privacy Notice" row above the "Delete my account" row in the Privacy section:
      ```tsx
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/(auth)/privacy-notice')}
        accessibilityRole="link"
        accessibilityLabel={t('settings.privacy.privacyNotice')}
      >
        <Text style={styles.rowText}>{t('settings.privacy.privacyNotice')}</Text>
      </TouchableOpacity>
      ```
    - Add `import { useRouter } from 'expo-router'` if not already present
    - Add `const router = useRouter()` inside the component

- [x] T7 — CI verification
  - [x] `turbo run typecheck` — all pass
  - [x] `turbo run lint` — all clean (verify i18next lint rule passes on `DPO_EMAIL` usage and `lastUpdated` constant)
  - [x] `turbo run test` — core: pass; supabase: pass; i18n: 5/5 pass
  - [x] Format-validation test: assert `PRIVACY_NOTICE_LAST_UPDATED` matches `YYYY-MM-DD` regex (e.g. `expect(PRIVACY_NOTICE_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/)`) — catches accidental malformed date edits
  - [x] i18n merge test: verify partial `hi.json` does not shadow `en` fallbacks — assert `t('settings.privacy.title', { lng: 'hi' })` returns `'Privacy'` and `t('settings.privacy.privacyNotice', { lng: 'hi' })` returns `'गोपनीयता सूचना'`; assert `t('auth.otp.sendCode', { lng: 'hi' })` falls back to the `en` string (not undefined)

### Review Findings

**Senior Developer Review (AI) — 2026-05-28**
Sources: Blind Hunter + Edge Case Hunter + Acceptance Auditor | 5 dismissed as noise

#### Decision-Needed

- [x] [Review][Decision] **D1 — Back button may be absent when navigating cross-group from `(app)/settings` to `(auth)/privacy-notice`** — **Resolved: verify and accept.** Current implementation stands. Requires simulator smoke test (Settings → Privacy Notice → back chevron) before merge to confirm Expo Router v4 root Stack threads back correctly. [apps/mobile/app/(auth)/privacy-notice.tsx:10] *(sources: blind+edge)*

- [x] [Review][Decision→Patch] **D2 — Add `legal.dpo.contactEmail` i18n key and use `t()` in Privacy Notice screen** — Resolved: added `legal.dpo.contactEmail` to `en.json` and `hi.json`; updated `privacy-notice.tsx` to render `t('legal.dpo.contactEmail')`. *(sources: auditor)*

- [x] [Review][Decision] **D3 — AC1 requires "DPO name and contact email" but no named individual is displayed** — **Resolved: role-only accepted.** App uses functional DPO role identification; no named individual. Close as intentional. *(sources: auditor)*

#### Patches

- [x] [Review][Patch] **P1 — Misleading migration comment: "service_role…is unaffected" implies it can write** — `CHECK (false)` is a table constraint enforced for **all** roles including `service_role`; `service_role` only bypasses RLS policies, not `CHECK` constraints. A Phase 2 developer reading "service_role is unaffected" may incorrectly assume service_role writes succeed and attempt inserts before creating the Phase 2 migration. Fix: correct the comment to state CHECK(false) blocks all roles. [supabase/migrations/0011_analytics_events_stub.sql:19-21] *(sources: blind)*

- [x] [Review][Patch] **P2 — Hindi locale missing `auth.deletion.accountPendingDeletion` key** — A Hindi-language user whose account is pending deletion sees the DPO contact warning in English only: `t('auth.deletion.accountPendingDeletion', { dpoEmail: DPO_EMAIL })` falls back to English because `hi.json` has no `auth.*` keys. This is a DPDPA compliance concern: the legally-required DPO contact notice is not intelligible to a Hindi-only user. Fix: add `auth.deletion.accountPendingDeletion` to `hi.json`. [apps/mobile/src/i18n/locales/hi.json] *(sources: edge)*

- [x] [Review][Patch] **P3 — Migration comment lists Phase 2 candidate event types, weakening the FR-ANALYTICS-BOUNDARY-01 boundary** — Line 15 of the migration names `'screen_view', 'feature_used', 'error'` as "NOT yet approved" candidates. FR-ANALYTICS-BOUNDARY-01 requires a new migration with explicit DPO + clinician sign-off to add any event type. Including named candidates in the Phase 1 stub creates an implicit pre-approval signal that could be cited to skip that review. Fix: remove the candidate-type list from the migration; reference the story or ADR instead. [supabase/migrations/0011_analytics_events_stub.sql:15] *(sources: auditor)*

- [x] [Review][Patch] **P4 — Settings Privacy Notice link missing `accessibilityHint`** — `sign-in.tsx` and `otp-verification.tsx` both set `accessibilityHint={t('legal.privacyNotice.accessibilityHint')}`. The `settings/index.tsx` link omits it. `legal.privacyNotice.accessibilityHint` exists in both locales. Fix: add `accessibilityHint={t('legal.privacyNotice.accessibilityHint')}` to the settings link. [apps/mobile/app/(app)/settings/index.tsx:62] *(sources: blind+auditor)*

#### Deferred

- [x] [Review][Defer] **F1 — `device_context JSONB` has no structural PII enforcement** [supabase/migrations/0011_analytics_events_stub.sql:7] — deferred, pre-existing; Phase 1 blocked by CHECK(false); enforce key allowlist in Phase 2 analytics activation migration *(sources: blind)*

- [x] [Review][Defer] **F2 — Date format test validates YYYY-MM-DD pattern only; no freshness check** [apps/mobile/src/i18n/i18n.test.ts:27] — deferred, pre-existing; no automated way to verify date was updated alongside content change; process obligation, not a testable invariant *(sources: blind)*

- [x] [Review][Defer] **F3 — Deep-link → `otp-verification` (no params) → `sign-in` → `(app)/` redirect loop** [apps/mobile/app/(auth)/otp-verification.tsx:97] — deferred, pre-existing; not introduced by this story; pre-existing routing contract from Story 2.2 *(sources: edge)*

- [x] [Review][Defer] **F4 — `KEY_PATTERN` regex only validates `en.json`; typos in `hi.json` keys are uncaught** [apps/mobile/src/i18n/i18n.test.ts:5] — deferred, pre-existing; hi.json is partial and reviewed manually; extend test coverage in a future i18n quality story *(sources: edge)*

## Dev Notes

### Migration Numbering

After Story 3.4, migrations on `main`:
- `0001_users.sql` ✅
- `0002_rls.sql` ✅
- `0003_profiles.sql` ✅
- `0004_consent_records.sql` ✅ (3.2)
- `0005_consent_records_retention.sql` ✅ (3.3)
- `0006_dpo_audit_log.sql` ✅ (3.3)
- `0007_perform_user_erasure_fn.sql` ✅ (3.3)
- `0008_dpo_audit_log_truncate_guard.sql` ✅ (3.3)
- `0009_dpo_operators.sql` ✅ (3.4)
- `0010_deletion_requested_at.sql` ✅ (3.4)

**This story creates:**
- `0011_analytics_events_stub.sql`

Do NOT skip or reuse numbers.

### `analytics_events` — Why `CHECK (false)` not `CHECK (event_type IN (...))`

FR-ANALYTICS-BOUNDARY-01 requires "zero event_name values at MVP" — the approved list is empty. Using `CHECK (false)` enforces this at the database layer and makes the intent explicit. Phase 2 migration will `DROP CONSTRAINT analytics_events_event_type_mvp_stub` and add a new `CHECK (event_type IN ('screen_view', 'feature_used', 'error'))` constraint with the DPO/clinician-approved list. **Do NOT pre-populate the approved list** — even with commented-out values that look like they're disabled. The migration comment documents the future types, not the constraint itself.

The `analytics_events` table has RLS **enabled** at MVP with no permissive policies — deny-all posture for `authenticated` and `anon` roles. `CHECK (false)` blocks writes; RLS blocks reads. `service_role` bypasses RLS by Supabase convention and is unaffected. When Phase 2 analytics writes are designed, add targeted RLS policies at that point; do not add them now.

### Analytics Field Rules (From FR-ANALYTICS-BOUNDARY-01)

When Phase 2 activates analytics writes:
- `session_token` field: MUST be `SHA-256(session_id)` (irreversible) — never raw session_id
- `user_pseudonym` field: MUST be `SHA-256(user_id)` (irreversible) — never raw user_id; required for user-level Day-1 retention cohort query (FR-ANALYTICS-01: "% of Day-1 users completing ≥1 ERP session within 24 hours")
- `device_context` JSONB: device type, OS version, app version ONLY — no PII
- Raw SUDS values and session_id are classified as health data — PROHIBITED in analytics_events ever
- Health data prohibition is enforced by the schema design (no health-data columns) not just policy

### Privacy Notice Screen — Route Design

The screen lives at `apps/mobile/app/(auth)/privacy-notice.tsx`. This is the unauthenticated group — no auth gate in `(auth)/_layout.tsx`. It's navigable from:
- `sign-in.tsx` (in same group): `router.push('/(auth)/privacy-notice')`
- `otp-verification.tsx` (in same group): `router.push('/(auth)/privacy-notice')`
- `settings/index.tsx` (in `(app)` group): `router.push('/(auth)/privacy-notice')` — Expo Router allows cross-group navigation; the `(auth)/_layout.tsx` has no redirect guard (only `sign-in.tsx` has the `isAuthenticated` redirect guard)

**Back navigation:** Using `<Stack.Screen options={{ headerShown: true }} />` inside the component overrides the auth layout's `headerShown: false` for this specific screen only. This gives a native header with automatic back chevron — consistent with Expo Router v4 behaviour. Do not re-implement a custom back button; the Stack override is sufficient.

**Deep-link URL:** With Expo Router v4, route group segments (folders in parentheses like `(auth)`) are excluded from the URL path. The correct deep-link URL for this screen is `exposure-buddy:///privacy-notice` — using the app scheme from `app.config.ts` (`exposure-buddy`, not `exposurebuddy`) and omitting the `(auth)` group segment. No additional configuration needed — Expo Router auto-handles deep links for file-system routes.

### Privacy Notice — `lastUpdated` Date

The `lastUpdated` date is exported as `PRIVACY_NOTICE_LAST_UPDATED` from `apps/mobile/src/constants/legal.ts` (alongside `DPO_EMAIL`). The Privacy Notice screen imports and renders it directly. This is a legal document version date under DPDPA §7 — it must be updated manually (in `legal.ts`) whenever Privacy Notice content changes. The `// eslint-disable-next-line i18next/no-literal-string` comment on the constant definition in `legal.ts` prevents the i18n lint rule from flagging the ISO string literal. The date is passed to `t('legal.privacyNotice.lastUpdated', { date: PRIVACY_NOTICE_LAST_UPDATED })` for formatting.

### i18n Setup — Registering Hindi

Current `apps/mobile/src/i18n/index.ts` only registers `en`. Story 3.5 must register `hi`:

```typescript
import en from './locales/en.json'
import hi from './locales/hi.json'  // ADD THIS

i18n.use(initReactI18next).init({
  lng: deviceLang,
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    hi: { translation: hi },  // ADD THIS
  },
  ...
})
```

The `hi.json` file created in T3 covers only the keys added by Story 3.5 (`legal.*` and `settings.privacy.privacyNotice`). Existing keys missing from `hi.json` fall back to `en` (the `fallbackLng` setting). This is the correct behaviour — do not duplicate all `en.json` keys into `hi.json`.

**Why a partial `hi.json` is safe:** The project uses i18next with pre-loaded static resources (`resources: { en: { translation: en }, hi: { translation: hi } }`). At `init()` time, i18next deep-merges each locale's resource into its namespace store at the leaf level. A partial `hi.json` that only includes `legal.*` and `settings.privacy.privacyNotice` does not shadow or remove any existing `en` keys — it only overrides the specific leaf keys it declares. All other keys (e.g. `auth.*`, `settings.deleteAccount.*`) that are absent from `hi.json` fall back to `en` via `fallbackLng: 'en'`. Do not add keys from `en.json` to `hi.json` unless a Hindi translation is explicitly provided.

**NOTE on Hindi translations:** The Hindi strings in T3 are functional translations. Before production launch, these should be reviewed by a qualified translator/native speaker familiar with mental health terminology. The Devanagari script is correct structurally. Technical terms (SUDS, ERP, DPDPA) are kept in English as they are internationally recognised acronyms.

### DPO Email Centralisation (Resolves W2 from deferred-work)

Current state of `DPO_EMAIL = 'privacy@exposure-buddy.com'`:
- `apps/mobile/src/components/settings/DeleteAccountModal.tsx:12` — module-level constant (UPDATE: import from constants)
- `apps/mobile/app/(auth)/otp-verification.tsx:248` — inline literal in `t()` call (UPDATE: import and use constant)

The new `apps/mobile/src/constants/legal.ts` is the single source of truth. The `DPO_EMAIL` constant is used for `t()` interpolation in two existing files and for display in the new Privacy Notice screen. The email is **not** present in `en.json` or `hi.json` — `legal.ts` is the sole source of truth. The Privacy Notice screen renders it directly (not via an i18n key).

**Why not put it in `packages/core`?** The DPO email is app configuration, not domain logic. `packages/core` has zero external deps and must remain that way (ADR-001). `apps/mobile/src/constants/legal.ts` is the correct boundary. Only `apps/mobile` uses this constant.

### i18n Lint Rule

The project enforces `i18next/no-literal-string` — all string literals in JSX must be via `t()`. Exceptions:
- Constants referenced by name (not string literals): `DPO_EMAIL` passes ✓
- Date constants with `// eslint-disable-next-line i18next/no-literal-string` comments: `lastUpdated = '2026-05-28'` passes ✓
- `// eslint-disable-next-line i18next/no-literal-string` is the established project pattern (already used extensively in sign-in.tsx, otp-verification.tsx, etc.)

### `(auth)/_layout.tsx` — No Changes Required

The `(auth)/_layout.tsx` is a simple Stack with `headerShown: false`. The Privacy Notice screen uses `<Stack.Screen options={{ headerShown: true }}/>` inside the component itself to re-enable the header for that specific screen. This is valid Expo Router v4 behaviour — screen-level options override layout options.

### `settings/index.tsx` — Router Import

Currently `apps/mobile/app/(app)/settings/index.tsx` does NOT import `useRouter` (it doesn't navigate anywhere). T6 adds navigation to the Privacy Notice. Add `import { useRouter } from 'expo-router'` and `const router = useRouter()` at the top of the component.

### What NOT to Create

- `apps/mobile/app/(app)/settings/data-rights.tsx` — this screen is in the architecture spec but is a post-MVP feature (full self-service data rights UI); NOT this story
- Any new `packages/core` exports — the `DPO_EMAIL` constant belongs in `apps/mobile`
- RLS policies on `analytics_events` — not needed; table cannot receive inserts at MVP
- Any test files for the Privacy Notice screen — it renders static i18n content; no business logic to test; i18n coverage is at the `en.json` structural level

### File Checklist

**New files:**
- `supabase/migrations/0011_analytics_events_stub.sql`
- `apps/mobile/app/(auth)/privacy-notice.tsx`
- `apps/mobile/src/constants/legal.ts`
- `apps/mobile/src/i18n/locales/hi.json`

**Modified files:**
- `apps/mobile/src/i18n/locales/en.json` — APPEND `legal.*` namespace and `settings.privacy.privacyNotice` key
- `apps/mobile/src/i18n/index.ts` — register `hi` resource
- `apps/mobile/app/(auth)/sign-in.tsx` — add Privacy Notice link
- `apps/mobile/app/(auth)/otp-verification.tsx` — add Privacy Notice link; import DPO_EMAIL constant
- `apps/mobile/src/components/settings/DeleteAccountModal.tsx` — import DPO_EMAIL from constants
- `apps/mobile/app/(app)/settings/index.tsx` — add Privacy Notice row; add router

**No new Edge Functions** — this story has no Supabase Edge Function changes.

**Maintenance obligation:** When any `legal.privacyNotice.*` string in `en.json` or `hi.json` changes, `PRIVACY_NOTICE_LAST_UPDATED` in `legal.ts` **MUST** be updated in the same commit — DPDPA §7 requires the Privacy Notice to carry an accurate "last updated" date.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § Story 3.5] — AC source (lines 895–933)
- [Source: `_bmad-output/planning-artifacts/epics.md` line 74] — FR-ANALYTICS-BOUNDARY-01
- [Source: `_bmad-output/planning-artifacts/epics.md` lines 78–84] — FR-DPO-01 through FR-DPO-07
- [Source: `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-CHILDRENS-DATA.md`] — pre-satisfied AC4
- [Source: `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-EXPORT-DEFERRAL.md`] — pre-satisfied AC5
- [Source: `_bmad-output/planning-artifacts/adrs/ADR-DPDPA-WITHDRAWAL-DEFERRAL.md`] — pre-satisfied AC6
- [Source: `_bmad-output/implementation-artifacts/3-4-dpo-operator-panel.md` § Completion Notes] — migration numbering, next is 0011
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` § W2 from 2-4 CR] — DPO email centralisation obligation
- [Source: `apps/mobile/src/i18n/index.ts`] — i18n setup pattern; currently `en` only
- [Source: `apps/mobile/app/(auth)/sign-in.tsx`] — StyleSheet pattern, useRouter, i18n usage
- [Source: `apps/mobile/app/(auth)/_layout.tsx`] — Stack with `headerShown: false`; override per-screen with `<Stack.Screen>`
- [Source: `apps/mobile/src/components/settings/DeleteAccountModal.tsx:12`] — `DPO_EMAIL` local constant to centralise
- [Source: `apps/mobile/app/(auth)/otp-verification.tsx:248`] — hardcoded `'privacy@exposure-buddy.com'` to replace
- [Source: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`] — `apps/mobile` route structure, package import boundaries

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- T0 (pre-satisfied): ADR-DPDPA-CHILDRENS-DATA, ADR-DPDPA-EXPORT-DEFERRAL, ADR-DPDPA-WITHDRAWAL-DEFERRAL all exist with Status: Accepted.
- T1: Created `supabase/migrations/0011_analytics_events_stub.sql` with `CHECK (false)` deny-all constraint, RLS enabled, no policies, table comment documenting Phase 2 approval process.
- T2: Created `apps/mobile/src/constants/legal.ts` as single source of truth for `DPO_EMAIL` and `PRIVACY_NOTICE_LAST_UPDATED`. Removed local `DPO_EMAIL` constant from `DeleteAccountModal.tsx`; replaced inline `'privacy@exposure-buddy.com'` literal in `otp-verification.tsx` with the constant.
- T3: Appended `legal.*` namespace and `settings.privacy.privacyNotice` key to `en.json`. Created `hi.json` with Hindi stubs for new keys only (partial — safe via i18next fallbackLng). Registered `hi` resource in `i18n/index.ts`.
- T4: Created `(auth)/privacy-notice.tsx` — ScrollView with StyleSheet, `<Stack.Screen headerShown: true>` override for native back button, no auth check, `accessibilityRole="header"` on all section headings, `DPO_EMAIL` displayed directly (not via t()).
- T5: Added Privacy Notice `TouchableOpacity` link (with `accessibilityRole="link"`) to `sign-in.tsx` (after Send code + DEV buttons) and `otp-verification.tsx` (after Resend button). Added `privacyLink`/`privacyLinkText` styles to both.
- T6: Added Privacy Notice row to `settings/index.tsx` above "Delete my account". Added `useRouter` import and `const router = useRouter()`.
- T7: `turbo typecheck` ✅ `turbo lint` ✅ `turbo test` (core + supabase pass, 6 pre-existing mobile renderer failures unrelated to this story). i18n test suite: 5/5 pass including new format-validation and hi.json merge tests.

### File List

- `supabase/migrations/0011_analytics_events_stub.sql` (new)
- `apps/mobile/src/constants/legal.ts` (new)
- `apps/mobile/app/(auth)/privacy-notice.tsx` (new)
- `apps/mobile/src/i18n/locales/hi.json` (new)
- `apps/mobile/src/i18n/locales/en.json` (modified — appended `legal.*` and `settings.privacy.privacyNotice`)
- `apps/mobile/src/i18n/index.ts` (modified — registered `hi` resource)
- `apps/mobile/app/(auth)/sign-in.tsx` (modified — Privacy Notice link + styles)
- `apps/mobile/app/(auth)/otp-verification.tsx` (modified — DPO_EMAIL import, Privacy Notice link + styles)
- `apps/mobile/src/components/settings/DeleteAccountModal.tsx` (modified — DPO_EMAIL from constants)
- `apps/mobile/app/(app)/settings/index.tsx` (modified — Privacy Notice row, useRouter)
- `apps/mobile/src/i18n/i18n.test.ts` (modified — added 4 new tests: PRIVACY_NOTICE_LAST_UPDATED format, hi.json merge safety)

### Change Log

- 2026-05-28: Story 3.5 implemented — analytics boundary migration stub, Privacy Notice screen, DPO email centralisation, Hindi i18n scaffold, Privacy Notice links on auth and settings screens.
- 2026-05-28: Code review patches applied — P1 (corrected migration comment re CHECK(false) blocking all roles), P2 (added auth.deletion.accountPendingDeletion to hi.json), P3 (removed Phase 2 candidate event types from migration comment), P4 (added accessibilityHint to settings Privacy Notice link). Decisions: D1 verify-and-accept (smoke test before merge), D2 resolved (added legal.dpo.contactEmail i18n key), D3 role-only DPO accepted.
