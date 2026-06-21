#!/usr/bin/env bash
# Story 9.1 — fails if packages/sync/src/schema.ts references a table or column
# with no corresponding table/column in supabase/migrations/*.sql history.
#
# Exact-match for v1 — no allowlist/config mechanism. New exceptions are added by
# editing EXCLUDED_TABLES / EXCLUDED_COLUMNS / RENAMES below in a normal PR, not a
# config file. Precedent: the actual-suds-rename-gate in .github/workflows/ci.yml
# already hardcodes its one rename directly in script source the same way.
set -euo pipefail

SCHEMA_FILE="${SCHEMA_FILE:-packages/sync/src/schema.ts}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"

# Tables intentionally absent from the PowerSync schema's migration-backed set.
EXCLUDED_TABLES=("suds_baselines" "device_push_tokens")

# "table.column" entries deliberately excluded from this check (none as of Story 9.1).
EXCLUDED_COLUMNS=()

# "table.new_column" -> "old_column:migration_prefix". Required from day one: the
# actual_suds -> peak_suds rename (migration 0015), or this gate false-positives
# against this story's own ground truth.
declare -A RENAMES=(
  ["fear_ladder_items.peak_suds"]="actual_suds:0015"
)

is_in() {
  local needle="$1"
  shift
  for item in "$@"; do
    [[ "$needle" == "$item" ]] && return 0
  done
  return 1
}

FAIL=0

TABLES=$(grep -oE '^const [a-zA-Z_]+ = new Table\(' "$SCHEMA_FILE" | sed -E 's/^const ([a-zA-Z_]+).*/\1/')

for table in $TABLES; do
  if is_in "$table" "${EXCLUDED_TABLES[@]}"; then
    continue
  fi

  if ! grep -rqE "CREATE TABLE[[:space:]]+(IF NOT EXISTS[[:space:]]+)?public\.${table}[[:space:](]" "$MIGRATIONS_DIR"/*.sql; then
    echo "FAIL: schema.ts table '${table}' has no 'CREATE TABLE public.${table}' in ${MIGRATIONS_DIR}"
    echo "      If this is a rename, see the actual-suds-rename-gate precedent in .github/workflows/ci.yml"
    FAIL=1
    continue
  fi

  TABLE_CREATE_BLOCK=""
  for f in "$MIGRATIONS_DIR"/*.sql; do
    TABLE_CREATE_BLOCK+=$'\n'
    TABLE_CREATE_BLOCK+=$(sed -n "/CREATE TABLE.*public\.${table}[[:space:](]/,/);/p" "$f")
  done

  COLUMNS=$(sed -n "/^const ${table} = new Table(/,/^})/p" "$SCHEMA_FILE" \
    | grep -oE '^[[:space:]]*[a-zA-Z_]+:' \
    | sed -E 's/^[[:space:]]*//; s/:$//')

  for col in $COLUMNS; do
    key="${table}.${col}"

    if is_in "$key" "${EXCLUDED_COLUMNS[@]}"; then
      continue
    fi

    if [[ -n "${RENAMES[$key]:-}" ]]; then
      old_name="${RENAMES[$key]%%:*}"
      mig_prefix="${RENAMES[$key]##*:}"
      if grep -lqE "RENAME COLUMN ${old_name} TO ${col}" "$MIGRATIONS_DIR/${mig_prefix}"*.sql 2>/dev/null; then
        continue
      fi
      echo "FAIL: RENAMES entry for '${key}' expects a 'RENAME COLUMN ${old_name} TO ${col}' in migration ${mig_prefix}* — not found"
      FAIL=1
      continue
    fi

    if echo "$TABLE_CREATE_BLOCK" | grep -qE "^[[:space:]]*${col}[[:space:]]"; then
      continue
    fi

    if grep -qE "ADD COLUMN[[:space:]]+${col}([[:space:]]|\$)" "$MIGRATIONS_DIR"/*.sql 2>/dev/null; then
      continue
    fi

    echo "FAIL: schema.ts column '${key}' has no corresponding column in ${MIGRATIONS_DIR}"
    echo "      If this is a rename, see the actual-suds-rename-gate precedent in .github/workflows/ci.yml"
    FAIL=1
  done
done

if [[ "$FAIL" -eq 1 ]]; then
  exit 1
fi
echo "PASS: packages/sync/src/schema.ts matches supabase/migrations/*.sql (no drift)"
