import enJson from './locales/en.json'

const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      return flattenKeys(value as Record<string, unknown>, fullKey)
    }
    return [fullKey]
  })
}

describe('en.json key naming convention', () => {
  it('all keys match [namespace].[identifier] pattern', () => {
    const keys = flattenKeys(enJson)
    expect(keys.length).toBeGreaterThan(0)

    const violations = keys.filter((key) => !KEY_PATTERN.test(key))
    expect(violations).toEqual([])
  })
})
