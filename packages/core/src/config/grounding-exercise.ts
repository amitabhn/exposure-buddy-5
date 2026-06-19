// ARC-011: zero imports from react-native, expo-*, or @supabase/*
export const GROUNDING_STEPS = [
  { step: 1, promptKey: 'grounding541.see' },
  { step: 2, promptKey: 'grounding541.hear' },
  { step: 3, promptKey: 'grounding541.touch' },
  { step: 4, promptKey: 'grounding541.smell' },
  { step: 5, promptKey: 'grounding541.taste' },
] as const
export const GROUNDING_TOTAL_STEPS = GROUNDING_STEPS.length
