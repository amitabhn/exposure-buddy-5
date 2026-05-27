import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import type { ConsentRecordPayload } from '../_shared/types.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const jwt = authHeader.slice(7)

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

  const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: ConsentRecordPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { timestampUtc, purposeId, consentVersion, withdrawalStatus } = payload

  if (
    !timestampUtc ||
    !purposeId ||
    !consentVersion ||
    typeof withdrawalStatus !== 'boolean' ||
    isNaN(Date.parse(timestampUtc))
  ) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid required fields: timestampUtc (ISO date), purposeId, consentVersion, withdrawalStatus (boolean)' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const { error: insertError } = await adminClient
    .from('consent_records')
    .insert({
      user_id: user.id,
      timestamp_utc: timestampUtc,
      purpose_id: purposeId,
      consent_version: consentVersion,
      withdrawal_status: withdrawalStatus,
    })

  if (insertError) {
    console.error('consent_records insert failed:', insertError)
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
