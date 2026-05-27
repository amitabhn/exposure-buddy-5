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

  // Patch 5: method guard — export is a POST-only operation (body carries targetUserId)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: 'POST' },
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
  // Patch 8: track which step failed for diagnostic metadata in audit log
  let failedStep: string | null = null

  // Compile user record
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('id, email, created_at, deleted_at')
    .eq('id', targetUserId)
    .maybeSingle()

  if (userError) {
    console.error('dpo-export-user: users query failed:', userError)
    failedStep = 'users_query'
  }

  // Patch 6: not-found guard — maybeSingle() returns data:null, error:null when no row exists.
  // Without this check the function would return 200 with all-null fields, making it impossible
  // to distinguish "user has no data" from "user does not exist".
  if (!failedStep && userData === null) {
    await adminClient.from('dpo_audit_log').insert({
      action_type: 'export',
      acting_operator_id: operator.operatorId,
      target_user_id: targetUserId,
      timestamp_utc: now,
      outcome: 'failure',
      metadata: { failed_step: 'user_not_found' },
    })
    return new Response(JSON.stringify({ error: 'Target user not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Compile profile record
  const { data: profileData, error: profileError } = !failedStep
    ? await adminClient
        .from('profiles')
        .select('id, display_name, created_at')
        .eq('id', targetUserId)
        .maybeSingle()
    : { data: null, error: null }

  if (profileError) {
    console.error('dpo-export-user: profiles query failed:', profileError)
    failedStep = 'profiles_query'
  }

  // Compile consent records (retained even after erasure)
  const { data: consentData, error: consentError } = !failedStep
    ? await adminClient
        .from('consent_records')
        .select('id, user_id, timestamp_utc, purpose_id, consent_version, withdrawal_status, created_at')
        .eq('user_id', targetUserId)
    : { data: null, error: null }

  if (consentError) {
    console.error('dpo-export-user: consent_records query failed:', consentError)
    failedStep = 'consent_records_query'
  }

  // Compile auth user data — includes PII not mirrored in public.users (phone, last_sign_in_at,
  // email_confirmed_at, user_metadata). Required for complete DPDPA §11 data portability export
  // (Finding 7: export must cover ALL personal data held, including the auth schema layer).
  let authUserData: Record<string, unknown> | null = null
  if (!failedStep) {
    const { data: authUserResp, error: authUserError } = await adminClient.auth.admin.getUserById(targetUserId)
    if (authUserError) {
      console.error('dpo-export-user: auth.admin.getUserById failed:', authUserError)
      failedStep = 'auth_user_query'
    } else if (authUserResp?.user) {
      const u = authUserResp.user
      authUserData = {
        id: u.id,
        email: u.email ?? null,
        phone: u.phone ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
        user_metadata: u.user_metadata ?? null,
      }
    }
  }

  // Session metadata — erp_sessions may not exist yet; return empty array if missing
  let sessionsData: unknown[] = []
  if (!failedStep) {
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

  // Write audit log (Patch 8: include failed_step in metadata so DPO can diagnose failures)
  const { error: auditError } = await adminClient
    .from('dpo_audit_log')
    .insert({
      action_type: 'export',
      acting_operator_id: operator.operatorId,
      target_user_id: targetUserId,
      timestamp_utc: now,
      outcome: failedStep ? 'failure' : 'success',
      metadata: failedStep ? { failed_step: failedStep } : null,
    })

  if (auditError) {
    console.error('dpo-export-user: dpo_audit_log insert failed:', auditError)
  }

  if (failedStep) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      export: {
        user: userData,
        authUser: authUserData,
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
