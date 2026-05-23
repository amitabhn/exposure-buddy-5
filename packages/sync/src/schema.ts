import { Schema, Table, column } from '@powersync/react-native'

// PowerSync local SQLite schema — mirrors the Supabase users table.
// Additional tables are added as Epic 2+ stories land.
const users = new Table({
  email: column.text,
  created_at: column.text,
})

export const AppSchema = new Schema({ users })
export type Database = (typeof AppSchema)['types']
