// RLS integration tests for the users table (AC2, ARC-006, ARC-007)
//
// REQUIRES: local Supabase instance running (`supabase start`)
// Run locally: pnpm --filter @exposure-buddy/supabase test
// In CI: passWithNoTests — these tests are skipped without SUPABASE_SERVICE_ROLE_KEY set
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/database.types'

const LOCAL_URL = 'http://localhost:54321'
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? ''

const TEST_USER_A_EMAIL = 'rls-test-a@example.com'
const TEST_USER_B_EMAIL = 'rls-test-b@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('users table RLS', () => {
  // Initialise inside beforeAll so createClient is NOT called at collection time
  let serviceClient: SupabaseClient<Database>
  let userAId: string | undefined
  let userBId: string | undefined

  beforeAll(async () => {
    serviceClient = createClient<Database>(LOCAL_URL, SERVICE_ROLE_KEY)

    // Create two isolated test users via service role
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

    // Insert users into public.users
    await serviceClient
      .from('users')
      .insert([
        { id: userAId, email: TEST_USER_A_EMAIL },
        { id: userBId, email: TEST_USER_B_EMAIL },
      ])
  })

  afterAll(async () => {
    // Delete auth users — ON DELETE CASCADE cleans up public.users rows
    if (userAId) await serviceClient.auth.admin.deleteUser(userAId)
    if (userBId) await serviceClient.auth.admin.deleteUser(userBId)
  })

  it('[+] own-row read succeeds for authenticated user', async () => {
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientA.from('users').select('*').eq('id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0]!.id).toBe(userAId)
  })

  it('[-] cross-user row read is blocked', async () => {
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    // User A attempts to read User B's row — should return 0 rows (RLS filters, not errors)
    const { data, error } = await clientA.from('users').select('*').eq('id', userBId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] unauthenticated read is blocked', async () => {
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    // No sign-in — anon request
    const { data, error } = await anonClient.from('users').select('*').eq('id', userAId)
    // RLS with no matching policy — returns 0 rows (not an error at the HTTP level)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] authenticated user cannot null their own email (migration 0032)', async () => {
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientA.from('users').update({ email: null }).eq('id', userAId!)
    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501') // RLS WITH CHECK violation

    const { data } = await serviceClient.from('users').select('email').eq('id', userAId!).single()
    expect(data?.email).toBe(TEST_USER_A_EMAIL)
  })

  it('[stub] clinician path returns empty (ARC-007)', async () => {
    // Clinician access via therapist_patient table is deferred to Epic 5 (ARC-007).
    // Stub: verify that no cross-user read is granted via current policies.
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    const { data } = await clientB.from('users').select('*').eq('id', userAId)
    expect(data).toHaveLength(0)
  })
})
