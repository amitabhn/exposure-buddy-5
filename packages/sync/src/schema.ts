import { Schema, Table, column } from '@powersync/react-native'

const users = new Table({
  email: column.text,
  created_at: column.text,
})

const user_onboarding_metadata = new Table({
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
})

const suds_readings = new Table({
  session_id: column.text,
  suds_value: column.integer,
  recorded_at: column.text,
})

export const AppSchema = new Schema({ users, user_onboarding_metadata, fear_ladder_items, exposure_sessions, suds_readings })
export type Database = (typeof AppSchema)['types']
