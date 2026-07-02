// Story 9.5, Task 3.4 — Inserts a pending fear_ladder_items row via PostgREST.
// Used by exposure-loop.yaml and debrief.yaml.
//
// IMPORTANT — Task 1.5 open question: fear_ladder_items is PowerSync-synced
// (apps/mobile/app/ladder.tsx reads via the on-device SQLite replica, not Postgres
// directly). If no local PowerSync sync stream is reachable in CI, this seeded row
// may never appear in the on-device UI. Verify empirically during Task 1.5:
//   1. Run this script to seed a row
//   2. Install and open the app
//   3. Check if /ladder shows the seeded item
// If the row does NOT appear, the exposure-loop and debrief flows must add their
// own ladder item via UI (like backgrounded-recovery.yaml does) instead of relying
// on backend seeding.
//
// Required env vars:
//   SUPABASE_URL              — REST API base (from the CI host's perspective)
//   SUPABASE_SERVICE_ROLE_KEY — bypasses RLS for the insert
//   SEED_USER_ID              — UUID of test1@test.com (set by seedAuthUser output or passed in)

var supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
var userId = process.env.SEED_USER_ID

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}
if (!userId || userId === 'null') {
  throw new Error('SEED_USER_ID is not set or null — run seedAuthUser.js first and pass its output.userId')
}

// Compute MAX(position)+1 to avoid the uq_user_position DEFERRABLE constraint violation
// (migration 0021 adds UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED).
// Maestro's http.get/http.post take a single params object: http.get(url, { headers }).
var maxPosResponse = http.get(
  supabaseUrl + '/rest/v1/fear_ladder_items?user_id=eq.' + userId + '&select=position&order=position.desc&limit=1',
  {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': 'Bearer ' + serviceRoleKey,
      'Content-Type': 'application/json',
    },
  }
)

var existingItems = JSON.parse(maxPosResponse.body)
var nextPosition = 1
if (Array.isArray(existingItems) && existingItems.length > 0 && existingItems[0].position != null) {
  nextPosition = existingItems[0].position + 1
}

var insertResponse = http.post(supabaseUrl + '/rest/v1/fear_ladder_items', {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': 'Bearer ' + serviceRoleKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
  body: JSON.stringify({
    user_id: userId,
    description: 'Riding the elevator alone',
    predicted_suds: 5,
    peak_suds: null,
    position: nextPosition,
    status: 'pending',
  }),
})

var statusCode = insertResponse.statusCode || insertResponse.status

if (statusCode === 201) {
  var inserted = JSON.parse(insertResponse.body)
  var item = Array.isArray(inserted) ? inserted[0] : inserted
  output.itemId = item.id
  output.description = item.description
  output.predictedSuds = item.predicted_suds
  console.log('seedPendingLadderItem: inserted id=' + item.id + ' position=' + nextPosition)
} else {
  throw new Error('seedPendingLadderItem: HTTP ' + statusCode + ': ' + insertResponse.body)
}
