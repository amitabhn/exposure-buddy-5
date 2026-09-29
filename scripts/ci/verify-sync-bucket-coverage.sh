#!/usr/bin/env bash
# Story 9.1 — fails if any table declared in packages/sync/src/schema.ts's AppSchema
# has no corresponding bucket data entry (or documented exclusion) in
# supabase/sync-rules.yaml. Separate failure class from verify-schema-drift.sh:
# this catches sync-policy completeness gaps (a table that exists but never syncs
# down to the local replica), not schema/migration drift.
#
# Story 17.1 — also checks powersync/sync-config.yaml, the Sync Streams config
# actually deployed to the live PowerSync Cloud instance (supabase/sync-rules.yaml
# is kept only as historical/reference scope, per its own header comment — see
# ADR-RN-VERSION.md's PowerSync entry). Without this second check, a table added
# to sync-rules.yaml (keeping this gate green) could silently never reach the
# deployed config, or vice versa.
set -euo pipefail

SCHEMA_FILE="${SCHEMA_FILE:-packages/sync/src/schema.ts}"
SYNC_RULES_FILE="${SYNC_RULES_FILE:-supabase/sync-rules.yaml}"
SYNC_CONFIG_FILE="${SYNC_CONFIG_FILE:-powersync/sync-config.yaml}"

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "FAIL: schema file not found: $SCHEMA_FILE"
  exit 1
fi

if [[ ! -f "$SYNC_RULES_FILE" ]]; then
  echo "FAIL: sync-rules file not found: $SYNC_RULES_FILE"
  exit 1
fi

if [[ ! -f "$SYNC_CONFIG_FILE" ]]; then
  echo "FAIL: sync-config file not found: $SYNC_CONFIG_FILE"
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

# check_coverage FILE FROM_PATTERN_PREFIX
# FROM_PATTERN_PREFIX is prepended to the table name in the FROM-clause regex —
# sync-rules.yaml (legacy Sync Rules) always schema-qualifies as `public.<table>`;
# sync-config.yaml (Sync Streams) never does, per the PowerSync skill's own
# documented convention — so each file needs its own prefix, not a shared one.
check_coverage() {
  local file="$1"
  local from_prefix="$2"

  for table in $TABLES; do
    [[ -z "$table" ]] && continue

    if grep -qE "FROM[[:space:]]+${from_prefix}${table}([[:space:]]|\$)" "$file"; then
      continue
    fi

    if grep -qE "#.*[[:space:]]${table}[[:space:]].*(excluded|exclusion)" "$file"; then
      continue
    fi

    echo "FAIL: schema.ts AppSchema table '${table}' has no bucket/stream data entry (FROM ${from_prefix}${table}) in $file and no documented exclusion comment"
    echo "      Add a query entry, or a '# ${table} — excluded: <reason>' comment if intentional"
    FAIL=1
  done
}

check_coverage "$SYNC_RULES_FILE" 'public\.'
check_coverage "$SYNC_CONFIG_FILE" ''

if [[ "$FAIL" -eq 1 ]]; then
  exit 1
fi
echo "PASS: every AppSchema table has coverage (or a documented exclusion) in both $SYNC_RULES_FILE and $SYNC_CONFIG_FILE"
