// Integration test for the fear_ladder_items_delete_audit_trigger (AC 7, Story 6.2-C, D13)
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

const TEST_USER_EMAIL = 'delete-audit-rls-test@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('fear_ladder_items_delete_audit_trigger', () => {
  let serviceClient: SupabaseClient<Database>
  let userId: string | undefined

  beforeAll(async () => {
    serviceClient = createClient<Database>(LOCAL_URL, SERVICE_ROLE_KEY)

    const { data, error } = await serviceClient.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error(`Failed to create test user: ${error?.message ?? 'null user'}`)
    userId = data.user.id
  })

  afterAll(async () => {
    try {
      if (userId) await serviceClient.auth.admin.deleteUser(userId)
    } catch (e) {
      console.error('afterAll: failed to delete test user', e)
    }
  })

  it('[+] deleting own fear_ladder_items row inserts exactly one dpo_audit_log row with action_type=ladder_item_delete, metadata.item_id matching, no description field anywhere in metadata', async () => {
    if (!userId) throw new Error('Test setup failed: userId undefined')

    const { data: item, error: insertError } = await serviceClient
      .from('fear_ladder_items')
      .insert({ user_id: userId, description: 'Sensitive fear text', predicted_suds: 6, position: 1, status: 'pending' })
      .select('id')
      .single()
    if (insertError || !item) throw new Error(`Failed to seed row: ${insertError?.message ?? 'null item'}`)

    const clientUser = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientUser.auth.signInWithPassword({ email: TEST_USER_EMAIL, password: TEST_PASSWORD })

    const { error: deleteError } = await clientUser.from('fear_ladder_items').delete().eq('id', item.id)
    expect(deleteError).toBeNull()

    // Regular users have no SELECT policy on dpo_audit_log — only service_role can verify the row.
    const { data: auditRows, error: auditError } = await serviceClient
      .from('dpo_audit_log')
      .select('*')
      .eq('target_user_id', userId)
      .eq('action_type', 'ladder_item_delete')
    expect(auditError).toBeNull()
    expect(auditRows).toHaveLength(1)

    const row = auditRows![0]!
    expect(row.outcome).toBe('success')
    expect(row.acting_operator_id).toBe(userId)
    expect(row.metadata).toEqual({ item_id: item.id })
    expect(JSON.stringify(row.metadata)).not.toContain('Sensitive fear text')
    expect(JSON.stringify(row.metadata)).not.toContain('description')
  })
})
