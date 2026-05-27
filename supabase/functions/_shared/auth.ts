// _shared/auth.ts — JWT extraction and DPO operator verification (Story 3.3)
// Deno runtime: no monorepo imports. Used by all /dpo/* Edge Functions.

import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Extracts the Bearer token from an Authorization header.
 * Returns null if the header is missing or does not start with 'Bearer '.
 * Uses .slice(7) — NOT .replace('Bearer ', '') — to avoid partial replacement bugs.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Verifies that a JWT belongs to a DPO operator.
 * Validates the JWT via adminClient.auth.getUser(), then checks
 * user.app_metadata.role === 'dpo_operator' (set by Story 3.4 login endpoint).
 *
 * Returns { operatorId: string } on success, null on failure (invalid JWT or wrong role).
 * Callers should return HTTP 401 when null is returned.
 */
export async function verifyOperatorJwt(
  adminClient: SupabaseClient,
  jwt: string,
): Promise<{ operatorId: string } | null> {
  const { data: { user }, error } = await adminClient.auth.getUser(jwt)
  if (error || !user) {
    return null
  }
  const role = (user.app_metadata as Record<string, unknown> | null)?.['role'] as string | undefined
  if (role !== 'dpo_operator') {
    return null
  }
  return { operatorId: user.id }
}
