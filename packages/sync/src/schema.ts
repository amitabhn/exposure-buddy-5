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

export const AppSchema = new Schema({ users, user_onboarding_metadata })
export type Database = (typeof AppSchema)['types']
