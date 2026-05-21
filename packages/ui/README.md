# @exposure-buddy/ui

StyleSheet-based shared component primitives for Exposure Buddy.

## ESLint Rules

### `no-grounding-token-in-context` (UX-DR2)

Files matching `*Context.{ts,tsx}` or `*Provider.{ts,tsx}` must not import
`groundingTokens` from the token system.

**Why:** The grounding register has a 2-second access SLA — grounding surfaces
must be immediately available with no async provider dependency. Routing
grounding tokens through a React Context adds a render cycle that violates this
SLA guarantee.

**Enforced by:** `no-restricted-imports` in `packages/ui/.eslintrc.js` overrides block.

## Token Usage

```typescript
import { color, spacing, radius, typography } from '@exposure-buddy/ui'
import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.surface.primary,
    padding: spacing[4],
    borderRadius: radius.card,
  },
})
```

Spread typography tokens to apply all four properties at once:

```typescript
const styles = StyleSheet.create({
  heading: {
    ...typography.h1,
    color: color.content.primary,
  },
})
```

## DM Serif Display

DM Serif Display italic (`typography.display`, `typography.narrative`) may only appear
on these four screen surfaces (`DmSerifSurface` type):

- `score-reveal`
- `prediction-reality-reveal`
- `progress-readback`
- `pre-exposure-readback`

Any other usage produces a TypeScript error at compile time.
