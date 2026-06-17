// RLS integration tests for the dpo_operators table (migration 0023)
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

const TEST_USER_EMAIL = 'dpo-operators-rls-test@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('dpo_operators table RLS', () => {
  let serviceClient: SupabaseClient<Database>
  let testUserId: string | undefined

  beforeAll(async () => {
    serviceClient = createClient<Database>(LOCAL_URL, SERVICE_ROLE_KEY)

    // Seed a test operator row via service role (mimics prod seeding flow)
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error ?? !data.user) throw new Error(`Failed to create test user: ${error?.message ?? 'null user'}`)
    testUserId = data.user.id

    await serviceClient
      .from('dpo_operators')
      .insert({ id: testUserId, email: TEST_USER_EMAIL, name: 'RLS Test Operator', active: true })
  })

  afterAll(async () => {
    if (testUserId) {
      await serviceClient.from('dpo_operators').delete().eq('id', testUserId)
      await serviceClient.auth.admin.deleteUser(testUserId)
    }
  })

  it('[-] unauthenticated (anon) read is blocked', async () => {
    // anon has no SELECT grant on dpo_operators — blocked at grant level (42501),
    // not just filtered by RLS. Stricter than empty-row behaviour.
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    const { error } = await anonClient.from('dpo_operators').select('*')
    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')
  })

  it('[-] authenticated regular user read is blocked', async () => {
    // authenticated has no SELECT grant on dpo_operators — same 42501 block as anon.
    const { data: user, error: createErr } = await serviceClient.auth.admin.createUser({
      email: 'dpo-operators-rls-regular@example.com',
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (createErr ?? !user.user) throw new Error(`Failed to create regular user: ${createErr?.message ?? 'null user'}`)
    const regularUserId = user.user.id

    try {
      const regularClient = createClient<Database>(LOCAL_URL, ANON_KEY)
      await regularClient.auth.signInWithPassword({ email: 'dpo-operators-rls-regular@example.com', password: TEST_PASSWORD })
      const { error } = await regularClient.from('dpo_operators').select('*')
      expect(error).not.toBeNull()
      expect(error!.code).toBe('42501')
    } finally {
      await serviceClient.auth.admin.deleteUser(regularUserId)
    }
  })

  it('[+] service role read succeeds (Edge Function access pattern)', async () => {
    const { data, error } = await serviceClient
      .from('dpo_operators')
      .select('id, email, active')
      .eq('id', testUserId!)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0]!.email).toBe(TEST_USER_EMAIL)
    expect(data![0]!.active).toBe(true)
  })
})
