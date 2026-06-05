// RLS integration tests for suds_readings table (AC5, Story 5.2)
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

const TEST_USER_A_EMAIL = 'suds-rls-test-a@example.com'
const TEST_USER_B_EMAIL = 'suds-rls-test-b@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('suds_readings table RLS', () => {
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

    // Seed one exposure_sessions for user A, then one suds_readings linked to it
    const { data: session, error: sessionError } = await serviceClient
      .from('exposure_sessions')
      .insert({ user_id: userAId, session_type: 'erp', status: 'started' })
      .select('id')
      .single()
    if (sessionError ?? !session) throw new Error(`Failed to seed session: ${sessionError?.message ?? 'null row'}`)
    sessionAId = session.id

    const { error: readingError } = await serviceClient
      .from('suds_readings')
      .insert({ session_id: sessionAId, suds_value: 6 })
    if (readingError) throw new Error(`Failed to seed suds_readings: ${readingError.message}`)
  })

  afterAll(async () => {
    // Delete auth users — ON DELETE CASCADE cleans up sessions and readings
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

  it('[+] authenticated user can read their own readings', async () => {
    if (!userAId || !sessionAId) throw new Error('Test setup failed')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientA
      .from('suds_readings')
      .select('*')
      .eq('session_id', sessionAId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    expect(data![0]!.session_id).toBe(sessionAId)
  })

  it('[-] cross-user SELECT is blocked (RLS subquery join enforced)', async () => {
    if (!userAId || !userBId || !sessionAId) throw new Error('Test setup failed')
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    // User B attempts to read readings from user A's session — RLS subquery filters all rows
    const { data, error } = await clientB
      .from('suds_readings')
      .select('*')
      .eq('session_id', sessionAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] unauthenticated SELECT is blocked', async () => {
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    const { data, error } = await anonClient
      .from('suds_readings')
      .select('*')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[stub] clinician path — user B with no therapist relationship sees 0 readings for user A session', async () => {
    if (!userAId || !userBId || !sessionAId) throw new Error('Test setup failed')
    // User B has no therapist_patient_relationships row for User A.
    // Functionally identical to cross-user SELECT until Story 5.4 adds the join-based policy.
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientB
      .from('suds_readings')
      .select('*')
      .eq('session_id', sessionAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})
