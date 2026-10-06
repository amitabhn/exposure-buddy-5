// Practice Relaxation (Story 19.2) — the techniques the Home "Practice Relaxation" picker lists.
// `route` is the existing standalone screen that runs the technique; `null` means it is not built
// yet and the picker opens the "Coming soon" screen instead. Nothing here is tied to a ladder
// item or an exposure session.
export type RelaxationTechniqueKey =
  | 'boxBreathing'
  | 'grounding54321'
  | 'breathing478'
  | 'bhramari'
  | 'nadiShodhana'
  | 'bodyScan'

export interface RelaxationTechnique {
  key: RelaxationTechniqueKey
  route: '/calm-me/breathing' | '/calm-me/grounding' | null
}

export const RELAXATION_TECHNIQUES: readonly RelaxationTechnique[] = [
  { key: 'boxBreathing', route: '/calm-me/breathing' },
  { key: 'grounding54321', route: '/calm-me/grounding' },
  { key: 'breathing478', route: null },
  { key: 'bhramari', route: null },
  { key: 'nadiShodhana', route: null },
  { key: 'bodyScan', route: null },
]

export function isRelaxationTechniqueKey(value: unknown): value is RelaxationTechniqueKey {
  return RELAXATION_TECHNIQUES.some((technique) => technique.key === value)
}
