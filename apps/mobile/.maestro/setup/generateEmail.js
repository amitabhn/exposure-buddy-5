// Story 9.5, Task 4.2 — Generates a per-invocation-unique test email address.
//
// Per Task 4.2 and the review finding about fixed/reused OTP test emails:
// a fixed address fails under Task 9.3's mandated back-to-back reruns within
// the same supabase db reset cycle (OTP rate limiting, stale Mailpit messages).
// Using a timestamp suffix gives each run a unique address.

var timestamp = Date.now()
output.email = 'e2e-onboarding-' + timestamp + '@maestro.local'
console.log('generateEmail: ' + output.email)
