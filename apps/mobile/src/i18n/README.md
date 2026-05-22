# i18n — Internationalisation Infrastructure

## Key Naming Convention

All translation keys follow the pattern `[namespace].[identifier]`:

```
/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/
```

- Each segment starts with a lowercase letter
- Rest of segment: letters and digits (camelCase allowed)
- Minimum two segments (at least `namespace.key`)
- Multi-level nesting allowed: `auth.otp.phonePrompt`

**Examples:**
- `auth.otp.phonePrompt` ✓
- `common.appName` ✓
- `error.screenNotFound` ✓
- `AuthName` ✗ (uppercase start)
- `auth` ✗ (single segment)

## Reserved Namespaces

| Namespace | Screens / Features |
|-----------|-------------------|
| `auth` | Authentication screens (OTP, sign-up, safety checkboxes) |
| `nav` | Navigation labels and tab titles |
| `common` | Shared strings (app name, date formats, generic buttons) |
| `error` | Error messages and not-found screens |
| `session` | ERP session screens |
| `hierarchy` | Fear ladder / hierarchy builder |
| `checkin` | Daily check-in flow |
| `progress` | Progress and streak screens |
| `crisis` | Crisis safety card |
| `dpo` | Data rights and privacy (DPDPA) |
| `settings` | Settings and preferences |

## Usage

```typescript
import { useTranslation } from 'react-i18next'

export default function MyScreen() {
  const { t } = useTranslation()
  return <Text>{t('common.appName')}</Text>
}
```

## Adding a New Key

1. Add the key and value to `locales/en.json` (nested under the appropriate namespace)
2. Use `t('namespace.key')` in your component via `useTranslation`
3. **Never** write user-visible strings as literals in JSX — CI will fail (`i18next/no-literal-string`)

## CI Enforcement

The `i18next/no-literal-string` ESLint rule in `apps/mobile/.eslintrc.js` rejects raw string literals in JSX. `pnpm turbo lint` enforces this on every PR.
