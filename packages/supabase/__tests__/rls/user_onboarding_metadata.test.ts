// RLS integration tests for user_onboarding_metadata table (AC4, Story 4.2)
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

const TEST_USER_A_EMAIL = 'onboarding-rls-test-a@example.com'
const TEST_USER_B_EMAIL = 'onboarding-rls-test-b@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

const SEED_RECORD = {
  suds_calibration_value: 5,
  completed_at: new Date().toISOString(),
}

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('user_onboarding_metadata table RLS', () => {
  let serviceClient: SupabaseClient<Database>
  let userAId: string | undefined
  let userBId: string | undefined

  beforeAll(async () => {
    serviceClient = createClient<Database>(LOCAL_URL, SERVICE_ROLE_KEY)

    const { data: a, error: errorA } = await serviceClient.auth.admin.createUser({
      email: TEST_USER_A_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    const { data: b, error: errorB } = await serviceClient.auth.admin.createUser({
      email: TEST_USER_B_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (errorA ?? !a.user) throw new Error(`Failed to create user A: ${errorA?.message ?? 'null user'}`)
    if (errorB ?? !b.user) throw new Error(`Failed to create user B: ${errorB?.message ?? 'null user'}`)
    userAId = a.user.id
    userBId = b.user.id

    // Seed one onboarding metadata row for user A via service_role (bypasses RLS)
    const { error: seedError } = await serviceClient
      .from('user_onboarding_metadata')
      .insert({ ...SEED_RECORD, user_id: userAId })
    if (seedError) throw new Error(`Failed to seed user_onboarding_metadata: ${seedError.message}`)
  })

  afterAll(async () => {
    // Delete auth users — ON DELETE CASCADE cleans up user_onboarding_metadata rows
    try {
      if (userAId) await serviceClient.auth.admin.deleteUser(userAId)
    } catch (e) {
      console.error('afterAll: failed to delete user A', e)
    }
    try {
      if (userBId) await serviceClient.auth.admin.deleteUser(userBId)
    } catch (e) {
      console.error('afterAll: failed to delete user B', e)
    }
  })

  it('[+] authenticated user can read their own row', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientA
      .from('user_onboarding_metadata')
      .select('*')
      .eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0]!.user_id).toBe(userAId)
  })

  it('[+] authenticated user can insert their own row', async () => {
    if (!userBId) throw new Error('Test setup failed: userBId undefined')
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientB.from('user_onboarding_metadata').insert({
      user_id: userBId,
      suds_calibration_value: 7,
      completed_at: new Date().toISOString(),
    })
    expect(error).toBeNull()

    // Verify row was inserted
    const { data } = await clientB
      .from('user_onboarding_metadata')
      .select('*')
      .eq('user_id', userBId)
    expect(data).toHaveLength(1)
  })

  it('[-] cross-user SELECT is blocked', async () => {
    if (!userAId || !userBId) throw new Error('Test setup failed: user IDs undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    // User A attempts to read User B's row — RLS filters, returns 0 rows
    const { data, error } = await clientA
      .from('user_onboarding_metadata')
      .select('*')
      .eq('user_id', userBId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] unauthenticated SELECT is blocked', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    // No sign-in — anon request
    const { data, error } = await anonClient
      .from('user_onboarding_metadata')
      .select('*')
      .eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] DELETE is denied for authenticated user on their own row', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    // No DELETE policy exists — RLS silently filters the row (0 rows affected, no error).
    // Verify denial by confirming the row still exists after the attempt.
    await clientA
      .from('user_onboarding_metadata')
      .delete()
      .eq('user_id', userAId)

    const { data } = await clientA
      .from('user_onboarding_metadata')
      .select('*')
      .eq('user_id', userAId)
    expect(data).toHaveLength(1)
  })
})
