// dpo-erase-user/index.ts — DPDPA erasure Edge Function (Story 3.3)
// FR-DPO-06: writes dpo_audit_log entry for every action.
// Soft-delete: nulls PII columns in public.users and public.profiles, bans auth user.
// consent_records are explicitly excluded from erasure (DPDPA 2023 §8(7) retention).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { extractBearerToken, verifyOperatorJwt } from '../_shared/auth.ts'

// Validates that a string is a plausible UUID v4 format
function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Fast-fail: env vars must be present
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

  // Extract and verify operator JWT
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

  // Parse and validate request body
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
  let failedStep: string | null = null

  // Step 1: Null PII in public.users and set deleted_at
  const { error: usersError } = await adminClient
    .from('users')
    .update({ email: null, deleted_at: now })
    .eq('id', targetUserId)

  if (usersError) {
    console.error('dpo-erase-user: public.users update failed:', usersError)
    failedStep = 'users'
  }

  // Step 2: Null PII in public.profiles
  if (!failedStep) {
    const { error: profilesError } = await adminClient
      .from('profiles')
      .update({ display_name: null })
      .eq('id', targetUserId)

    if (profilesError) {
      console.error('dpo-erase-user: public.profiles update failed:', profilesError)
      failedStep = 'profiles'
    }
  }

  // Step 3: Ban auth user (prevents re-login without deleting the row)
  // consent_records.user_id FK is ON DELETE SET NULL — DO NOT call deleteUser()
  if (!failedStep) {
    const { error: banError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      user_metadata: { deleted: true },
      ban_duration: 'none',
    })

    if (banError) {
      console.error('dpo-erase-user: auth.admin.updateUserById failed:', banError)
      failedStep = 'auth_ban'
    }
  }

  // Write audit log entry regardless of outcome
  const { error: auditError } = await adminClient
    .from('dpo_audit_log')
    .insert({
      action_type: 'erasure',
      acting_operator_id: operator.operatorId,
      target_user_id: targetUserId,
      timestamp_utc: now,
      outcome: failedStep ? 'failure' : 'success',
      metadata: failedStep ? { failed_step: failedStep } : null,
    })

  if (auditError) {
    // Audit log failure is critical — log but still return appropriate response
    console.error('dpo-erase-user: dpo_audit_log insert failed:', auditError)
  }

  if (failedStep) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
