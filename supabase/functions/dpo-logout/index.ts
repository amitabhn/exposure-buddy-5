// dpo-logout/index.ts — DPO operator logout Edge Function (Story 3.4)
// Clears the httpOnly dpo_token cookie.
// NOTE (F3/F10 — accepted, deferred to Epic 4): The underlying Supabase session JWT remains
// valid until expiry (≤8h). Server-side revocation is not implemented here — mitigated by
// 8h TTL, active=false deactivation, and small operator roster. File as security hardening
// for Epic 4 / SOC-2 prep.

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

  // Clear the httpOnly cookie by setting Max-Age=0
  const clearCookie = 'dpo_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookie,
    },
  })
})
