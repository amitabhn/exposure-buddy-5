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
  let capturedDeletedAt: string | null = null

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
    await serviceClient.from('profiles').insert({ id: userId, display_name: 'Erasure Test Display Name' })
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

  it('[+] service_role can execute perform_user_erasure and the erasure fully succeeds', async () => {
    // Guards both the EXECUTE grant (migration 0030) and the erasure logic itself
    // (migration 0007 + 0031 — public.users.email was NOT NULL until Story 10.4 fixed it,
    // which made every erasure call fail with 23502 regardless of caller).
    const { error } = await serviceClient.rpc('perform_user_erasure', { p_target_user_id: userId! })
    expect(error).toBeNull()

    const { data: row, error: rowError } = await serviceClient
      .from('users')
      .select('email, deleted_at')
      .eq('id', userId!)
      .single()
    expect(rowError).toBeNull()
    expect(row?.email).toBeNull()
    expect(row?.deleted_at).not.toBeNull()
    capturedDeletedAt = row?.deleted_at ?? null

    const { data: profileRow, error: profileError } = await serviceClient
      .from('profiles')
      .select('display_name')
      .eq('id', userId!)
      .single()
    expect(profileError).toBeNull()
    expect(profileRow?.display_name).toBeNull()
  })

  // Depends on the preceding test having already erased userId — must run after it.
  it('[-] a second erasure call against an already-erased user is rejected, not silently repeated', async () => {
    const { error } = await serviceClient.rpc('perform_user_erasure', { p_target_user_id: userId! })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('erasure_already_erased')

    const { data: row, error: rowError } = await serviceClient
      .from('users')
      .select('deleted_at')
      .eq('id', userId!)
      .single()
    expect(rowError).toBeNull()
    expect(row?.deleted_at).toBe(capturedDeletedAt)
  })
})
