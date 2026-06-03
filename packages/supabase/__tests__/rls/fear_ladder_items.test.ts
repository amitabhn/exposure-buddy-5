// RLS integration tests for fear_ladder_items table (AC5, Story 4.3)
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

const TEST_USER_A_EMAIL = 'fear-rls-test-a@example.com'
const TEST_USER_B_EMAIL = 'fear-rls-test-b@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

const SEED_PAYLOAD = {
  description: 'Test situation',
  predicted_suds: 5,
  position: 1,
  status: 'pending' as const,
}

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('fear_ladder_items table RLS', () => {
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

    // Seed one fear_ladder_items row for user A via service_role (bypasses RLS)
    const { error: seedError } = await serviceClient
      .from('fear_ladder_items')
      .insert({ ...SEED_PAYLOAD, user_id: userAId })
    if (seedError) throw new Error(`Failed to seed fear_ladder_items: ${seedError.message}`)
  })

  afterAll(async () => {
    // Delete auth users — ON DELETE CASCADE cleans up fear_ladder_items rows
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

  it('[+] authenticated user can read their own rows', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientA
      .from('fear_ladder_items')
      .select('*')
      .eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    expect(data![0]!.user_id).toBe(userAId)
  })

  it('[+] authenticated user can insert their own row', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientA.from('fear_ladder_items').insert({
      user_id: userAId,
      description: 'Second situation',
      predicted_suds: 3,
      position: 2,
      status: 'pending',
    })
    expect(error).toBeNull()
  })

  it('[-] cross-user SELECT is blocked', async () => {
    if (!userAId || !userBId) throw new Error('Test setup failed: user IDs undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    // User A attempts to read User B's rows — RLS filters, returns 0 rows
    const { data, error } = await clientA
      .from('fear_ladder_items')
      .select('*')
      .eq('user_id', userBId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[stub] clinician path — user with no therapist_patient_relationships row sees 0 rows for other user', async () => {
    if (!userAId || !userBId) throw new Error('Test setup failed: user IDs undefined')
    // User B has no therapist_patient_relationships row for User A (no rows in the stub table).
    // Functionally identical to cross-user SELECT until Epic 5 Story 5.4 activates the join-based policy.
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientB
      .from('fear_ladder_items')
      .select('*')
      .eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] unauthenticated SELECT is blocked', async () => {
    // Anon client with no signIn — auth.uid() is null, SELECT policy evaluates false for all rows
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    const { data, error } = await anonClient
      .from('fear_ladder_items')
      .select('*')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})
