import { Schema, Table, column } from '@powersync/react-native'

// Schema verification checklist (Story 9.1) — verified against supabase/migrations/*.sql
// through migration 0029 (device_push_tokens_update_policy). Re-verify on schema-affecting
// migration changes; CI gate `verify-schema-drift` (.github/workflows/ci.yml) enforces this
// going forward.
//
// Verified tables (columns match migration history exactly):
//   - users
//   - user_onboarding_metadata
//   - fear_ladder_items (peak_suds — column was renamed in migration 0015; see that
//     migration for the prior column name)
//   - exposure_sessions
//   - suds_readings
//
// Excluded tables (not part of AppSchema, by design):
//   - suds_baselines — not created at MVP (Story 6.4 deferred-post-mvp); no migration exists.
//   - device_push_tokens — written directly via the packages/supabase push-tokens Edge
//     Function client (packages/supabase/src/functions/push-tokens.ts), not synced through
//     PowerSync.
const users = new Table({
  email: column.text,
  created_at: column.text,
})

const user_onboarding_metadata = new Table({
  id: column.text,            // client-generated UUID PK (deferred from 4-2-D5)
  user_id: column.text,
  suds_calibration_value: column.integer,
  completed_at: column.text,
  created_at: column.text,
})

const fear_ladder_items = new Table({
  id: column.text,
  user_id: column.text,
  description: column.text,
  predicted_suds: column.integer,
  peak_suds: column.integer,
  position: column.integer,
  status: column.text,
  created_at: column.text,
  updated_at: column.text,
})

const exposure_sessions = new Table({
  user_id: column.text,
  fear_item_id: column.text,
  session_type: column.text,
  status: column.text,
  pre_session_intention: column.text,
  post_session_reflection: column.text,
  started_at: column.text,
  ended_at: column.text,
  expires_at: column.real,  // BIGINT epoch-ms; column.real (64-bit float) avoids 32-bit overflow
  created_at: column.text,
  technique: column.text,
})

const suds_readings = new Table({
  session_id: column.text,
  suds_value: column.integer,
  recorded_at: column.text,
})

export const AppSchema = new Schema({ users, user_onboarding_metadata, fear_ladder_items, exposure_sessions, suds_readings })
export type Database = (typeof AppSchema)['types']
