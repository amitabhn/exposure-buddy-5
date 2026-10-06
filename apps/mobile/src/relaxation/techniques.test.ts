import enJson from '../i18n/locales/en.json'
import hiJson from '../i18n/locales/hi.json'
import { RELAXATION_TECHNIQUES, isRelaxationTechniqueKey } from './techniques'

describe('RELAXATION_TECHNIQUES (Story 19.2)', () => {
  it('has unique keys', () => {
    const keys = RELAXATION_TECHNIQUES.map((technique) => technique.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('maps the two built techniques to their existing screens and leaves the rest as coming soon', () => {
    const routes = Object.fromEntries(RELAXATION_TECHNIQUES.map((technique) => [technique.key, technique.route]))
    expect(routes).toEqual({
      boxBreathing: '/calm-me/breathing',
      grounding54321: '/calm-me/grounding',
      breathing478: null,
      bhramari: null,
      nadiShodhana: null,
      bodyScan: null,
    })
  })

  it('never points at the exposure flow', () => {
    for (const technique of RELAXATION_TECHNIQUES) {
      expect(technique.route ?? '').not.toMatch(/\/session\//)
    }
  })

  it('has a label and description for every technique in en.json and hi.json', () => {
    for (const locale of [enJson, hiJson]) {
      for (const { key } of RELAXATION_TECHNIQUES) {
        const entry = (locale.relaxation.techniques as Record<string, { label?: string; description?: string }>)[key]
        expect(entry?.label).toBeTruthy()
        expect(entry?.description).toBeTruthy()
      }
    }
  })

  it('en.json and hi.json define exactly the same relaxation keys', () => {
    const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([key, value]) =>
        typeof value === 'object' && value !== null
          ? flatten(value as Record<string, unknown>, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      )
    expect(flatten(hiJson.relaxation).sort()).toEqual(flatten(enJson.relaxation).sort())
  })

  it('isRelaxationTechniqueKey accepts listed keys only', () => {
    expect(isRelaxationTechniqueKey('bodyScan')).toBe(true)
    expect(isRelaxationTechniqueKey('somatic')).toBe(false)
    expect(isRelaxationTechniqueKey(undefined)).toBe(false)
  })
})
