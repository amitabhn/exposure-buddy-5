// dpo-pending-requests/index.ts — Returns pending erasure queue for DPO panel (Story 3.4)
// Returns users where deletion_requested_at IS NOT NULL AND deleted_at IS NULL.
// Operator-authenticated (verifyOperatorJwt).
// CORS OPTIONS must be first — panel JS sends Authorization header which triggers preflight.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { extractBearerToken, verifyOperatorJwt } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  // CORS preflight — must be before method guard (E1)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // GET-only method guard (after OPTIONS check)
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: 'GET' },
    })
  }

  // Env var fast-fail
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

  // Verify operator JWT
  const jwt = extractBearerToken(req)
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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

  // Query pending erasure requests — service_role bypasses RLS (correct: DPO has authority)
  const { data, error: queryError } = await adminClient
    .from('users')
    .select('id, email, deletion_requested_at')
    .not('deletion_requested_at', 'is', null)
    .is('deleted_at', null)
    .order('deletion_requested_at', { ascending: true })

  if (queryError) {
    console.error('dpo-pending-requests: query failed:', queryError)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Write audit log entry — FR-DPO-06: every DPO read access is logged
  const { error: auditError } = await adminClient.from('dpo_audit_log').insert({
    action_type: 'audit_view',
    acting_operator_id: operator.operatorId,
    target_user_id: operator.operatorId, // consistent with audit-log pattern
    timestamp_utc: new Date().toISOString(),
    outcome: 'success',
    metadata: null,
  })

  if (auditError) {
    console.error('dpo-pending-requests: audit log insert failed:', auditError)
  }

  // Shape: { id, email | null, deletion_requested_at } — panel uses request.id as targetUserId
  const requests = (data ?? []).map((row) => ({
    id: row.id,
    email: (row.email as string | null) ?? null,
    deletion_requested_at: row.deletion_requested_at as string,
  }))

  return new Response(JSON.stringify({ requests }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
