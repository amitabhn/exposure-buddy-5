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
  actual_suds: column.integer,
  position: column.integer,
  status: column.text,
  created_at: column.text,
  updated_at: column.text,
})

export const AppSchema = new Schema({ users, user_onboarding_metadata, fear_ladder_items })
export type Database = (typeof AppSchema)['types']
