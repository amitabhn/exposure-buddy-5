// RLS integration tests for the consent_records table (AC2, ADR-006, FR-DPO-04)
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

const TEST_USER_A_EMAIL = 'consent-rls-test-a@example.com'
const TEST_USER_B_EMAIL = 'consent-rls-test-b@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

const SEED_RECORD = {
  timestamp_utc: '2026-01-01T00:00:00.000Z',
  purpose_id: 'account-creation-v1',
  consent_version: '1.0',
  withdrawal_status: false,
}

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('consent_records table RLS', () => {
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

    // Seed one consent record per user via service_role (bypasses RLS — only valid insert path)
    const { error: seedError } = await serviceClient
      .from('consent_records')
      .insert([
        { ...SEED_RECORD, user_id: userAId },
        { ...SEED_RECORD, user_id: userBId },
      ])
    if (seedError) throw new Error(`Failed to seed consent records: ${seedError.message}`)
  })

  afterAll(async () => {
    // Delete auth users — ON DELETE CASCADE cleans up consent_records rows
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

  it('[+] authenticated user can read their own consent records', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientA.from('consent_records').select('*').eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0]!.user_id).toBe(userAId)
  })

  it('[-] cross-user read is blocked', async () => {
    if (!userAId || !userBId) throw new Error('Test setup failed: user IDs undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    // User A attempts to read User B's consent records — RLS filters, not errors
    const { data, error } = await clientA.from('consent_records').select('*').eq('user_id', userBId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] unauthenticated read is blocked', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    // No sign-in — anon request
    const { data, error } = await anonClient.from('consent_records').select('*').eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] direct INSERT from authenticated user is blocked (FR-DPO-04)', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    // Direct INSERT must fail — no INSERT policy exists for authenticated users (FR-DPO-04)
    const { error } = await clientA.from('consent_records').insert({
      user_id: userAId,
      timestamp_utc: new Date().toISOString(),
      purpose_id: 'test-direct-insert',
      consent_version: '1.0',
      withdrawal_status: false,
    })
    expect(error).not.toBeNull()
  })
})
