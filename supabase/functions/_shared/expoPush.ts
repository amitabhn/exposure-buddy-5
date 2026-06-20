// _shared/expoPush.ts — Expo Push API transport helper (Story 8.1)
// Deno runtime: no monorepo imports. Shared module, not an HTTP-serving Edge Function
// (no Deno.serve(), no CORS, no JWT extraction here — that's the caller's job).

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'

export type PushResult =
  | { ok: true }
  | { ok: false; signal: 'PruneToken' | 'RetryLater' | 'Unknown' }

interface ExpoPushTicket {
  status: 'ok' | 'error'
  message?: string
  details?: { error?: string }
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[]
}

/**
 * Splits an array into chunks of at most `size` — Expo's push API caps batches at 100
 * messages per request. Exported standalone so Stories 8.3/8.4's multi-token senders
 * reuse it rather than re-deriving the chunking logic.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk: size must be > 0')
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function mapTicketToResult(ticket: ExpoPushTicket): PushResult {
  if (ticket.status === 'ok') return { ok: true }

  const errorCode = ticket.details?.error
  if (errorCode === 'DeviceNotRegistered') return { ok: false, signal: 'PruneToken' }
  // InvalidCredentials signals a project-wide FCM/APNs credential misconfiguration,
  // not a dead token — mapping it to PruneToken would mass-delete tokens during a
  // credential outage instead of surfacing the error. See story Dev Notes.
  if (errorCode === 'InvalidCredentials') return { ok: false, signal: 'Unknown' }
  return { ok: false, signal: 'Unknown' }
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
): Promise<PushResult> {
  let response: Response
  try {
    response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify([{ to: token, title, body }]),
    })
  } catch {
    return { ok: false, signal: 'RetryLater' }
  }

  if (!response.ok) {
    return { ok: false, signal: 'RetryLater' }
  }

  let payload: ExpoPushResponse
  try {
    payload = await response.json()
  } catch {
    return { ok: false, signal: 'RetryLater' }
  }

  const ticket = payload.data?.[0]
  if (!ticket) return { ok: false, signal: 'RetryLater' }

  return mapTicketToResult(ticket)
}
