// RLS integration tests for exposure_sessions table (AC5, Story 5.2)
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

const TEST_USER_A_EMAIL = 'erp-rls-test-a@example.com'
const TEST_USER_B_EMAIL = 'erp-rls-test-b@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('exposure_sessions table RLS', () => {
  let serviceClient: SupabaseClient<Database>
  let userAId: string | undefined
  let userBId: string | undefined
  let sessionAId: string | undefined

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

    // Seed one exposure_sessions row for user A via service_role (bypasses RLS)
    const { data: session, error: seedError } = await serviceClient
      .from('exposure_sessions')
      .insert({
        user_id: userAId,
        session_type: 'erp',
        status: 'started',
      })
      .select('id')
      .single()
    if (seedError ?? !session) throw new Error(`Failed to seed exposure_sessions: ${seedError?.message ?? 'null row'}`)
    sessionAId = session.id
  })

  afterAll(async () => {
    // Delete auth users — ON DELETE CASCADE cleans up exposure_sessions rows
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

  it('[+] authenticated user can read and insert their own rows', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientA
      .from('exposure_sessions')
      .select('*')
      .eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    expect(data![0]!.user_id).toBe(userAId)

    const { error: insertError } = await clientA.from('exposure_sessions').insert({
      user_id: userAId,
      session_type: 'erp',
      status: 'started',
    })
    expect(insertError).toBeNull()
  })

  it('[-] cross-user SELECT is blocked', async () => {
    if (!userAId || !userBId) throw new Error('Test setup failed: user IDs undefined')
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    // User B attempts to read User A's sessions — RLS filters, returns 0 rows
    const { data, error } = await clientB
      .from('exposure_sessions')
      .select('*')
      .eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] unauthenticated SELECT is blocked', async () => {
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    const { data, error } = await anonClient
      .from('exposure_sessions')
      .select('*')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[stub] clinician path — user with no therapist_patient_relationships row sees 0 rows for other user', async () => {
    if (!userAId || !userBId) throw new Error('Test setup failed: user IDs undefined')
    // User B has no therapist_patient_relationships row for User A.
    // Functionally identical to cross-user SELECT until Story 5.4 activates the join-based policy.
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientB
      .from('exposure_sessions')
      .select('*')
      .eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})
