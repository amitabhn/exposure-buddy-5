// Story 9.5, Task 4.1 — Fetches the most-recent OTP code for a specific email address
// from Mailpit's REST API, with poll/backoff to handle async email delivery.
//
// This repo's local Supabase stack (CLI v2.107.0) serves Mailpit at the port configured
// under the [inbucket] section in supabase/config.toml (port 54324). The running service
// is Mailpit despite the config section name. Use MAILPIT_URL from `supabase status -o env`.
//
// Required env vars:
//   MAILPIT_URL   — e.g. http://127.0.0.1:54324
//   OTP_TO_EMAIL  — the specific email address this OTP was sent to (per-invocation unique)
//
// Output:
//   output.otpCode — the 6-digit OTP string, ready for inputText in the Maestro flow

// Maestro's JS runtime (GraalJS) has no Node `process` global — env vars passed via
// `--env` / a flow's `env:` block are injected as bare top-level globals. Referencing an
// undefined identifier throws a ReferenceError, so guard each read with `typeof`.
var mailpitUrl = typeof MAILPIT_URL !== 'undefined' ? MAILPIT_URL : 'http://127.0.0.1:54324'
var toEmail = typeof OTP_TO_EMAIL !== 'undefined' ? OTP_TO_EMAIL : null

if (!toEmail) {
  throw new Error('OTP_TO_EMAIL is not set — cannot filter Mailpit messages by recipient')
}

var maxAttempts = 30
var otpCode = null

for (var attempt = 0; attempt < maxAttempts; attempt++) {
  // Mailpit REST API: GET /api/v1/messages?query=to:<email>
  // Returns a JSON object with a "messages" array and "total" count.
  // See: https://mailpit.axllent.org/docs/usage/api-v1/#tag/Message
  var searchUrl = mailpitUrl + '/api/v1/messages?query=' + encodeURIComponent('to:' + toEmail)
  var response = http.get(searchUrl)

  if (!response || !response.body) {
    console.log('fetchOtp attempt ' + (attempt + 1) + ': no response body — retrying...')
    java.lang.Thread.sleep(1000)
    continue
  }

  var parsed
  try {
    parsed = JSON.parse(response.body)
  } catch (e) {
    console.log('fetchOtp attempt ' + (attempt + 1) + ': failed to parse JSON — retrying...')
    java.lang.Thread.sleep(1000)
    continue
  }

  if (!parsed.messages || parsed.messages.length === 0) {
    console.log('fetchOtp attempt ' + (attempt + 1) + ': no messages yet for ' + toEmail + ' — retrying...')
    java.lang.Thread.sleep(1000)
    continue
  }

  // Sort by CreatedAt descending to get the most recent (defensive: API may not guarantee order)
  var messages = parsed.messages.slice()
  messages.sort(function(a, b) {
    return new Date(b.CreatedAt || b.createdAt || 0) - new Date(a.CreatedAt || a.createdAt || 0)
  })
  var latestMessageId = messages[0].ID || messages[0].id

  // Fetch the full message body to extract the OTP code
  var msgResponse = http.get(mailpitUrl + '/api/v1/message/' + latestMessageId)
  if (!msgResponse || !msgResponse.body) {
    console.log('fetchOtp attempt ' + (attempt + 1) + ': could not fetch message body — retrying...')
    java.lang.Thread.sleep(1000)
    continue
  }

  var msgData = JSON.parse(msgResponse.body)
  // The OTP is typically a 6-digit code in the email body.
  // Check both Text (plain text) and HTML body fields.
  var bodyText = msgData.Text || msgData.text || ''
  var bodyHtml = msgData.HTML || msgData.html || ''
  var fullBody = bodyText + ' ' + bodyHtml

  // Extract 6-digit code — Supabase OTP emails contain a standalone 6-digit number.
  // Verify this regex during implementation by triggering a real signup locally and
  // inspecting Mailpit's UI at http://localhost:54324 for the exact email format.
  var match = fullBody.match(/\b(\d{6})\b/)
  if (match) {
    otpCode = match[1]
    console.log('fetchOtp: found OTP code after ' + (attempt + 1) + ' attempt(s)')
    break
  }

  console.log('fetchOtp attempt ' + (attempt + 1) + ': message found but no 6-digit code in body — retrying...')
  java.lang.Thread.sleep(1000)
}

if (!otpCode) {
  throw new Error('fetchOtp: could not retrieve OTP code for ' + toEmail + ' after ' + maxAttempts + ' attempts')
}

output.otpCode = otpCode
