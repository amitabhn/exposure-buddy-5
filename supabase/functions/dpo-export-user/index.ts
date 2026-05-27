// dpo-export-user/index.ts — DPDPA data export Edge Function (Story 3.3)
// FR-DPO-05: compiles all exportable personal data for a target user.
// Writes dpo_audit_log entry for every export action (FR-DPO-06).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { extractBearerToken, verifyOperatorJwt } from '../_shared/auth.ts'

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

  let body: { targetUserId?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const targetUserId = body.targetUserId
  if (typeof targetUserId !== 'string' || !isValidUuid(targetUserId)) {
    return new Response(JSON.stringify({ error: 'targetUserId must be a valid UUID' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const now = new Date().toISOString()
  let failed = false

  // Compile user record
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('id, email, created_at, deleted_at')
    .eq('id', targetUserId)
    .maybeSingle()

  if (userError) {
    console.error('dpo-export-user: users query failed:', userError)
    failed = true
  }

  // Compile profile record
  const { data: profileData, error: profileError } = !failed
    ? await adminClient
        .from('profiles')
        .select('id, display_name, created_at')
        .eq('id', targetUserId)
        .maybeSingle()
    : { data: null, error: null }

  if (profileError) {
    console.error('dpo-export-user: profiles query failed:', profileError)
    failed = true
  }

  // Compile consent records (retained even after erasure)
  const { data: consentData, error: consentError } = !failed
    ? await adminClient
        .from('consent_records')
        .select('id, user_id, timestamp_utc, purpose_id, consent_version, withdrawal_status, created_at')
        .eq('user_id', targetUserId)
    : { data: null, error: null }

  if (consentError) {
    console.error('dpo-export-user: consent_records query failed:', consentError)
    failed = true
  }

  // Session metadata — erp_sessions may not exist yet; return empty array if missing
  let sessionsData: unknown[] = []
  if (!failed) {
    const { data: sessions, error: sessionsError } = await adminClient
      .from('erp_sessions')
      .select('id, created_at')
      .eq('user_id', targetUserId)

    if (sessionsError) {
      // Table likely doesn't exist yet — treat as empty, not a failure
      console.warn('dpo-export-user: erp_sessions query failed (table may not exist):', sessionsError.message)
    } else {
      sessionsData = sessions ?? []
    }
  }

  // Write audit log
  const { error: auditError } = await adminClient
    .from('dpo_audit_log')
    .insert({
      action_type: 'export',
      acting_operator_id: operator.operatorId,
      target_user_id: targetUserId,
      timestamp_utc: now,
      outcome: failed ? 'failure' : 'success',
      metadata: null,
    })

  if (auditError) {
    console.error('dpo-export-user: dpo_audit_log insert failed:', auditError)
  }

  if (failed) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      export: {
        user: userData,
        profile: profileData,
        consentRecords: consentData ?? [],
        sessions: sessionsData,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
