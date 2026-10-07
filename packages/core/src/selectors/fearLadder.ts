// ARC-001: zero imports from react-native, expo-*, or @supabase/*

export type FearLadderItemStatus = 'pending' | 'completed'

export interface FearLadderItemSummary {
  id: string
  description: string
  predictedSuds: number
  position: number
}

// Full item type includes status for filtering; summary omits it for the card prop
export interface FearLadderItem extends FearLadderItemSummary {
  status: FearLadderItemStatus
  peakSuds: number | null
}

export function resolveLowestPendingItem(items: FearLadderItem[]): FearLadderItemSummary | null {
  const pending = items
    .filter(item => item.status === 'pending')
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
  const first = pending[0]
  if (!first) return null
  const { id, description, predictedSuds, position } = first
  return { id, description, predictedSuds, position }
}

const byPosition = (a: FearLadderItem, b: FearLadderItem) =>
  a.position - b.position || a.id.localeCompare(b.id)

// Display order only: unfinished items first, completed after, each group by position then id.
// Pure — never mutates the input and never changes a stored position.
export function sortLadderForDisplay(items: FearLadderItem[]): FearLadderItem[] {
  const unfinished = items.filter(item => item.status !== 'completed').sort(byPosition)
  const completed = items.filter(item => item.status === 'completed').sort(byPosition)
  return [...unfinished, ...completed]
}
