// EXECUTE-privilege integration tests for perform_user_erasure() (Story 10.2 AC #2, migration 0030)
// Guards against a future migration accidentally re-granting public EXECUTE on this
// SECURITY DEFINER function, which would reopen the cross-user PII-erasure hole from
// migration 0007 (any signed-in user could erase any other user's PII by id).
//
// REQUIRES: local Supabase instance running (`supabase start`)
// Run locally: SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_ANON_KEY=<key> pnpm --filter @exposure-buddy/supabase test
// In CI: passWithNoTests — these tests are skipped without SUPABASE_SERVICE_ROLE_KEY set
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/database.types'

const LOCAL_URL = 'http://localhost:54321'
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? ''

const TEST_USER_EMAIL = 'erasure-privilege-test@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('perform_user_erasure EXECUTE privileges (migration 0030)', () => {
  let serviceClient: SupabaseClient<Database>
  let userId: string | undefined

  beforeAll(async () => {
    serviceClient = createClient<Database>(LOCAL_URL, SERVICE_ROLE_KEY)

    const { data, error } = await serviceClient.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error(`Failed to create test user: ${error?.message ?? 'null user'}`)
    userId = data.user.id

    await serviceClient.from('users').insert({ id: userId, email: TEST_USER_EMAIL })
  })

  afterAll(async () => {
    try {
      if (userId) await serviceClient.auth.admin.deleteUser(userId)
    } catch (e) {
      console.error('afterAll: failed to delete test user', e)
    }
  })

  it('[-] anon role cannot execute perform_user_erasure', async () => {
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    const { error } = await anonClient.rpc('perform_user_erasure', { p_target_user_id: userId! })
    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501') // insufficient_privilege
  })

  it('[-] authenticated role cannot execute perform_user_erasure, even against its own row', async () => {
    const userClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    await userClient.auth.signInWithPassword({ email: TEST_USER_EMAIL, password: TEST_PASSWORD })

    const { error } = await userClient.rpc('perform_user_erasure', { p_target_user_id: userId! })
    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')
  })

  it('[+] service_role has EXECUTE privilege on perform_user_erasure (not blocked at the grant level)', async () => {
    // Scoped to the EXECUTE-privilege regression this test file exists to guard (migration 0030).
    // Does NOT assert the function body succeeds end-to-end — public.users.email is NOT NULL
    // (migration 0001) and this function unconditionally sets email = NULL, so it currently
    // fails with 23502 regardless of caller. That is a separate, pre-existing bug (predates
    // this migration) tracked outside this story — see deferred-work.md. A 42501
    // (insufficient_privilege) here would mean service_role's grant was lost; any other
    // outcome, including a 23502 from inside the function body, proves the grant is intact.
    const { error } = await serviceClient.rpc('perform_user_erasure', { p_target_user_id: userId! })
    expect(error?.code).not.toBe('42501')
  })
})
