// Integration tests for the uq_active_thread partial unique index (AC 9, Story 6.2-A)
//
// REQUIRES: local Supabase instance running (`supabase start`) with migration 0022 applied
// Run locally: pnpm --filter @exposure-buddy/supabase test
// In CI: passWithNoTests — these tests are skipped without SUPABASE_SERVICE_ROLE_KEY set
//
// Key properties under test:
//   [+] first 'started' row for (userId, fearItemId) → succeeds
//   [-] second 'started' row for same pair → unique-constraint violation
//   [+] second row for different fearItemId → succeeds (constraint is per fear item)
//   [+] second row for same fearItemId with status='abandoned' → succeeds (partial index only covers 'started')
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/database.types'

const LOCAL_URL = 'http://localhost:54321'
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? ''

const TEST_USER_EMAIL = 'active-thread-rls-test@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

// Skip all tests if no local Supabase — passWithNoTests handles CI
const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('uq_active_thread partial unique index', () => {
  let serviceClient: SupabaseClient<Database>
  let testUserId: string
  let fearItemId: string

  beforeAll(async () => {
    serviceClient = createClient<Database>(LOCAL_URL, SERVICE_ROLE_KEY)

    // Create a test auth user
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message ?? 'null user'}`)
    }
    testUserId = data.user.id

    // Create a fear ladder item for this user (needed for the FK relationship)
    const { data: item, error: itemErr } = await serviceClient
      .from('fear_ladder_items')
      .insert({
        user_id: testUserId,
        description: 'Test fear item for active thread constraint',
        predicted_suds: 5,
        position: 1,
        status: 'pending',
      })
      .select('id')
      .single()
    if (itemErr || !item) {
      throw new Error(`Failed to create fear ladder item: ${itemErr?.message ?? 'null item'}`)
    }
    fearItemId = item.id
  })

  afterAll(async () => {
    // Clean up test data
    try {
      if (fearItemId) {
        // exposure_sessions ON DELETE CASCADE handles sessions via fear_ladder_items ON DELETE SET NULL
        await serviceClient.from('exposure_sessions').delete().eq('user_id', testUserId)
        await serviceClient.from('fear_ladder_items').delete().eq('id', fearItemId)
      }
      if (testUserId) await serviceClient.auth.admin.deleteUser(testUserId)
    } catch {
      // Non-fatal: test DB is local-only
    }
  })

  it('[+] first started row for (userId, fearItemId) succeeds', async () => {
    const { error } = await serviceClient
      .from('exposure_sessions')
      .insert({
        user_id: testUserId,
        fear_item_id: fearItemId,
        status: 'started',
        session_type: 'erp',
      })

    expect(error).toBeNull()
  })

  it('[-] second started row for same (userId, fearItemId) violates uq_active_thread', async () => {
    const { error } = await serviceClient
      .from('exposure_sessions')
      .insert({
        user_id: testUserId,
        fear_item_id: fearItemId,
        status: 'started',
        session_type: 'erp',
      })

    expect(error).not.toBeNull()
    // Unique violation — Postgres error code 23505
    expect(error?.code).toBe('23505')
  })

  it('[+] second started row for different fearItemId succeeds', async () => {
    // Create a second fear ladder item
    const { data: item2, error: item2Err } = await serviceClient
      .from('fear_ladder_items')
      .insert({
        user_id: testUserId,
        description: 'Second test fear item',
        predicted_suds: 3,
        position: 2,
        status: 'pending',
      })
      .select('id')
      .single()
    expect(item2Err).toBeNull()

    const { error } = await serviceClient
      .from('exposure_sessions')
      .insert({
        user_id: testUserId,
        fear_item_id: item2!.id,
        status: 'started',
        session_type: 'erp',
      })

    expect(error).toBeNull()

    // Cleanup the second item
    await serviceClient.from('exposure_sessions').delete().eq('fear_item_id', item2!.id)
    await serviceClient.from('fear_ladder_items').delete().eq('id', item2!.id)
  })

  it('[+] row with status=abandoned for same fearItemId succeeds (partial index only covers started)', async () => {
    // First complete/abandon the existing started session
    await serviceClient
      .from('exposure_sessions')
      .update({ status: 'abandoned' })
      .eq('user_id', testUserId)
      .eq('fear_item_id', fearItemId)
      .eq('status', 'started')

    // Now insert an abandoned row directly
    const { error } = await serviceClient
      .from('exposure_sessions')
      .insert({
        user_id: testUserId,
        fear_item_id: fearItemId,
        status: 'abandoned',
        session_type: 'erp',
      })

    expect(error).toBeNull()
  })
})
