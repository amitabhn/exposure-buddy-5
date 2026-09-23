import enJson from './locales/en.json'
import hiJson from './locales/hi.json'
import { PRIVACY_NOTICE_LAST_UPDATED } from '../constants/legal'

// Numeric segments (e.g. calmMe.affirmation.1) are allowed for rotation-style lists
// (Story 7.1's CALM_ME_AFFIRMATIONS) — every other segment still requires lowercase-first camelCase.
const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.([a-z][a-zA-Z0-9]*|[0-9]+))+$/

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

describe('PRIVACY_NOTICE_LAST_UPDATED format', () => {
  it('matches YYYY-MM-DD regex', () => {
    expect(PRIVACY_NOTICE_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> }

describe('hi.json partial merge — fallback safety', () => {
  const hi = hiJson as DeepPartial<typeof enJson>

  it('hi.json has settings.privacy.privacyNotice translation', () => {
    expect(hi.settings?.privacy?.privacyNotice).toBe('गोपनीयता सूचना')
  })

  it('hi.json does NOT define settings.privacy.title — en fallback required', () => {
    expect(hi.settings?.privacy?.title).toBeUndefined()
    expect(enJson.settings.privacy.title).toBe('Privacy')
  })

  it('hi.json does NOT define auth.otp.sendCode — en fallback required', () => {
    expect(hi.auth?.otp?.sendCode).toBeUndefined()
    expect(enJson.auth.otp.sendCode).toBe('Send code')
  })
})

describe('Story 12.4 — session.intent copy (AC-A)', () => {
  it('en.json intentionPrompt asks the feeling/expectation check-in question', () => {
    expect(enJson.session.intent.intentionPrompt).toBe(
      'How are you feeling right now? What do you think will happen?'
    )
  })

  it('en.json intentionPlaceholder is an example-format hint, not a restated question', () => {
    expect(enJson.session.intent.intentionPlaceholder).toBe(
      'e.g. Nervous my hands will shake, but I can handle it'
    )
  })

  it('hi.json duplicates the English intentionPrompt/intentionPlaceholder per existing convention', () => {
    const hi = hiJson as DeepPartial<typeof enJson>
    expect(hi.session?.intent?.intentionPrompt).toBe(enJson.session.intent.intentionPrompt)
    expect(hi.session?.intent?.intentionPlaceholder).toBe(enJson.session.intent.intentionPlaceholder)
  })
})

describe('Story 12.4 — session.debrief.saveFailed copy accuracy (AC-B)', () => {
  it('en.json saveFailed does not falsely claim the reflection is stored/synced', () => {
    expect(enJson.session.debrief.saveFailed).not.toMatch(/stored on your device/)
    expect(enJson.session.debrief.saveFailed).not.toMatch(/sync automatically/)
    expect(enJson.session.debrief.saveFailed).toBe(
      "We couldn't save your reflection yet. It's still here — tap Try again to save it."
    )
  })

  it('hi.json duplicates the English saveFailed copy per existing convention', () => {
    const hi = hiJson as DeepPartial<typeof enJson>
    expect(hi.session?.debrief?.saveFailed).toBe(enJson.session.debrief.saveFailed)
  })
})
