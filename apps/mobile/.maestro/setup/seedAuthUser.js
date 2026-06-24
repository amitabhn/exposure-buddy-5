// Story 9.5, Task 3.2 — Creates test1@test.com via the Supabase Admin API.
// Idempotent: a 422 (user already exists) is treated as success.
//
// Maestro runScript context — uses Maestro's built-in http client (OkHttp wrapper).
// See: https://docs.maestro.dev/maestro-flows/javascript/make-http-requests
//
// Required env vars (set by run-e2e-smoke.sh / CI step):
//   SUPABASE_URL            — e.g. http://10.0.2.2:54321 (from the emulator's perspective)
//                             or http://127.0.0.1:54321 (from the CI host's perspective when
//                             this script runs via runScript in Maestro which runs on the host)
//   SUPABASE_SERVICE_ROLE_KEY

var supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot call Admin API')
}

var adminUrl = supabaseUrl + '/auth/v1/admin/users'

var response = http.post(
  adminUrl,
  JSON.stringify({
    email: 'test1@test.com',
    password: 'DevTest123!',
    email_confirm: true,
  }),
  {
    'apikey': serviceRoleKey,
    'Authorization': 'Bearer ' + serviceRoleKey,
    'Content-Type': 'application/json',
  }
)

var statusCode = response.statusCode || response.status

// 201 = created, 422 = user already exists (idempotent)
if (statusCode === 201) {
  var body = JSON.parse(response.body)
  output.userId = body.id
  console.log('seedAuthUser: created test1@test.com, userId=' + body.id)
} else if (statusCode === 422) {
  // User already exists from a prior run within the same supabase db reset cycle.
  // Fetch the existing user to return their ID.
  var listResponse = http.get(
    supabaseUrl + '/auth/v1/admin/users?email=test1@test.com',
    {
      'apikey': serviceRoleKey,
      'Authorization': 'Bearer ' + serviceRoleKey,
    }
  )
  var listBody = JSON.parse(listResponse.body)
  var existingUser = Array.isArray(listBody) ? listBody[0] : (listBody.users && listBody.users[0])
  if (existingUser) {
    output.userId = existingUser.id
    console.log('seedAuthUser: test1@test.com already exists, userId=' + existingUser.id)
  } else {
    output.userId = null
    console.log('seedAuthUser: user exists (422) but could not retrieve ID — continuing anyway')
  }
} else {
  throw new Error('seedAuthUser: unexpected HTTP ' + statusCode + ': ' + response.body)
}
