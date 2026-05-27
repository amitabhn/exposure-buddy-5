// RLS integration tests for the dpo_audit_log table (AC3, ARC-006, FR-DPO-06)
//
// REQUIRES: local Supabase instance running (`supabase start`)
// Run locally: pnpm --filter @exposure-buddy/supabase test
// In CI: passWithNoTests — these tests are skipped without SUPABASE_SERVICE_ROLE_KEY set
//
// Key properties under test:
//   [+] service_role INSERT succeeds (proxy for Edge Function path — service_role bypasses RLS)
//   [-] authenticated non-operator INSERT is blocked by RLS (no INSERT policy for auth users)
//   [-] unauthenticated INSERT is blocked by RLS
//   [-] UPDATE raises immutability trigger exception (even service_role cannot update)
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/database.types'

const LOCAL_URL = 'http://localhost:54321'
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? ''

const TEST_USER_EMAIL = 'dpo-audit-rls-test-a@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

// Minimal valid audit log row for test inserts
const makeAuditRow = (overrides: Partial<{
  action_type: string
  acting_operator_id: string
  target_user_id: string
  outcome: string
}> = {}) => ({
  action_type: 'erasure' as const,
  acting_operator_id: '00000000-0000-0000-0000-000000000001',
  target_user_id: '00000000-0000-0000-0000-000000000002',
  outcome: 'success' as const,
  ...overrides,
})

describe.skipIf(skipIfNoSupabase)('dpo_audit_log table RLS + immutability', () => {
  let serviceClient: SupabaseClient<Database>
  let testUserId: string | undefined
  let insertedRowId: string | undefined

  beforeAll(async () => {
    serviceClient = createClient<Database>(LOCAL_URL, SERVICE_ROLE_KEY)

    // Create a regular (non-operator) auth user for the blocked-INSERT tests
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error ?? !data.user) {
      throw new Error(`Failed to create test user: ${error?.message ?? 'null user'}`)
    }
    testUserId = data.user.id
  })

  afterAll(async () => {
    // Clean up test auth user
    try {
      if (testUserId) await serviceClient.auth.admin.deleteUser(testUserId)
    } catch {
      // Non-fatal: test DB is local-only
    }
    // dpo_audit_log rows inserted during tests are intentionally left — immutability
    // trigger prevents deletion; local test DB is reset by supabase db reset.
  })

  it('[+] service_role INSERT succeeds (proxy for Edge Function path)', async () => {
    const { data, error } = await serviceClient
      .from('dpo_audit_log')
      .insert(makeAuditRow())
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data?.id).toBeTruthy()
    // Store for the UPDATE test
    insertedRowId = data?.id
  })

  it('[-] authenticated non-operator INSERT is blocked by RLS', async () => {
    if (!testUserId) throw new Error('Test setup failed: testUserId undefined')

    const authClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    await authClient.auth.signInWithPassword({ email: TEST_USER_EMAIL, password: TEST_PASSWORD })

    const { error } = await authClient
      .from('dpo_audit_log')
      .insert(makeAuditRow())

    // RLS blocks INSERT — error expected
    expect(error).not.toBeNull()
  })

  it('[-] unauthenticated INSERT is blocked by RLS', async () => {
    const anonClient = createClient<Database>(LOCAL_URL, ANON_KEY)
    // No sign-in

    const { error } = await anonClient
      .from('dpo_audit_log')
      .insert(makeAuditRow())

    // RLS blocks INSERT — error expected
    expect(error).not.toBeNull()
  })

  it('[-] UPDATE raises immutability trigger exception (even service_role)', async () => {
    if (!insertedRowId) throw new Error('Test setup failed: no row inserted in [+] test')

    const { error } = await serviceClient
      .from('dpo_audit_log')
      .update({ outcome: 'failure' })
      .eq('id', insertedRowId)

    // BEFORE trigger raises exception for ALL roles including service_role
    expect(error).not.toBeNull()
    expect(error?.message).toContain('dpo_audit_log is append-only')
  })
})
