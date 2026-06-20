// RLS integration tests for device_push_tokens table (AC1-3, Story 8.1)
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

const TEST_USER_A_EMAIL = 'push-token-rls-test-a@example.com'
const TEST_USER_B_EMAIL = 'push-token-rls-test-b@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('device_push_tokens table RLS', () => {
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
  })

  afterAll(async () => {
    // Delete auth users — ON DELETE CASCADE cleans up device_push_tokens rows
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

  it('[+] authenticated user can register (insert) their own token', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientA.from('device_push_tokens').upsert(
      { token: 'token-user-a', platform: 'ios', user_id: userAId, last_seen_at: new Date().toISOString() },
      { onConflict: 'token' },
    )
    expect(error).toBeNull()

    const { data } = await serviceClient.from('device_push_tokens').select('*').eq('token', 'token-user-a')
    expect(data).toHaveLength(1)
    expect(data![0]!.user_id).toBe(userAId)
  })

  it('[+] authenticated user can re-register (upsert conflict branch) their own token, refreshing last_seen_at — the AC4 foreground-refresh path', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    // First registration — plain INSERT, no conflict.
    const { error: firstError } = await clientA.from('device_push_tokens').upsert(
      { token: 'token-reregister', platform: 'ios', user_id: userAId, last_seen_at: '2020-01-01T00:00:00.000Z' },
      { onConflict: 'token' },
    )
    expect(firstError).toBeNull()

    // Second registration of the SAME token — hits the ON CONFLICT DO UPDATE branch,
    // which requires an UPDATE policy. Prior to the 0029 migration this failed with 42501.
    const refreshedAt = new Date().toISOString()
    const { error: secondError } = await clientA.from('device_push_tokens').upsert(
      { token: 'token-reregister', platform: 'ios', user_id: userAId, last_seen_at: refreshedAt },
      { onConflict: 'token' },
    )
    expect(secondError).toBeNull()

    const { data } = await serviceClient.from('device_push_tokens').select('*').eq('token', 'token-reregister')
    expect(data).toHaveLength(1)
    expect(new Date(data![0]!.last_seen_at).getTime()).toBe(new Date(refreshedAt).getTime())
  })

  it('[-] cross-user upsert against a token owned by another user is blocked, not silently hijacked', async () => {
    if (!userAId || !userBId) throw new Error('Test setup failed: user IDs undefined')

    // Seed a token owned by user A via service_role.
    const { error: seedError } = await serviceClient
      .from('device_push_tokens')
      .insert({ token: 'token-owned-by-a', platform: 'android', user_id: userAId })
    if (seedError) throw new Error(`Failed to seed device_push_tokens: ${seedError.message}`)

    // User B attempts to upsert the same token string, trying to reassign ownership to themselves.
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    const { error: hijackError } = await clientB.from('device_push_tokens').upsert(
      { token: 'token-owned-by-a', platform: 'android', user_id: userBId, last_seen_at: new Date().toISOString() },
      { onConflict: 'token' },
    )
    expect(hijackError).not.toBeNull()

    // Row still belongs to user A — no silent reassignment.
    const { data } = await serviceClient.from('device_push_tokens').select('*').eq('token', 'token-owned-by-a')
    expect(data).toHaveLength(1)
    expect(data![0]!.user_id).toBe(userAId)
  })

  it('[-] cross-user SELECT is blocked', async () => {
    if (!userAId || !userBId) throw new Error('Test setup failed: user IDs undefined')
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    const { data, error } = await clientB.from('device_push_tokens').select('*').eq('user_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[-] client-side DELETE is blocked — no DELETE policy exists, pruning is service_role-only', async () => {
    if (!userAId) throw new Error('Test setup failed: userAId undefined')
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    // RLS filters the DELETE silently — Postgres does not error on a DELETE that matches 0 rows.
    const { error, count } = await clientA
      .from('device_push_tokens')
      .delete({ count: 'exact' })
      .eq('token', 'token-user-a')
    expect(error).toBeNull()
    expect(count).toBe(0)

    const { data: stillThere } = await serviceClient.from('device_push_tokens').select('id').eq('token', 'token-user-a')
    expect(stillThere).toHaveLength(1)
  })
})
