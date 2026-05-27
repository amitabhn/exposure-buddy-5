// dpo-request-deletion/index.ts — User-authenticated deletion request Edge Function (Story 3.4)
// FR-DPO-07: allows a mobile user to submit a deletion request.
// Identity is derived exclusively from the verified Bearer JWT — body is intentionally empty.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // POST-only method guard
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: 'POST' },
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

  // Extract user JWT from Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const jwt = authHeader.slice(7)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Verify regular user JWT (NOT dpo_operator — this is user-authenticated)
  // Pattern from supabase/functions/consent-record/index.ts
  const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // C2/BOLA prevention: do NOT parse the request body — user identity comes from JWT only.
  // The body is intentionally empty ({}); never trust a user-supplied userId in the body.

  // Set deletion_requested_at to now() — idempotent (re-submission updates timestamp)
  const { error: updateError } = await adminClient
    .from('users')
    .update({ deletion_requested_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    console.error('dpo-request-deletion: update failed:', updateError)
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
