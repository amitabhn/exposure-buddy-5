// ARC-001: zero imports from react-native, expo-*, or @supabase/*

export interface FearLadderItemSummary {
  id: string
  description: string
  predictedSuds: number
  position: number
}

// Full item type includes status for filtering; summary omits it for the card prop
export interface FearLadderItem extends FearLadderItemSummary {
  status: string
}

export function resolveLowestPendingItem(items: FearLadderItem[]): FearLadderItemSummary | null {
  const pending = items
    .filter(item => item.status === 'pending')
    .sort((a, b) => a.position - b.position)
  const first = pending[0]
  if (!first) return null
  const { id, description, predictedSuds, position } = first
  return { id, description, predictedSuds, position }
}
