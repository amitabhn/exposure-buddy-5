// dpo-audit-log/index.ts — DPO audit log read Edge Function (Story 3.3)
// FR-DPO-06: read access is itself audited (every read writes an audit_view entry).
// Restricted to dpo_operator role. Returns paginated dpo_audit_log entries.
//
// Access model (intentional): full audit log is visible to ALL authenticated dpo_operators.
// In a single/small-DPO DPDPA deployment, restricting each operator to their own entries
// would undermine oversight — a real audit trail must be visible to senior reviewers.
// If per-operator scoping is required in a future multi-operator deployment, add
// .eq('acting_operator_id', operator.operatorId) to the select query.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { extractBearerToken, verifyOperatorJwt } from '../_shared/auth.ts'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Patch 5: method guard — audit log reads are GET-only
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: 'GET' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const jwt = extractBearerToken(req)
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const operator = await verifyOperatorJwt(adminClient, jwt)
  if (!operator) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse pagination query params
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(url.searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  )
  const offset = (page - 1) * pageSize

  const now = new Date().toISOString()

  // Fetch paginated entries and total count
  const { data: entries, error: queryError, count } = await adminClient
    .from('dpo_audit_log')
    .select('*', { count: 'exact' })
    .order('timestamp_utc', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (queryError) {
    console.error('dpo-audit-log: query failed:', queryError)

    // Write failure audit entry before returning error
    await adminClient.from('dpo_audit_log').insert({
      action_type: 'audit_view',
      acting_operator_id: operator.operatorId,
      // target_user_id = operatorId for audit_view reads (no specific target user)
      target_user_id: operator.operatorId,
      timestamp_utc: now,
      outcome: 'failure',
      metadata: null,
    })

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Write success audit entry (read access is itself audited per FR-DPO-06)
  const { error: auditError } = await adminClient.from('dpo_audit_log').insert({
    action_type: 'audit_view',
    acting_operator_id: operator.operatorId,
    target_user_id: operator.operatorId,
    timestamp_utc: now,
    outcome: 'success',
    metadata: { page, pageSize },
  })

  if (auditError) {
    console.error('dpo-audit-log: self-audit insert failed:', auditError)
  }

  return new Response(
    JSON.stringify({
      entries: entries ?? [],
      page,
      pageSize,
      total: count ?? 0,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
