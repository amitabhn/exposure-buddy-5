// dpo-login/index.ts — DPO operator authentication Edge Function (Story 3.4)
// Issues an httpOnly cookie (dpo_token) and returns the token in the body for in-memory storage.

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

  // Env var fast-fail — all three required
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse body
  let body: { email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const email = body.email
  const password = body.password

  // Validate credentials — reject missing, non-string, or empty-after-trim fields
  // Do NOT forward empty credentials to Supabase Auth (C1)
  if (
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !password.trim()
  ) {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Use anon client for signInWithPassword (C1 — not service_role)
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  })

  const { data, error: signInError } = await anonClient.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  })

  if (signInError || !data.session) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const user = data.user

  // Verify app_metadata.role === 'dpo_operator'
  const role = (user.app_metadata as Record<string, unknown> | null)?.['role'] as string | undefined
  if (role !== 'dpo_operator') {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify email exists in dpo_operators with active = true, AND id matches JWT sub.
  // The id check prevents a manually-inserted row with a mismatched UUID from passing —
  // without it, audit attribution (acting_operator_id = JWT sub) would point to a non-existent row.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: operatorRow, error: operatorError } = await adminClient
    .from('dpo_operators')
    .select('id')
    .eq('email', email.trim())
    .eq('active', true)
    .eq('id', user.id)
    .maybeSingle()

  if (operatorError || !operatorRow) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const accessToken = data.session.access_token

  // Set httpOnly cookie — 8h TTL, SameSite=Strict, Secure
  const cookieValue = `dpo_token=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`

  return new Response(JSON.stringify({ ok: true, token: accessToken }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': cookieValue,
    },
  })
})
