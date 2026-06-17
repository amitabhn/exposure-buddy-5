// RLS/RPC integration tests for swap_ladder_positions (AC 2, Story 6.2-C, D6)
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

const TEST_USER_A_EMAIL = 'swap-positions-rls-test-a@example.com'
const TEST_USER_B_EMAIL = 'swap-positions-rls-test-b@example.com'
const TEST_PASSWORD = 'rls-test-password-123!'

const skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY

describe.skipIf(skipIfNoSupabase)('swap_ladder_positions RPC', () => {
  let serviceClient: SupabaseClient<Database>
  let userAId: string | undefined
  let userBId: string | undefined
  let itemA1: string
  let itemA2: string
  let itemB1: string

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

    const { data: itemsA, error: itemsAErr } = await serviceClient
      .from('fear_ladder_items')
      .insert([
        { user_id: userAId, description: 'A item 1', predicted_suds: 3, position: 1, status: 'pending' },
        { user_id: userAId, description: 'A item 2', predicted_suds: 5, position: 2, status: 'pending' },
      ])
      .select('id')
    if (itemsAErr || !itemsA) throw new Error(`Failed to seed user A items: ${itemsAErr?.message ?? 'null items'}`)
    itemA1 = itemsA[0]!.id
    itemA2 = itemsA[1]!.id

    const { data: itemsB, error: itemsBErr } = await serviceClient
      .from('fear_ladder_items')
      .insert([{ user_id: userBId, description: 'B item 1', predicted_suds: 4, position: 1, status: 'pending' }])
      .select('id')
    if (itemsBErr || !itemsB) throw new Error(`Failed to seed user B items: ${itemsBErr?.message ?? 'null items'}`)
    itemB1 = itemsB[0]!.id
  })

  afterAll(async () => {
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

  it("[+] owner can swap two of their own items' positions atomically", async () => {
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientA.rpc('swap_ladder_positions', {
      p_item_a_id: itemA1,
      p_item_a_new_position: 2,
      p_item_b_id: itemA2,
      p_item_b_new_position: 1,
    })
    expect(error).toBeNull()

    const { data: rows } = await serviceClient
      .from('fear_ladder_items')
      .select('id, position')
      .in('id', [itemA1, itemA2])
    const posById = Object.fromEntries((rows ?? []).map(r => [r.id, r.position]))
    expect(posById[itemA1]).toBe(2)
    expect(posById[itemA2]).toBe(1)
  })

  // Note: the ownership SELECTs inside swap_ladder_positions run under SECURITY INVOKER,
  // so they are themselves subject to the table's SELECT RLS policy — a cross-user item
  // is invisible to that SELECT and surfaces as "not found", not "does not own both
  // items" (that branch only guards against a future change to the SELECT policy, e.g.
  // a clinician/therapist read grant, that would make other users' rows visible to SELECT
  // but should still not be writable via this RPC).
  it('[-] rejects when auth.uid() does not own item A', async () => {
    const clientB = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: TEST_USER_B_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientB.rpc('swap_ladder_positions', {
      p_item_a_id: itemA1,
      p_item_a_new_position: 1,
      p_item_b_id: itemB1,
      p_item_b_new_position: 2,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('not found')
  })

  it('[-] rejects when auth.uid() does not own item B', async () => {
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientA.rpc('swap_ladder_positions', {
      p_item_a_id: itemA1,
      p_item_a_new_position: 1,
      p_item_b_id: itemB1,
      p_item_b_new_position: 2,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('not found')
  })

  it('[-] rejects with non-existent item id', async () => {
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientA.rpc('swap_ladder_positions', {
      p_item_a_id: itemA1,
      p_item_a_new_position: 1,
      p_item_b_id: '00000000-0000-0000-0000-000000000000',
      p_item_b_new_position: 2,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('not found')
  })

  it('[-] rejects when item_a_id equals item_b_id', async () => {
    const clientA = createClient<Database>(LOCAL_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: TEST_USER_A_EMAIL, password: TEST_PASSWORD })

    const { error } = await clientA.rpc('swap_ladder_positions', {
      p_item_a_id: itemA1,
      p_item_a_new_position: 1,
      p_item_b_id: itemA1,
      p_item_b_new_position: 2,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('must differ')
  })
})
