#!/usr/bin/env bash
# Story 9.1 — fails if any table declared in packages/sync/src/schema.ts's AppSchema
# has no corresponding bucket data entry (or documented exclusion) in
# supabase/sync-rules.yaml. Separate failure class from verify-schema-drift.sh:
# this catches sync-policy completeness gaps (a table that exists but never syncs
# down to the local replica), not schema/migration drift.
set -euo pipefail

SCHEMA_FILE="${SCHEMA_FILE:-packages/sync/src/schema.ts}"
SYNC_RULES_FILE="${SYNC_RULES_FILE:-supabase/sync-rules.yaml}"

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "FAIL: schema file not found: $SCHEMA_FILE"
  exit 1
fi

if [[ ! -f "$SYNC_RULES_FILE" ]]; then
  echo "FAIL: sync-rules file not found: $SYNC_RULES_FILE"
  exit 1
fi

APP_SCHEMA_LINE=$(grep -E '^export const AppSchema = new Schema\(' "$SCHEMA_FILE") || {
  echo "FAIL: could not locate 'export const AppSchema = new Schema(' in $SCHEMA_FILE"
  exit 1
}
TABLES=$(echo "$APP_SCHEMA_LINE" \
  | grep -oE '\{[^}]*\}' \
  | tr -d '{}' \
  | tr ',' '\n' \
  | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')

if [[ -z "$TABLES" ]]; then
  echo "FAIL: no tables parsed from AppSchema in $SCHEMA_FILE — check formatting"
  exit 1
fi

FAIL=0

for table in $TABLES; do
  [[ -z "$table" ]] && continue

  if grep -qE "FROM[[:space:]]+public\.${table}([[:space:]]|\$)" "$SYNC_RULES_FILE"; then
    continue
  fi

  if grep -qE "#.*[[:space:]]${table}[[:space:]].*(excluded|exclusion)" "$SYNC_RULES_FILE"; then
    continue
  fi

  echo "FAIL: schema.ts AppSchema table '${table}' has no sync-rules.yaml bucket data entry (FROM public.${table}) and no documented exclusion comment"
  echo "      Add a bucket data entry, or a '# ${table} — excluded: <reason>' comment if intentional"
  FAIL=1
done

if [[ "$FAIL" -eq 1 ]]; then
  exit 1
fi
echo "PASS: every AppSchema table has sync-rules.yaml bucket coverage or a documented exclusion"
