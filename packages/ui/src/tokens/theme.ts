// ─── DM Serif Display surface type ────────────────────────────────────────────
// DM Serif Display appears on exactly 4 dedicated screens only (UX-DR21).
// A TypeScript compilation error is produced by any string outside this union.
export type DmSerifSurface =
  | 'score-reveal'
  | 'prediction-reality-reveal'
  | 'progress-readback'
  | 'pre-exposure-readback'

// ─── Colour (8 semantic tokens) ───────────────────────────────────────────────
export const color = {
  surface: {
    primary:   '#F5F7F6', // main backgrounds
    secondary: '#EBF0EE', // cards, sheets, preparation register
  },
  content: {
    primary:   '#1A2E2A', // body text — deep forest
    secondary: '#4A6B62', // supporting text
  },
  accent: {
    courage:   '#2D6A5A', // CTAs, primary actions
    progress:  '#E8A84C', // DECORATIVE ONLY on reflect.background — no text (1.94:1 fails AA)
    grounding: '#8B6F47', // grounding/somatic tools — 4.37:1; AA large text only (≥18px or ≥14px bold); never use for normal-size text
  },
  reflect: {
    background: '#FDF7ED', // reflection mode surfaces
  },
} as const

// ─── Motion (3 presets) ───────────────────────────────────────────────────────
// These values encode clinical mode registers — not aesthetic choices.
// Do not override at component level without design review.
export const motion = {
  preparing:  { duration: 200, easing: 'easeOut'   as const }, // forward-leaning, slight urgency
  grounding:  { duration: 400, easing: 'easeInOut' as const }, // anchoring stillness
  reflecting: { duration: 600, easing: 'easeOut'   as const }, // unhurried, retrospective
} as const

// ─── Haptics (4 constants) ────────────────────────────────────────────────────
// String values map to expo-haptics ImpactFeedbackStyle ('light'|'medium'|'heavy')
// and NotificationFeedbackType ('success'). expo-haptics is called only from
// apps/mobile — never import it here (packages/ui may not import expo-* per .eslintrc.js).
export const haptic = {
  breathingRhythm:     'light'   as const, // repeating during breathing exercise
  dragConfirmation:    'medium'  as const, // fear ladder item placement
  commitmentTap:       'heavy'   as const, // "Let's do this" — weighted, distinct
  techniqueCompletion: 'success' as const, // expo-haptics NotificationFeedbackType.Success
} as const

// ─── Spacing (4px base, 11 tokens) ────────────────────────────────────────────
export const spacing = {
  0:   0,
  px:  1,  // dividers, border widths
  1:   4,  // icon+label gap, tag padding
  2:   8,  // standard intra-component
  3:   12, // dense component padding
  4:   16, // standard padding, screen horizontal margin
  5:   20, // between components within a section
  6:   24, // section spacing, card-to-card gap
  7:   28, // mid-range
  8:   32, // screen section separators
  10:  40, // reflection register only — do not use in preparing or grounding surfaces
} as const

// ─── Border radii ─────────────────────────────────────────────────────────────
export const radius = {
  card:      14, // cards, sheets
  button:    12, // buttons
  pill:      20, // tag pills
  rankBadge:  6, // fear ladder rank badges
  input:     10, // text input fields
  panel:     20, // quick-access panel — top corners only (borderTopLeftRadius + borderTopRightRadius)
} as const

// ─── Touch targets ────────────────────────────────────────────────────────────
export const tapTarget = {
  inTheMoment: 56, // 56×56px — grounding register (UX-DR19)
  standard:    44, // 44×44pt iOS / 48dp Android — preparation and reflection
} as const

// ─── Typography (9 tokens) ────────────────────────────────────────────────────
// lineHeight values are absolute px (React Native does not accept ratios).
// DM Serif Display has no 700 weight — fontWeight '400' is correct for all DM Serif tokens.
// The display token uses DM Serif Display italic; it reads as display-weight by design.
// text-display has a responsive override at width < 360px (24px) — implement in component.
export const typography = {
  display: {
    fontSize:   28,
    fontWeight: '400' as const,
    lineHeight: 32, // 28 × 1.15 ≈ 32
    fontFamily: 'DMSerifDisplay_400Regular_Italic',
    // Use ONLY at: score-reveal · prediction-reality-reveal · progress-readback · pre-exposure-readback (UX-DR21)
  },
  h1: {
    fontSize:   22,
    fontWeight: '700' as const,
    lineHeight: 26, // 22 × 1.20 ≈ 26
    fontFamily: 'Inter_700Bold',
  },
  h2: {
    fontSize:   17,
    fontWeight: '600' as const,
    lineHeight: 22, // 17 × 1.30 ≈ 22
    fontFamily: 'Inter_600SemiBold',
  },
  h3: {
    fontSize:   14,
    fontWeight: '600' as const,
    lineHeight: 19, // 14 × 1.35 ≈ 19
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    fontSize:   14,
    fontWeight: '400' as const,
    lineHeight: 22, // 14 × 1.55 ≈ 22
    fontFamily: 'Inter_400Regular',
  },
  bodySm: {
    fontSize:   12,
    fontWeight: '400' as const,
    lineHeight: 19, // 12 × 1.55 ≈ 19
    fontFamily: 'Inter_400Regular',
    // PR gate: no primary copy uses text-bodySm or smaller (UX spec)
  },
  caption: {
    fontSize:   11,
    fontWeight: '500' as const,
    lineHeight: 15, // 11 × 1.40 ≈ 15
    fontFamily: 'Inter_500Medium',
  },
  micro: {
    fontSize:   10,
    fontWeight: '600' as const,
    lineHeight: 13, // 10 × 1.30 ≈ 13
    fontFamily: 'Inter_600SemiBold',
  },
  narrative: {
    fontSize:   15,
    fontWeight: '400' as const,
    lineHeight: 24, // 15 × 1.60 ≈ 24
    fontFamily: 'DMSerifDisplay_400Regular_Italic',
    // Pull quotes and companion voice — DmSerifSurface screens only
  },
} as const

// ─── Grounding tokens (separate named export for ESLint no-grounding-token-in-context) ──
// This export is isolated so the ESLint rule can target `groundingTokens` specifically.
// Never import this in files matching *Context.{ts,tsx} or *Provider.{ts,tsx} (UX-DR2).
export const groundingTokens = {
  motion:    motion.grounding,
  tapTarget: tapTarget.inTheMoment,
} as const
