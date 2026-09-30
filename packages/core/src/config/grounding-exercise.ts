// ARC-011: zero imports from react-native, expo-*, or @supabase/*
export const GROUNDING_STEPS = [
  { step: 1, promptKey: 'grounding541.see', count: 5 },
  { step: 2, promptKey: 'grounding541.hear', count: 4 },
  { step: 3, promptKey: 'grounding541.touch', count: 3 },
  { step: 4, promptKey: 'grounding541.smell', count: 2 },
  { step: 5, promptKey: 'grounding541.taste', count: 1 },
] as const
export const GROUNDING_TOTAL_STEPS = GROUNDING_STEPS.length
